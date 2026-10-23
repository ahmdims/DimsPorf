# Portfolio v2: menambah / mengubah project

Semua project ada di `v2/data/projects.json`. Setelah mengedit, jalankan:

    node v2/tools/build.mjs

Script ini membuat ulang `v2/work/<slug>/index.html`, kartu di bagian Work pada `v2/index.html`
(antara marker `build:work-cards`), dan entri v2 di `sitemap.xml`. Commit semua hasilnya.

## Field project

| Field | Keterangan |
|---|---|
| `slug`, `title`, `short` | URL, judul, ringkasan (dipakai juga untuk meta description) |
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
