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

## Team session in one chat (2026-10-19, chat)

"Bagaimana jika aturan dirombak sehingga bisa menjalankan semuanya dalam 1 sesi? Misal main hanya untuk engine, agent 1 card, agent 2 ui, agent 3 saya lupa" / "Saya ada bonus token dan bisa dipakai boros. Tidak apa tidak hemat. Sebelum memulai, cek apakah ada dari proses roadmap dan rencana sesi kita yang bisa dibuat agent lagi?" / "ya, ubah aturannya. Q3 ikut." Applied: main keeps engine + the card head (a separate card agent would edit the same engine files); agents A1 UI (`lane/ui` worktree), A2/A3 card prep, A4 mechanic check + deck data, A5 Q3 (`lane/q3` worktree), A6 player-view every session, A7 reviewer, A8 Regression watcher. CLAUDE.md "Team session", skill `bs-session-runner` step 8, `docs/ai/lanes/README.md`, `tools/lane_merge.sh --local`.

## Mode hemat ON / OFF (2026-10-19 12:27, chat)

"setelah saya cek satu sesi memakai banyak agent terlalu mahal dan boros token. Saya ingin ada penggunaan dua mode, mode HEMAT ON dan mode HEMAT OFF. untuk mode HEMAT ON gunakan pengaturan seperti versi sebelumnya (versi sebelum 0.68) dan HEMAT OFF gunakan pengaturan seperti ver 0.68. buat switch ini bisa diaktifkan seperti mode otomatis dan cek setiap akhir sesi." / "buat mode hemat on sebagai default". Applied: `session_gate.sh hemat on|off|status` (comments `HEMAT ON|OFF` on issue #1, none = ON), chat commands `hemat on` / `hemat off` / `hemat status`; CLAUDE.md "Mode hemat"; skill `bs-session-runner` step 8 (read at start, decides team or not) and End step 6 (`Mode hemat: ON|OFF` in the final summary); the team session (v0.68) runs only with HEMAT OFF.

## Foundation first, one session, no agents (2026-10-20 17:00-17:08, chat)

"saya ingin anda mengevaluasi semuanya. dan usahakan saran dan pengaturan yang menghasilkan hasil paling baik, menghemat paling banyak token, dan mempersingkat waktu. saya juga ada pikiran untuk menyelesaikan infrastruktur dan ui dulu sebelum nanti memprogram kartu karena ada pikiran kalau sistem tidak stabil maka kartu hanya akan menggoyahkan sistem." / (on the session size limit) "tidak perlu disertakan. saya takut jika diberi batasan maka bisa mengganggu sesi coding" / "Saya setuju. Jadwal otomatis buat menjadi 2 kali per jam"

Agreed plan: phase F (effect schema + validator, host port M2/M3, replays M4, test waits Q2) before more card bundles; UI U5-U8 after the card rate is steady; no subagents except the read-only player-view pass; Mode hemat and team sessions retired; push after every commit; long runs on GitHub Actions; Opus for engine work, Sonnet for docs and JSON-only card bundles; no per-session size limit; auto runs at :00 and :30.
