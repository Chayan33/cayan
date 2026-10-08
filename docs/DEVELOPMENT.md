# Geliştirme ve bulut ortamı

Bu çalışma alanı zaten yalıtılmıştır. `/workspace/cayan` içindeki mevcut depoyu kullanın; kullanıcı istemedikçe ek Git worktree oluşturmayın. Node.js 24.19.0 ile hazırlanmıştır; uygulama Node.js 22.12+ destekler.

## Kurulum

`scripts/cloud-setup.sh`, kilit dosyasına göre bağımlılıkları kurar ve üretim paketini derler. npm önbelleği `/tmp/son-doz-npm` içindedir. Harici API anahtarı, ücretli hizmet veya veritabanı sunucusu gerekmez. Kurulum npm paket kayıt servisine erişir; oyun varlıkları, yazı tipleri ve sesleri çalışırken üçüncü taraf CDN'den alınmaz.

## Başlatma

Depo kökünde `npm run dev` komutunu uzun ömürlü bir terminal oturumunda başlatın. İstemci 5173, oda sunucusu 3001 portunu kullanır. Sunucu değişikliklerinde `tsx watch`, arayüz değişikliklerinde Vite yeniden yükleme sağlar.

Hazırlık denetimleri:

```sh
curl --fail --silent http://127.0.0.1:3001/api/health
curl --fail --silent http://127.0.0.1:5173/api/health
npm run check
npm test
npm run test:e2e
```

Her iki sağlık isteği `ok: true`, `game: "SON DOZ"`, `maxPlayers: 4` döndürmelidir. `npm test` kendi geçici veri dizininde 3102 portunda gerçek test sunucusu başlatır; geliştirme odalarını değiştirmez. Tarayıcı testleri çalışan geliştirme sunucusunda yeni test odaları oluşturur.

Playwright burada kurulu `/usr/bin/chromium` tarayıcısını kullanır. Farklı ortamda `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ile kurulu Chromium yolunu belirtin. Yazılımsal WebGL testi performans ayarını kullanır; donanım FPS ölçümü değildir. Kullanıcıya görünen bütün oyun metinleri Türkçedir; test ve kaynak dosyası adları geliştirme dilindedir.

## Kayıtları koruma

- `.data/rooms.json` gerçek oda kayıtlarını içerir. Bağımlılık kurulumu ve yeniden başlatma bu dizini silmemelidir.
- Sunucu kayıt bozuksa veri kaybı yaratmak yerine açılışı durdurur. Önce dosyanın yedeğini alıp sorunu inceleyin.
- Tek oyunculu kayıt ve oda kimlikleri tarayıcıda ayrı tutulur. `localStorage` temizliği oyuncu kimliğini kaldırır.
- Kayıt dosyası çalışma anında geçici dosyaya yazılıp atomik olarak değiştirilir. Üretimde veri dizinine kalıcı disk bağlayın.
- Ortam görüntüsündeki dosyalar korunabilir; canlı Node süreçleri ve tarayıcı oturumları korunmuş kabul edilmemelidir. Yeni görevde servisleri yeniden başlatın.

## Üretim kullanımı

`npm run build` istemciyi `dist/` içine üretir. Geliştirme amaçlı `window.__SONDOZ` erişimi üretimde eklenmez. Statik dosyaları HTTPS üzerinden sunup `/socket.io` ve `/api` yollarını 3001 portundaki Node sunucusuna yönlendirin. `npm run preview` yalnız istemciyi sunar; çok oyunculu üretim yayını yerine geçmez.

Bu çalışma alanı hazırlanmış ve test edilmiş kaynak kodudur. GitHub'a gönderme, çevrimiçi dağıtım ve bulut ortamını yayımlama ayrı işlemlerdir.
