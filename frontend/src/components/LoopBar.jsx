import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from './LoopBar.module.css';

export default function LoopBar({ enabled, onToggle, start, end, total, currentBar, progress, onRangeChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | 'range'
  const [dragOffset, setDragOffset] = useState(0);
  const localStart = useRef(start);
  const localEnd = useRef(end);

  useEffect(() => { localStart.current = start; }, [start]);
  useEffect(() => { localEnd.current = end; }, [end]);

  const getBarFromX = useCallback((clientX) => {
    if (!trackRef.current || total === 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * total);
  }, [total]);

  const startDrag = useCallback((e, type) => {
    if (!enabled) return;
    e.preventDefault();
    setDragging(type);
    if (type === 'range') {
      setDragOffset(getBarFromX(e.clientX) - localStart.current);
    }
  }, [enabled, getBarFromX]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const bar = getBarFromX(e.clientX);
      if (dragging === 'start') {
        const ns = Math.max(0, Math.min(bar, localEnd.current - 1));
        localStart.current = ns;
        onRangeChange(ns, localEnd.current);
      } else if (dragging === 'end') {
        const ne = Math.max(localStart.current + 1, Math.min(bar, total));
        localEnd.current = ne;
        onRangeChange(localStart.current, ne);
      } else if (dragging === 'range') {
        const width = localEnd.current - localStart.current;
        const ns = Math.max(0, Math.min(bar - dragOffset, total - width));
        const ne = ns + width;
        localStart.current = ns;
        localEnd.current = ne;
        onRangeChange(ns, ne);
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, dragOffset, total, getBarFromX, onRangeChange]);

  const startPct = total > 0 ? (start / total) * 100 : 0;
  const endPct = total > 0 ? (end / total) * 100 : 100;
  const curPct = progress * 100;

  return (
    <div className={styles.loopBar}>
      <button
        className={`${styles.loopBtn} ${enabled ? styles.loopActive : ''}`}
        onClick={onToggle}
        title={enabled ? 'Disable loop' : 'Enable loop'}
      >
        <LoopIcon />
        <span>Loop</span>
      </button>

      <div className={styles.track} ref={trackRef}>
        {/* Background segments */}
        <div className={styles.trackBg} />

        {/* Loop region */}
        {enabled && (
          <div
            className={styles.loopRegion}
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
            onMouseDown={(e) => startDrag(e, 'range')}
          />
        )}

        {/* Playhead */}
        <div className={styles.playhead} style={{ left: `${curPct}%` }} />

        {/* Bar ticks */}
        {total > 0 && total <= 200 && (
          <div className={styles.ticks}>
            {Array.from({ length: Math.min(total, 50) }, (_, i) => {
              const interval = Math.ceil(total / 50);
              const bar = i * interval;
              return (
                <div
                  key={bar}
                  className={styles.tick}
                  style={{ left: `${(bar / total) * 100}%` }}
                >
                  {bar > 0 && <span className={styles.tickLabel}>{bar + 1}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Loop handles */}
        {enabled && (
          <>
            <div
              className={`${styles.handle} ${styles.handleStart}`}
              style={{ left: `${startPct}%` }}
              onMouseDown={(e) => startDrag(e, 'start')}
              title={`Loop start: bar ${start + 1}`}
            >
              <div className={styles.handleLabel}>{start + 1}</div>
            </div>
            <div
              className={`${styles.handle} ${styles.handleEnd}`}
              style={{ left: `${endPct}%` }}
              onMouseDown={(e) => startDrag(e, 'end')}
              title={`Loop end: bar ${end}`}
            >
              <div className={styles.handleLabelEnd}>{end}</div>
            </div>
          </>
        )}
      </div>

      <div className={styles.barInfo}>
        {total > 0 && (
          <span className={styles.barNum}>
            {currentBar + 1} / {total}
          </span>
        )}
      </div>
    </div>
  );
}

function LoopIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 01-4 4H3"/>
    </svg>
  );
}
