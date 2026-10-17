# Owner instructions (record, kept in the repo by the owner's request of 2026-10-16)

Copy of the claude.ai Project instructions of "Aeterna" and of the owner's auto-mode request, in the owner's words (Indonesian). The working rules derived from them are CLAUDE.md, skill `bs-session-runner` and `docs/ai/next-session-prompt.md`; when this record and those files differ, those files win and this record is updated.

## Project instructions (claude.ai)
1. Pakai roadmap terbaru di repo odinguard009/aeterna. Ikuti skill bs-session-runner untuk alur sesi, ukuran sesi, backup, dan mind map.
2. Di awal sesi "lanjutkan roadmap": tulis "Ver. X.XX" (versi yang direncanakan atau dihasilkan) dan rekomendasikan model dengan format "gunakan model …" sesuai ukuran sesi.
3. Hemat token tanpa mengorbankan hasil. Pertahankan proses yang sudah teruji.
4. Sampaikan saran efisiensi atau improvement kapan saja, termasuk di tengah sesi.
5. Buat backup setiap 5 versi rilis.
6. Sumber utama aturan, format, mekanik, dan data kartu: data ekspor Fandom di data/sources dan data/impor di reppo, manual resmi Battle Spirits, dan Battle Spirits Fandom Wiki. Kalau tidak bisa diakses, pakai situs lain atau data lokal. Pembanding UI dan perilaku game: aegis-digi.online (web dan repo GitHub) dan game Battle Spirits Connected Battler.
7. Saat ada pilihan teknis, pilih opsi paling stabil atau aman tanpa bertanya.
8. Kirim mind map roadmap (HTML) setiap akhir sesi.
9. Pemilihan model: pilih Sonnet, Opus, atau model lain secara otomatis sesuai tingkat kesulitan task, dengan tetap mempertimbangkan penggunaan token. Ini berlaku juga untuk subagent.
10. Always allow, situs: selalu izinkan dan masukkan ke allowlist sesi semua halaman dari github.com, battlespirits.fandom.com, situs resmi Battle Spirits, dan semua situs lain yang dipakai dalam sesi proyek ini.
11. Always allow, persetujuan: jika muncul permintaan persetujuan atau pilihan, pilih opsi paling stabil atau aman, setujui otomatis, dan masukkan ke allowlist sesi. Berlaku untuk semua sesi di proyek ini.
12. Always allow, perangkat: jika ada perangkat terhubung (browser, komputer, dan lainnya) yang dibutuhkan proyek, langsung gunakan tanpa menunggu izin.
13. Browser otomatis: jika WebFetch atau WebSearch gagal (halaman tidak bisa dirender, butuh login, butuh klik atau isi form, atau perlu uji game secara visual), langsung gunakan browser tanpa bertanya. Prioritas: browser bawaan aplikasi Claude, lalu Claude in Chrome. Berlaku untuk Battle Spirits Fandom, situs resmi Battle Spirits, aegis-digi.online, GitHub, dan uji index.html Aeterna.
14. Jadwal: semua jadwal atau perubahan jadwal yang dibuat Claude dianggap disetujui dan langsung disimpan.
15. Nama sesi: beri nama sesi "lanjutkan roadmap" sesuai nomor versi, misalnya "Ver. 0.40".

## Auto mode request (2026-10-16)
1. Setelah sesi terakhir selesai dan file versi terakhir dikirim, jika dalam 30 menit tidak ada perintah "lanjutkan roadmap", Claude melanjutkan roadmap sendiri secara otomatis.
2. Setelah sesi otomatis terakhir selesai dan file versi terakhir dikirim, jika dalam 30 menit tidak ada respon apa pun, lanjutkan kembali pengerjaan roadmap.
3. Pengerjaan otomatis selalu memakai mode auto; model Claude sesuai beratnya item roadmap.
4. Mode otomatis harus mudah di-on/off-kan.
5. Semua data dan instruksi disimpan di repo.

Implementation and its limits (scheduled runs cannot see chats; the real delay is 20 minutes (owner, 2026-10-17; was 30) plus up to one schedule interval; no per-run model setting): `docs/ai/next-session-prompt.md`.

## Deck builder (2026-10-16, chat)

"Saya ingin juga anda memikirkan UI dan UX untuk deck builder. Saya ingin UI yang user friendly, fungsional, namun tetap stylish waktu digunakan untuk versi PC atau HP. Rencanakan pekerjaan ini di roadmap dan sesi berikutnya."

Plan: `docs/ai/deckbuilder-plan.md` (next session, before the batch promotion).

## Details (2026-10-16, chat)

"Selalu perhatikan detail. Walau sekecil apa pun."

## Model (2026-10-17, chat)

"mulai sekarang, saya akan menggunakan Opus karena saya merasa saya lebih yakin menggunakan itu."

Applied: Opus for every manual and auto session and for subagents; the gate treats every `next=` as Opus; the Sonnet scheduled task is disabled (not deleted). Project instruction 9 (automatic Sonnet/Opus choice) is superseded by this.

## Monorepo (2026-10-17, chat)

"saya rasa ini perlu untuk ditiru juga karena saya juga ingin membuat aeterna menjadi seperti itu" / "ya, saya ingin repo kita bisa menjadi lebih rapi dan lebih baik dari aegis". Answers: online + offline; no server hosting yet; migration step by step, alternating with card sessions. Plan: `docs/ai/monorepo-plan.md`.

## Repo cleanup (2026-10-17, chat)

"oke, rencanakan untuk merapikan repo aeterna." Plan: `docs/ai/repo-cleanup-plan.md`.

## Roadmap order and Thai UI (2026-10-17, chat)

"oke, atur ulang kembali rencana roadmap. lalu untuk UI berbahasa Indonesia saya rasa tidak perlu, malah saya ingin ada UI berbahasa Thailand". Applied: "Session order" in `docs/ai/roadmap-open.md`.

"rencana bahasa UI: 1. Inggris, 2. Jepang, 3. Thailand, 4. China, dan seterusnya mengikuti pasar populer Battle Spirits" (2026-10-17). Applied: roadmap-open.md "Session order" item 9.

## Front page and releases (2026-10-17, chat)

"Saya melihat halaman repo github Aeterna terlalu panjang dan semrawut. Buat halaman seperti halaman repo github Aegis yang terlihat rapi dan terstruktur. Coba cari tempat lain untuk menulis hasil update dari setiap versi Aeterna, Misal di halaman release. Masukan rencana ke update berikutnya." Plan: `docs/ai/repo-cleanup-plan.md` "C5", roadmap-open "Session order" item 2b.
