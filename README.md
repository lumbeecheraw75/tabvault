# TabVault

**A self-hosted Guitar Pro file player for Unraid and Docker.**

Load your Guitar Pro files, play them back with MIDI, loop sections with draggable handles, slow down for practice, and mix individual tracks — all from your browser, running entirely on your own hardware.

---

## Features

- Plays Guitar Pro files — .gp, .gp3, .gp4, .gp5, .gpx, .gp6, .gp7
- MIDI playback with built-in SoundFont synthesizer
- Draggable loop region — click and drag handles on the timeline to set loop points
- Speed control — presets from 50-100%, manual input up to 200%
- Speed ramp — auto-increases tempo each loop for progressive practice
- Track selector — switch which track's notation is displayed (drums excluded automatically)
- Per-track mixer — volume, mute, and solo per instrument
- Metronome and count-in
- Auto-scrolling tab notation that follows playback
- Beat cursor and bar highlight that move with the music
- Library metadata — title and artist extracted automatically from GP files on upload
- Inline metadata editor — edit title/artist for any file directly in the sidebar
- Search across title, artist, and filename
- Drag-and-drop upload directly in the browser
- Dark UI

---

## Attribution

TabVault is built on top of **[alphaTab](https://alphatab.net/)** by Daniel Kuschny and contributors, licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/). alphaTab handles Guitar Pro file parsing, score rendering, and MIDI playback. Without it, this project would not exist.

---

## Quick Start

### Docker

```bash
docker run -d \
  --name tabvault \
  -p 3000:3000 \
  -v /path/to/your/gp/files:/library \
  --restart unless-stopped \
  lumbeecheraw75/tabvault:latest
```

Open http://localhost:3000

### docker-compose

```bash
git clone https://github.com/lumbeecheraw75/tabvault.git
cd tabvault
mkdir library
docker compose up --build
```

---

## Unraid Setup

### Via Community Applications

Search for TabVault in the Community Applications plugin.

### Manual

1. In Unraid UI go to Docker, Add Container
2. Set Repository to lumbeecheraw75/tabvault:latest
3. Add port mapping: 3000 to 3000
4. Add volume mapping: /mnt/user/appdata/tabvault/library to /library
5. Apply and start

Access at http://your-unraid-ip:3000

---

## Uploading Files

Two ways to add Guitar Pro files:

1. Via the browser — drag and drop files onto the upload zone in the sidebar
2. Via file share — copy files directly into your mapped library folder

Metadata (title, artist) is extracted automatically on upload. Click the pencil icon next to any file to edit metadata manually.

---

## Usage Guide

### Looping

**Option 1 — Timeline handles:**
1. Click **Loop** to enable loop mode
2. Drag the green handles on the timeline bar to set start and end bars
3. Drag the green highlighted region to slide the entire loop window
4. Hit play — playback loops the selected range

**Option 2 — Score selection:**
- Click and drag directly on the tab notation to highlight notes or bars
- This selection automatically overrides the timeline handles
- To go back to timeline handles, click on the score without dragging to clear the selection

### Speed Ramp
1. Set your starting speed (e.g. 70%)
2. Enable **Speed Ramp**
3. Set the step size (e.g. +5%) and target tempo (e.g. 100%)
4. Speed increases automatically each loop restart until the target is reached
5. Click **Step now** to advance manually at any time


### Track Mixer
- Use sliders on the right panel to balance track volumes
- M = mute, S = solo
- Use the dropdown in the header to switch which track's tab is displayed

---

## Building from Source

```bash
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && cd ..
mkdir library
cd backend
LIBRARY_PATH=../library node server.js
```

Open http://localhost:3000

---

## Tech Stack

- [alphaTab](https://alphatab.net/) (MPL-2.0) — Guitar Pro parsing, score rendering, MIDI playback
- React 18 + Vite — Frontend
- Express — Backend
- Docker — Containerization

---

## Notes

- The SoundFont (~40MB) loads from jsDelivr CDN on first use and is cached by the browser
- GP6 (BCFz format) metadata extraction not yet supported — edit manually via the pencil icon
- Drum tracks are automatically excluded from the track display selector

---

## License

MIT — see LICENSE

alphaTab is licensed under the Mozilla Public License 2.0.
