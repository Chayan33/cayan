# Doğrulama kaydı — 8 Ekim 2026

Node.js 24.19.0, TypeScript strict, Chromium 151 ve yazılımsal WebGL ile çalışma alanında yürütüldü.

## Oyun mantığı ve gerçek ağ sunucusu

`npm test`: **16 geçti, 0 başarısız, 0 atlandı.**

- 80 görevin isim, aşama ve bağımlılık tutarlılığı; beş kategori zincirinin önceki görevlerden kazanılan deneyimle ilerleyebilmesi.
- Görevlerde taşıma, teslimat, mesafe, zaman aşımı ve tek seferlik ödül koşulları.
- Alışveriş, eşya tüketimi, VEX tolerans/fiyat ilişkisi, kayıt doğrulama ve rehin işlemleri.
- Gerçek iki Socket.IO istemcisiyle ortak görev; aynı anda teslimatta çift ödül engeli; para/eşya paylaşımı; kabul ve geri ödemeli borç; ortak ev kilidi/daveti/düzenleme izni.
- Ortak dolaptan eş zamanlı alımda tek eşya; mobilyanın ilk sahibine geri dönmesi; birlikte dinlenme ile ortak saat değişimi; gerçek sunucu yeniden başlatması sonrası kayıt; beşinci oyuncunun reddedilmesi.

Görev zinciri testleri konumları ve mini oyun başarılarını kontrollü olarak sağlar; 80 görevin her birinin tarayıcıda gerçek süreyle tamamlandığı anlamına gelmez.

## Tarayıcı kabul senaryoları

Yedi senaryonun tamamı geçti. İlk tam turda 5/7 geçti; düşük kare hızı ve iç mekân geçiş zamanlaması düzeltildikten sonra etkilenen iki senaryo yeniden çalıştırıldı, 2/2 geçti.

1. Gerçek WASD hareketi, zıplama, duvara çarpma, Nihat Abi ile konuşma, İlk Mesai kabulü, koliyi alma/bırakma/geri alma/teslim etme, 140 ₺ kazanma ve sayfa yenilenince kaydı geri yükleme.
2. 80 görevli günlük, kalıcı telefon notları, dükkândan satın alma, envanterden tüketme, destek görüşmesi, fiziksel ev iç mekânı ve mobilya yerleştirme.
3. Fare kamerası, kalite ve yağmur ayarı, telefon tuşunu değiştirme, 390 px genişlikte taşmayan telefon ekranı.
4. İki gerçek tarayıcı oturumu: ortak oda, borç kabulü ve geri ödeme, ev içindeki diğer karakteri görme, iç mekân hareketinin eşlenmesi, birlikte dinlenme ve tek oyunculu kaydın korunması.
5. Gerçek 3D çarpışma verileri üzerinden bütün görev hedeflerine erişilebilirlik.
6. Üç zamanlamalı tamir girdisi ve inceleme için tuşu basılı tutma. Yazılımsal WebGL/CDP gecikmesi nedeniyle tamir testi görünür göstergeyi okuyup gerçek düğmeye tarayıcı içinde tıklar; görev durumunu doğrudan tamamlamaz.
7. Gerçek 3D karakter önizlemesi ve özelleştirme; rehin fişiyle eşyanın geri alınması.

İlk kabul testi haritada gerçekten yürür. Diğer bağımsız arayüz senaryoları, uzun seyahatleri tekrarlamamak için belirtilmiş konum/eşya başlangıç verilerini kullanır.

## Grafik ve üretim paketi

`npm run build` TypeScript denetimiyle birlikte geçti. Yüksek grafik ayarı, karakter önizlemesi ve yağmur/gece sahnesi gerçek Chromium/WebGL üzerinde açıldı; görsel kontrol yapıldı. 1080p/60 FPS hedefi gerçek GPU donanımında ölçülmedi. Üretim paketi geliştirme amaçlı `window.__SONDOZ` erişimini içermez.

Ekran görüntüleri `artifacts/` altında bulunur. Bunlar oyunun gerçek görüntüleridir; dışarıdan üretilmiş temsili çizimler değildir.
