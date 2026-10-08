# SON DOZ

Karayaka’da geçen, Türkçe, üçüncü şahıs bir 3D tarayıcı oyunu. React arayüzü ile Three.js dünyası ayrı katmanlarda çalışır; ana menünün arkasındaki şehir de canlı WebGL sahnesidir.

Bu depo, oynanabilir **0.1 geliştirme sürümüdür**. Tasarım belgesindeki stüdyo ölçeğindeki nihai oyunun bütün ayrıntılarının tamamlandığı iddia edilmez. Uygulanan sistemler ve mevcut sınırlar aşağıda açıkça belirtilmiştir.

## Çalıştırma

Node.js 22.12+ veya 24 kullanın.

```sh
npm ci
npm run dev
```

Bu komut Vite istemcisini **5173**, Socket.IO oda sunucusunu **3001** portunda başlatır. Tarayıcıdan 5173 portunu açın. `/socket.io` ve `/api` istekleri Vite üzerinden sunucuya yönlendirilir. Tek oyunculu oyun için yalnız `npm run client` yeterlidir.

```sh
npm run build       # TypeScript denetimi ve üretim paketi
npm test            # Oyun kuralları, 80 görev ve gerçek oda sunucusu testleri
npm run test:e2e     # Çalışan geliştirme sunucusuna karşı Chromium testleri
```

E2E testleri `/usr/bin/chromium` kullanır. Başka bir yol için `PLAYWRIGHT_CHROMIUM_EXECUTABLE` tanımlayın. Yazılımsal WebGL kullanılan CI ortamında testler performans grafik ayarıyla yürür. Oyun 60 FPS hedefler; bu depodaki yazılımsal tarayıcı testleri donanım üzerinde 60 FPS ölçümü değildir.

## İlk iş

**Yeni oyun** ile başlayın. Yıldız Bakkal’a yürüyün, Nihat Abi’nin yanındayken **E** tuşuna basın, **İlk Mesai** işini kabul edin. Nihat Abi ile tekrar konuşun, bakkalın deposundan koliyi alın, raflara götürün ve ücretinizi almak için Nihat Abi’ye dönün. İş 140 ₺ ve 60 deneyim verir.

Koliler fiziksel olarak elde taşınır; taşıma sırasında koşma kapanır. **G** ile bırakılan koli aynı konumdan **E** ile geri alınabilir. Görev aşamaları konum, eşya, sıra, süre ve kaynak kontrolünden geçer.

| Kontrol                            | İşlev                                  |
| ---------------------------------- | -------------------------------------- |
| W A S D                            | Hareket                                |
| Sağ fare + hareket / sahneye tıkla | Kamera; tıklamak fareyi kilitler       |
| Shift / Space                      | Koş / zıpla                            |
| E / G                              | Etkileşim / koliyi bırak               |
| Tab / M / J / P                    | Envanter / harita / görevler / telefon |
| Escape                             | Ekranı kapat veya duraklat             |
| R / E                              | Ev dekorasyonunda döndür / yerleştir   |

Tuşlar ve fare hassasiyeti Ayarlar ekranından değiştirilebilir.

## Geliştirilen sistemler

- Tek bağlantılı haritada yedi bölge, balkonlar, tenteler, dükkân tabelaları, sahil, iskele, araçlar, yayalar, ağaçlar ve çevre ayrıntıları.
- Üçüncü şahıs kamera, yumuşak takip, engel yaklaşımı, WASD hareket, koşma, zıplama, yerçekimi ve nesne çarpışmaları. Hafif bir özel kinematik fizik çözümü kullanılır.
- Canlı, sürüklenerek döndürülen gerçek 3D karakter önizlemesi; üç yüz biçimi, ten/saç/kıyafet/ayakkabı renkleri, saç/şapka ve gözlük seçimi. Yürüme, koşma, taşıma ve nefes animasyonu.
- Gün/gece ışığı, gölgeler, uzaklık sisi, yağmur parçacıkları ve yerel gece ışıkları. Yüksek ayarda çevresel gölgeleme (SSAO) ve hafif ışık parlaması. Üç kalite seçeneği, toplu çizilen statik geometri ve birleştirilmiş karakter parçaları; arayüz açıkken arka plan daha seyrek çizilir.
- Sinematik menü, HUD, mini harita, etkileşim ipuçları, görev günlüğü, harita, telefon, envanter, alışveriş, ev, danışma merkezi, oda ve başarım ekranları.
- **20 yasal, 20 riskli, 15 hikâye, 15 ortak, 10 yan görev.** Her görev özgün başlık/hikâye ve bağımlılık zinciri içerir. Ortak bir görev motorunda fiziksel teslimat, konuşma, inceleme, süreli çalışma, nöbet, ödeme ve zamanlamalı tamir mekaniklerini birleştirirler. Bunlar 80 ayrı özel mekanik anlamına gelmez.
- Nakit / ev kasası / kira borcu ayrımı, işlem günlüğü, alışveriş ve ikinci el satışı. Üç oyun günü içinde geri alınabilen rehin fişleri; kabul gerektiren oyuncular arası faizsiz borç teklifleri, taksit ve tam geri ödeme. Açlık, enerji, sağlık, kurgusal VEX ihtiyacı ve tolerans, destek görüşmesi.
- Riskli işlerle yükselen şüphe, devriye/takip, yakalanma cezası ve görevin iptali.
- Girilebilir ve döşenebilir ev iç mekânı, uyuma, kasa, kira taksiti ve başlangıç evini satın alma. Sandalye, bitki ve lambayı yerleştirme/döndürme/geri alma. Ortak evde kapı kilidi, davet ve ayrı düzenleme izinleri, eşya dolabı; kaldırılan mobilya ilk sahibine döner.
- Web Audio ile üretilen menü, adım, bildirim, başarı/hata, kapı sesleri ve arka plan atmosferi.
- Gerçek Socket.IO odaları: 1–4 karakter, özel oda kodu, dışarıda ve evin içinde hareket/görünüm eşleme, ortak görev aşamaları, eşya/nakit paylaşımı, ortak kasa ve soyut oyuncudan para alma eylemi. Oda saati ortaktır; sabaha geçmek için bağlı oyuncular evde dinlenmeyi onaylar.

## Kayıt ve çok oyunculu kullanım

Tek oyunculu kayıt sürüm denetimiyle `localStorage` içinde tutulur; 15 saniyede bir, önemli işlemlerde ve sayfa kapanırken saklanır. Oda karakterleri tek oyunculu kaydı değiştirmez.

Oda ekonomisi ve görev ilerlemesi sunucuda doğrulanır. Görevler mesafe/sıra, satın alma bakiye ve konum, transferler miktar ve yakınlık, ortak teslimat ise taşıyıcı kimliği kontrolünden geçer. Tek sunucu işlemi içindeki ardışık durum güncellemeleri aynı teslimatın iki kez ödüllendirilmesini engeller. Sunucu dosyayı geçici bir dosyaya yazıp atomik olarak değiştirir.

Oda kayıtları `.data/rooms.json` içindedir. `SONDOZ_DATA_DIR` ile farklı bir kalıcı dizin kullanılabilir. Odaya yeniden giriş bilgisi tarayıcıda saklanır; aynı oda koduyla aynı tarayıcıdan dönüldüğünde karakter geri gelir. Tarayıcı verilerini silmek bu kimliği kaybettirir. Sunucu için `.env` veya harici hizmet anahtarı gerekmez.

İki ayrı tarayıcı/cihaz aynı çalışan sunucuya erişmelidir. Oda kodu tek başına bilgisayarlar arasında tünel kurmaz. İnternete açılacak bir kurulumda HTTPS ve WebSocket yönlendirmesi yapılandırılmalıdır. `npm run preview` yalnızca üretilmiş tek oyunculu istemciyi sunar; çok oyunculu üretim dağıtımı ayrıca Socket.IO sunucusuna yönlendirme gerektirir.

## Mevcut kapsam sınırları

- NPC rutinleri, trafik ve polis yapay zekâsı ilk sürüm düzeyindedir. Tam günlük program, gelişmiş yol bulma, sinematik diyalog veya seslendirilmiş konuşma yoktur.
- Oda ekonomisi ve görevler doğrulanır; bu sistem rekabetçi bir oyun için tamamlanmış hile önleme çözümü değildir. Trafik, görsel NPC’ler ve tüm dünya nesneleri ortak sunucu fiziğinde simüle edilmez. Oda gün/saat bilgisi sunucudan eşlenir; hava ayarı istemciye özeldir.
- Odada tek bir ortak başlangıç evi vardır; ayrı oyuncu mülklerinden oluşan çoklu gayrimenkul pazarı yoktur. Ortak kasadan çekme yetkisi oda kurucusundadır.
- İç mekân kapsamı başlangıç evidir. Diğer işletmeler dış dünyadan etkileşim ekranlarına açılır.
- Sürülebilir araçlar, oturma/uyuma/nesne kullanma için ayrı iskelet animasyonları ve her meslek için farklı bir mini oyun bu sürümde yer almaz. İşler ortak fiziksel teslimat, süreli çalışma ve zamanlamalı tamir mekaniklerinden oluşur.
- Yüzler üç hazır biçimle özelleştirilir; serbest yüz heykelleme editörü yoktur. Ray tracing, gerçek zamanlı ayna yansıması ve profesyonel seslendirme kullanılmaz. Görsel ve ses varlıkları prosedüreldir; ücretli/izinsiz oyun varlığı kullanılmaz.
- Ekran görüntüleri `artifacts/` içindedir. Otomasyon 80 görevin mantığını tamamlar; 80 görevin her biri gerçek zamanlı tarayıcıda baştan sona elle oynanmış olarak sunulmaz.

## Kod rehberi

- `src/game/engine.ts`: 3D dünya, fizik, kamera, ışık, animasyon.
- `src/game/avatar.ts`, `src/game/atmosphere.ts`: karakter geometrisi, SSAO/parlama/yağmur/gece ışıkları.
- `src/game/economy.ts`, `src/game/housing.ts`: rehin kuralları, ortak ev izinleri ve yerleştirme sınırları.
- `src/game/world.ts`: etkileşim noktaları, bölge ve eşya tanımları.
- `src/game/quests.ts`: 80 görev ve ilerleme zincirleri.
- `src/game/model.ts`: istemci/sunucu tarafından paylaşılan oyun kuralları.
- `src/game/store.ts`: arayüz ve tek oyunculu durum yönetimi.
- `src/game/network.ts`, `server/index.ts`: oda istemcisi ve yetkili ekonomi/görev sunucusu.
- `src/ui/`, `src/styles.css`: özgün Türkçe arayüz.
- `tests/`: oyun mantığı, ağ entegrasyonu ve tarayıcı kabul testleri.

## İnceleme ve yayınlama

`npm run build:portable`, **artifacts/SON-DOZ-oyna.html** dosyasını üretir. Dosyayı bilgisayarına indirip güncel Chrome/Edge/Firefox ile açarak tek oyunculu oyunu kurulum yapmadan inceleyebilirsin. Yazı tipleri, JavaScript ve CSS dosyanın içindedir. Çok oyunculu odalar Node sunucusunu gerektirir.

`npm run build && npm start` üretim istemcisiyle oda sunucusunu aynı **3001** portundan sunar. Dockerfile bu sunuculu sürüm içindir; `.data` dizinine kalıcı disk bağlanmalıdır. HTTPS bir ters vekil üzerinden sağlanabilir.

`.github/workflows/pages.yml`, `main` dalı güncellenince tek oyunculu istemciyi GitHub Pages'a hazırlar. Depoda **Settings → Pages → Source: GitHub Actions** etkin olmalıdır. Pages statik barındırmadır; tek başına Socket.IO oda sunucusunu çalıştırmaz. Workflow dosyasının bulunması yayının gerçekleştiği anlamına gelmez; Actions/Pages sonucu ayrıca doğrulanmalıdır.

Kontrol sonuçları: [Test kaydı](docs/TEST_REPORT.md). Bulut ortamı ve sunucu ayrıntıları: [Geliştirme rehberi](docs/DEVELOPMENT.md).
