import type { FaqCategory } from "./types";

export const faq: FaqCategory[] = [
  {
    id: "basics",
    title: "Memulai",
    items: [
      { id: "what", q: "Apa itu UMOVE?", a: "Papan titip-antar kampus untuk mahasiswa UM. Pasang apa yang kamu butuhkan, lalu runner mahasiswa terverifikasi mengambil dan mengantarkannya." },
      { id: "who", q: "Siapa yang bisa memakai UMOVE?", a: "Siapa pun yang punya akun Google bisa masuk dan membuat permintaan. Runner adalah mahasiswa UM yang dicek admin sebelum bisa mengambil permintaan." },
      { id: "signup", q: "Bagaimana cara daftar?", a: "Ketuk Masuk lalu lanjutkan dengan Google. Tidak ada kata sandi yang perlu diingat. Setelah itu tambahkan nomor WhatsApp di Pengaturan supaya runner bisa menghubungimu." },
      { id: "where", q: "Area mana saja yang dilayani?", a: "Kampus UM dan kolej-kolej di sekitarnya. Runner memilih sendiri perjalanan yang diambil, jadi lokasi dekat kampus mungkin juga bisa; tulis saja di permintaanmu." },
      { id: "when", q: "Kapan bisa dipakai?", a: "Kapan saja. Permintaan diambil oleh mahasiswa yang sedang senggang, jadi paling cepat di siang dan malam hari." },
    ],
  },
  {
    id: "ordering",
    title: "Memesan",
    items: [
      { id: "post", q: "Bagaimana cara memasang permintaan?", a: "Ketuk Pasang permintaan, tulis apa yang kamu butuhkan, ambil dari mana, antar ke mana, dan upah antar yang akan kamu bayar. Runner langsung melihatnya di papan." },
      { id: "what-can", q: "Apa saja yang boleh dipesan?", a: "Makanan, minuman, belanja harian, print, alat tulis, dan ambil paket di sekitar kampus. Tulis dengan jelas: tokonya, barangnya, dan pilihan lainnya." },
      { id: "pickup-place", q: "Runner bisa ambil barang dari mana?", a: "Dari tempat di dalam UM: kantin kolej kediaman, toko, dan tempat print. Pilih dari daftar saat membuat permintaan. Kalau tempatmu belum ada, ketik saja, tapi tetap di dalam kampus. Tanda centang menunjukkan tempat dari daftar UMOVE." },
      { id: "not-allowed", q: "Apa yang tidak boleh?", a: "Alkohol, rokok atau vape, narkoba, senjata, joki ujian, apa pun yang ilegal atau melanggar aturan UM, dan barang yang tidak aman dibawa runner. Permintaan seperti itu dihapus dan akun bisa ditangguhkan." },
      { id: "fee", q: "Berapa upah antar yang wajar?", a: "Minimal RM1. Patokan: RM1 sampai RM2 dalam satu kolej atau fakultas, RM3 sampai RM5 antar area kampus, dan lebih untuk barang berat, hujan, atau larut malam. Upah yang wajar lebih cepat diambil." },
      { id: "code", q: "Apa itu kode pesanan (misal UM-7K3F9Q)?", a: "Setiap permintaan mendapat kode acak. Pakai kode itu saat bicara dengan runner atau dengan kami, supaya jelas pesanan yang mana." },
      { id: "edit", q: "Bisakah permintaan diubah setelah dipasang?", a: "Tidak secara langsung. Kalau belum ada runner yang mengambil, batalkan dan pasang ulang. Kalau sudah diambil, sepakati perubahannya dengan runner lewat WhatsApp." },
      { id: "cancel", q: "Bisakah aku membatalkan?", a: "Bisa, selama belum ada runner yang mengambil. Setelah itu, bicarakan dulu dengan runner di WhatsApp. Runner bisa mengembalikan permintaan sebelum berangkat, dan permintaan kembali ke papan." },
      { id: "limits", q: "Ada batas jumlah permintaan?", a: "Kamu bisa punya maksimal 3 permintaan yang sedang berjalan dan memasang sampai 20 per hari. Supaya papan tetap adil untuk semua." },
      { id: "nobody", q: "Bagaimana kalau tidak ada yang mengambil?", a: "Permintaan tetap di papan sampai kamu membatalkannya. Kalau lama menunggu, menaikkan sedikit upah atau memperjelas lokasi ambil biasanya membantu." },
    ],
  },
  {
    id: "payment",
    title: "Pembayaran",
    items: [
      { id: "cost", q: "Berapa biaya UMOVE?", a: "UMOVE sendiri gratis dan tidak memotong apa pun. Kamu membayar harga barang ditambah upah antar yang kamu tentukan, langsung ke runner." },
      { id: "pay", q: "Bagaimana cara bayar?", a: "Saat pesanan sampai, langsung ke runner: tunai, DuitNow QR, atau Touch 'n Go. UMOVE tidak pernah memegang uang siapa pun." },
      { id: "upfront", q: "Siapa yang menalangi harga barang?", a: "Biasanya runner yang membeli dulu, lalu kamu bayar saat barang sampai. Sepakati harganya lewat WhatsApp. Untuk pesanan mahal, runner boleh minta ditransfer dulu: lakukan hanya dengan runner terverifikasi dan setelah chat." },
      { id: "receipt", q: "Apakah ada struk?", a: "Minta runner menyimpan struk toko dan menunjukkannya saat serah terima, terutama untuk belanjaan atau barang yang harganya bisa berubah." },
      { id: "dispute", q: "Bagaimana kalau ada masalah pembayaran?", a: "Bicarakan dulu lewat WhatsApp; kebanyakan salah paham cepat beres. Kalau tidak, kirim permintaan Bantuan dengan kode pesanan dan kami akan membantu." },
    ],
  },
  {
    id: "runners",
    title: "Untuk runner",
    items: [
      { id: "become", q: "Siapa yang bisa jadi runner?", a: "Mahasiswa UM dengan nomor WhatsApp aktif. Formnya singkat: nama, kolej, cara mengantar, dan foto wajah yang jelas. Tanpa dokumen identitas." },
      { id: "apply", q: "Bagaimana cara mendaftar?", a: "Buka Jadi runner atau Pengaturan → Peran → Daftar. Isi nama, kolej atau fakultas, cara mengantar, dan tambahkan foto wajah yang jelas." },
      { id: "review-time", q: "Berapa lama persetujuannya?", a: "Biasanya dalam 24 jam. Statusnya terlihat di Pengaturan dan kamu dapat email. Kalau belum disetujui, kamu akan melihat alasannya dan bisa daftar lagi setelah 24 jam." },
      { id: "vehicle", q: "Apakah harus punya kendaraan?", a: "Tidak. Kamu bisa mengantar dengan jalan kaki, sepeda atau skuter, motor, atau mobil. Pilih saat mendaftar; pilihanmu tampil di profil." },
      { id: "earn", q: "Bagaimana aku dibayar?", a: "Pemesan membayar harga barang ditambah upah antar saat serah terima. Upahnya utuh untukmu; UMOVE tidak mengambil apa pun." },
      { id: "at-once", q: "Berapa permintaan yang bisa diambil sekaligus?", a: "Sampai 3. Tandai setiap pesanan saat berangkat dan saat sudah diantar supaya pemesan bisa memantau." },
      { id: "give-back", q: "Bisakah permintaan dikembalikan?", a: "Bisa, sebelum kamu mengetuk Aku berangkat. Kabari pemesan lewat WhatsApp. Setelah berangkat, selesaikan pengantaran atau bicarakan dengan pemesan." },
      { id: "runner-rules", q: "Apa aturan untuk runner?", a: "Bertemu di tempat umum, pastikan harga sebelum membeli, simpan struk, patuhi aturan lalu lintas, dan bersikap sopan. Sering tidak datang atau banyak keluhan bisa membuat peran runner dicabut." },
    ],
  },
  {
    id: "safety",
    title: "Keamanan dan privasi",
    items: [
      { id: "who-coming", q: "Apakah saya tahu siapa yang mengantar?", a: "Ya. Setelah runner mengambil permintaanmu, kamu bisa melihat foto wajah, nama, cara dia berkeliling, serta jumlah antaran dan ratingnya di halaman permintaan. Pastikan orangnya sama saat dia datang. Foto dicek admin dan hanya ditampilkan ke kamu setelah cocok." },
      { id: "verified", q: "Bagaimana runner diperiksa?", a: "Setiap runner ditinjau admin dalam 24 jam, termasuk foto wajahnya. Runner terverifikasi punya centang biru, dan kamu bisa melihat siapa yang datang setelah permintaanmu diambil." },
      { id: "whatsapp", q: "Siapa yang bisa melihat nomor WhatsApp-ku?", a: "Hanya satu orang yang dipasangkan denganmu, setelah runner mengambil permintaanmu. Nomormu tidak pernah muncul di halaman publik." },
      { id: "meet", q: "Ketemunya di mana?", a: "Di tempat umum seperti lobi kolej, pos satpam, atau pintu fakultas. Runner tidak masuk ke kamar." },
      { id: "report", q: "Bagaimana cara melaporkan seseorang?", a: "Kirim permintaan Bantuan, pilih Melaporkan seseorang, dan sertakan kode pesanan. Setiap laporan kami tinjau dan akun bisa ditangguhkan." },
      { id: "ratings", q: "Bagaimana rating bekerja?", a: "Setelah pengantaran, pemesan dan runner saling memberi rating 1 sampai 5 bintang. Rating tampil di profil publik." },
      { id: "data", q: "Data apa yang disimpan UMOVE?", a: "Nama dan email Google, profil, permintaan, dan ratingmu. Email dan WhatsApp tidak pernah ditampilkan ke publik, dan kami tidak menjual data." },
    ],
  },
  {
    id: "account",
    title: "Akun dan aplikasi",
    items: [
      { id: "install", q: "Bisa dipasang seperti aplikasi?", a: "Bisa, di HP atau laptop apa pun. Android atau komputer: buka di Chrome atau Edge lalu pilih Install app, atau lewat Pengaturan → Aplikasi. iPhone: buka di Safari, ketuk Bagikan, lalu Tambahkan ke Layar Utama." },
      { id: "language", q: "Bisakah bahasanya diganti?", a: "Bisa. Pengaturan → Preferensi: English, Bahasa Indonesia, atau Bahasa Melayu." },
      { id: "profile", q: "Bagaimana mengganti nama atau username?", a: "Pengaturan → Profil. Username dipakai di tautan profilmu." },
      { id: "delete", q: "Bagaimana menghapus akun?", a: "Kirim permintaan Bantuan dengan topik Akun saya dan kami akan menghapusnya." },
      { id: "notify", q: "Apakah ada notifikasi?", a: "Situs diperbarui langsung selama terbuka, dan hal penting (seperti hasil pendaftaran) dikirim lewat email. Notifikasi HP untuk runner akan hadir nanti." },
    ],
  },
  {
    id: "help",
    title: "Bantuan",
    items: [
      { id: "contact", q: "Bagaimana menghubungi tim UMOVE?", a: "Buka Bantuan dan kirim permintaan dengan penjelasan singkat. Admin meninjaunya lalu membuka chat denganmu, biasanya dalam beberapa jam." },
      { id: "why-review", q: "Kenapa permintaan bantuanku sedang ditinjau?", a: "Kami membaca setiap permintaan dulu supaya bisa membalas dengan tepat dan chat dipakai untuk masalah yang nyata. Kamu akan dapat email saat chat dibuka." },
      { id: "maintenance", q: "Kenapa muncul layar pemeliharaan?", a: "Kami sedang memperbarui UMOVE, atau server sebentar tidak bisa dihubungi. Halaman akan memuat ulang sendiri saat kami kembali. Pemeliharaan terjadwal diumumkan lebih dulu." },
    ],
  },
];
