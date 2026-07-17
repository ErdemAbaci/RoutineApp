# Son Degisiklikler ve Kontrol Notlari

Tarih: 2026-07-10

Bu dosya son gelistirme turunda eklenen ozellikleri, dogrulama sonuclarini ve
kontrol sirasinda gorulen riskleri ozetler.

## Eklenen ve Degistirilen Ozellikler

### 1. Routine Update Duplicate Korumasi

Routine olusturma tarafinda bulunan duplicate korumasi update akimina da
eklendi. Bir routine duzenlenerek baska bir aktif routine ile ayni hale
getirilmeye calisilirsa API artik `409 Routine already exists` doner.

Kontrol iki seviyede yapilir:

- Servis mevcut aktif routine listesini kontrol eder.
- DynamoDB transaction yeni duplicate marker'i kosullu olarak olusturur.

Bu sayede ayni anda gelen iki update isteginde de ikinci istek veri
cakismasi olusturamaz. Signature degistiginde yeni marker olusturulur ve eski
marker ayni transaction icinde silinir.

### 2. Haftalik Ozet Ekrani

iOS Dashboard sekmesi `Hafta` olarak guncellendi. Ekranda artik:

- Son 7 gunluk ortalama puan tamamlama orani
- Kazanilan ve toplam puan
- Aktif routine, streak ve freeze degerleri
- Gold, silver, bronze ve missed dagilimi
- Gunluk puan tamamlama sutunlari
- Gun gun badge ve puan listesi

gosterilir.

### 3. Istek Uzerine Routine Gecmisi

Yeni endpoint:

```text
GET /routines/{id}/history
```

Varsayilan olarak son 30 gunu doner. Desteklenen `days` araligi 7 ile 90
arasindadir.

iOS routine listesi acilirken bu endpoint cagrilmaz. Kullanici bir routine'i
acar ve `Son 30 gunu goruntule` alanina dokunursa gecmis yuklenir. Bu karar
gereksiz DynamoDB okumalarini azaltir.

### 4. Routine Onceligi

Routine modeline su oncelikler eklendi:

- `high`
- `normal`
- `low`

Eski kayitlarda alan bulunmuyorsa `normal` kabul edilir. iOS routine editor
ekraninda oncelik secilebilir. Today ve aktif routine listesinde yuksek
oncelikli kayitlar once, ayni oncelikte olanlar saatlerine gore siralanir.

### 5. Gunluk Plan Snapshot'i

`GET /today`, gunun rutinlerini ilk okumada tek seferlik bir plan olarak
saklar. Plan rutin basligi, saati ve puanini o gun icin sabitler.

Gun icinde routine update veya archive edilse bile gece finalize islemi bu
snapshot'i kullanir. Boylece toplam puan ve badge sonradan degismez. Ayni gun
icin yeni olusturulan uygun rutinler acik plana kontrollu olarak eklenir.

## Dogrulama Sonuclari

- TypeScript build basarili.
- Backend testleri 28/28 basarili.
- Serverless package islemi basarili.
- iOS Simulator hedefi icin Xcode build basarili.
- `git diff --check` temiz.

Yeni testler su davranislari kapsar:

- Update ile duplicate olusturulamamasi
- DynamoDB kosullu yazma cakismasinin 409'a cevrilmesi
- Priority siralamasi
- Routine history'nin sadece secilen routine kayitlarini donmesi
- Daily plan snapshot'inin archive/edit sonrasi puani korumasi
- Weekly routine icin tam bir gun secilmesi
- Dev request authorizer'in anahtar ve IP'yi birlikte dogrulamasi

## Kontrol Sonucu ve Alarm Seviyeleri

### Kirmizi - Canli Surum Oncesi Cozulmeli

#### Auth ve Owner Ayrimi

API halen `temporary-user-id` kullanir. Bu gelistirme karari bilincli olarak
korundu. Dev endpointleri yerel anahtar ve izin verilen dis IP ile korunur,
ancak gercek kullaniciya acik surumde Cognito benzeri kullanici kimligi ve
owner ayrimi yine zorunludur.

#### Manual Finalize Endpoint

`POST /summaries/{date}/finalize` endpointi de ayni dev authorizer arkasindadir.
Anahtar ve izin verilen IP olmadan disaridan tetiklenemez. Production auth
eklendiginde bu endpoint ayrica admin/dev yetkisine alinmalidir.

### Turuncu - Yakin Zamanda Iyilestirilmeli

#### Backend Once Deploy Edilmeli

iOS Today modeli yeni `priority` alanini bekler. Mevcut canli backend deploy
edilmeden yeni iOS kodu calistirilirsa eski `/today` response'u bu alani
gondermeyecegi icin decode hatasi olusabilir. Mevcut durumda dogru yayin sirasi:

1. Backend deploy
2. iOS build/run

Daha sonra iOS tarafinda bu alan opsiyonel okunarak staged deployment daha
toleransli hale getirilebilir.

#### Haftalik Ozet Sadece Finalized Gunleri Ayirmiyor

Dashboard servisi son yedi DailySummary kaydini toplar. Eski sistemden kalmis
finalized olmayan bir ozet varsa badge dagilimi ve ortalama oran icine dahil
olabilir. Haftalik istatistiklerde yalnizca finalized gunlerin kullanilmasi,
bugunun canli durumunun ise ayri gosterilmesi daha net olur.

#### Routine History Sorgu Maliyeti

History endpointi sadece kullanici dokundugunda calisir; bu su an icin yeterli
bir maliyet kontroludur. Ancak DynamoDB sorgusu once kullanicinin tarih
araligindaki tum completion kayitlarini okur, sonra secilen routine'i Lambda
icinde filtreler. Kullanici ve routine sayisi buyurse `routineId-date-index`
benzeri bir GSI eklenmelidir.

#### Archived Routine History Erisimi

Aktif routine satirina dokununca editor ve history acilabilir. Archived
routine satirlari su an editor acmadigi icin eski bir routine'in gecmisine
mobil arayuzden ulasilamaz. Backend endpointi archived routine icin calisir;
eksik olan kisim yalnizca iOS navigasyonudur.

### Yesil - Saglam Gorunen Alanlar

- Update duplicate kontrolu race condition'a karsi transaction ile korunur.
- Finalized gun complete/skip ile degistirilemez.
- Eski priority alani olmayan routine kayitlari backend tarafinda `normal`
  kabul edilir.
- Routine history uygulama acilisinda otomatik yuklenmez.
- Gunluk puan plani update/archive islemlerinden etkilenmez.
- Dashboard yalnizca finalize edilmis gunleri hesaplar.
- Yeni backend kurallari otomatik testlerle korunur.

## Onerilen Sonraki Sira

1. Backend'i deploy et ve live smoke test calistir.
2. iOS `priority` decoding davranisini eski backend response'una toleransli yap.
3. Dashboard hesaplarini finalized summary kayitlariyla sinirla.
4. Archived routine history navigasyonunu ekle.
5. Kullanici istediginde auth ve owner resolution katmanina gec.

## Deployment Durumu

Bu degisiklikler henuz commit edilmedi, push edilmedi ve AWS ortaminda deploy
edilmedi. Local build ve test dogrulamalari tamamlandi.
