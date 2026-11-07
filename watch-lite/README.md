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


## v4.2 — Saat uygulaması test prototipi (HAP henüz yok)

**Bu kaynak, video kadranından farklı bir uygulama prototipidir.** Watch Fit 5 Pro'nun video kadranında MP4 oynatması doğrulandı; Lite Wearable uygulaması içindeki HML \`<video>\` bileşeninin gerçek cihazda çalışması hâlâ doğrulanmadı.

Kod ve işleyiş:
- \`pages/index/index.hml\` video ekranı, önceki/sonraki hareket, set tamamlama ve dinlenme görünümü.
- \`utils/watch-state.js\` beş gerçek egzersiz, hareket başına set sayısı, 90 sn dinlenme, kayıt geri yükleme ve sıkı mesaj doğrulama. Set sayacı Lite Wearable \`@system.storage\` üzerinde az yer tutan bir biçimde saklanır.
- MP4 oynatımı hata verirse yalnızca hata açıklaması ve yerel poster görüntülenir. **Bunu video çalıştı diye raporlamıyoruz.**
- \`utils/wear-link.js\`: Huawei P2pClient/Builder/Message yöntemlerine uygun, test edilen ve uygulamada henüz başlatılmamış iletişim adaptörü.
- \`set.completed\` mesajları gerçekleştiğinde şu an yalnızca saat tarafında saklanır; **telefon kayıtlarına yazılmaz**. Tekrar mesaj kontrolü ve ACK tasarımı eklendi.

### Gerekli dış araçlar ve izinler

1. Huawei geliştirici hesabı ve **DevEco Studio** kurulu bilgisayar.
2. Yeni **[Lite] Empty Ability** projesi: HarmonyOS JS/HML, cihaz türü **Lite Wearable**.
3. \`watch-lite/entry/src/main\` dosyalarını DevEco projesine taşı. Android APK'nın saate yüklenemeyeceğini unutma.
4. CI tarafından hazırlanan **v4.2 Lite SOURCE ZIP** içindeki \`common/videos\` ve \`common/posters\` klasörlerinde gerçek beş MP4/poster yer alır.
5. Önce **Huawei Lite Wearable Simulator** ile yerel video ve set düğmelerini test et.
6. Saat için gerçek HAP üretmek adına modelin **Lite API sürümü** ile uyumlu compile/target SDK seç ve uygulamayı **Huawei geliştirici sertifikası/profil ile imzala**.
7. Lite Wearable cihazına kurmak için Huawei'nin **App Debugging Assistant** yöntemini dene. Watch Fit 5 Pro için bu yöntemin destek durumu ayrıca cihaz üzerinde doğrulanmalı.
8. Huawei'nin resmî Lite Wearable Wear Engine SDK'sını sağlayıp \`P2pClient\` adaptörüne geçir; telefon paket ismi \`com.fitkocum.plus\` ve **gerçek imza parmak izi** gereklidir. Repo kaynak koduna kişisel sertifika, token veya fingerprint yükleme.

**Önemli uyumluluk riski:** Huawei'nin Wear Engine dökümanı üçüncü taraf telefonlar için Android 6–14 listesini veriyor; Pixel 9'un daha yeni Android sürümündeki davranışı test edilmeden otomatik senkronizasyon garantisi veremeyiz.

### Komutlar

DevEco kurulmadan önce CI üzerinde şu kaynak/varlık kontrollerini yapıyoruz:

\`\`\`sh
node tests/watch-state.cjs
node tests/watch-lite-prototype.cjs
node tests/watch-videos.cjs
\`\`\`

Gerçek saat üzerinde birinci kabul testi: uygulamanın açılması, ardından MP4'ün hareket ederek oynatılması, sonraki harekete geçmesi ve "SET +" sayacının doğru çalışması. İkinci kabul testi: telefon–saat mesajlarının Bluetooth ile gidip geri gelmesi. Bunlar **henüz geçilmedi**.
