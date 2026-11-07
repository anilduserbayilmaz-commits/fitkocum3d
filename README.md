# FitKoçum 3D+

Türkçe, çevrimdışı çalışan Android spor salonu asistanı. Android uygulaması hâlen WebView tabanlıdır; ayrı gerçekçi Unity karakter/animasyon prototipi henüz tamamlanmış bir APK değildir.

## v3.1 geliştirme dalı — antrenman planı

- **Pazartesi:** Ağır, göğüs/omuz/triceps.
- **Salı:** Sadece kardiyo (yürüyüş bandı ve sabit bisiklet).
- **Çarşamba:** Ağır, sırt/biceps.
- **Perşembe:** Dinlenme.
- **Cuma:** Ağır, bacak/kalça/karın.
- **Cumartesi:** Dinlenme.
- **Pazar:** Sadece kardiyo (eliptik ve eğimli yürüyüş).
- Her egzersiz kartında **↔ Değiştir**: kütüphaneden arayarak alternatif seçme. Ayrıca hareket ekleme ve günün varsayılan programına dönme.
- Değişiklikler cihazda saklanır. Eski set/ağırlık kayıtları korunur; v3.0 A/B/C özel plan verisi eski anahtarında kalır.
- Kardiyo kaydı dakika üzerinden yapılır; 3D animasyon varmış gibi gösterilmez.
- 390 hareketlik önceki atlas korunur; kalite iyileştirme (gerçekçi humanoid, ağırlık tutuşu, ekipman IK) sonraki aşamadır.

**Durum:** v3.1.1 video önizlemesi geliştirme aşamasında. Başarılı Android derlemesi ve telefon testi yapılmadan v3.1 APK'nın hazır olduğu söylenemez.


## v3.1.1 MoveKit video önizlemesi

- Gerçek video oynatıcı: H.264 MP4, çevrimdışı, döngü ve 0.5×/1×/1.5× hız.
- MoveKit'in ticari uygulamalarda kullanımına izin verdiği **iki ücretsiz örnek** uygulamaya derleme sırasında dahil edilir: **Pull-ups** ve **Dumbbell Chest Fly**.
- Bu hareketler haftalık kuvvet programında ve hareket değiştirme kütüphanesinde bulunur.
- Diğer hareketlerde lisanslı MoveKit videosu henüz bulunmadığı açıkça belirtilir; biyomekanik açıdan hatalı olabilen eski 3D sahneler artık egzersiz kartlarından açılmaz.
- MoveKit örnek dosyaları halka açık kaynak depomuzda tutulmaz. APK üretiminde [resmî ücretsiz örnek ZIP](https://movekit.com/free-sample) alınır, son kullanıcı uygulamasına dahil edilir.
- 588 MoveKit videosunun tümü **satın alınmadı ve bu APK'da yoktur**. Diğer dosyalar ancak uygun lisansla sağlandıktan sonra içe aktarılabilir.
- Kaynak: [MoveKit Licensing](https://movekit.com/licensing). MoveKit eserlerinin hakları kendi sahiplerindedir.

## Android APK

GitHub > Actions > **FitKoçum 3D APK** > başarılı çalışma > **Artifacts** > FitKocum-3D-APK. Bu Android **debug** derlemesidir; Google Play yayın paketi değildir.

> Uygulama içindeki egzersiz görüntüleri teknik özetlerdir; birebir anatomi veya güvenli form garantisi değildir.
