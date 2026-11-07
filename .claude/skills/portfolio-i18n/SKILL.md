---
name: portfolio-i18n
description: Aturan multi bahasa untuk portfolio DimsPorf (v2): saat ini Inggris (default) dan Indonesia. Pakai setiap kali menambah/mengubah teks halaman, project, deck/slide, label UI, menambah bahasa baru, atau saat user menyebut "multi bahasa", "terjemahan", "bahasa Indonesia/Inggris", "deck belum ada bahasa X", "hreflang". Menjelaskan struktur URL, model data {en,id}, fallback deck, kamus UI, terjemahan beranda, dan checklist menambah project dua bahasa.
---

# Portfolio multi bahasa (v2)

Satu sumber data, halaman statis per bahasa. Tidak ada terjemahan di browser, jadi Google membaca setiap bahasa sebagai halaman nyata.

## 1. Struktur URL (jangan diubah tanpa alasan SEO)

| Bahasa | Beranda | Daftar | Project |
|---|---|---|---|
| en (default) | `/v2/` | `/v2/work/` | `/v2/work/<slug>/` |
| id | `/v2/id/` | `/v2/id/work/` | `/v2/id/work/<slug>/` |

- Bahasa default memakai URL lama, jadi tidak ada URL yang pindah atau hilang dari indeks.
- Bahasa lain memakai subfolder `/v2/<kode>/`. Bukan subdomain, bukan parameter `?lang=`.
- Aset (gambar, css, js) tetap satu: semua halaman memakai `<base href="/v2/">`. Link internal di halaman non-default diawali `id/`.
- Tidak ada redirect otomatis berdasarkan bahasa browser (Google tidak mengirim `Accept-Language`, dan redirect seperti itu menyembunyikan satu bahasa dari crawler). Pengunjung memilih lewat tombol EN/ID.

## 2. Di mana teks disimpan

1. **Isi project** di `v2/data/projects.json`. Setiap bidang yang diterjemahkan adalah string biasa atau objek `{ "en": "...", "id": "..." }`: `title`, `short`, `type`, `role`, `sections.overview`, `sections.approach[].title/text`, `cover`, `decks[].title/label`, caption slide, dan label kategori. Bahasa yang kosong otomatis jatuh ke bahasa default.
2. **Label UI halaman yang dibuat build** (menu, footer, "Overview", "Next project", teks kunci privat, dsb.) di `v2/data/i18n.json`, kunci `en` dan `id`. Kunci wajib ada di `en`. Teks yang mengandung markup (`<br>`) hanya dipakai di tempat yang memang memasukkannya sebagai HTML.
3. **Beranda tulis tangan** `v2/index.html` tetap bahasa Inggris. Versi lain dibuat otomatis oleh `build.mjs` lewat `v2/data/home.<kode>.json` (kamus `"teks Inggris": "terjemahan"`). Kuncinya adalah teks apa adanya, spasi dirapatkan, `<br>` dipertahankan (`"Research-led<br>product design"`). Nama diri/merek/teknologi ditulis dengan nilai sama dengan kuncinya. **Build gagal** kalau ada teks beranda yang belum ada di kamus, jadi tidak mungkin terbit setengah terjemah.
   - Menambah teks baru di `v2/index.html` berarti menambah entri di `home.id.json`. Daftar teks yang belum diterjemahkan keluar sebagai pesan error build.
   - Kartu project di beranda dan tombol bahasa dibuat per bahasa oleh build (penanda `build:work-cards`, `build:lang-switch`, `build:hreflang`). Jangan diedit tangan.

## 3. Deck / slide per bahasa

```json
"decks": [{
  "title": { "en": "SDGs are not just a checklist", "id": "SDGs bukan sekadar checklist" },
  "label": { "en": "Case study", "id": "Studi kasus" },
  "slides": {
    "en": [{ "src": "img/works/<slug>/<slug>-en-01-cover.webp", "caption": "Cover: ..." }],
    "id": [{ "src": "img/works/<slug>/<slug>-id-01-cover.webp", "caption": "Cover: ..." }]
  }
}]
```

- **Deck belum ada di satu bahasa**: isi `slides` hanya untuk bahasa yang ada. Halaman bahasa lain otomatis menampilkan deck itu dan memberi catatan "This deck is currently available in Indonesian only." (kunci `case.fallback`). Saat deck bahasa lain siap, tambahkan daftar slide-nya, catatan hilang sendiri. Tidak perlu mengubah kode.
- Jika slide tidak memakai objek bahasa (daftar biasa), dianggap bahasa halaman yang sedang dibuat.
- Caption slide per bahasa: pada deck dua bahasa, caption cukup string di daftar bahasanya. Pada deck satu bahasa yang dipakai bersama, caption boleh `{ "en": "...", "id": "..." }` agar alt text mengikuti bahasa halaman.
- Nama file: `<slug>-<kode>-NN-<topik>.webp` + `-800.webp` (1600 px dan 800 px, rasio 16:9). Alt text dibuat otomatis: `"{title} case study, slide NN: {caption}"` / `"{title} studi kasus, slide NN: {caption}"`.
- `cover` boleh objek bahasa kalau sampul memuat teks (kartu, OG image, dan JSON-LD memakai sampul bahasa halaman itu).
- Project terkunci (`locked`) memakai satu payload terenkripsi untuk semua bahasa dan isinya berbahasa default. Halaman bahasa lain tetap dibuat dari payload yang sama.

## 4. Aturan SEO per bahasa (dijaga `seo-audit.mjs`)

- Setiap halaman v2 punya `<html lang>` yang benar, `og:locale` + `og:locale:alternate`, canonical ke dirinya sendiri, dan `hreflang` untuk **semua** bahasa (termasuk dirinya) + `x-default` ke bahasa default. Alamat di tiap `hreflang` harus halaman yang benar-benar ada.
- Setiap entri `sitemap.xml` untuk halaman v2 memuat `xhtml:link` alternatif untuk semua bahasa (namespace `xmlns:xhtml` ada di `<urlset>`). Gambar tiap bahasa masuk ke entri bahasa itu.
- Title dan description wajib unik per halaman, termasuk antar bahasa: terjemahkan, jangan salin.
- Tombol bahasa (`.lang`) selalu memuat semua bahasa dan menunjuk ke halaman padanannya (bukan ke beranda).
- JSON-LD memakai `inLanguage` sesuai bahasa halaman. Root `/` tetap satu halaman beranda situs (bahasa default).

## 5. Checklist

**Menambah project dua bahasa**
1. Siapkan slide per bahasa, ubah ke webp (1600 dan 800 px), beri nama sesuai pola di atas.
2. Tambahkan project di `projects.json` dengan bidang `{en,id}`. `short` 80 sampai 155 karakter per bahasa (dipakai sebagai meta description).
3. `node v2/tools/build.mjs`. Audit harus lulus tanpa peringatan. Periksa `/v2/id/work/<slug>/` di browser.

**Menambah deck bahasa kedua ke project yang sudah ada**: ubah `slides` jadi objek bahasa, tambahkan daftar slide baru, build.

**Menambah bahasa baru (mis. `ar`)**
1. `site.languages` di `projects.json`: `{ "code": "ar", "label": "...", "short": "AR", "locale": "ar_AR" }`.
2. Tambahkan blok `ar` di `i18n.json`, buat `home.ar.json` (build akan mendaftar semua teks yang kurang), isi `{ar}` di bidang project (yang kosong jatuh ke default).
3. Untuk bahasa RTL, tambahkan `dir="rtl"` per bahasa di `<html>` dan periksa CSS sebelum rilis.
4. Tambahkan redirect `/v2/<kode>` dan `/v2/<kode>/index.html` ke `/v2/<kode>/` di `vercel.json`.

## 6. Yang tidak dilakukan (disengaja)

- Tidak ada terjemahan mesin otomatis. Setiap teks ditulis atau ditinjau manual.
- Tidak ada pengalihan bahasa otomatis dan tidak ada cookie bahasa.
- Teks di dalam gambar slide diterjemahkan dengan membuat deck bahasa baru, bukan lewat kode.
