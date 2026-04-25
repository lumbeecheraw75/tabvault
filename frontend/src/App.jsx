import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Player from './components/Player.jsx';
import EmptyState from './components/EmptyState.jsx';
import styles from './App.module.css';

// Load cache from localStorage on startup
function loadCache() {
  try {
    const stored = localStorage.getItem('gpplayer-metacache');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [metaCache, setMetaCache] = useState(loadCache);

  // Persist metaCache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('gpplayer-metacache', JSON.stringify(metaCache));
    } catch (e) {}
  }, [metaCache]);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
  }, []);

  const handleMetaLoaded = useCallback((filename, title, artist) => {
    setMetaCache(prev => {
      const next = { ...prev, [filename]: { title, artist } };
      return next;
    });
  }, []);

  return (
    <div className={styles.app}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        metaCache={metaCache}
      />
      <main className={`${styles.main} ${!sidebarOpen ? styles.mainExpanded : ''}`}>
        {selectedFile
          ? <Player key={selectedFile.name} file={selectedFile} onMetaLoaded={handleMetaLoaded} />
          : <EmptyState onToggleSidebar={() => setSidebarOpen(true)} />
        }
      </main>
    </div>
  );
}
