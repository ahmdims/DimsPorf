---
name: portfolio-seo
description: Aturan SEO yang wajib dipakai setiap kali membuat atau mengubah halaman, project, gambar, meta tag, structured data, sitemap, robots, redirect, atau domain di portfolio DimsPorf (v2). Pakai juga saat diminta audit SEO, "optimalkan SEO", "gambar/project tidak muncul di Google", menambah project baru, mengganti nama atau memindah file gambar, atau sebelum publish. Mencakup SEO halaman (title, description, canonical, Open Graph, JSON-LD), SEO gambar (agar muncul di Google Images), konsolidasi dua domain, performa Core Web Vitals, dan guardrail otomatis yang menggagalkan build kalau aturan dilanggar.
---

# Portfolio SEO (DimsPorf)

Tujuan: setiap halaman, project, dan gambar di portfolio bisa ditemukan di Google (Search, Images, Discover) dengan tampilan terbaik, dan **selalu konsisten** karena dijaga oleh script, bukan ingatan.

## 0. Fakta yang tidak boleh dilanggar

| Hal | Nilai |
|---|---|
| Domain utama (canonical) | `https://dimsporf.vercel.app` |
| Domain alias | `ahmdims.vercel.app`, selalu 301 ke domain utama (`vercel.json`) |
| Situs utama | `/v2/` (root `/` di-301 ke `/v2/`). Brand pribadi: "Ahmad Dimas" |
| Sub-brand mandiri | `/jejak/`, `/pemberdayaan/`, `/tanam-harapan/` (diindeks, berdiri sendiri) |
| Arsip | `/v1/bem-dcc.html`, `/v1/dreamjourney.html`, `/v1/puspresnas.html` diindeks. `/v1/` dan `/v1/terrago.html` `noindex`. v3 selalu `noindex` |
| Daftar halaman mandiri | `site.standalone` di `v2/data/projects.json` (sumber sitemap dan audit) |
| Sumber data project | `v2/data/projects.json` (+ `site.url`, `site.aliases`) |
| Pembuat halaman | `node v2/tools/build.mjs` (otomatis menjalankan audit) |
| Penjaga aturan | `node v2/tools/seo-audit.mjs` (exit code 1 = ada error) |

Satu URL = satu halaman. Tidak ada URL yang menyebut `ahmdims.vercel.app` di canonical, og:url, sitemap, JSON-LD, atau link internal.

## 1. Alur kerja (selalu urut)

1. Ubah data atau markup (`projects.json`, `v2/index.html`, `v2/tools/build.mjs`, `v2/css/custom.css`).
2. Jalankan `node v2/tools/build.mjs`. Ini membuat ulang halaman, `sitemap.xml` (termasuk image sitemap), lalu menjalankan audit.
3. Perbaiki semua **ERROR** sampai `SEO audit passed`. Warning dibaca dan diperbaiki kalau masuk akal.
4. Jangan pernah menonaktifkan atau melonggarkan audit untuk meloloskan perubahan. Perbaiki penyebabnya.
5. Setelah deploy: lihat bagian 8.
6. Commit, push, merge, dan rilis ke Vercel mengikuti skill `git-flow-portfolio` (develop/[perbaikan] -> develop/[project] -> release).

Halaman v2 yang dibuat tangan hanya `v2/index.html`. Semua halaman lain dihasilkan oleh `build.mjs`, jadi **perbaiki di template `build.mjs`, bukan di file HTML hasilnya**.

## 2. Aturan per halaman

**Title** (15 sampai 60 karakter, unik per halaman)
- Home: `Ahmad Dimas | UX Researcher & UI Designer - DimsPorf`
- Daftar: `All Work — UX, UI & Research Case Studies | DimsPorf`
- Project: `{Judul Project} — Case Study | DimsPorf`
- Kata kunci utama di depan, nama brand di belakang. Tanpa pengulangan kata, tanpa huruf kapital semua.

**Meta description** (70 sampai 160 karakter, unik, kalimat utuh)
- Jawab: apa halaman ini, untuk siapa, apa hasilnya. Project: pakai `short` di `projects.json` (satu kalimat jelas, ada nama produk dan hasil).
- Tanpa tanda kutip ganda, tanpa daftar kata kunci.

**Wajib di `<head>` setiap halaman**
- `<html lang="en">`, `<meta name="viewport" content="width=device-width, initial-scale=1">` (tanpa `maximum-scale`).
- `<link rel="canonical">` absolut ke URL halaman itu sendiri di domain utama, berakhiran `/`.
- `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`. `max-image-preview:large` wajib agar gambar besar muncul di Search dan Discover.
- Open Graph: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url` (= canonical), `og:image` (absolut, file harus ada), `og:locale`. Twitter: `twitter:card=summary_large_image`, title, description, image.
- Gambar sosial: 1200x630 (rasio 1.91:1). Home dan daftar memakai `ahmad-dimas-ux-researcher-ui-designer-og.jpg`. Project memakai cover project.
- Satu `<h1>` per halaman, berisi topik halaman. Urutan heading tidak melompat.
- Font lewat `<link rel="preconnect">` + `rel="preload" as="style"` (tidak boleh `@import` di CSS).

**JSON-LD** (JSON valid, semua URL di domain utama)
- Home: `WebSite` (name `DimsPorf`, `alternateName`, `inLanguage`) + `ProfilePage` dengan `Person` (name, url, jobTitle, image, description, sameAs ke LinkedIn/Dribbble/Behance/Medium).
- Daftar: `BreadcrumbList`.
- Project: `BreadcrumbList` (Home > Work > Project, semua URL halaman nyata, bukan `#hash`) + `CreativeWork` berisi `image[]` berupa `ImageObject` (contentUrl, name, caption, creator). Jangan pasang `ProfilePage` di halaman project.
- Tidak boleh memalsukan data (rating, tanggal, penghargaan, angka hasil) yang tidak ada di sumber.

## 3. SEO gambar (agar gambar dan project muncul di Google Images)

Google menemukan gambar dari: `<img>` di HTML (bukan CSS background), image sitemap, structured data, dan teks di sekitarnya. Semuanya wajib dipenuhi.

1. **Nama file = slug deskriptif**, huruf kecil, kata dipisah `-`, minimal 3 kata, memuat topik: `redesign-litabmas-07-keputusan-01-alur-dana.webp`. Dilarang: `1.webp`, `banner.webp`, `IMG_0042`, `image-final-2`. Ganti nama file sebelum dipublish, bukan sesudahnya (URL gambar yang berubah membuang peringkat).
2. **Alt text** menjelaskan isi gambar dalam satu kalimat, memuat nama project. Rumus slide: `{Judul Project} case study, slide {nn}: {caption}`. Cover: `{Judul Project} cover`. Dilarang: kosong untuk gambar konten, nama file, "image of", daftar kata kunci. `alt=""` hanya untuk gambar dekoratif (marquee, ikon, latar).
3. **Gambar konten harus berupa `<img>`** di dalam `<figure>`, dengan `<figcaption>` yang terlihat bila relevan. Jangan memakai CSS `background-image` untuk gambar yang ingin diindeks.
4. **Format dan ukuran**: WebP. Lebar penuh 1600 px (atau lebih bila perlu detail) dan versi `-800.webp` untuk `srcset`. Cover dan gambar OG minimal 1200 px lebar. Kompres sampai kualitas 80, target < 150 KB per gambar.
5. **`width` dan `height` wajib** di setiap `<img>` konten (mencegah layout shift).
6. **Lazy loading**: gambar di atas lipatan (hero, cover, dua slide pertama) tanpa `loading="lazy"`, dengan `fetchpriority="high"` untuk elemen LCP. Sisanya `loading="lazy" decoding="async"`.
7. **Image sitemap**: setiap halaman di `sitemap.xml` memuat `<image:image><image:loc>` untuk semua gambar kontennya. Dibuat otomatis oleh `build.mjs`. Hanya `image:loc` yang dipakai (tag caption/title sudah ditinggalkan Google).
8. **Jangan blokir gambar** di `robots.txt`. Gambar harus bisa dibuka tanpa login dan tanpa JavaScript.
9. **Teks di sekitar gambar** (heading section, caption, paragraf Overview) harus menyebut topiknya dengan kata alami. Itu yang dibaca Google untuk memahami gambar.
10. **Gambar terkunci password** (project private) tidak akan pernah terindeks, itu memang disengaja. Cover dan ringkasan publiknya tetap harus lengkap.
11. Gambar yang berisi banyak teks (slide) tetap diberi caption yang menjelaskan isinya, karena Google tidak membaca teks di dalam gambar dengan andal.

## 4. Menambah project baru (checklist)

Isi di `v2/data/projects.json`:
- `slug` huruf kecil dengan `-`, mengandung nama project. URL jadi `/v2/work/{slug}/`.
- `title` jelas dan spesifik (bukan "Project 1").
- `short`: satu kalimat 80 sampai 155 karakter berisi apa, untuk siapa, hasil.
- `categories`, `type`, `role`; `tools` hanya bila benar-benar disebut di sumber.
- `cover`: file slug deskriptif 1600 px, rasio 16:9.
- `sections.overview` dan `approach` dari isi nyata project (jangan dikarang).
- Slide/galeri: setiap item punya `caption` yang bermakna. Siapkan `{nama}.webp` dan `{nama}-800.webp`.
- `featured: true` hanya untuk yang ingin tampil di home.
Lalu jalankan `node v2/tools/build.mjs` dan pastikan audit lulus. Project baru otomatis masuk sitemap, image sitemap, kartu home, dan halaman daftar.

## 5. Dua domain dan redirect

- Semua canonical, sitemap, JSON-LD, dan og:url memakai domain utama. Alias hanya boleh muncul di `site.aliases` dan `vercel.json`.
- `vercel.json` memuat 301 dari alias ke domain utama (`has: host`), root `/` ke `/v2/`, dan `/index.html`, `/v2`, `/v2/index.html` ke `/v2/`. Redirect dengan host hanya jalan kalau **kedua domain terpasang di satu project Vercel**. Kalau alias adalah project terpisah, salin `vercel.json` yang sama ke project itu.
- Search Console: daftarkan kedua domain sebagai properti. Kirim sitemap hanya untuk domain utama. Jangan memakai "Change of address" (tidak tersedia untuk subdomain vercel.app).
- Mengganti domain utama: ubah `site.url` dan `site.aliases` di `projects.json`, jalankan build, lalu perbarui canonical statis di `v2/index.html`, `robots.txt`, dan `vercel.json`. Audit akan menunjukkan semua yang tertinggal.

## 6. Sitemap, robots, redirect

- `sitemap.xml` hanya berisi URL kanonik (200, indexable) di domain utama: home, daftar, tiap project, dan halaman mandiri yang memang ingin diindeks. Tidak ada URL yang di-redirect atau `noindex`.
- `robots.txt`: `User-agent: *`, `Allow: /`, dan baris `Sitemap:` ke domain utama.
- Jangan memakai redirect JavaScript atau meta refresh sebagai satu-satunya cara memindahkan halaman. Pakai 301 di `vercel.json`.
- Halaman `noindex` (v1 home, TerraGo, v3) tidak boleh ada di sitemap. v3 tetap `noindex` sampai resmi menggantikan v2.

## 7. Performa (Core Web Vitals ikut menentukan peringkat)

- Tidak ada resource 404, tidak ada layout shift (CLS 0), semua gambar punya dimensi.
- Loader awal singkat (di bawah 2 detik), konten penting tidak disembunyikan lebih lama dari itu.
- CSS font tidak boleh memblokir render (preload + `display=swap`). Tidak ada `@import` font.
- Gambar responsif dengan `srcset` dan `sizes`. Hindari menambah library JS besar. Script ditaruh di akhir `body`.
- Teks terkecil 12 px. Target sentuh minimal 44 px di layar kecil.
- Ikon tombol tanpa teks wajib punya `aria-label`.

## 8. Setelah deploy (tidak bisa dibuktikan dari kode)

1. PageSpeed Insights (mobile) untuk `/v2/`, `/v2/work/`, dan satu halaman project. Target: SEO 100, Accessibility dan Best Practices 95+.
2. Rich Results Test untuk halaman home dan project (cek `ProfilePage`, `BreadcrumbList`, `CreativeWork`).
3. Search Console: URL Inspection > Request indexing untuk home dan project baru; kirim ulang `sitemap.xml`.
4. Cek `curl -I https://ahmdims.vercel.app/` memberi 301 ke domain utama, dan `curl -I https://dimsporf.vercel.app/` memberi 301 ke `/v2/`.
5. Cari `site:dimsporf.vercel.app` di Google dan tab Images untuk melihat apa yang sudah terindeks. Gambar baru butuh beberapa hari sampai minggu; tidak bisa dipercepat dengan kode.

## 9. Larangan

- Keyword stuffing, teks tersembunyi, atau alt berisi daftar kata kunci.
- Title atau description yang sama di dua halaman.
- Mengubah URL atau nama file gambar yang sudah terindeks tanpa 301.
- `noindex` pada halaman yang seharusnya tampil. Menaruh halaman `noindex` di sitemap.
- Menyebut penghargaan, angka, atau klaim yang tidak ada di sumber data.
- Menyimpan password, token, atau data internal di HTML publik.

## 10. Sub-brand dan halaman mandiri (`/jejak/`, `/pemberdayaan/`, `/tanam-harapan/`, arsip `/v1/`)

Tujuan: tiap project muncul di Google sebagai dirinya sendiri, tanpa menyaingi atau dipengaruhi v2.

1. **Berdiri sendiri.** v2 tidak boleh menautkan ke sub-brand atau arsip (tidak ada "More projects"). Sub-brand tidak menautkan balik ke v2 dan JSON-LD-nya tidak boleh menunjuk ke `/v1/` atau `/v2/` (tidak ada `isPartOf`). Audit menggagalkan build kalau dilanggar.
2. **Topik dipisah.** v2 memegang kata kunci pribadi (Ahmad Dimas, UX researcher, UI designer). Setiap sub-brand memegang topiknya sendiri (mis. "MBG vs pemberdayaan ekonomi"). Jangan memakai kata kunci pribadi di title sub-brand.
3. **Setiap halaman mandiri wajib memiliki**: title dan description unik (aturan bagian 2), canonical ke dirinya sendiri, `robots` `index, follow, max-image-preview:large`, Open Graph lengkap dengan `og:image` 1200x630 milik halaman itu sendiri (nama file slug deskriptif) beserta `og:image:alt`, `twitter:card=summary_large_image`, `og:locale` sesuai bahasa halaman, dan JSON-LD `CreativeWork` dengan `ImageObject`. Halaman arsip v1 memakai `BreadcrumbList` (breadcrumb root: "DimsPorf Archive").
4. **Gambar** mengikuti bagian 3: webp bernama deskriptif, alt jelas, `width`/`height`, gambar pertama tanpa lazy. Gambar PNG besar tidak dipakai di halaman yang diindeks.
5. **`noindex, follow`** untuk halaman yang tetap online tapi tidak boleh bersaing: `/v1/` (beranda lama, merek sama dengan v2), `/v1/terrago.html` (gambarnya salah), dan v3. `noindex` diperiksa audit, dan halaman itu tidak boleh ada di sitemap.
6. **Menambah halaman mandiri baru**: buat halamannya, tambahkan ke `site.standalone` (`file`, `url`, `index`), buat gambar OG, jalankan `node v2/tools/build.mjs`. Sitemap dan image sitemap terisi otomatis dari isi halaman, dan audit memeriksanya.
7. **Batas yang perlu dijelaskan ke pemilik**: Google tidak mendukung nama situs (site name) per subfolder, jadi nama sub-brand tampil lewat title hasil pencarian, bukan sebagai site name. Semua halaman memakai host yang sama sehingga otoritas domain dibagi. "Muncul di atas" tidak bisa dijamin, hanya kelayakannya yang bisa dijaga.

Skill pelengkap: `seo-head-architect` (metodologi diagnosa meta tag dan structured data secara umum).
