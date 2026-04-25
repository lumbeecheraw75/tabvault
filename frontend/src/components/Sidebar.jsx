import React, { useState, useEffect, useRef } from 'react';
import styles from './Sidebar.module.css';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatName(name) {
  return name.replace(/\.(gp|gp3|gp4|gp5|gpx|gp6|gp7)$/i, '');
}

function getDisplayTitle(file, metaCache) {
  // Prefer backend metadata, then frontend cache, then filename
  if (file.title) return file.title;
  if (metaCache[file.name]?.title) return metaCache[file.name].title;
  return formatName(file.name);
}

function getDisplayArtist(file, metaCache) {
  if (file.artist) return file.artist;
  if (metaCache[file.name]?.artist) return metaCache[file.name].artist;
  return null;
}

export default function Sidebar({ open, onToggle, selectedFile, onFileSelect, metaCache = {} }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();
  const [editingFile, setEditingFile] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/library');
      if (!res.ok) throw new Error('Failed to load library');
      const data = await res.json();
      setFiles(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLibrary(); }, []);

  const handleUpload = async (fileList) => {
    const gpFiles = Array.from(fileList).filter(f =>
      /\.(gp|gp3|gp4|gp5|gpx|gp6|gp7)$/i.test(f.name)
    );
    if (!gpFiles.length) return;
    setUploading(true);
    try {
      await Promise.all(gpFiles.map(f => {
        const fd = new FormData();
        fd.append('file', f);
        return fetch('/api/upload', { method: 'POST', body: fd });
      }));
      await fetchLibrary();
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e, file) => {
    e.stopPropagation();
    const title = getDisplayTitle(file, metaCache);
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/file/${encodeURIComponent(file.name)}`, { method: 'DELETE' });
    if (selectedFile?.name === file.name) onFileSelect(null);
    fetchLibrary();
  };

  const handleEditSave = async (file) => {
    try {
      const res = await fetch(`/api/meta/${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, artist: editArtist }),
      });
      if (res.ok) {
        setFiles(fs => fs.map(f => f.name === file.name
          ? { ...f, title: editTitle, artist: editArtist }
          : f
        ));
      }
    } catch (e) {
      console.error('Save meta failed', e);
    }
    setEditingFile(null);
  };

  const filtered = files.filter(f => {
    const q = search.toLowerCase();
    const title = getDisplayTitle(f, metaCache).toLowerCase();
    const artist = (getDisplayArtist(f, metaCache) || '').toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      title.includes(q) ||
      artist.includes(q)
    );
  });

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  if (!open) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.toggleBtn} onClick={onToggle} title="Open library">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <span>TabVault</span>
        </div>
        <button className={styles.toggleBtn} onClick={onToggle} title="Close library">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className={styles.search}
            placeholder="Search title, artist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div
        className={`${styles.dropZone} ${dragOver ? styles.dragActive : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp6,.gp7"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files)}
        />
        {uploading ? (
          <span className={styles.uploading}>Uploading...</span>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Drop GP files or click to upload</span>
          </>
        )}
      </div>

      <div className={styles.listHeader}>
        <span>LIBRARY</span>
        <span className={styles.count}>{files.length}</span>
      </div>

      <div className={styles.fileList}>
        {loading && <div className={styles.hint}>Loading...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className={styles.hint}>
            {search ? 'No matches' : 'No files yet — upload some Guitar Pro files above'}
          </div>
        )}
        {filtered.map(file => {
          const title = getDisplayTitle(file, metaCache);
          const artist = getDisplayArtist(file, metaCache);
          return (
            <div key={file.name}>
              {editingFile === file.name ? (
                <div className={styles.editForm}>
                  <input
                    className={styles.editInput}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Title"
                    autoFocus
                  />
                  <input
                    className={styles.editInput}
                    value={editArtist}
                    onChange={e => setEditArtist(e.target.value)}
                    placeholder="Artist"
                  />
                  <div className={styles.editButtons}>
                    <button className={styles.editSave} onClick={() => handleEditSave(file)}>Save</button>
                    <button className={styles.editCancel} onClick={() => setEditingFile(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  className={`${styles.fileItem} ${selectedFile?.name === file.name ? styles.active : ''}`}
                  onClick={() => onFileSelect(file)}
                >
                  <div className={styles.fileIcon}>
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path d="M1 1h7l3 3v9H1V1z" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M8 1v3h3" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  </div>
                  <div className={styles.fileMeta}>
                    <span className={styles.fileName}>{title}</span>
                    <span className={styles.fileSize}>
                      {artist || formatSize(file.size)}
                    </span>
                  </div>
                  <button
                    className={styles.editBtn}
                    onClick={e => {
                      e.stopPropagation();
                      setEditingFile(file.name);
                      setEditTitle(title);
                      setEditArtist(artist || '');
                    }}
                    title="Edit metadata"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={e => handleDelete(e, file)}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
