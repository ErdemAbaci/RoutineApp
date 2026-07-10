# Routine App Architecture Notes

Bu not, projenin nasil calistigini orta seviyede anlatir. Amac kod satiri satirina inmek degil; sistemi sunarken veya projeye bir sure sonra geri donerken ana akisi, karar noktalarini ve dikkat edilmesi gereken yerleri hizlica hatirlatmaktir.

## Genel Resim

Routine App iki ana parcadan olusuyor:

- AWS uzerinde calisan serverless backend
- SwiftUI ile yazilan iOS MVP uygulamasi

Backend ana kaynak olarak davranir. Rutinler, tamamlanma kayitlari, gunluk ozetler, streak/freeze bilgisi ve template verisi backend tarafinda yonetilir. iOS uygulamasi bu veriyi REST endpointleriyle okur, kullanici aksiyonlarini yine backend'e gonderir.

Su an sistem demo/MVP seviyesinde tasarlandi. Gercek auth ve push notification henuz yoktur. Development hizini korumak icin tum istekler `temporary-user-id` kullanicisina baglanir.

## Katmanlar

Backend kodu kabaca dort katmana ayrilir:

1. Handler katmani
   API Gateway'den gelen HTTP istegini alir. Body/path validation yapar, ilgili service veya repository fonksiyonunu cagirir, HTTP response dondurur.

2. Service katmani
   Is kurallarinin buyuk kismi buradadir. Ornegin rutin olustururken `startDate` kararini vermek, gunluk summary hesaplamak, badge/streak/freeze kurallarini uygulamak, template apply duplicate kontrolu yapmak.

3. Repository katmani
   DynamoDB okuma/yazma detaylarini saklar. Handler veya service katmani DynamoDB komutlarini dogrudan bilmek zorunda kalmaz.

4. Mapper/type katmani
   Backend ic veri modellerini API response formatina cevirir. Type dosyalari da veri yapilarini netlestirir.

Bu ayrim iyi bir nokta cunku proje buyudukce yeni endpoint eklemek kolaylasir. En onemli kural: yeni is mantigi mumkun oldukca handler icinde degil service katmaninda kalmali.

## Veri Modeli

Sistemde temel olarak dort veri grubu var:

- `Routine`
  Kullanicinin takip edecegi aliskanlik. Baslik, kategori, saat, frekans, startDate, status gibi alanlari vardir.

- `RoutineCompletion`
  Bir rutinin belli bir gundeki durumudur. `done`, `skipped` veya `missed` olabilir.

- `DailySummary`
  Bir gunun toplam sonucudur. Toplam rutin, kazanilan puan, completion rate, badge, streak ve freeze bilgilerini tutar.

- `GamificationState`
  Kullanici seviyesinde guncel streak ve freeze durumunu tutar.

Rutin template'leri ise su an statik servis verisi olarak tutuluyor. Template apply edildiginde backend bu template item'larindan gercek `Routine` kayitlari olusturur.

## Ana Gunluk Akis

Gunluk kullanim akisi soyle ilerler:

1. Kullanici iOS uygulamasini acar.
2. iOS `GET /today` cagirir.
3. Backend bugunun aktif rutinlerini bulur.
4. Bugune ait completion kayitlarini okur.
5. Gun henuz finalize edilmemisse summary hesaplanir ve guncellenir.
6. iOS ekranda rutinleri, puanlari, badge durumunu, streak/freeze bilgisini gosterir.
7. Kullanici rutin saatinden sonra `complete`, veya istediginde `skip` aksiyonu alir.
8. Backend completion kaydini yazar ve gunluk summary tekrar guncellenir.

Burada kritik nokta: `GET /today` sadece veri gostermekle kalmaz, finalize edilmemis gun icin summary'nin guncel kalmasina da yardim eder. Bu MVP icin pratik bir cozumdur.

## Complete ve Skip Kurallari

`complete` ve `skip` aksiyonlari benzer sekilde calisir ama ayni kurallara sahip degiller.

Complete:

- Rutin var olmali.
- Rutin archived olmamali.
- Gun finalize edilmemis olmali.
- Rutinin planlanan saati gelmis olmali.
- Eger saat gelmediyse backend `400 Routine is not ready yet` dondurur.

Skip:

- Rutin var olmali.
- Rutin archived olmamali.
- Gun finalize edilmemis olmali.
- Saat kuralina takilmaz.

Bu ayrim urun mantigi acisindan onemli. Kullanici erken complete yapamaz, ama rutini yapmayacagini biliyorsa skip edebilir.

## Finalize Akisi

Finalize, gunun artik kapanmasi anlamina gelir. Kapanan gunun badge, puan, streak ve freeze sonucu sonradan bozulmamali.

Sistem Duolingo benzeri bir mantik izler:

- Her gece Istanbul saatine gore yaklasik 00:10'da `finalizeYesterdaySummary` calisir.
- Dun icin aktif rutinler ve completion kayitlari uzerinden son summary hesaplanir.
- Eksik kalan rutinler `missed` sayilir.
- Badge/streak/freeze hesaplanir.
- Summary `finalized: true` olur.

Finalize sonrasi:

- O gune complete/skip yazilamaz.
- O gunun summary'si tekrar ezilmez.
- Sonradan eklenen yeni rutin, finalize edilmis gunun badge/puan sonucunu bozmaz.

Bu kisim projenin en kritik is kurallarindan biri. Cunku kullanici guvenini dogrudan etkiler: dun gold aldiysa bugun yeni rutin ekledi diye dun silver'a dusmemeli.

## Routine Start Date Mantigi

Yeni rutin olusturulurken backend `startDate` belirler.

- Bugun finalize olduysa rutin yarindan baslar.
- Bugun finalize olmadi ama rutinin saati gectiyse yine yarindan baslar.
- Bugun finalize olmadi ve rutinin saati henuz gelmediyse bugune dahil olabilir.

Bu kural sayesinde kullanici saat 21:00'de sabah 08:00 rutini eklediginde, bugunun sonucunu haksiz yere bozmaz.

## Duplicate Koruma

Duplicate routine korumasi iki seviyeli calisir.

Duplicate imzasi su alanlardan uretilir:

- title
- category
- frequencyType
- scheduledTime
- daysOfWeek

Birinci seviye uygulama kontroludur. Backend mevcut aktif rutinleri listeler ve ayni imza varsa yeni routine olusturmaz.

Ikinci seviye DynamoDB transaction marker'dir. Ayni anda iki istek gelirse ikisi de "aktif duplicate yok" gorebilir. Bunu engellemek icin routine olusturulurken ayni transaction icinde bir duplicate marker kaydi da yazilir. Marker zaten varsa ikinci istek basarisiz olur.

Manual create icin duplicate sonucunda:

```text
409 Routine already exists
```

Template apply icin duplicate sonucunda hata firlatmak yerine ilgili item `skipped` listesine alinir.

Archive edilince marker serbest birakilir. Boylece kullanici archived ettigi rutini ileride tekrar olusturabilir.

## Gamification

Oyunlastirma uc ana parca uzerinden ilerler:

- Puan
- Badge
- Streak/freeze

Her routine kategorisinin bir puani vardir. Gunluk badge, tamamlanan puanin toplam puana oranindan hesaplanir. Streak ise finalize edilen gun sonucuna gore ilerler veya korunur.

Freeze mantigi:

- Kullanici gunu missed kapatirsa ve freeze hakki varsa streak korunur.
- Freeze hakki yoksa streak risk altindadir.
- Haftalik gold momentum belli sartlarda yeni freeze kazandirabilir.

Bu kurallar backend tarafinda tutuldugu icin iOS sadece sonucu gosterir. Bu dogru bir tercih, cunku oyunlastirma kurallari client tarafina dagilmamis olur.

## Dashboard ve Insights

`GET /dashboard`, son gunlerin ozetini tek response'ta verir:

- aktif rutin sayisi
- guncel streak
- freeze hakki
- toplam/kazanilan puan
- badge dagilimi
- haftalik summary listesi

`GET /insights` ise daha yorumlayici bilgi uretir. Ornegin kullanicinin streak riski, gold'a yakinligi, skip/missed egilimi gibi durumlar icin aksiyon metadata'si dondurur. iOS bu aksiyon tiplerini ekranda yonlendirme veya vurgu icin kullanabilir.

## iOS Uygulamasi

iOS tarafi SwiftUI ile yazildi ve basit MVVM yapisi kullaniyor.

- `Models`
  Backend response'larini `Codable` modeller olarak tanimlar.

- `Networking/APIClient.swift`
  Base URL, HTTP request, JSON decode ve hata mesajlarini yonetir.

- `ViewModels`
  API cagrilarini yapar ve ekran state'ini tutar.

- `Views`
  Today, Dashboard, Insights, Templates, Routines ve Settings ekranlarini olusturur.

Backend URL Swift dosyasina gomulu degildir. Xcode config uzerinden okunur. Gercek URL `Local.xcconfig` icindedir ve git'e girmez.

iOS'ta son eklenen polish:

- sistem/acik/koyu tema secimi
- Dashboard ve Today ekranlarinda yumusak animasyonlar
- dunun badge sonucunu gosteren kutlama ekrani

## Guclu Taraflar

- Is kurallarinin cogu backend'de merkezilesmis durumda.
- Finalize mantigi puan/badge bozulmalarini engelliyor.
- Duplicate routine korumasi hem normal hem eszamanli istekleri dusunuyor.
- Test kapsami kritik domain kurallari icin iyi bir MVP seviyesinde.
- iOS tarafinda backend URL config'i local tutuluyor, canli URL git'e yazilmiyor.
- Demo icin canli smoke test script'i var.

## Dikkat Edilmesi Gereken Noktalar

- Auth yok. `temporary-user-id` ileride merkezi bir `resolveOwnerId(event)` helper'i ile degistirilmeli.
- Push notification yok. Reminder alanlari var ama gercek mobil bildirim servisi henuz bagli degil.
- `GET /today` summary hesaplamasina da dokunuyor. MVP icin iyi ama ileride salt read ve write etkisi ayrimi daha netlestirilebilir.
- Update routine duplicate marker'i su an create kadar guclu degil. Kullanici bir rutini baska aktif rutinin imzasina update ederse ek guard gerekebilir.
- Demo data temizligi manuel/script seviyesinde. Ileride admin/dev temizleme araci faydali olur.

## Sistemin Su Anki Durumu

Su an proje sunulabilir MVP seviyesinde:

- Backend deploy edildi.
- Lokal testler geciyor.
- Canli smoke test geciyor.
- iOS temel ekranlari backend ile konusuyor.
- Tema, dashboard, template, routine CRUD, today, complete/skip, finalize, badge, streak ve freeze akislari mevcut.

Bir sonraki en mantikli mimari adim, buyuk ozellik eklemekten once auth'a hazirlik ve demo data yonetimi olur.
