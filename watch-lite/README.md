# FitKoçum Watch v4.1 — gerçek video ve Lite Wearable prototipi

## Doğrulanmış çalışma
- Kullanıcı, **Watch Fit 5 Pro üzerinde gerçek Bench Press MP4 videosunun video kadranı olarak hareketli oynadığını** doğruladı.
- v4.1, aynı gerçek kaynak videoları kullanır; görüntüyü büyütür, beyaz stüdyo fonunu koyu arka plana çevirir.
- Kaynak: Android uygulamasında çevrimdışı bulunan 317 hareketten 5 videoluk test seçimi.
- Android **⌚ SAAT İÇİN VİDEOYU KAYDET** düğmesi, klibi telefonun Movies/FitKocumWatch klasörüne çıkarır; Huawei Sağlık'tan video kadranına ayrıca uygulanır.
- Yeni Android v4.1 Watch Lab APK'sı **mevcut uygulamanın üzerine** kurulmalıdır; silmek kayıtları kaybettirebilir.

## v4.1 değişiklikleri
- Beş gerçek MP4'te görüntü kadrajı analiz edilerek düzeltildi: bench, lat pulldown, squat, incline press, biceps curl.
- Beyaz arka plan azaltıldı; 408×480, H264, 25 fps, 4 saniye, sessiz video korunuyor.
- Ana uygulamada **beş hareketlik Watch Lab hızlı seçim listesi** eklendi.
- CI testleri her klipte karanlık alanın varlığını, sabit resim olmadığını, codec ve süreyi kontrol eder.
- Derleme önce 317 çevrimdışı egzersiz videosunu, sonra 5 saat klibini üretir.
- Saat prototipinin kaynakları `watch-lite/entry/src/main/` altında. Bu kısım bir **DevEco Studio Lite Wearable proje taslağıdır; HAP derlenmedi ve Watch Fit 5 Pro'ya kurulmadı**.

## Teknik sınırlar
Huawei'nin `Wear Engine` belge ve araçları, **eş uygulama (telefon + saat)** arasındaki dosya/mesaj aktarımı destekler. Bu, özel geliştirici kaydı, uygulama kimlikleri, sertifika parmak izi, izinler ve gerçek cihaz testi gerektirir. Watch Fit serisinin **Lite Wearable JavaScript/HML** yolunu öncelikle değerlendirmek gerekir; normal Android APK saate kurulmaz.

Huawei'nin genel JavaScript `video` bileşen dokümanı bulunur. Ancak bunun **Watch Fit 5 Pro'da Lite uygulaması içinde MP4 oynatabildiği** doğrulanmış değildir. Video kadranında oynatma ile uygulama içi oynatma **ayrı** kabiliyetlerdir.

### DevEco deney planı
1. Yeni Lite Wearable projesi aç: FA/JS, cihaz türü liteWearable. `watch-lite/entry/src/main` dosyalarını projeye ekle.
2. Oluşturulmuş beş klibi, proje içindeki `js/MainAbility/common/videos/` klasörüne al.
3. Önce tek MP4 ile `<video>` bileşenini saat üzerinde dene. Desteklenmiyorsa kare tabanlı image-animator alternatifini deneyebiliriz; ancak gerçek videoyu birinci öncelik tutacağız.
4. Saat tarafında video ve düğmeler doğrulanınca Wear Engine telefon eşleşmesini/mesaj servisinin izinlerini tamamla.
5. Antrenman senkronizasyonu için mesaj protokolü: `exercise.select`, `set.saved`, `rest.start`, `session.next`, `ack`. Kalıcı kayıt sahibi telefon olmalı; tekrar gelen mesajları tekilleştirmeli.
6. Watch Fit 5 Pro model destek matrisi, geliştirici yetkisi ve gerçek HAP kurulumunu test etmeden tam senkronizasyonu yayınlama.

## Belgeler
- https://developer.huawei.com/consumer/en/codelab/WearEngine/index.html
- https://developer.huawei.com/consumer/en/doc/connectivity-guides/service-introduction-0000000000018585/
- https://developer.huawei.com/consumer/en/doc/harmonyos-references/js-components-media-video/
- https://developer.huawei.com/consumer/en/doc/best-practices/bpta-smartwatch/

Kullanılan egzersiz videolarının hakları bağımsız doğrulanmadı. Kaynak geliştiricinin açıklamaları referans alınan kişisel test paketidir; halka açık dağıtım öncesi lisans doğrulaması gerekir.
