# Portfolio v3

Desain: turunan design system v2 (Outfit, palet abu-biru dan hitam, bentuk besar yang rounded, tombol pill dan lingkaran,
tag "[ Label ]", gambar dekoratif, marquee), tapi layout dirombak: hero besar dengan parallax, kartu project
daftar project berbaris bernomor (thumbnail, tag, judul, deskripsi), kartu Approach bergambar, tabs pill dengan thumb geser. Flat tanpa shadow.
Aksen kecil per kategori (Research, UX, UI, Web), terang dan gelap.

## Struktur
- `css/tokens.css`: semua token (font, skala tipografi, spacing, warna, radius). Ubah di sini.
- `css/base.css`: reset, tipografi, layout dasar.
- `css/components.css`: header, button, tag, card, tabs, rows, case study, gate, footer.
- `js/main.js`: tema, menu mobile, reveal, tabs, lightbox. `js/unlock.js`: gerbang password.
- `data/projects.json` (project), `data/profile.json` (bio, pengalaman, penghargaan, sosial).

## Build
    node v3/tools/build.mjs

Menghasilkan `v3/index.html`, `v3/work/`, `v3/about/`, `v3/resume/`, dan `v3/work/<slug>/index.html`.
Field project sama seperti v2 (`featured`, `categories`, `decks`, `prototype`, `video`, `gallery`, `locked`, `liveUrl`).

## Project private
Sama dengan v2: `"locked": true`, file privat di `v3/private-src/<slug>/` (di-gitignore), lalu build dengan
`PORTFOLIO_PASSWORD` (atau `PORTFOLIO_PASSWORD_<SLUG>`). Gunakan password panjang. Batasannya: konten yang sudah terbuka
tidak bisa dicegah dari screenshot. Detail lengkap ada di `v2/tools/README.md`.

## Catatan rilis
Semua halaman v3 sementara memakai `noindex` dan tidak masuk sitemap. Hapus `<meta name="robots">` di
`head()` pada `build.mjs` saat v3 siap menggantikan v2, lalu atur canonical dan sitemap.
