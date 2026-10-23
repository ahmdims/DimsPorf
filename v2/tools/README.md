# Portfolio v2: menambah / mengubah project

Semua project ada di `v2/data/projects.json`. Setelah mengedit, jalankan:

    node v2/tools/build.mjs

Script ini membuat ulang `v2/work/<slug>/index.html`, kartu di bagian Work pada `v2/index.html`
(antara marker `build:work-cards`), dan entri v2 di `sitemap.xml`. Commit semua hasilnya.

## Field project

| Field | Keterangan |
|---|---|
| `slug`, `title`, `short` | URL, judul, ringkasan (dipakai juga untuk meta description) |
| `featured` | `true` = tampil di home; semua project tetap ada di halaman `work/` |
| `categories` | `research`, `ux`, `ui`, `web` (untuk filter) |
| `type`, `role`, `year`, `tools` | Baris meta di atas halaman (kosong = tidak tampil) |
| `cover` | Gambar kartu + OG image (16:9, simpan sebagai .webp di `v2/img/works/<slug>/`) |
| `sections.overview` | Paragraf ringkasan |
| `sections.approach` | Daftar `{title, text}`, tampil sebagai langkah bernomor |
| `decks` | Daftar slide/pitch deck: `{ "title": "...", "url": "...", "label": "Pitch deck" }` |
| `prototype` | `{ "title": "...", "url": "<link prototype Figma>" }` |
| `video` | `{ "youtube": "<id video>" }` |
| `gallery` | Daftar `{ src, caption }`, lightbox PhotoSwipe |
| `liveUrl`, `liveLabel` | Tombol ke halaman live (mis. visual essay) |

Section yang kosong otomatis tidak dirender.

## Slide / pitch deck

Tempel link share biasa di `decks[].url`; build mengubahnya jadi embed:

- Google Slides: `https://docs.google.com/presentation/d/<id>/edit` (file harus "Anyone with the link can view")
- Canva: `https://www.canva.com/design/<id>/<token>/view` (link public view)
- Figma deck/prototype: link `figma.com/proto|deck|slides|design/...`
- PDF: path lokal, mis. `img/works/<slug>/deck.pdf` (taruh file di repo)

Satu project boleh punya beberapa deck (mis. research deck dan UI deck).

## Project private (dikunci password)

Untuk project yang berisi research / pitch deck internal. Set `"locked": true` pada project.
Yang tetap publik: judul, ringkasan, meta (type, role, tools), cover, dan video YouTube (link YouTube memang publik). Semua yang lain
(`sections`, `decks`, `prototype`, `gallery`) dienkripsi dan baru terbuka setelah password benar.

1. Taruh file privat di `v2/private-src/<slug>/` (folder ini di-gitignore, tidak ikut ter-deploy).
   Di `gallery` dan `decks` pakai `file` (bukan `src`), mis. `{ "file": "01.webp", "w": 1920, "h": 1080, "caption": "..." }`
   dan `{ "title": "Research deck", "file": "deck.pdf" }`. Link Google Slides / Canva / Figma (`url`) juga boleh.
2. Build dengan password lewat environment variable (jangan ditulis di file mana pun):

       # PowerShell
       $env:PORTFOLIO_PASSWORD = "password-panjang-dan-unik"; node v2/tools/build.mjs
       # password berbeda per project: PORTFOLIO_PASSWORD_<SLUG> (huruf besar, "-" jadi "_"), mis. PORTFOLIO_PASSWORD_PUSPRESNAS

3. Commit hasilnya (`v2/work/<slug>/` berisi ciphertext, bukan konten asli).
   Build tanpa password tidak menimpa halaman terkunci, jadi build biasa tetap aman.

### Batas keamanan (penting)

- Konten terenkripsi AES-256-GCM (kunci dari PBKDF2 600rb iterasi). Tanpa password, isi HTML dan file `.enc` tidak bisa dibaca.
  Gunakan password panjang (4+ kata acak); password pendek bisa ditebak offline.
- Setelah terbuka, konten ada di browser pengunjung. Gambar digambar ke canvas, klik kanan/drag/copy/Ctrl+S/print diblokir,
  dan ada watermark tipis "Confidential". Ini hanya menyulitkan penyimpanan biasa. Screenshot, screen recording, atau
  DevTools tidak bisa dicegah oleh website mana pun.
- Link Google Slides / Canva / Figma di dalam payload tetap ikut aturan share di platform masing-masing; kalau mau lebih ketat,
  pakai file PDF (dienkripsi) atau batasi share link-nya.
- Ganti password = build ulang dengan password baru lalu commit; password lama tidak berlaku lagi untuk halaman baru.
