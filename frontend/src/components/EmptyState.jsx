import React from 'react';
import styles from './EmptyState.module.css';

export default function EmptyState({ onToggleSidebar }) {
  return (
    <div className={styles.empty}>
      <div className={styles.graphic}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="31" stroke="var(--border2)" strokeWidth="1.5"/>
          <path d="M24 20v24M24 20l16 12-16 12" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="20" cy="44" r="4" stroke="var(--accent)" strokeWidth="1.5"/>
          <path d="M24 44V28" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="20" cy="28" r="4" stroke="var(--text3)" strokeWidth="1.5"/>
        </svg>
      </div>
      <h2 className={styles.title}>No file selected</h2>
      <p className={styles.sub}>Choose a Guitar Pro file from your library to start playing</p>
      <button className={styles.btn} onClick={onToggleSidebar}>
        Open Library
      </button>
    </div>
  );
}
