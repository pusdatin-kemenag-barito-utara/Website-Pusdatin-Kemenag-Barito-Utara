# Project Rules

- **GIT PUSH PERMISSION**: Diizinkan melakukan `git push origin <branch>` untuk repositori pusdatin tanpa perlu meminta konfirmasi berulang ketika user telah menginstruksikan deploy / push.
- **ZERO HARDCODED SECRETS / EVS**: DILARANG KERAS meng-hardcode nilai environment variable (EV), token, API key, JWT, atau rahasia apa pun di dalam kode sumber (`.ts`, `.js`, `.go`, `.astro`), `Dockerfile` (nilai default ARG), ataupun `docker-compose.yml`. Semua nilai konfigurasi dan rahasia harus murni menggunakan referensi variabel (`process.env`, `window.__PUBLIC_ENV__`, `os.Getenv`) yang dikelola terpusat di Infisical Cloud (`https://app.infisical.com/api`).
