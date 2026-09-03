---
name: seo-head-architect
description: Use this skill when auditing, fixing, or designing a website's <head> meta tags and structured data (title, description, canonical, Open Graph, Twitter Card, JSON-LD WebSite/ProfilePage/BreadcrumbList/Organization) for SEO purposes. Trigger especially when — the site is on a free/subdomain host (vercel.app, github.io, netlify.app, pages.dev) and Google shows the HOST's brand instead of the site's own name; multiple pages share one generic <title>/description; the user wants each page/project to show "SiteName · Page" or "SiteName › Page" in Google search results; or when standardizing SEO tags across a multi-page portfolio/project site so the pattern is reusable elsewhere.
---

# SEO Head Architect

Metodologi untuk merancang & mengaudit `<head>` HTML + structured data agar Google menampilkan identitas situs (bukan platform hosting-nya) dan setiap halaman punya representasi yang jelas di hasil pencarian. Disusun dari kasus nyata: situs statis di `*.vercel.app` yang di Google tampil sebagai "Vercel" alih-alih nama brand-nya sendiri, lalu diperluas ke pola profil ala LinkedIn ("LinkedIn · Nama") dan breadcrumb per-halaman proyek.

## Step 0 — Diagnosa dulu, jangan langsung nulis tag

1. Ambil HTML **mentah** dari production, bukan lewat tool yang mengonversi ke markdown (markdown fetcher membuang tag `<meta>` dan `<script type="application/ld+json">` karena tidak render sebagai teks terlihat). Gunakan:
   ```
   curl -s -A "Mozilla/5.0" https://domain-nya/ | head -c 3000
   ```
2. Bandingkan dengan apa yang benar-benar tampil di Google (minta user tempel screenshot atau HTML hasil pencarian).
3. Tentukan **peran** tiap halaman sebelum memilih structured data — ini keputusan paling penting di seluruh skill ini:

   | Peran halaman | Structured data yang tepat | Contoh salah |
   |---|---|---|
   | Homepage / representasi seluruh situs | `WebSite` | — |
   | Halaman "about me" / profil yang **benar-benar** tentang satu orang/organisasi yang berafiliasi dengan situs | `ProfilePage` + `mainEntity` (`Person`/`Organization`) | Dipasang di halaman produk, proyek, atau toko → **melanggar guideline Google**, tidak akan menghasilkan rich result apa pun |
   | Halaman konten interior (proyek, artikel, produk, dokumentasi) | `BreadcrumbList` | Memakai `ProfilePage` di sini (salah tipe entitas) |
   | Identitas entitas brand di seluruh web (opsional, untuk Knowledge Panel) | `Organization` dengan `sameAs` ke akun sosial resmi | — |

   Jangan tergoda menyamakan semua halaman jadi satu tipe skema hanya karena hasil visualnya mirip (titik tengah `·` vs chevron `›` itu berbeda mekanisme, bukan gaya bebas pilih).

## Step 1 — 6 sinyal wajib per halaman

Setiap halaman idealnya punya:

1. `<title>` **unik**, bukan disalin sama dari homepage (`<title>DimsPorf</title>` di semua halaman = red flag klasik).
2. `<meta name="description">` unik dan deskriptif — jangan dikosongkan.
3. `<link rel="canonical">` — satu URL final yang jadi "sumber kebenaran" halaman ini.
4. Open Graph: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (pakai gambar yang benar-benar ada & relevan — jangan asal isi gambar halaman lain).
5. Twitter Card: `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.
6. JSON-LD sesuai tabel Step 0.

## Step 2 — ATURAN EMAS: konsistensi canonical

`canonical`, `og:url`, dan setiap `"url"` / `"item"` di JSON-LD **harus menunjuk ke URL yang sama persis**. Ini penyebab paling sering kenapa sinyal SEO yang "sudah benar" tetap tidak dibaca Google dengan baik:

- ❌ `canonical` bilang halaman asli ada di `/v1/`, tapi `og:url` dan JSON-LD `"url"` masih menunjuk ke `/` — Google jadi bingung entitas mana yang dipercaya.
- ✅ Semua sinyal sepakat pada satu URL.

Terapkan juga ke `sitemap.xml`: jangan daftarkan URL yang canonical-nya sendiri menunjuk ke tempat lain (mis. halaman redirect stub) sebagai entri terpisah — itu kontradiksi sinyal.

## Step 3 — Kasus khusus: hosting gratis menimpa nama brand

Jika domain berbentuk `nama-project.vercel.app` / `.github.io` / `.netlify.app`, Google kadang menampilkan nama **platform hosting** (mis. "Vercel") sebagai site name, bukan brand situs. Perbaikannya BUKAN mengganti domain, tapi memperkuat sinyal brand:

```html
<meta property="og:site_name" content="NamaBrand">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "NamaBrand",
  "url": "https://domain-final-yang-canonical/"
}
</script>
```

Pastikan tag ini ada di halaman yang **benar-benar diindeks Google** (cek dengan curl!), bukan cuma di halaman redirect stub yang kosong.

## Step 4 — Pola "Site · Nama" ala LinkedIn (Profile Page)

Hanya valid untuk halaman tentang satu Person/Organization yang berafiliasi dengan situs (about-me, profil forum, halaman penulis). Struktur minimal:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "dateCreated": "YYYY-MM-DD",
  "dateModified": "YYYY-MM-DD",
  "mainEntity": {
    "@type": "Person",
    "name": "Nama Lengkap",
    "url": "https://domain/halaman-ini/",
    "image": "https://domain/foto.jpg",
    "jobTitle": "...",
    "sameAs": ["https://linkedin.com/in/...", "..."]
  }
}
</script>
```

**Jangan pernah** mengisi `interactionStatistic` (follower/like count) dengan angka karangan — itu structured-data spam dan berisiko manual action dari Google. Hanya isi kalau datanya nyata dan terverifikasi; kalau tidak ada, hilangkan field-nya sepenuhnya.

## Step 5 — Pola "Site › Nama Halaman" untuk halaman konten (proyek, artikel, produk)

Ini padanan yang BENAR untuk halaman non-profil (mis. tiap halaman proyek di portofolio):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "NamaBrand", "item": "https://domain/" },
    { "@type": "ListItem", "position": 2, "name": "Judul Halaman Ini", "item": "https://domain/halaman-ini/" }
  ]
}
</script>
```

Hasil di Google: `NamaBrand › Judul Halaman Ini` menggantikan URL mentah — dipakai berulang untuk tiap halaman proyek/artikel dengan `name` & `item` disesuaikan.

## Step 5.5 — Batas keras: Sitelinks TIDAK bisa dipesan

Kotak navigasi tambahan yang kadang muncul di bawah hasil utama (mis. beberapa link section/halaman sekaligus) itu **Sitelinks** — beda mekanisme dari `BreadcrumbList` di atas. Dokumentasi resmi Google eksplisit: *"Sitelinks are automated"* — **tidak ada tag, meta, atau JSON-LD apa pun yang bisa memaksa/meminta sitelinks muncul**. Jangan pernah menjanjikan ini bisa "di-setting".

Yang bisa dilakukan hanya sinyal tidak langsung, tanpa jaminan:
- Anchor text nav yang jelas & deskriptif (bukan "klik di sini")
- Struktur `<nav>` semantik
- (Opsional, sinyal lemah/tidak resmi) `SiteNavigationElement` JSON-LD yang mendaftar section/halaman nav — boleh dipasang karena tidak merugikan, tapi sampaikan ke user ini cuma "best effort", bukan solusi.

**Perhatikan juga batas struktural:** sitelinks klasik (kotak besar dengan deskripsi, seperti pada situs institusi/sekolah) itu menunjuk ke **halaman-halaman terpisah** dengan URL berbeda, bukan ke `#anchor` di satu halaman yang sama. Kalau halaman targetnya adalah situs satu-halaman (scrolling landing page) dengan nav berbasis `#hash`, secara struktural itu jauh lebih kecil kemungkinannya pernah mendapat sitelinks bergaya itu — sampaikan ini secara jujur ke user, jangan menyarankan solusi yang seolah pasti berhasil.

## Step 6 — Validasi sebelum & sesudah deploy

1. Tempel URL live ke [Rich Results Test](https://search.google.com/test/rich-results) — pastikan tidak ada error pada tiap tipe JSON-LD.
2. `curl -s -A "Mozilla/5.0" <url-live> | head -c 3000` setelah deploy — konfirmasi tag benar-benar sampai ke production, bukan cuma di file lokal.
3. Google Search Console → URL Inspection → **Request Indexing** untuk tiap URL yang berubah signifikan.

## Step 7 — Set ekspektasi waktu dengan jujur

Fitur "Site Name" dan rich result (`ProfilePage`, `BreadcrumbList`, dst) adalah proses **algoritmik terpisah** dari crawling biasa — **tidak ada tombol manual** untuk memaksa tampilannya, bahkan dari pihak Google sendiri. Setelah sinyal benar & konsisten serta sudah di-request index ulang, perubahan visual di SERP biasanya butuh beberapa minggu, kadang 1–3 bulan untuk situs kecil/baru. Jangan menjanjikan hasil instan ke siapa pun yang meminta ini dikerjakan — sampaikan validitas teknis sudah terjamin, waktu tayangnya di luar kendali siapa pun.

## Checklist ringkas sebelum menyatakan selesai

- [ ] Tiap halaman: title, description, og:*, twitter:*, JSON-LD unik (bukan copy-paste homepage)
- [ ] canonical / og:url / JSON-LD url **identik** di tiap halaman
- [ ] Tipe JSON-LD sesuai peran halaman (WebSite/ProfilePage/BreadcrumbList/Organization) — bukan asal comot
- [ ] Tidak ada data yang dikarang (follower, rating, dsb.)
- [ ] sitemap.xml hanya berisi URL canonical
- [ ] Sudah divalidasi lewat curl raw HTML + Rich Results Test
- [ ] User sudah diberi tahu soal lag waktu Google, bukan dijanjikan instan
- [ ] Kalau user minta "sitelinks"/kotak navigasi tambahan muncul: sudah diluruskan bahwa itu 100% algoritmik, tidak bisa dipesan lewat tag apa pun
