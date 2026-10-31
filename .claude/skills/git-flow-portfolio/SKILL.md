---
name: git-flow-portfolio
description: Alur git wajib untuk repo portfolio DimsPorf. Pakai setiap kali membuat branch, commit, push, merge, rilis ke Vercel, membersihkan branch, atau saat user menulis "commit", "push", "merge", "rilis", "deploy", "merge ke release/vercel". Menetapkan tiga tingkat branch (develop/[perbaikan] -> develop/[project] -> release), penamaan, format commit, urutan perintah, pemeriksaan sebelum rilis, pembersihan branch, dan hook yang menjaga repo tetap bersih.
---

# Git flow DimsPorf

Skill ini khusus repo ini dan **menang atas** aturan git umum di skill `dimas` bila ada bentrok. Aturan "jangan commit, push, atau merge sebelum diperintah" tetap berlaku di semua tingkat.

## 1. Tiga tingkat branch

```
develop/[perbaikan]  ->  develop/[project]  ->  release  ->  Vercel (production)
   (pekerjaan kecil)       (rumah satu project)    (hasil jadi)
```

| Tingkat | Contoh | Umur | Boleh commit langsung? |
|---|---|---|---|
| `develop/[perbaikan]` | `develop/v2-hero-layout`, `develop/fix-navbar-scroll`, `develop/seo-sub-brands` | Pendek, dihapus setelah di-merge | **Ya, satu-satunya tempat commit** |
| `develop/[project]` | `develop/v1`, `develop/v2`, `develop/v3`, `develop/jejak`, `develop/pemberdayaan`, `develop/tanam-harapan` | Panjang, satu per project | Tidak, hanya menerima merge |
| `release` | `release` | Selamanya, dipantau Vercel | Tidak, hanya menerima merge dari branch project |

- Daftar branch project ada di `.githooks/project-branches` (satu baris satu nama). Project baru: tambahkan namanya di sana, lalu buat `develop/[project]` dari `release`.
- Satu perbaikan = satu topik. Jangan mencampur dua topik di satu branch.
- Jangan ada branch lain (`feature/*`, `fix/*`, `refactor/*`, `v1`). Semua pekerjaan memakai awalan `develop/`.

### Penamaan branch perbaikan
`develop/{project}-{apa}` untuk perubahan di satu project (`develop/v2-hero-layout`), atau `develop/{apa}` untuk perubahan lintas project (`develop/seo-sub-brands`, `develop/git-flow`). Huruf kecil, kata dipisah `-`, spesifik (bukan `develop/update` atau `develop/fix`).

## 2. Arti perintah user

| User menulis | Yang dilakukan |
|---|---|
| "commit" | Commit di branch perbaikan saja |
| "push" | Push branch perbaikan |
| "merge" | Merge perbaikan ke `develop/[project]` lalu push branch project |
| "rilis", "deploy", "merge ke release", "merge ke vercel" | Merge `develop/[project]` ke `release` lalu push (ini memicu deploy Vercel) |
| "commit push merge" tanpa kata release | Commit, push, dan merge ke branch project. Tanyakan sekali apakah juga ingin dirilis |

Persetujuan sebelumnya tidak berlaku untuk perintah berikutnya. Tanpa perintah eksplisit, pekerjaan dibiarkan tidak ter-commit dan statusnya dilaporkan.

## 3. Urutan kerja

### A. Mulai perbaikan
```
git fetch origin
git checkout develop/[project]
git merge --ff-only release            # sinkronkan project dengan release bila release lebih baru
git checkout -b develop/[perbaikan]
```
Kalau `develop/[project]` belum ada: `git checkout -b develop/[project] release`.

### B. Kerjakan dan periksa
- Untuk apa pun di `v2/` atau halaman yang diindeks: `node v2/tools/build.mjs` (membuat ulang halaman, sitemap, dan menjalankan audit SEO). Harus `SEO audit passed`.
- Hanya perubahan yang diminta. Jangan menyentuh hal lain.

### C. Commit (hanya bila diperintah)
- Stage **per path**, bukan `git add -A` di root. Jangan stage `reference/`, `moodboard/`, scratchpad, `v2/project/`, `private-src/`, file password.
- Pesan: **satu baris**, bahasa Indonesia, awalan `feat:`, `fix:`, `style:`, `docs:`, `chore:`, tanpa deskripsi, tanpa co-author atau "Generated with".
- Gabungkan commit yang satu topik. Jangan memecah satu fitur jadi banyak commit kecil.
- Commit hanya di branch perbaikan (hook menolak commit di `release` dan branch project).

### D. Push (hanya bila diperintah)
`git push -u origin develop/[perbaikan]`. Jangan pernah `--force` kecuali diminta eksplisit.

### E. Merge ke branch project (hanya bila diperintah)
```
git checkout develop/[project]
git pull --ff-only origin develop/[project]
git merge --no-ff develop/[perbaikan] -m "Merge branch 'develop/[perbaikan]' into develop/[project]"
git push origin develop/[project]
```
Lalu bersihkan branch perbaikan (bagian 5). Bila ada konflik: selesaikan di branch perbaikan atau branch project tanpa membuang kode branch lain, lalu laporkan.

### F. Rilis ke production (hanya bila diperintah)
```
git checkout release
git pull --ff-only origin release
git merge --no-ff develop/[project] -m "Merge branch 'develop/[project]' into release"
node v2/tools/seo-audit.mjs            # wajib lulus
git push origin release                # memicu deploy Vercel
```
Setelah push, tunggu deploy (sekitar 20 sampai 60 detik) dan verifikasi di produksi:
- `curl -I https://dimsporf.vercel.app/` memberi 308 ke `/v2/`, `curl -I https://ahmdims.vercel.app/` memberi 308 ke domain utama.
- Halaman yang diubah memberi 200 dan isinya yang baru.
- Laporkan hasilnya ke user, termasuk bila ada yang gagal.
Setelah rilis, sinkronkan: `git checkout develop/[project] && git merge --ff-only release` (supaya branch project tidak tertinggal).

### G. Perbaikan darurat di production
Buat `develop/hotfix-[apa]` dari `release`, perbaiki, merge ke `release` (langkah F), lalu merge `release` ke `develop/[project]` yang terkait agar tidak ada kode yang hilang.

## 4. Larangan
- Commit atau push langsung ke `release` atau `develop/[project]`.
- `git push --force`, `git reset --hard` pada branch yang sudah di-push, atau menulis ulang riwayat `release`.
- Merge `release` dari branch perbaikan langsung (lewati branch project).
- Merge tanpa `--no-ff` (merge commit wajib ada supaya riwayat terbaca).
- Merge ke `release` saat audit SEO gagal atau saat masih ada perubahan yang belum ter-commit.
- Menyimpan password, token, atau data internal di commit.
- Memakai `--no-verify` untuk melewati hook.

## 5. Menjaga repo bersih
Setelah perbaikan ter-merge ke branch project:
```
git branch -d develop/[perbaikan]
git push origin --delete develop/[perbaikan]
git fetch --prune origin
```
Pemeriksaan berkala (tanpa menghapus apa pun tanpa izin user):
- `git branch -r --merged origin/release` untuk melihat branch yang sudah ter-merge.
- `git branch -vv` untuk melihat branch lokal yang tidak punya remote atau tertinggal.
Branch yang sudah ter-merge dan sifatnya sementara dilaporkan ke user dulu, baru dihapus setelah disetujui. Branch project (`develop/v1`, `develop/v2`, ...) tidak pernah dihapus.

## 6. Hook penjaga
Folder `.githooks/` (LF, ter-versi) dipasang dengan `git config core.hooksPath .githooks` (sekali per clone; jalankan bila `git config core.hooksPath` kosong):
- **pre-commit**: menolak commit langsung di `release` dan branch project; bila file halaman, sitemap, atau `vercel.json` ikut ter-stage, menjalankan audit SEO.
- **pre-push**: bila yang di-push adalah `release`, audit SEO harus lulus.
Merge commit tidak dihentikan oleh pre-commit, sehingga langkah E dan F berjalan normal.

## 7. Ringkasan satu layar
1. `develop/[project]` sinkron dengan `release` -> buat `develop/[perbaikan]`.
2. Kerjakan -> `node v2/tools/build.mjs` -> (diperintah) commit satu baris -> push.
3. (diperintah) merge `--no-ff` ke `develop/[project]` -> push -> hapus branch perbaikan.
4. (diperintah "rilis") merge `--no-ff` ke `release` -> audit lulus -> push -> verifikasi live -> sinkronkan project.
