# Routine App

Routine App, gunluk rutinleri takip etmeyi oyunlastirma ile birlestiren SwiftUI
tabanli bir iOS uygulamasi ve AWS Serverless backend projesidir.

Kullanici rutin olusturabilir, hazir paketleri uygulayabilir, gunluk rutinleri
complete veya skip olarak isaretleyebilir ve haftalik ilerlemesini badge,
streak, freeze ve puanlar uzerinden takip edebilir.

## Mevcut Ozellikler

### iOS Uygulamasi

- SwiftUI ve basit MVVM mimarisi
- Today ekrani ve gunluk rutin aksiyonlari
- Routine create, update ve archive akislari
- High, normal ve low routine onceligi
- Hazir routine template paketleri
- Haftalik ozet, puan grafigi ve badge dagilimi
- Streak ve freeze takibi
- Kural tabanli insights
- Kullanici dokundugunda yuklenen son 30 gunluk routine gecmisi
- Sistem, light ve dark tema destegi
- Badge kutlama ekrani ve yumusak gecis animasyonlari

### Backend

- AWS Lambda ve API Gateway uzerinde REST API
- DynamoDB tabanli routine, completion, daily summary ve gamification state
  depolamasi
- Routine CRUD ve duplicate korumasi
- Create ve update islemlerinde DynamoDB transaction ile race condition
  korumasi
- Routine saatinden once complete islemini engelleyen backend kurali
- Finalized gunlerde complete ve skip islemlerini engelleyen kilit
- Her gece otomatik gun finalize akisi
- Point-based gold, silver, bronze ve missed badge sistemi
- Streak freeze kazanma ve tuketme kurallari
- Haftalik dashboard ve kural tabanli insights
- Pull-based routine history endpointi
- Gun basinda rutin ve puanlari sabitleyen daily plan snapshot'i
- Yerel dev anahtari, dis IP kontrolu ve API Gateway hiz siniri

## Mimari

```text
SwiftUI Views
      |
ViewModels
      |
APIClient (URLSession + async/await)
      |
API Gateway
      |
AWS Lambda Handlers
      |
Domain Services
      |
DynamoDB Repositories
      |
DynamoDB Tables
```

Backend handler dosyalari HTTP request ve response islemlerini yonetir. Is
kurallari service katmaninda, DynamoDB erisimi repository katmaninda tutulur.
iOS tarafinda View yalnizca arayuze, ViewModel ise API cagrilari ve ekran
state'ine odaklanir.

## Oyunlastirma Kurallari

Routine puanlari kategoriye gore hesaplanir:

| Kategori | Puan |
| --- | ---: |
| Water | 5 |
| Vitamin | 5 |
| Supplement | 5 |
| Medicine | 10 |
| Habit | 10 |
| Walking | 15 |
| Study | 20 |
| Workout | 25 |

Gunluk badge, tamamlanan routine sayisindan ziyade kazanilan puanin toplam
puana oranina gore belirlenir:

| Badge | Kosul |
| --- | --- |
| Gold | %100 |
| Silver | %60 ve uzeri |
| Bronze | %0'dan buyuk |
| Missed | %0 |

Gold ve silver streak'i artirir, bronze streak'i korur. Missed gun freeze
varsa bir hak tuketerek streak'i korur; freeze yoksa streak sifirlanir. Son
yedi gunde yeterli gold performansi haftalik bir freeze kazandirabilir.

## Gunluk Akis

1. `GET /today` bugune uygun aktif routine listesini ilk okumada sabitler ve
   anlik ozeti bu plan uzerinden hesaplar.
2. Routine saati geldiginde complete islemi acilir; skip islemi gun acikken
   kullanilabilir.
3. Complete ve skip yazmalari finalize ile cakismayi engelleyen DynamoDB
   transaction kullanir.
4. Gece calisan schedule onceki gunu finalize eder.
5. Eksik routine kayitlari missed olur ve badge, streak, freeze ile puan
   sonuclari kalici hale gelir.
6. Finalized gun tekrar degistirilemez ve sonradan eklenen routine o gunun
   sonucuna dahil edilmez.

Yeni bir routine olusturulurken gun finalize edilmisse veya routine saati
gecmisse baslangic tarihi sonraki gun olarak belirlenir.

Gun icinde bir routine duzenlense veya arsivlense bile o gunun sabitlenmis
puani ve badge hesabi degismez. Haftalik dashboard yalnizca finalize edilmis
gunleri kullanir.

## API Ozeti

| Method | Path | Aciklama |
| --- | --- | --- |
| `POST` | `/routines` | Routine olusturur |
| `GET` | `/routines` | Routine listesini getirir |
| `GET` | `/routines/{id}` | Routine detayini getirir |
| `PUT` | `/routines/{id}` | Routine'i gunceller |
| `POST` | `/routines/{id}/archive` | Routine'i arsivler |
| `GET` | `/routines/{id}/history` | Istek uzerine routine gecmisini getirir |
| `GET` | `/routine-templates` | Hazir paketleri listeler |
| `POST` | `/routine-templates/{id}/apply` | Paketteki eksik rutinleri olusturur |
| `GET` | `/today` | Bugunun rutinlerini ve anlik ozeti getirir |
| `POST` | `/routines/{id}/complete` | Routine'i tamamlar |
| `POST` | `/routines/{id}/skip` | Routine'i atlar |
| `GET` | `/summaries` | Gunluk ozetleri listeler |
| `GET` | `/summaries/{date}` | Bir gunun ozetini getirir |
| `POST` | `/summaries/{date}/finalize` | Bir gunu finalize eder |
| `GET` | `/streak` | Streak ve freeze durumunu getirir |
| `GET` | `/insights` | Kural tabanli onerileri getirir |
| `GET` | `/dashboard` | Haftalik dashboard verisini getirir |

## Teknolojiler

- Swift ve SwiftUI
- TypeScript
- Node.js 18
- Serverless Framework
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Terraform
- Node.js built-in test runner

## Proje Yapisi

```text
.
|-- ios/RoutineApp/             SwiftUI iOS uygulamasi
|-- src/handlers/               Lambda HTTP ve schedule handler'lari
|-- src/services/               Is kurallari
|-- src/repositories/           DynamoDB erisim katmani
|-- src/mappers/                API response donusumleri
|-- src/types/                  TypeScript modelleri
|-- src/utils/                  Tarih ve timezone yardimcilari
|-- tests/                      Backend otomatik testleri
|-- infra/environments/dev/     Terraform dev altyapisi
|-- scripts/                    Live smoke test araclari
`-- serverless.yml              API, Lambda ve IAM tanimlari
```

## Backend Kurulumu

Gereksinimler:

- Node.js 18 veya uzeri
- npm
- Terraform 1.5 veya uzeri
- Yerel ortamda yapilandirilmis AWS erisimi

Bagimliliklari yuklemek ve projeyi dogrulamak icin:

```bash
npm install
npm test
```

Yalnizca TypeScript build almak icin:

```bash
npm run build
```

Dev altyapisini hazirlamak icin:

```bash
cd infra/environments/dev
terraform init
terraform plan
terraform apply
```

Backend'i deploy etmek ve olusan endpoint bilgisini yerel ortamda gormek icin:

```bash
npx serverless deploy
npx serverless info
```

Terraform state, variable dosyalari, `.env` ve yerel credential dosyalari Git'e
eklenmemelidir.

## iOS Kurulumu

Xcode ile su projeyi acin:

```text
ios/RoutineApp/RoutineApp.xcodeproj
```

Uygulama backend adresini Swift kaynak kodundan degil, yerel Xcode config
dosyasindan okur. Dev erisim anahtari ile mevcut dis IP'yi Git tarafindan yok
sayilan yerel dosyalara yazmak icin once su komutu calistirin:

```bash
npm run setup:dev-access
```

Ardindan su dosyada API adresinin tanimli oldugunu kontrol edin:

```text
ios/RoutineApp/Config/Local.xcconfig
```

Guvenli placeholder formati:

```text
API_BASE_URL = https:/$()/YOUR_DEPLOYED_API_HOST
```

`Local.xcconfig` ve `.env` Git tarafindan yok sayilir. Gercek endpoint, erisim
anahtari veya IP degerlerini kaynak koda, README'ye ya da commit mesajina
eklemeyin. Internet baglantinizin dis IP'si degisirse kurulum komutunu yeniden
calistirip backend'i deploy edin.

Backend degisiklikleri deploy edildikten sonra Xcode'da bir iOS Simulator
secip projeyi Run edebilirsiniz.

## Testler

Backend testleri su alanlari kapsar:

- Timezone ve gun planlamasi
- Scheduled time complete korumasi
- Category point ve badge hesaplari
- Streak ve freeze kurallari
- Finalize concurrency davranisi
- Routine template ve duplicate korumasi
- Update duplicate race condition'i
- Routine priority siralamasi
- Routine history filtrelemesi
- Daily plan snapshot ve archive/edit sonrasi puan korumasi
- Weekly routine gun secimi validation'i
- Dev request authorizer ve dashboard finalized filtrelemesi
- Dashboard ve insights response'lari

Testleri calistirmak icin:

```bash
npm test
```

## Guvenlik Notu

Proje su anda gelistirme ve demo odaklidir. HTTP endpointleri yerel dev
anahtari ve izin verilen dis IP ile korunur; API Gateway'de dusuk hiz siniri
bulunur. Bu katman Cognito yerine gecmez. Gercek kullaniciya acik bir surum
icin authentication ve kullanici bazli owner resolution tamamlanmalidir.

Repository'ye su dosyalar eklenmemelidir:

- `.env`
- AWS credential dosyalari
- Terraform state ve variable dosyalari
- `ios/RoutineApp/Config/Local.xcconfig`
- Gercek API endpointleri, tokenlar veya secret degerleri

## Ek Dokumantasyon

- [Mimari notlari](ARCHITECTURE_NOTES.md)
- [Son degisiklikler ve kontrol notlari](LATEST_CHANGES.md)
- [Demo notlari](DEMO_NOTES.md)
- [iOS kurulum notlari](ios/RoutineApp/README.md)

## Durum

Backend otomatik testleri 28/28 basarilidir. Yeni backend endpointleri iOS
uygulamasindan once deploy edilmelidir.
