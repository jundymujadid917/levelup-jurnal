# LevelUp Journal — PWA

Solo Leveling-style habit & workout tracker dengan AI quest generation.

---

## 🚀 Deploy ke Netlify (5 menit)

### Cara 1: Drag & Drop (paling mudah)
1. Jalankan `npm install` lalu `npm run build` di folder ini
2. Buka [netlify.com](https://netlify.com) → Log in / daftar gratis
3. Klik **"Add new site" → "Deploy manually"**
4. **Drag folder `build/`** ke area upload
5. Selesai! Netlify kasih URL otomatis, contoh: `levelup-abc123.netlify.app`

### Cara 2: Via GitHub (recommended untuk update mudah)
1. Push folder ini ke GitHub repo baru
2. Di Netlify: **"Add new site" → "Import from Git"**
3. Pilih repo → Build command: `npm run build` → Publish dir: `build`
4. Deploy!

---

## 📱 Install di HP sebagai App

### Android (Chrome)
1. Buka URL app di Chrome
2. Muncul banner **"Add to Home Screen"** — tap
3. Atau tap ⋮ menu → **"Add to Home Screen"**
4. Icon LevelUp muncul di home screen seperti app biasa ✅

### iOS (Safari)
1. Buka URL di **Safari** (wajib Safari, bukan Chrome)
2. Tap tombol **Share** (kotak dengan panah ke atas)
3. Scroll → pilih **"Add to Home Screen"**
4. Tap **"Add"** ✅

---

## 🔑 API Key Setup

App ini pakai Claude AI untuk generate quest. API key sudah tertanam via Claude.ai artifact system saat development.

Untuk production mandiri, tambahkan API key di environment variable Netlify:
- Key: `REACT_APP_ANTHROPIC_KEY`
- Value: API key dari [console.anthropic.com](https://console.anthropic.com)

Lalu update di `src/App.jsx` pada bagian fetch, tambahkan header:
```
"x-api-key": process.env.REACT_APP_ANTHROPIC_KEY
```

---

## 📁 Struktur File

```
levelup-pwa/
├── public/
│   ├── index.html       ← PWA meta tags, safe-area
│   ├── manifest.json    ← App name, icon, theme color
│   ├── sw.js            ← Service worker (offline support)
│   ├── icon-192.png     ← App icon
│   └── icon-512.png     ← App icon HD
├── src/
│   ├── index.js         ← Entry point + SW registration
│   └── App.jsx          ← Main app (semua logic & UI)
├── netlify.toml         ← Netlify build config
└── package.json
```

---

## 🛠 Jalankan Lokal

```bash
npm install
npm start
# Buka http://localhost:3000
```
