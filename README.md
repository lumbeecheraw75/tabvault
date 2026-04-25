# GP Player

A self-hosted Guitar Pro file player with Songsterr-style controls. Built with alphaTab, React, and Express.

## Features

- Load and render Guitar Pro files (.gp, .gp3, .gp4, .gp5, .gpx, .gp6, .gp7)
- MIDI playback with built-in SoundFont synthesizer
- Draggable loop region (click and drag handles on the timeline)
- Speed control with presets (50%–100%) and manual input
- Speed ramp — automatically increase tempo each loop for progressive practice
- Per-track mixer: volume, mute, solo
- Master volume control
- Metronome and count-in toggles
- Drag-and-drop file upload into the library
- Dark UI, works great on desktop

---

## Quick Start (Local)

```bash
# 1. Clone / copy this folder
cd gpplayer

# 2. Install frontend deps and build
cd frontend && npm install && npm run build && cd ..

# 3. Install backend deps
cd backend && npm install && cd ..

# 4. Create a library folder and drop some .gp files in it
mkdir library

# 5. Start the server
cd backend
LIBRARY_PATH=../library node server.js

# Open http://localhost:3000
```

---

## Docker (Recommended)

### Build and run with docker-compose

```bash
# Put your .gp files into ./library first (or upload via the UI)
docker compose up --build
```

Open `http://localhost:3000`

### Build manually

```bash
docker build -t gpplayer .
docker run -d \
  --name gpplayer \
  -p 3000:3000 \
  -v /path/to/your/gp/files:/library \
  --restart unless-stopped \
  gpplayer
```

---

## Unraid Setup

### Option A — Community Applications (manual template)

1. In Unraid, go to **Docker → Add Container**
2. Fill in:
   - **Name:** `gpplayer`
   - **Repository:** `gpplayer` (after building and pushing, or use local image)
   - **Network Type:** `Bridge`
   - **Port:** Host `3000` → Container `3000`
   - **Volume:** Host `/mnt/user/appdata/gpplayer/library` → Container `/library`
3. Click **Apply**

### Option B — Build on Unraid directly

```bash
# SSH into Unraid
cd /mnt/user/appdata
git clone <your-repo> gpplayer
cd gpplayer
docker build -t gpplayer .
docker run -d \
  --name gpplayer \
  -p 3000:3000 \
  -v /mnt/user/appdata/gpplayer/library:/library \
  --restart unless-stopped \
  gpplayer
```

Then access at `http://<your-unraid-ip>:3000`

---

## Uploading Files

You can add Guitar Pro files two ways:

1. **Via the UI** — drag and drop files onto the upload zone in the sidebar, or click it to browse
2. **Directly** — copy `.gp` files into your mapped `library` folder; they'll appear on the next page refresh

---

## Usage Tips

### Looping
1. Click **Loop** to enable loop mode
2. Drag the green handles on the timeline bar to set the start and end bars
3. You can also drag the green highlighted region to slide the whole loop window
4. Hit play — it will loop the selected range

### Speed Ramp (Practice Mode)
1. Set your starting speed (e.g. 70%)
2. Enable **Speed Ramp**
3. Set the step size (e.g. +5%) and target (e.g. 100%)
4. Click **Step now** after each successful loop to increase the tempo, or increase manually

### Track Mixer
- Use the sliders on the right panel to balance track volumes
- **M** = mute that track
- **S** = solo that track (all others mute)

---

## Development

```bash
# Run backend in dev mode (auto-reload)
cd backend && npm run dev

# Run frontend dev server (hot reload, proxies API to :3001)
cd frontend && npm run dev
# Open http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:3001`, so both servers need to be running during development.

---

## Tech Stack

- **[alphaTab](https://alphatab.net/)** — Guitar Pro parsing, score rendering, MIDI playback
- **React 18** + **Vite** — Frontend
- **Express** — File server backend
- **Docker** — Containerization

---

## Notes

- SoundFont is loaded from jsDelivr CDN on first use (~40MB). It's cached by the browser after that. If you need fully offline operation, download `sonivox.sf2` from the alphaTab npm package and serve it locally — update the `soundFont` path in `Player.jsx` accordingly.
- alphaTab renders scores using HTML5 canvas/SVG. Large files with many tracks may take a few seconds to render.
- The `.gpx`/`.gp6`/`.gp7` format support depends on the alphaTab version. If a file fails to load, try re-exporting it as `.gp5` from Guitar Pro or TuxGuitar.
