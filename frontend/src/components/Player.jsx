import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './Player.module.css';
import TrackMixer from './TrackMixer.jsx';
import PlaybackControls from './PlaybackControls.jsx';
import LoopBar from './LoopBar.jsx';

const TRACK_COLORS = [
  '#e8673a', '#4a9eff', '#3acd7e', '#e8c13a',
  '#c97aff', '#ff7aaa', '#7acfff', '#ffaa4a',
];

export default function Player({ file, onMetaLoaded }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const [totalTicks, setTotalTicks] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [totalBars, setTotalBars] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(100);
  const [tracks, setTracks] = useState([]);
  const [visibleTrack, setVisibleTrack] = useState(0);
  const [masterVolume, setMasterVolume] = useState(100);
  const [countIn, setCountIn] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursorX, setCursorX] = useState(-1);
  const [loopCount, setLoopCount] = useState(0);
  const lastBarRef = React.useRef(0);
  const [cursorY, setCursorY] = useState(0);
  const [cursorH, setCursorH] = useState(0);
  const [error, setError] = useState(null);
  const [scoreTitle, setScoreTitle] = useState('');
  const [scoreArtist, setScoreArtist] = useState('');
  const [timeSignature, setTimeSignature] = useState('');
  const [tempo, setTempo] = useState(null);
  const initAlphaTab = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);

    try {
      // Handle all possible export shapes from alphaTab
      const mod = await import('@coderline/alphatab');
      const at = mod.alphaTab ?? mod.default ?? mod;

      const LayoutMode = at.LayoutMode ?? { Page: 0, Horizontal: 1 };
      const StaveProfile = at.StaveProfile ?? { Tab: 1 };
      const ScrollMode = at.ScrollMode ?? { Continuous: 2 };
      const AlphaTabApi = at.AlphaTabApi ?? mod.AlphaTabApi;

      if (!AlphaTabApi) {
        throw new Error('Could not load AlphaTabApi from module');
      }

      const settings = {
        core: {
          fontDirectory: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/',
          logLevel: 1,
        scriptFile: '/assets/alphaTab.mjs',
        },
        display: {
          layoutMode: LayoutMode.Page,
          staveProfile: StaveProfile.Tab,
          scale: 0.9,
          resources: {
            staffLineColor: '#666680',
            barSeperatorColor: '#ffffff',
            mainGlyphColor: '#e0e0ee',
            secondaryGlyphColor: '#9090a8',
            scoreInfoColor: '#c0c0d0',
            playHeadColor: '#e8673a',
            selectionColor: 'rgba(232, 103, 58, 0.25)',
          }
        },
        player: {
          enablePlayer: true,
          enableCursor: true,
          enableAnimatedBeatCursor: true,
          scrollMode: ScrollMode.Continuous,
          soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
          scrollElement: containerRef.current.parentElement,
        }
      };

      console.log('AlphaTabApi found:', !!AlphaTabApi);
      const api = new AlphaTabApi(containerRef.current, settings);
      console.log('API created:', !!api);
      apiRef.current = api;

      // Watch beat cursor and make it visible
      const cursorObserver = new MutationObserver(() => {
        const beat = document.querySelector('.at-cursor-beat');
        if (beat) {
          const t = beat.style.transform;
          const match = t && t.match(/scale\(([\d.e-]+),\s*([\d.e-]+)\)/);
          if (match) {
            const scaleX = parseFloat(match[1]);
            const scaleY = parseFloat(match[2]);
            // Replace scaleX to make it visible (target 2px wide from 300px element = 0.00667)
            beat.style.transform = t.replace(
              /scale\([\d.e-]+,/,
              'scale(0.039,'
            );
            beat.style.background = '#e8673a';
            beat.style.opacity = '1';
            beat.style.boxShadow = '0 0 8px 3px #e8673a';
          }
        }
        const bar = document.querySelector('.at-cursor-bar');
        if (bar) {
          bar.style.background = 'rgba(74, 158, 255, 0.15)';
        }
      });

      setTimeout(() => {
        const cursors = document.querySelector('.at-cursors');
        if (cursors) {
          cursorObserver.observe(cursors, { attributes: true, subtree: true, attributeFilter: ['style'] });
        }
      }, 2000);

      api.playerReady.on(() => {
        console.log('Player ready!');
        setReady(true);
        setLoading(false);
      });

      api.playerStateChanged.on((e) => {
        setPlaying(e.state === 1);
      });

      api.playerPositionChanged.on((e) => {
        setCurrentTick(e.currentTick);
        setTotalTicks(e.endTick);
        if (e.currentBar !== undefined) setCurrentBar(e.currentBar);
        if (e.endBar !== undefined) setTotalBars(e.endBar);
        // Detect loop restart by tick jumping backwards
        if (e.currentTick < lastBarRef.current - 1000) {
          setLoopCount(c => c + 1);
        }
        lastBarRef.current = e.currentTick;

        // Update custom cursor position
        if (e.currentBeat) {
          const bounds = e.currentBeat.bounds;
          if (bounds) {
            setCursorX(bounds.x);
            setCursorY(bounds.y);
            setCursorH(bounds.h);
          }
        }
      });

      api.scoreLoaded.on((score) => {
        if (!score) return;
        const title = score.title || file.name.replace(/\.(gp\w*)$/i, '');
        const artist = score.artist || '';
        setScoreTitle(title);
        setScoreArtist(artist);
        if (onMetaLoaded) onMetaLoaded(file.name, title, artist);
        setTotalBars(score.masterBars?.length || 0);
        setLoopEnd(score.masterBars?.length || 100);

        if (score.masterBars?.[0]) {
          const mb = score.masterBars[0];
          setTimeSignature(`${mb.timeSignatureNumerator}/${mb.timeSignatureDenominator}`);
          setTempo(mb.tempo);
        }

        const sanitizeName = (name, i) => {
          if (!name) return `Track ${i + 1}`;
          // Remove replacement characters and non-printable chars
          const cleaned = name.replace(/[\uFFFD\u0000-\u001F\u0080-\u009F]/g, '').trim();
          // If only numbers/symbols remain after stripping, use generic name
          if (!cleaned || /^[\d\s\W]+$/.test(cleaned)) return `Track ${i + 1}`;
          return cleaned;
        };

        const trackList = (score.tracks || []).map((t, i) => ({
          id: i,
          name: sanitizeName(t.name, i),
          volume: 100,
          muted: false,
          solo: false,
          color: TRACK_COLORS[i % TRACK_COLORS.length],
          isDrum: t.isPercussion || (t.playbackInfo && t.playbackInfo.program === 0 && t.playbackInfo.primaryChannel === 9),
        }));
        setTracks(trackList);
      });

      api.error.on((e) => {
        console.error('alphaTab error', e);
        setError('Failed to load file: ' + (e?.message || String(e)));
        setLoading(false);
      });

      const url = `/api/file/${encodeURIComponent(file.name)}`;
      console.log('Loading URL:', url);
      api.load(url);

    } catch (e) {
      console.error('Init error', e);
      setError('Failed to initialize player: ' + (e?.message || String(e)));
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    initAlphaTab();
    return () => {
      if (apiRef.current) {
        try { apiRef.current.destroy(); } catch (e) {}
        apiRef.current = null;
      }
      try { cursorObserver?.disconnect(); } catch(e) {}
    };
  }, [initAlphaTab]);

  const togglePlay = () => {
    if (!apiRef.current) return;
    // Resume suspended audio context on user gesture
    if (window.AudioContext || window.webkitAudioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx.prototype && apiRef.current.context) {
        apiRef.current.context.resume?.();
      }
      // Also try resuming any suspended context globally
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
    }
    apiRef.current.playPause();
  };
  const stop = () => { if (apiRef.current) { apiRef.current.stop(); setPlaying(false); } };

  const handleSpeedChange = (val) => {
    setSpeed(val);
    if (apiRef.current) apiRef.current.playbackSpeed = val / 100;
  };

  const handleMasterVolume = (val) => {
    setMasterVolume(val);
    if (apiRef.current) apiRef.current.masterVolume = val / 100;
  };

  const handleLoopToggle = () => {
    const next = !loopEnabled;
    setLoopEnabled(next);
    if (apiRef.current) apiRef.current.isLooping = next;
  };

  const handleLoopRange = (start, end) => {
    setLoopStart(start);
    setLoopEnd(end);
    if (apiRef.current && totalTicks > 0 && totalBars > 0) {
      const startTick = Math.floor((start / totalBars) * totalTicks);
      const endTick = Math.floor((end / totalBars) * totalTicks);
      apiRef.current.playbackRange = { startTick, endTick };
    }
  };

  const handleTrackVolume = (trackId, vol) => {
    setTracks(ts => ts.map(t => t.id === trackId ? { ...t, volume: vol } : t));
    if (apiRef.current?.score?.tracks?.[trackId]) {
      apiRef.current.changeTrackVolume([apiRef.current.score.tracks[trackId]], vol / 100);
    }
  };

  const handleTrackMute = (trackId) => {
    setTracks(ts => ts.map(t => {
      if (t.id !== trackId) return t;
      const next = !t.muted;
      if (apiRef.current?.score?.tracks?.[trackId]) {
        apiRef.current.changeTrackMute([apiRef.current.score.tracks[trackId]], next);
      }
      return { ...t, muted: next };
    }));
  };

  const handleTrackSolo = (trackId) => {
    setTracks(ts => {
      const isSolo = ts[trackId]?.solo;
      return ts.map(t => {
        const nextSolo = t.id === trackId ? !isSolo : false;
        if (apiRef.current?.score?.tracks?.[t.id]) {
          apiRef.current.changeTrackSolo([apiRef.current.score.tracks[t.id]], nextSolo);
        }
        return { ...t, solo: nextSolo };
      });
    });
  };

  const handleVisibleTrack = (trackId) => {
    setVisibleTrack(trackId);
    if (apiRef.current?.score?.tracks?.[trackId]) {
      apiRef.current.renderTracks([apiRef.current.score.tracks[trackId]]);
    }
  };

  const handleCountIn = () => {
    const next = !countIn;
    setCountIn(next);
    if (apiRef.current) apiRef.current.countInVolume = next ? 1 : 0;
  };

  const handleMetronome = () => {
    const next = !metronome;
    setMetronome(next);
    if (apiRef.current) apiRef.current.metronomeVolume = next ? 1 : 0;
  };

  const progress = totalTicks > 0 ? currentTick / totalTicks : 0;

  return (
    <div className={styles.player}>
      <div className={styles.header}>
        <div className={styles.songInfo}>
          <h1 className={styles.title}>{scoreTitle || file.name.replace(/\.(gp\w*)$/i, '')}</h1>
          <div className={styles.meta}>
            {scoreArtist && <span className={styles.artist}>{scoreArtist}</span>}
            {tempo && <span className={styles.badge}>{tempo} BPM</span>}
            {timeSignature && <span className={styles.badge}>{timeSignature}</span>}
            {totalBars > 0 && <span className={styles.badge}>{totalBars} bars</span>}
          </div>
        </div>
        <div className={styles.headerRight}>
          {tracks.length > 1 && (
            <select
              style={{
                background: 'var(--bg4)',
                border: '1px solid var(--border2)',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '12px',
                padding: '4px 8px',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                maxWidth: '160px',
              }}
              value={visibleTrack}
              onChange={e => handleVisibleTrack(Number(e.target.value))}
            >
              {tracks.filter(t => !t.isDrum).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button className={`${styles.iconBtn} ${metronome ? styles.active : ''}`} onClick={handleMetronome} title="Metronome">
            <MetronomeIcon /><span>Click</span>
          </button>
          <button className={`${styles.iconBtn} ${countIn ? styles.active : ''}`} onClick={handleCountIn} title="Count in">
            <CountInIcon /><span>Count In</span>
          </button>
        </div>
      </div>

      <LoopBar
        enabled={loopEnabled}
        onToggle={handleLoopToggle}
        start={loopStart}
        end={loopEnd}
        total={totalBars}
        currentBar={currentBar}
        progress={progress}
        onRangeChange={handleLoopRange}
      />

      <div className={styles.body}>
        <div className={styles.scoreWrap}>
          {loading && (
            <div className={styles.loadOverlay}>
              <div className={styles.spinner} />
              <span>Loading score...</span>
            </div>
          )}
          {error && (
            <div className={styles.errorOverlay}>
              <span>{error}</span>
            </div>
          )}
          <div ref={containerRef} className={styles.atContainer} />
        </div>
        {tracks.length > 0 && (
          <TrackMixer
            tracks={tracks}
            masterVolume={masterVolume}
            onMasterVolume={handleMasterVolume}
            onTrackVolume={handleTrackVolume}
            onTrackMute={handleTrackMute}
            onTrackSolo={handleTrackSolo}
          />
        )}
      </div>

      <PlaybackControls
        playing={playing}
        ready={ready}
        speed={speed}
        onPlayPause={togglePlay}
        onStop={stop}
        onSpeedChange={handleSpeedChange}
        progress={progress}
        currentBar={currentBar}
        totalBars={totalBars}
        loopCount={loopCount}
      />
    </div>
  );
}

function MetronomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 19.8 22 19.8"/>
      <line x1="12" y1="2" x2="17" y2="13"/>
      <line x1="12" y1="19.8" x2="12" y2="14"/>
    </svg>
  );
}

function CountInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  );
}
