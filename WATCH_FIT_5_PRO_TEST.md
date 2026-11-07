# FitKoçum Watch Fit 5 Pro — Video prototipi

Bu klasördeki test, **gerçek FitKoçum egzersiz videolarını** WATCH FIT 5 Pro'da görüntülemeyi hedefler. Tam bir saat uygulaması değildir. Google Play/Huawei AppGallery'a yayımlamak için video haklarını ve Huawei geliştirici gereksinimlerini bağımsız doğrulamak gerekir.

## Hemen dene (FitKoçum v4.0 Watch Lab Android APK)

1. Yeni APK'yı mevcut FitKoçum'un üzerine yükle (**eskisini silme**).
2. Uygulamada **⌚ Saat için hareket seç** düğmesine bas veya programdan bir hareket aç.
3. **Bench Press, Lat Pulldown, Squat, Incline Press** ya da **Biceps Curl** hareketlerinden birini aç.
4. **⌚ SAAT İÇİN VİDEOYU KAYDET** düğmesine bas. Android 10+ telefonun **Filmler / FitKocumWatch** klasörüne 4 saniyelik MP4 yazılır. Galeride de görünmesi beklenir.
5. **Huawei Sağlık → Cihazlar → Watch Fit 5 Pro → Kadranlarım (My faces) → Video** yolunu izle. +/Video seçme işlemiyle kaydettiğin MP4 dosyasını seçip uygula.

Huawei Sağlık menüsünde video kadranı yoksa telefon/saat yazılımını güncelle. Modelin video kadranını desteklemesi, her yazılım veya bölgede aynı menülerin görünmesini garanti etmez. Saat kadranının ana arayüzünü değiştirir; antrenman ekranı hâline gelmez.

## Teknik özellikler

- Kaynak: FitKoçum APK'sındaki **gerçek Free Exercise DB MP4'leri**.
- Huawei FIT 5 uyumlu video kadranı çıktı boyutu **408 × 480**, H.264/yuv420p, **25 fps**, **4 saniye**, sessiz.
- CI: `node tools/build-watch-videos.cjs` komutunu, 317 çevrimdışı hareket videosu hazırlandıktan sonra çalıştırır.
- CI ayrıca **5 ayrı MP4 ZIP** ve yeni FitKoçum Android APK'sını oluşturur.
- Test: `node tests/watch-videos.cjs` codec, boyut, fps, süre, ses ve dosya varlığını denetler.
- Video başına yaklaşık 4 saniye; temel model destekliyorsa galeri üzerinden kadran olarak aktarılabilir.
- Yanıltıcı vaat yok: **Saatten antrenman kontrolü, tüm 317 videonun otomatik taşınması, uygulama içi dinamik video gösterimi ve Wear Engine bağlantısı henüz yapılmadı.**

## Sonraki teknik eşik

- HarmonyOS uyumlu **ayrı bir saat uygulaması** ve Huawei'nin Wear Engine API izinleri.
- Saatin ArkUI Video/AVPlayer yeteneklerini gerçek donanımda doğrulama.
- Telefon uygulamasında seçilen hareketin kısa videosunu Bluetooth üstünden saatin uygulamasına taşıma ve uygulama içinde oynatma.
- Set tamamla / sonraki hareket / dinlenme kontrolü / izin verilirse nabız.

Huawei kaynakları:
- https://consumer.huawei.com/en/support/content/en-us16091400/
- https://developer.huawei.com/consumer/en/doc/content/production-example-pro-0000001633927109/
- https://developer.huawei.com/consumer/en/doc/harmonyos-references/wearengine_api/
