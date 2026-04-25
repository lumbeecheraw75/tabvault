import React, { useState, useEffect, useRef } from 'react';
import styles from './PlaybackControls.module.css';

const SPEED_PRESETS = [50, 60, 70, 75, 80, 85, 90, 95, 100];

export default function PlaybackControls({
  playing, ready, speed, onPlayPause, onStop, onSpeedChange, progress, currentBar, totalBars, loopCount
}) {
  const [rampEnabled, setRampEnabled] = useState(false);
  const [rampTarget, setRampTarget] = useState(100);
  const [rampStep, setRampStep] = useState(5);
  const prevLoopCount = useRef(loopCount);

  // Auto-trigger speed ramp when loop restarts
  useEffect(() => {
    if (rampEnabled && loopCount > prevLoopCount.current) {
      onSpeedChange(Math.min(speed + rampStep, rampTarget));
    }
    prevLoopCount.current = loopCount;
  }, [loopCount]);

  const handleSpeedClick = (val) => {
    onSpeedChange(val);
  };

  const handleSpeedInput = (e) => {
    const val = Math.max(25, Math.min(200, parseInt(e.target.value) || 100));
    onSpeedChange(val);
  };

  const handleRamp = () => {
    if (!rampEnabled) return;
    if (speed < rampTarget) {
      onSpeedChange(Math.min(speed + rampStep, rampTarget));
    }
  };

  return (
    <div className={styles.controls}>
      {/* Transport */}
      <div className={styles.transport}>
        <button
          className={styles.stopBtn}
          onClick={onStop}
          disabled={!ready}
          title="Stop"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
        </button>

        <button
          className={`${styles.playBtn} ${playing ? styles.pauseBtn : ''}`}
          onClick={onPlayPause}
          disabled={!ready}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Progress */}
      <div className={styles.progressSection}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
        </div>
        <div className={styles.progressLabels}>
          <span className={styles.progLabel}>Bar {currentBar + 1}</span>
          <span className={styles.progLabel}>{totalBars} bars</span>
        </div>
      </div>

      {/* Speed */}
      <div className={styles.speedSection}>
        <div className={styles.speedHeader}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>Speed</span>
          <input
            className={styles.speedInput}
            type="number"
            min="25"
            max="200"
            value={speed}
            onChange={handleSpeedInput}
          />
          <span className={styles.pct}>%</span>
        </div>
        <div className={styles.speedPresets}>
          {SPEED_PRESETS.map(s => (
            <button
              key={s}
              className={`${styles.preset} ${speed === s ? styles.presetActive : ''}`}
              onClick={() => handleSpeedClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Speed ramp */}
      <div className={styles.rampSection}>
        <div className={styles.rampHeader}>
          <button
            className={`${styles.rampToggle} ${rampEnabled ? styles.rampActive : ''}`}
            onClick={() => setRampEnabled(r => !r)}
            title="Auto-speed ramp: increases speed each loop"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <span>Speed Ramp</span>
          </button>
        </div>
        {rampEnabled && (
          <div className={styles.rampControls}>
            <label className={styles.rampLabel}>
              <span>+</span>
              <input
                type="number"
                className={styles.rampInput}
                min="1"
                max="25"
                value={rampStep}
                onChange={e => setRampStep(parseInt(e.target.value) || 5)}
              />
              <span>% per loop →</span>
              <input
                type="number"
                className={styles.rampInput}
                min="50"
                max="200"
                value={rampTarget}
                onChange={e => setRampTarget(parseInt(e.target.value) || 100)}
              />
              <span>%</span>
            </label>
            <button
              className={styles.rampNowBtn}
              onClick={handleRamp}
              disabled={speed >= rampTarget}
            >
              Step now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
