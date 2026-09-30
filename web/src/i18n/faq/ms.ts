import type { FaqCategory } from "./types";

export const faq: FaqCategory[] = [
  {
    id: "basics",
    title: "Bermula",
    items: [
      { id: "what", q: "Apa itu UMOVE?", a: "Papan tugasan kampus untuk pelajar UM. Pasang apa yang anda perlukan, dan runner pelajar yang disahkan akan mengambil dan menghantarnya kepada anda." },
      { id: "who", q: "Siapa boleh guna UMOVE?", a: "Sesiapa dengan akaun Google boleh log masuk dan memasang permintaan. Runner dan driver mesti pelajar UM dan disemak oleh admin sebelum boleh mengambil permintaan." },
      { id: "signup", q: "Bagaimana cara mendaftar?", a: "Ketik Log masuk dan teruskan dengan Google. Tiada kata laluan untuk diingat. Kemudian tambah nombor WhatsApp dalam Tetapan supaya runner boleh menghubungi anda." },
      { id: "where", q: "Kawasan mana yang diliputi?", a: "Kampus UM dan kolej kediaman di sekitarnya. Runner memilih perjalanan sendiri, jadi lokasi berdekatan mungkin juga boleh; nyatakan sahaja dalam permintaan anda." },
      { id: "when", q: "Bila boleh digunakan?", a: "Bila-bila masa. Permintaan diambil oleh pelajar yang lapang pada masa itu, jadi paling cepat pada waktu siang dan malam." },
    ],
  },
  {
    id: "ordering",
    title: "Membuat pesanan",
    items: [
      { id: "post", q: "Bagaimana cara memasang permintaan?", a: "Ketik Pasang permintaan, tulis apa yang anda perlukan, ambil dari mana, hantar ke mana, dan upah hantar yang anda bayar. Runner terus nampak di papan." },
      { id: "what-can", q: "Apa yang boleh dipesan?", a: "Makanan, minuman, barang runcit, cetakan, alat tulis dan ambil bungkusan sekitar kampus. Tulis dengan jelas: kedai, barang dan pilihan lain." },
      { id: "not-allowed", q: "Apa yang tidak dibenarkan?", a: "Alkohol, rokok atau vape, dadah, senjata, bantuan peperiksaan, apa-apa yang menyalahi undang-undang atau peraturan UM, dan barang yang tidak selamat dibawa. Permintaan sebegini dibuang dan akaun boleh digantung." },
      { id: "fee", q: "Berapa upah hantar yang berpatutan?", a: "Sekurang-kurangnya RM1. Panduan: RM1 hingga RM2 dalam kolej atau fakulti yang sama, RM3 hingga RM5 merentas kampus, dan lebih untuk barang berat, hujan atau lewat malam. Upah yang berpatutan lebih cepat diambil." },
      { id: "code", q: "Apa itu kod pesanan (cth. UM-7K3F9Q)?", a: "Setiap permintaan mendapat kod rawak. Gunakannya semasa bercakap dengan runner atau dengan kami, supaya jelas pesanan yang mana." },
      { id: "edit", q: "Bolehkah permintaan diubah selepas dipasang?", a: "Tidak secara langsung. Jika belum diambil runner, batalkan dan pasang semula. Jika sudah diambil, persetujui perubahan dengan runner melalui WhatsApp." },
      { id: "cancel", q: "Bolehkah saya batalkan?", a: "Boleh, selagi tiada runner mengambilnya. Selepas itu, bincang dahulu dengan runner di WhatsApp. Runner boleh memulangkan permintaan sebelum bertolak, dan ia kembali ke papan." },
      { id: "limits", q: "Ada had bilangan permintaan?", a: "Anda boleh ada sehingga 3 permintaan yang sedang berjalan dan memasang sehingga 20 sehari. Ini supaya papan adil untuk semua." },
      { id: "nobody", q: "Bagaimana jika tiada siapa mengambilnya?", a: "Permintaan kekal di papan sehingga anda membatalkannya. Jika lama menunggu, menaikkan sedikit upah atau menjelaskan lokasi ambil biasanya membantu." },
    ],
  },
  {
    id: "payment",
    title: "Pembayaran",
    items: [
      { id: "cost", q: "Berapa kos UMOVE?", a: "UMOVE sendiri percuma dan tidak mengambil potongan. Anda bayar harga barang dan upah hantar yang anda tetapkan, terus kepada runner." },
      { id: "pay", q: "Bagaimana cara bayar?", a: "Semasa pesanan sampai, terus kepada runner: tunai, DuitNow QR atau Touch 'n Go. UMOVE tidak pernah memegang wang sesiapa." },
      { id: "upfront", q: "Siapa yang dahulukan wang barang?", a: "Biasanya runner beli dahulu dan anda bayar semula semasa sampai. Persetujui harga di WhatsApp dahulu. Untuk pesanan mahal, runner boleh minta anda pindahkan kos barang terlebih dahulu: lakukan hanya dengan runner yang disahkan, selepas bersembang." },
      { id: "receipt", q: "Adakah saya dapat resit?", a: "Minta runner menyimpan resit kedai dan menunjukkannya semasa serahan, terutamanya untuk barang runcit atau barang yang harganya berubah." },
      { id: "dispute", q: "Bagaimana jika ada masalah pembayaran?", a: "Bincang dahulu melalui WhatsApp; kebanyakan salah faham cepat selesai. Jika tidak, hantar permintaan Bantuan dengan kod pesanan dan kami akan membantu." },
    ],
  },
  {
    id: "runners",
    title: "Untuk runner",
    items: [
      { id: "become", q: "Siapa boleh jadi runner?", a: "Pelajar UM dengan nombor WhatsApp aktif. Anda memohon dengan kad matrik, dan admin menyemaknya." },
      { id: "apply", q: "Bagaimana cara memohon?", a: "Pergi ke Jadi runner atau Tetapan → Peranan → Mohon. Isi nama seperti dalam kad matrik, nombor matrik, fakulti atau kolej, cara menghantar, dan gambar kad matrik." },
      { id: "review-time", q: "Berapa lama kelulusan?", a: "Biasanya dalam 24 jam. Status dipaparkan dalam Tetapan dan anda terima e-mel. Jika tidak diluluskan, anda akan nampak sebabnya dan boleh memohon semula selepas 24 jam." },
      { id: "vehicle", q: "Perlukah saya ada kenderaan?", a: "Tidak. Anda boleh menghantar dengan berjalan kaki, basikal atau skuter, motosikal atau kereta. Pilih semasa memohon; ia dipaparkan di profil anda." },
      { id: "earn", q: "Bagaimana saya dibayar?", a: "Pelanggan membayar harga barang dan upah hantar semasa serahan. Anda simpan keseluruhan upah; UMOVE tidak mengambil apa-apa." },
      { id: "at-once", q: "Berapa permintaan boleh diambil serentak?", a: "Sehingga 3. Tandakan setiap pesanan semasa bertolak dan selepas dihantar supaya pelanggan boleh ikuti." },
      { id: "give-back", q: "Bolehkah permintaan dipulangkan?", a: "Boleh, sebelum anda ketik Saya bertolak. Maklumkan pelanggan melalui WhatsApp. Selepas bertolak, selesaikan penghantaran atau bincang dengan pelanggan." },
      { id: "runner-rules", q: "Apakah peraturan untuk runner?", a: "Berjumpa di tempat awam, sahkan harga sebelum membeli, simpan resit, patuhi peraturan jalan raya dan bersopan. Kerap tidak hadir atau banyak aduan boleh menyebabkan peranan runner ditarik balik." },
    ],
  },
  {
    id: "drivers",
    title: "Driver dan tumpangan",
    items: [
      { id: "ride", q: "Bila Ride akan tiba?", a: "Tidak lama lagi. Tumpangan dengan driver pelajar yang disahkan ialah ciri seterusnya. Driver yang diluluskan mendapat akses dahulu." },
      { id: "driver-req", q: "Apa syarat untuk jadi driver?", a: "Lesen memandu Malaysia yang sah sekurang-kurangnya 30 hari lagi (kelas sepadan dengan kenderaan), cukai jalan dan insurans yang sah, serta gambar kad matrik, lesen, kenderaan dengan plat kelihatan, dan swafoto memegang kad matrik." },
      { id: "driver-strict", q: "Kenapa semakan driver lebih ketat?", a: "Membawa penumpang ialah tanggungjawab yang lebih besar daripada membawa makanan. Setiap driver disemak satu per satu sebelum boleh menawarkan tumpangan." },
      { id: "documents", q: "Apa yang berlaku kepada gambar dokumen saya?", a: "Hanya admin UMOVE boleh melihatnya. Gambar dipadam secara automatik 30 hari selepas permohonan anda disemak." },
    ],
  },
  {
    id: "safety",
    title: "Keselamatan dan privasi",
    items: [
      { id: "verified", q: "Bagaimana runner dan driver disemak?", a: "Semua memohon dengan kad matrik (driver juga dengan lesen, kenderaan, cukai jalan dan insurans), dan admin menyemak setiap permohonan dalam 24 jam. Yang disahkan ada tanda biru." },
      { id: "whatsapp", q: "Siapa boleh lihat nombor WhatsApp saya?", a: "Hanya seorang yang dipadankan dengan anda, selepas runner mengambil permintaan anda. Nombor anda tidak pernah muncul di halaman awam." },
      { id: "meet", q: "Di mana kita berjumpa?", a: "Di tempat awam seperti lobi kolej, pondok pengawal atau pintu masuk fakulti. Runner tidak masuk ke bilik." },
      { id: "report", q: "Bagaimana melaporkan seseorang?", a: "Hantar permintaan Bantuan, pilih Melaporkan seseorang, dan sertakan kod pesanan. Setiap laporan disemak dan akaun boleh digantung." },
      { id: "ratings", q: "Bagaimana rating berfungsi?", a: "Selepas penghantaran, pelanggan dan runner memberi rating antara satu sama lain dari 1 hingga 5 bintang. Rating dipaparkan di profil awam." },
      { id: "data", q: "Data apa yang UMOVE simpan?", a: "Nama dan e-mel Google, profil, permintaan dan rating anda. E-mel dan WhatsApp tidak pernah dipaparkan secara awam, dan kami tidak menjual data." },
    ],
  },
  {
    id: "account",
    title: "Akaun dan aplikasi",
    items: [
      { id: "install", q: "Boleh pasang UMOVE seperti aplikasi?", a: "Boleh, di mana-mana telefon atau komputer riba. Android atau komputer: buka di Chrome atau Edge dan pilih Install app, atau melalui Tetapan → Aplikasi. iPhone: buka di Safari, ketik Kongsi, kemudian Tambah ke Skrin Utama." },
      { id: "language", q: "Bolehkah bahasa ditukar?", a: "Boleh. Tetapan → Keutamaan: English, Bahasa Indonesia atau Bahasa Melayu." },
      { id: "profile", q: "Bagaimana menukar nama atau nama pengguna?", a: "Tetapan → Profil. Nama pengguna digunakan dalam pautan profil anda." },
      { id: "delete", q: "Bagaimana memadam akaun?", a: "Hantar permintaan Bantuan di bawah Akaun saya dan kami akan memadamnya untuk anda." },
      { id: "notify", q: "Adakah saya akan terima notifikasi?", a: "Laman dikemas kini secara langsung semasa dibuka, dan perkara penting (seperti keputusan permohonan) dihantar melalui e-mel. Notifikasi telefon untuk runner akan datang kemudian." },
    ],
  },
  {
    id: "help",
    title: "Mendapatkan bantuan",
    items: [
      { id: "contact", q: "Bagaimana menghubungi pasukan UMOVE?", a: "Buka Bantuan dan hantar permintaan dengan penerangan ringkas. Admin menyemaknya dan membuka sembang dengan anda, biasanya dalam beberapa jam." },
      { id: "why-review", q: "Kenapa permintaan bantuan saya sedang disemak?", a: "Kami baca setiap permintaan dahulu supaya boleh membalas dengan betul dan sembang digunakan untuk isu sebenar. Anda akan terima e-mel apabila sembang dibuka." },
      { id: "maintenance", q: "Kenapa saya nampak skrin penyelenggaraan?", a: "Kami sedang mengemas kini UMOVE, atau pelayan tidak dapat dihubungi seketika. Halaman akan dimuat semula sendiri apabila kami kembali. Penyelenggaraan berjadual diumumkan terlebih dahulu." },
    ],
  },
];
