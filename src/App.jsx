import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// CONFIGURAÇÕES DO APLICATIVO E ARQUIVOLOGIA
// ==========================================
const LINK_DO_ICONE_NO_GITHUB = "https://raw.githubusercontent.com/killuixo/acervo-memorabilia/main/icon-192.png";

const DEFAULT_CATEGORIES = {
  'Livros': ['Livro', 'Quadrinho', 'Revista'],
  'Discos': ['CD', 'Vinil', 'Fita Cassete'],
  'Vídeo': ['VHS', 'DVD'],
  'Games': ['Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4']
};

const DEFAULT_CLASS_CODES = {
  'Livro': '110', 'Quadrinho': '120', 'Revista': '130',
  'CD': '210', 'Vinil': '220', 'Fita Cassete': '230',
  'VHS': '310', 'DVD': '320',
  'Mega Drive': '410', 'SNES': '420', 'Wii': '430', 'PS1': '440', 'PS2': '450', 'PS4': '460'
};

const STATUS_OPTIONS = ['Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'];

// ==========================================
// AUDIO ENGINE (CHIPTUNE 8-BIT)
// ==========================================
let audioCtx = null;
let globalSoundEnabled = true;

const initAudio = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
};

const playLydianSuccess = () => {
  if (!globalSoundEnabled) return;
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); osc.type = 'square';
    const now = audioCtx.currentTime;
    const notes = [523.25, 587.33, 659.25, 739.99, 783.99, 880.00];
    const dur = 0.04;
    notes.forEach((freq, i) => osc.frequency.setValueAtTime(freq, now + i * dur));
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.setValueAtTime(0.04, now + notes.length * dur - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + notes.length * dur);
    osc.start(now); osc.stop(now + notes.length * dur);
  } catch (e) {}
};

const playChipBeep = (type) => {
  if (!globalSoundEnabled) return;
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime; const vol = 0.02;
    if (type === 'save' || type === 'success') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554.37, now + 0.05);
      gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now); osc.frequency.setValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.01, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    }
  } catch (e) {}
};

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================
let globalSequenceCache = null;

const generateId = (itemsArray = []) => {
  const now = new Date();
  const timeBase = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
  if (globalSequenceCache === null) {
    let maxSeq = 0;
    itemsArray.forEach(item => {
      const match = String(item.id || '').match(/-(\d{4})$/);
      if (match && parseInt(match[1], 10) > maxSeq) maxSeq = parseInt(match[1], 10);
    });
    globalSequenceCache = maxSeq;
  }
  globalSequenceCache++;
  return `${timeBase}-${String(globalSequenceCache).padStart(4, '0')}`;
};

const reindexCollection = (currentItems) => {
  const sorted = [...currentItems].sort((a, b) => String(a.id || '').substring(0, 18).localeCompare(String(b.id || '').substring(0, 18)));
  const classCodeCounters = {}; let globalCounter = 1;
  const reindexed = sorted.map(item => {
    let newId = item.id;
    if (item.id?.includes('-')) newId = `${item.id.split('-').slice(0, 2).join('-')}-${String(globalCounter).padStart(4, '0')}`;
    let newArchiveCode = item.archive_code;
    if (item.archive_code) {
      const archParts = String(item.archive_code).split('-');
      if (archParts.length >= 3) {
        const classCode = archParts[1];
        classCodeCounters[classCode] = (classCodeCounters[classCode] || 0) + 1;
        newArchiveCode = `${archParts[0]}-${classCode}-${String(classCodeCounters[classCode]).padStart(4, '0')}`;
      }
    }
    globalCounter++;
    return { ...item, id: newId, archive_code: newArchiveCode };
  });
  globalSequenceCache = globalCounter - 1;
  return reindexed;
};

const resizeImageForAPI = (file, maxWidth = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth; canvas.height = img.height * (maxWidth / img.width);
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      }; img.onerror = reject;
    }; reader.onerror = reject;
  });
};

const parseCSVText = (rawText) => {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let inQuotes = false; let val = '';
  for (let i = 0; i < text.length; i++) {
    let char = text[i]; let nextChar = text[i + 1];
    if (char === '"' && inQuotes && nextChar === '"') { val += '"'; i++; } 
    else if (char === '"') { inQuotes = !inQuotes; } 
    else if (char === ',' && !inQuotes) { row.push(val); val = ''; } 
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(val); rows.push(row); row = []; val = '';
    } else { val += char; }
  }
  if (val !== '' || row.length > 0) { row.push(val); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
};

const normalizeWorkTitle = title => {
  if (!title) return '';
  let t = String(title).toLowerCase().trim();
  if (t.startsWith('garfield')) return 'garfield';
  return t.replace(/(?:\s*[:-]\s*|\s+)(?:vol\.?|volume|livro|book|edição|ed\.?|pt\.?|part|parte|#)?\s*\d+(?:\.\d+)?$/i, '').trim();
};

const getSortableName = name => name ? String(name).trim().replace(/^(the|a|an|o|os|as)\s+/i, '') : '';
const isVariousArtists = name => ['various', 'vários', 'varios', 'variados', 'compilação', 'compilações'].some(k => String(name || '').toLowerCase().trim().includes(k));
const getValidYear = val => val ? (String(val).match(/\b(1[0-9]{3}|20[0-9]{2})\b/) ? parseInt(String(val).match(/\b(1[0-9]{3}|20[0-9]{2})\b/)[0], 10) : NaN) : NaN;

const applyArtistAlias = (name, aliases = []) => {
  if (!name || !Array.isArray(aliases)) return name;
  const n = name.trim().toLowerCase();
  const found = aliases.find(a => a.alias.trim().toLowerCase() === n);
  return found ? found.main : name.trim();
};

const getExternalLinkInfo = (type, title, specificLink = '') => {
  if (specificLink?.trim().startsWith('http')) return { url: specificLink.trim(), isExact: true };
  if (!title) return { url: '#', isExact: false };
  const q = encodeURIComponent(title);
  if (['CD', 'Vinil', 'Fita Cassete'].includes(type)) return { url: `https://www.discogs.com/search?q=${q}&type=all`, isExact: false };
  if (['Livro', 'Quadrinho', 'Revista'].includes(type)) return { url: `https://www.skoob.com.br/livro/lista/busca:${q}`, isExact: false };
  return { url: `https://gamefaqs.gamespot.com/search?game=${q}`, isExact: false };
};

const getMetricInfo = (itemType, activeCategories) => {
  if ((activeCategories['Livros'] || []).includes(itemType)) return { label: 'Págs', desc: 'Páginas' };
  if ((activeCategories['Discos'] || []).includes(itemType)) return { label: 'Faixas', desc: 'Faixas' };
  if ((activeCategories['Games'] || []).includes(itemType)) return { label: 'Horas', desc: 'Horas' };
  if ((activeCategories['Vídeo'] || []).includes(itemType)) return { label: 'Min', desc: 'Minutos' };
  return { label: 'Und', desc: 'Métrica' };
};

const fetchTimeout = (url, options = {}, timeoutMs = 8000) => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); reject(new Error("Timeout")); }, timeoutMs);
    fetch(url, { ...options, signal: controller.signal })
      .then(response => { clearTimeout(timer); resolve(response); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
};

const fetchCoverBySearch = async (item, settings, activeCategories) => {
  const qTitle = encodeURIComponent(item.title ? item.title.trim() : '');
  const qAuthor = encodeURIComponent(item.author_developer ? item.author_developer.trim() : '');
  const typeRaw = item.type ? item.type.trim() : '';
  const barcodeRaw = item.barcode ? item.barcode.replace(/[-\s]/g, "") : '';
  const isBook = (activeCategories['Livros'] || []).includes(typeRaw);
  const isDisc = (activeCategories['Discos'] || []).includes(typeRaw);
  const isGame = (activeCategories['Games'] || []).includes(typeRaw);

  if (barcodeRaw) {
    try { const res = await fetchTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcodeRaw}`); const data = await res.json(); if (data.items?.[0]?.images?.[0]) return data.items[0].images[0]; } catch(e) {}
    if (isBook) {
      try { const res = await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcodeRaw}`); const data = await res.json(); if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) return data.items[0].volumeInfo.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3"); } catch(e) {}
    }
    if (isDisc && settings?.discogsToken) {
      try { const res = await fetchTimeout(`https://api.discogs.com/database/search?barcode=${barcodeRaw}&token=${settings.discogsToken}`); const data = await res.json(); if (data.results?.[0]?.cover_image && !data.results[0].cover_image.includes('spacer.gif')) return data.results[0].cover_image; } catch(e) {}
    }
  }

  if (isDisc && settings?.discogsToken) {
    try {
      let formatQuery = typeRaw.toLowerCase().includes('vinil') ? '&format=vinyl' : typeRaw.toLowerCase().includes('cd') ? '&format=cd' : '';
      const res = await fetchTimeout(`https://api.discogs.com/database/search?release_title=${qTitle}&artist=${qAuthor}${formatQuery}&token=${settings.discogsToken}`);
      const data = await res.json();
      if (data.results?.[0]?.cover_image && !data.results[0].cover_image.includes('spacer.gif')) return data.results[0].cover_image;
    } catch(e) {}
  } else if (isBook) {
    try {
      const res = await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:"${item.title}"+inauthor:"${item.author_developer}"`)}&maxResults=2`);
      const data = await res.json();
      if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) return data.items[0].volumeInfo.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3");
    } catch(e) {}
  } else if (isGame) {
    try {
      const res = await fetchTimeout(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${item.title} ${typeRaw} game cover`)}&utf8=&format=json&origin=*`);
      const data = await res.json();
      if (data.query?.search?.length > 0) {
        const imgRes = await fetchTimeout(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(data.query.search[0].title)}&prop=pageimages&pithumbsize=800&format=json&origin=*`);
        const imgData = await imgRes.json();
        const pages = imgData.query?.pages;
        if (pages && Object.values(pages)[0]?.thumbnail?.source) return Object.values(pages)[0].thumbnail.source;
      }
    } catch(e) {}
  }
  return null;
};

// ==========================================
// ÍCONES SVG NATIVOS E SPINNER
// ==========================================
const Icon = ({ path, className = "w-6 h-6", onClick, fill = "none", style }) => <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" className={className} style={style}>{path}</svg>;

const DiscoSpinner = ({ className = "w-6 h-6", glow = 0, speed = 3 }) => (
  <svg viewBox="0 0 100 100" className={className} style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px currentColor)` : 'none' }}>
    <defs>
      <linearGradient id="cdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0891b2">
          <animate attributeName="stop-color" values="#0891b2;#db2777;#d97706;#0891b2" dur={`${speed}s`} repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stopColor="#db2777">
          <animate attributeName="stop-color" values="#db2777;#d97706;#0891b2;#db2777" dur={`${speed}s`} repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="#d97706">
          <animate attributeName="stop-color" values="#d97706;#0891b2;#db2777;#d97706" dur={`${speed}s`} repeatCount="indefinite" />
        </stop>
      </linearGradient>
    </defs>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur={`${speed}s`} repeatCount="indefinite" />
      <circle cx="50" cy="50" r="46" fill="url(#cdGradient)" />
      <circle cx="50" cy="50" r="14" fill="black">
        <animate attributeName="fill" values="black;white;black" dur={`${speed}s`} repeatCount="indefinite" />
      </circle>
    </g>
  </svg>
);

const Search = p => <Icon {...p} path={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const Library = p => <Icon {...p} path={<><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>} />;
const PlusSquare = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3"/><path d="M8 12h8"/><path d="M12 8v8"/></>} />;
const BarChart2 = p => <Icon {...p} path={<><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></>} />;
const Settings = p => <Icon {...p} path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>} />;
const Camera = p => <Icon {...p} path={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />;
const Sun = p => <Icon {...p} path={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>} />;
const Download = p => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />;
const Upload = p => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>} />;
const ExternalLink = p => <Icon {...p} path={<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>} />;
const Star = ({ className = '', onClick, style }) => <Icon onClick={onClick} className={className} style={style} fill={className.includes('fill') ? 'currentColor' : 'none'} path={<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>} />;
const ChevronLeft = p => <Icon {...p} path={<path d="m15 18-6-6 6-6"/>} />;
const ChevronRight = p => <Icon {...p} path={<path d="m9 18 6-6-6-6"/>} />;
const ChevronDown = p => <Icon {...p} path={<path d="m6 9 6 6 6-6"/>} />;
const ChevronUp = p => <Icon {...p} path={<path d="m18 15-6-6-6 6"/>} />;
const Check = p => <Icon {...p} path={<path d="M20 6 9 17l-5-5"/>} />;
const ScanLine = p => <Icon {...p} path={<><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></>} />;
const Ghost = p => <Icon {...p} path={<><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></>} />;
const LibraryBig = p => <Icon {...p} path={<><rect width="8" height="18" x="3" y="3"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></>} />;
const AlertTriangle = p => <Icon {...p} path={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} />;
const Sparkles = p => <Icon {...p} path={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;
const FilterIcon = p => <Icon {...p} path={<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>} />;
const Smartphone = p => <Icon {...p} path={<><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>} />;
const DiscIcon = p => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></>} />;
const XIcon = p => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const Zap = p => <Icon {...p} path={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />;
const ListIcon = p => <Icon {...p} path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} />;
const Share = p => <Icon {...p} path={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>} />;
const Headphones = p => <Icon {...p} path={<><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></>} />;
const ImageIcon = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></>} />;
const Trash2 = p => <Icon {...p} path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} />;
const MonitorPlay = p => <Icon {...p} path={<><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M14 21h-4"/><path d="M12 17v4"/><path d="m10 13 5-3-5-3v6z"/></>} />;

// ==========================================
// PWA ENGINE
// ==========================================
const usePWA = (iconUrl) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const manifest = { name: "Memorabilia", short_name: "Memorabilia", display: "standalone", background_color: "#ffffff", theme_color: "#000000", icons: [{ src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" }] };
    const manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement('link'); manifestLink.rel = 'manifest'; document.head.appendChild(manifestLink); }
    manifestLink.href = manifestUrl;
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(URL.createObjectURL(new Blob([`self.addEventListener('fetch', (e) => {});`], { type: 'application/javascript' }))).catch(() => {});

    const handlePrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, [iconUrl]);

  const promptInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setIsInstalled(true); }
  };
  return { isInstallable: !!installPrompt, promptInstall, isInstalled };
};

// ==========================================
// COMPONENTES UI MONDRIAN 
// Simplificado para 3 Cores Principais: Ciano, Pink, Amber
// ==========================================
const getChartColors = darkMode => darkMode ? ['#0891b2', '#db2777', '#f59e0b', '#06b6d4', '#ec4899', '#d97706'] : ['#0891b2', '#db2777', '#d97706', '#06b6d4', '#ec4899', '#f59e0b'];
const getMondrianColor = (index, darkMode) => darkMode ? ['bg-cyan-600', 'bg-pink-600', 'bg-amber-500'][index % 3] : ['bg-cyan-600', 'bg-pink-600', 'bg-amber-600'][index % 3];
const getMondrianColorHex = (index, darkMode) => getChartColors(darkMode)[index % 3];

const MContainer = ({ children, className = '', colorClass = '', darkMode, onClick }) => (
  <div onClick={onClick} className={`border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} ${colorClass} ${className} transition-colors duration-300`}>
    {children}
  </div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false, title }) => {
  let bg = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'pink') bg = darkMode ? 'bg-pink-600 text-white' : 'bg-pink-600 text-white';
  if (variant === 'cyan') bg = darkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-600 text-white';
  if (variant === 'amber') bg = darkMode ? 'bg-amber-500 text-black' : 'bg-amber-600 text-white';
  if (variant === 'black') bg = darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white';

  return (
    <button title={title} disabled={disabled} onClick={(e) => { playChipBeep('click'); onClick && onClick(e); }} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} ${disabled ? 'opacity-50 shadow-none translate-y-1 translate-x-1' : 'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bg} ${className}`}>
      {icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, onBlur, type = "text", placeholder = "", multiline = false, darkMode, readOnly = false }) => (
  <div className="flex flex-col w-full h-full mb-1.5">
    {label && <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>{label}</label>}
    {multiline ? (
      <textarea readOnly={readOnly} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-amber-100 dark:focus:bg-amber-900'} transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input readOnly={readOnly} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-cyan-100 dark:focus:bg-cyan-900'} transition-colors`} />
    )}
  </div>
);

const MRadio = ({ label, checked, onChange, darkMode }) => (
    <label className={`flex items-center justify-between p-3 cursor-pointer border-b-[2px] transition-colors active:bg-black/5 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} onClick={onChange}>
       <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{label}</span>
       <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${checked ? (darkMode ? 'border-cyan-400' : 'border-cyan-600') : (darkMode ? 'border-gray-500' : 'border-gray-400')}`}>
          {checked && <div className={`w-2.5 h-2.5 rounded-full ${darkMode ? 'bg-cyan-400' : 'bg-cyan-600'}`} />}
       </div>
    </label>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4 animate-in zoom-in duration-200" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-[2px] pb-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>{title}</h3>
        <p className="text-sm font-bold opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="pink" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

const MondrianHBar = ({ label, value, max, index, darkMode, valueFormatter = (v)=>v, onClick, showValue = true }) => (
  <div className={`flex items-center gap-2 w-full mb-2 ${onClick ? 'cursor-pointer group' : ''}`} onClick={(e) => { if(onClick) { playChipBeep('click'); onClick(e); } }}>
    <div className={`w-20 text-[9px] font-black uppercase tracking-widest truncate ${onClick ? 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors' : ''}`} title={label}>{label}</div>
    <div className={`flex-1 h-6 border-[2px] ${darkMode ? 'bg-gray-800 border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-gray-200 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} flex relative overflow-hidden ${onClick ? 'group-active:translate-y-0.5 group-active:translate-x-0.5 group-active:shadow-none transition-all' : ''}`}>
      <div className={`h-full transition-all duration-1000 ${getMondrianColor(index, darkMode)}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      {showValue && <span className={`absolute inset-0 flex items-center ml-2 text-[10px] font-black ${darkMode ? 'text-white' : 'text-black'} drop-shadow-md mix-blend-difference`}>{valueFormatter(value)}</span>}
    </div>
  </div>
);

const MondrianStackedBar = ({ data, total, darkMode }) => {
  if (total === 0) return null;
  return (
    <div className="w-full flex flex-col gap-1 mt-2">
      <div className={`w-full h-6 border-[2px] flex ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
        {data.map((d, i) => (
          <div key={i} title={`${d.label}: ${d.value} (${((d.value/total)*100).toFixed(1)}%)`} className={`h-full transition-all duration-1000 flex items-center justify-center overflow-hidden cursor-help`} style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.colorHex }}>
            {d.value / total > 0.15 && <span className="text-[8px] font-black text-white mix-blend-difference drop-shadow-md truncate px-1">{d.label}</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between text-[8px] font-black uppercase tracking-widest opacity-70 mt-1">
         {data.map((d, i) => <span key={i}>{d.label}: {((d.value/total)*100).toFixed(0)}%</span>)}
      </div>
    </div>
  );
};

const MondrianDonutChart = ({ title, data, darkMode, onSliceClick }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) return null;
  let currentAngle = 0;
  const slices = data.map((item, idx) => {
      const p = (item.value / total) * 100;
      const s = currentAngle;
      const e = currentAngle + p;
      currentAngle = e;
      return { ...item, s, e, p, idx };
  });

  const grad = slices.map(s => `${s.colorHex} ${s.s}% ${s.e}%`).join(', ');

  return (
    <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-between h-full w-full" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
      <div className={`text-[10px] font-black uppercase tracking-widest mb-4 w-full border-b-[2px] pb-2 text-center ${darkMode ? 'border-gray-300' : 'border-black'}`}>{title}</div>
      
      <div className="relative w-32 h-32 flex-shrink-0 mb-4 group cursor-pointer" onClick={() => onSliceClick && onSliceClick(null)} title="Limpar filtro deste gráfico">
        <div className={`absolute inset-0 rounded-full border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} transition-transform group-active:scale-95`} style={{ background: `conic-gradient(${grad})` }}></div>
        <div className={`absolute inset-0 m-auto w-14 h-14 rounded-full border-[2px] ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'} flex items-center justify-center group-active:scale-95 transition-transform`}>
           <span className="text-[9px] font-black">{total}</span>
        </div>
      </div>

      <div className="flex flex-col w-full gap-1.5 mt-auto">
        {slices.map((item, idx) => (
          <div key={idx} onClick={() => { if(onSliceClick) { playChipBeep('click'); onSliceClick(item.originalLabel || item.label); } }} className={`flex items-center justify-between text-[9px] font-black uppercase tracking-widest p-1 border-[2px] border-transparent ${onSliceClick ? 'cursor-pointer hover:border-current active:scale-95 transition-all' : ''}`}>
            <div className="flex items-center gap-2 truncate">
              <div className={`w-3 h-3 flex-shrink-0 border-[2px] ${darkMode ? 'border-gray-300' : 'border-black'}`} style={{ backgroundColor: item.colorHex }}></div>
              <span className="truncate" title={item.label}>{item.label}</span>
            </div>
            <span className="flex-shrink-0 opacity-80">{item.value} ({item.p.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </MContainer>
  );
};

const MetricCard = ({ label, value, subtext, darkMode, highlight = false, icon, onClick }) => (
  <div onClick={onClick} className={`p-3 border-[2px] flex flex-col justify-between transition-all ${onClick ? 'cursor-pointer active:scale-95 hover:shadow-lg' : ''} ${highlight ? (darkMode ? 'bg-cyan-900 border-cyan-400 text-cyan-50 shadow-[2px_2px_0px_#22d3ee]' : 'bg-cyan-100 border-cyan-600 text-cyan-900 shadow-[2px_2px_0px_#0891b2]') : (darkMode ? 'bg-gray-800 border-gray-300 text-white' : 'bg-gray-50 border-black text-black')}`}>
     <div className="flex justify-between items-start mb-2">
       <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-tight pr-1">{label}</span>
       {icon && <span className="opacity-50 flex-shrink-0">{icon}</span>}
     </div>
     <div className={`text-2xl font-black ${highlight ? (darkMode ? 'text-cyan-300' : 'text-cyan-700') : ''}`}>{value}</div>
     {subtext && <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1 truncate" title={subtext}>{subtext}</div>}
  </div>
);

const syncItemToSheets = (itemToSync, googleSheetsUrl) => {
  if (googleSheetsUrl) {
    fetch(googleSheetsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(itemToSync) }).catch(e => console.error("Erro Google Sheets:", e));
  }
};

const syncDeleteToSheets = (deletedId, googleSheetsUrl) => {
  if (googleSheetsUrl) {
    fetch(googleSheetsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _action: 'delete', id: deletedId }) }).catch(e => console.error("Erro Google Sheets:", e));
  }
};

// ==========================================
// ABAS DA APLICAÇÃO
// ==========================================
const LibraryTab = ({ items, setItems, filteredItems, setFilteredItems, darkMode, settings, onShowToast, activeCategories, page, setPage }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  
  const itemsPerPage = 12;

  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleItemPressStart = (item) => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => { isLongPress.current = true; setContextMenuItem(item); }, 500);
  };
  const handleItemPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleItemClick = (item) => { if (!isLongPress.current) handleSelect(item); };

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  }, [filteredItems, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  const handleSelect = (item) => { setSelectedItem(item); setEditedItem({ ...item }); };

  const updateRatingList = (id, r) => {
    const u = { ...items.find(i => i.id === id), rating: r };
    setItems(items.map(item => item.id === id ? u : item));
    playChipBeep('save');
    onShowToast('success');
    syncItemToSheets(u, settings?.googleSheetsUrl);
  };

  const saveModifications = () => {
    let statusToSave = editedItem.status;
    if (statusToSave === 'Backlog') statusToSave = 'Não Iniciado';

    const itemToSave = { ...editedItem, status: statusToSave };
    setItems(items.map(i => i.id === itemToSave.id ? itemToSave : i));
    setSelectedItem(itemToSave);
    playChipBeep('save');
    onShowToast('success');
    syncItemToSheets(itemToSave, settings?.googleSheetsUrl);
  };

  const handleSearchCover = async () => {
    setIsSearchingCover(true);
    try {
      const newCover = await fetchCoverBySearch(editedItem, settings, activeCategories);
      if (newCover) {
        setEditedItem(prev => ({ ...prev, cover_url: newCover }));
        playChipBeep('success'); onShowToast('success');
      } else { playChipBeep('error'); }
    } catch (e) { playChipBeep('error'); } finally { setIsSearchingCover(false); }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
       const updatedList = items.filter(item => item.id !== itemToDelete);
       const reindexedList = reindexCollection(updatedList);
       setItems(reindexedList);
       setItemToDelete(null); setSelectedItem(null); setEditedItem(null);
       playChipBeep('save'); onShowToast('success');

       if (settings?.googleSheetsUrl) {
          syncDeleteToSheets(itemToDelete, settings.googleSheetsUrl);
          for (let i = 0; i < reindexedList.length; i++) {
             const newItem = reindexedList[i]; const oldItem = updatedList[i];
             if (newItem.id !== oldItem.id) {
                syncDeleteToSheets(oldItem.id, settings.googleSheetsUrl);
                await new Promise(r => setTimeout(r, 400));
                syncItemToSheets(newItem, settings.googleSheetsUrl);
                await new Promise(r => setTimeout(r, 400));
             } else if (newItem.archive_code !== oldItem.archive_code) {
                syncItemToSheets(newItem, settings.googleSheetsUrl);
                await new Promise(r => setTimeout(r, 400));
             }
          }
       }
    }
  };

  if (selectedItem && editedItem) {
    const isBookOrGame = [...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(editedItem.type);
    const isDiscItem = (activeCategories['Discos'] || []).includes(editedItem.type);
    const linkInfo = getExternalLinkInfo(editedItem.type, editedItem.title);
    const metricLabel = getMetricInfo(editedItem.type, activeCategories).label;
    const imageContainerClass = isDiscItem ? "w-40 h-40 md:w-56 md:h-56 aspect-square" : "w-32 h-44 md:w-48 md:h-64 aspect-[3/4]";

    return (
      <div className="flex flex-col h-full pb-20 relative max-w-4xl mx-auto w-full">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title}"?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />

        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[2px] ${darkMode ? 'border-gray-300 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black bg-gray-100 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[2px] font-black uppercase text-[10px] tracking-widest ${darkMode ? 'bg-cyan-600 border-gray-300 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black bg-cyan-600 text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}>Salvar</button>
        </MContainer>

        <div className="flex-1 overflow-y-auto px-1 flex flex-col gap-2.5 pb-10 scrollbar-hide">
          <div className="flex gap-3 flex-col md:flex-row md:items-start">
            <MContainer darkMode={darkMode} className={`${imageContainerClass} flex-shrink-0 flex items-center justify-center overflow-hidden mx-auto md:mx-0`} colorClass={`border-[2px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {editedItem.cover_url ? <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" /> : <LibraryBig className={`w-10 h-10 md:w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[2px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-300 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="text" darkMode={darkMode} />
            <MInput label={metricLabel} value={editedItem.pages_or_time || ''} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} type="text" darkMode={darkMode} />
            <div className="col-span-2"><MInput label="Editora/Gravadora" value={editedItem.publisher || ''} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <MInput label="URL da Capa" value={editedItem.cover_url || ''} onChange={e => setEditedItem({...editedItem, cover_url: e.target.value})} darkMode={darkMode} />
            <MInput label="Localização" value={editedItem.location || ''} onChange={e => setEditedItem({...editedItem, location: e.target.value})} darkMode={darkMode} />
          </div>

          <div className="flex gap-2 flex-col sm:flex-row">
            {isBookOrGame && (
              <MContainer darkMode={darkMode} className="flex-1 p-2" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[2px] pb-1 ${darkMode ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Status</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[2px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${editedItem.status === opt ? (darkMode ? 'bg-cyan-600 border-gray-300 text-white' : 'bg-cyan-600 border-black text-white') : (darkMode ? 'bg-gray-900 border-gray-300 text-gray-400' : 'bg-white border-black text-black')}`}>{opt}</button>)}
                </div>
              </MContainer>
            )}
            <MContainer darkMode={darkMode} className="flex-1 p-2" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[2px] pb-1 ${darkMode ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Sua Avaliação</label>
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setEditedItem({...editedItem, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= (editedItem.rating || 0) ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
              </div>
            </MContainer>
          </div>

          <MInput label="Descrição" multiline value={editedItem.description || ''} onChange={e => setEditedItem({...editedItem, description: e.target.value})} darkMode={darkMode} />
          <MInput label="Código de Barras/Catálogo" value={editedItem.barcode || ''} onChange={e => setEditedItem({...editedItem, barcode: e.target.value})} darkMode={darkMode} />
          
          <MContainer darkMode={darkMode} className="p-2" colorClass={darkMode ? 'bg-gray-800 border-amber-500/50 text-white' : 'bg-amber-50 text-black'}>
            <MInput label="Anotações" multiline value={editedItem.notes || ''} onChange={e => setEditedItem({...editedItem, notes: e.target.value})} darkMode={darkMode} />
          </MContainer>

          <div className="flex gap-2 flex-col sm:flex-row mt-1">
            <a href={linkInfo.url} target="_blank" rel="noopener noreferrer" className={`flex-1 p-3 border-[2px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 border-gray-300 text-cyan-400' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-cyan-100 border-black text-cyan-800'} flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none`}><ExternalLink className="w-4 h-4 flex-shrink-0" /> <span className="truncate">Buscar na Web</span></a>
            {isDiscItem && <a href={`https://open.spotify.com/search/${encodeURIComponent((editedItem.title || '') + ' ' + (editedItem.author_developer || ''))}`} target="_blank" rel="noopener noreferrer" className={`flex-1 p-3 border-[2px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 border-gray-300 text-cyan-400' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-cyan-100 border-black text-cyan-800'} flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none`}><Headphones className="w-4 h-4 flex-shrink-0" /> <span className="truncate">Spotify</span></a>}
          </div>

          <button onClick={saveModifications} className={`w-full mt-2 py-3 border-[2px] font-black uppercase text-[12px] tracking-widest flex items-center justify-center gap-2 ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-cyan-600 border-gray-300 text-white' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-cyan-600 border-black text-white'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}><Check className="w-5 h-5" /> Salvar Alterações</button>

          <div className="mt-4 mb-2 flex flex-row items-center justify-center gap-6">
            <button onClick={() => setItemToDelete(editedItem.id)} className={`text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 underline flex items-center gap-1 ${darkMode ? 'text-gray-400 hover:text-pink-400' : 'text-gray-500 hover:text-pink-600'}`}><Trash2 className="w-3 h-3" /> Apagar este item</button>
            <span className="opacity-20 text-[9px] font-black">|</span>
            <button disabled={isSearchingCover} onClick={handleSearchCover} className={`text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 underline flex items-center gap-1 ${darkMode ? 'text-gray-400 hover:text-cyan-400' : 'text-gray-500 hover:text-cyan-600'}`}>
                {isSearchingCover ? <DiscoSpinner className="w-3 h-3 flex-shrink-0" speed={2} /> : <ImageIcon className="w-3 h-3" />}{isSearchingCover ? 'Buscando...' : 'Procurar Capa'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem?.title}"?`} onConfirm={confirmDelete} onCancel={() => {setItemToDelete(null); setEditedItem(null);}} darkMode={darkMode} confirmText="Apagar" />

      {contextMenuItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setContextMenuItem(null)}>
          <MContainer darkMode={darkMode} className="w-full max-w-xs p-0 flex flex-col overflow-hidden animate-in zoom-in duration-200" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} onClick={(e) => e.stopPropagation()}>
             <div className={`p-4 border-b-[2px] ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'} flex justify-between items-center`}><div className="flex flex-col overflow-hidden pr-2"><span className="text-sm font-black truncate leading-tight">{contextMenuItem.title}</span><span className="text-[9px] uppercase tracking-widest opacity-70 truncate mt-0.5">{contextMenuItem.author_developer||'--'}</span></div><button onClick={() => setContextMenuItem(null)} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button></div>
             <div className="flex flex-col">
                <button onClick={() => { handleSelect(contextMenuItem); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-[2px] ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-white' : 'border-gray-200 hover:bg-gray-50 text-black'} transition-colors text-left`}><Settings className="w-5 h-5" /> Editar Detalhes</button>
                <button onClick={() => { window.open(`https://open.spotify.com/search/${encodeURIComponent((contextMenuItem.title||'')+' '+(contextMenuItem.author_developer||''))}`, '_blank'); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-[2px] ${darkMode ? 'border-gray-700 hover:bg-cyan-900/30' : 'border-gray-200 hover:bg-cyan-50'} transition-colors text-cyan-600 text-left`}><Headphones className="w-5 h-5" /> Ouvir (Spotify)</button>
                <button onClick={() => { window.open(`https://www.discogs.com/search?q=${contextMenuItem.barcode||encodeURIComponent((contextMenuItem.title||'')+' '+(contextMenuItem.author_developer||''))}&type=all`, '_blank'); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-[2px] ${darkMode ? 'border-gray-700 hover:bg-amber-900/30' : 'border-gray-200 hover:bg-amber-50'} transition-colors text-amber-600 text-left`}><DiscIcon className="w-5 h-5" /> Buscar Preço (Discogs)</button>
                <button onClick={() => { setEditedItem(contextMenuItem); setItemToDelete(contextMenuItem.id); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-colors text-pink-600 text-left`}><XIcon className="w-4 h-4" /> Apagar Item</button>
             </div>
          </MContainer>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-20 px-1 pt-1 scrollbar-hide">
        {paginatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] p-10 opacity-50 text-center"><Ghost className="w-12 h-12 mb-4" /><span className="text-sm font-sans font-black uppercase tracking-widest">Nenhum item localizado.</span><span className="text-[10px] font-bold mt-2">Verifique as regras do filtro no topo.</span></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row min-h-[140px] cursor-pointer active:scale-[0.98] transition-transform hover:-translate-y-1 hover:shadow-lg" onContextMenu={e => e.preventDefault()} onTouchStart={() => handleItemPressStart(item)} onTouchEnd={handleItemPressEnd} onTouchMove={handleItemPressEnd} onMouseDown={() => handleItemPressStart(item)} onMouseUp={handleItemPressEnd} onMouseLeave={handleItemPressEnd} onClick={() => handleItemClick(item)}>
                <MContainer darkMode={darkMode} className="w-5 border-r-0 rounded-l-sm flex-shrink-0" colorClass={getMondrianColor(idx, darkMode)} />
                <MContainer darkMode={darkMode} className="flex-1 flex flex-row p-2 rounded-r-sm" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>
                  <div className="flex-1 flex flex-col justify-between pr-3 pointer-events-none">
                    <div className="flex flex-col">
                      <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1.5 break-words">{item.type||'--'} • {item.year||'--'} {item.pages_or_time ? `• ${item.pages_or_time} ${getMetricInfo(item.type, activeCategories).label}` : ''}</div>
                      <div className="text-sm font-black leading-tight break-words whitespace-normal mb-1">{item.title || 'S/ Título'}</div>
                      <div className="text-[10px] font-bold opacity-80 uppercase tracking-wide break-words whitespace-normal">{item.author_developer || '--'}</div>
                    </div>
                    <div className="mt-3 flex items-end">{[...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(item.type) ? <div className={`text-[8px] px-2 py-1 border-[2px] ${darkMode ? 'border-gray-300 bg-cyan-800 text-cyan-300' : 'border-black bg-amber-500 text-white'} font-black uppercase tracking-widest w-max`}>{item.status || '--'}</div> : <div />}</div>
                 </div>
                 <div className={`w-24 sm:w-28 flex-shrink-0 flex flex-col items-center justify-between border-l-[2px] pl-2 py-0.5 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className={`w-full ${(activeCategories['Discos'] || []).includes(item.type) ? 'aspect-square' : 'border-[2px] aspect-[3/4]'} ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-black'} flex items-center justify-center overflow-hidden mb-2 shadow-[2px_2px_0px_currentColor]`}>
                       {item.cover_url ? <img src={item.cover_url} alt="Capa" className="w-full h-full object-cover"/> : <LibraryBig className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'} opacity-50`}/>}
                    </div>
                    <div className="flex flex-nowrap justify-center items-center gap-0.5 pointer-events-auto w-full" onClick={e => e.stopPropagation()}>
                       {item.rating === 5 ? (
                         <div title="Obra-Prima! (Clique para redefinir a nota)"><Star onClick={() => updateRatingList(item.id, 0)} className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] cursor-pointer fill-current drop-shadow-[0_0_5px_currentColor] active:scale-90 transition-transform" style={{ animation: `titleColorCycle ${settings?.marqueeSpeed || 35}s linear infinite` }} /></div>
                       ) : (
                         [1, 2, 3, 4, 5].map((star) => <Star key={star} onClick={() => updateRatingList(item.id, star)} className={`w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] cursor-pointer flex-shrink-0 active:scale-90 transition-transform ${star <= (item.rating || 0) ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)
                       )}
                    </div>
                 </div>
                </MContainer>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 mb-4 max-w-lg mx-auto">
            <MButton darkMode={darkMode} onClick={() => { setPage(Math.max(0, page - 1)); document.querySelector('.overflow-y-auto').scrollTo(0,0); }} className="w-12 h-10" disabled={page === 0}><ChevronLeft className="w-5 h-5" /></MButton>
            <div className="font-sans text-[10px] font-black uppercase tracking-widest">Pág {page + 1} / {totalPages}</div>
            <MButton darkMode={darkMode} onClick={() => { setPage(Math.min(totalPages - 1, page + 1)); document.querySelector('.overflow-y-auto').scrollTo(0,0); }} className="w-12 h-10" disabled={page === totalPages - 1}><ChevronRight className="w-5 h-5" /></MButton>
          </div>
        )}
      </div>
    </div>
  );
};

const AddTab = ({ items, setItems, settings, darkMode, addMode, setAddMode, setActiveTab, onShowToast, triggerGlobalAI, globalAiState, globalAiMessage, resetGlobalAi, scannedAIData, setScannedAIData, isHtml5QrcodeLoaded, activeCategories, activeClassCodes, allTypes }) => {
  const [scanBox, setScanBox] = useState({ state: 'idle', message: '' });
  const scannerRef = useRef(null); const isProcessingScan = useRef(false);
  const [formData, setFormData] = useState({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);

  const updateStatus = (state, message) => setScanBox({ state, message });
  const changeMode = (newMode) => { setAddMode(newMode); if (newMode !== 'manual') { updateStatus('idle', ''); resetGlobalAi(); } };

  useEffect(() => {
    if (scannedAIData) {
       setFormData(prev => ({ ...prev, title: scannedAIData.title||'', author_developer: scannedAIData.author_developer||'', year: scannedAIData.year?.toString()||'', publisher: scannedAIData.publisher||'', description: scannedAIData.description||'', barcode: scannedAIData.barcode||'', pages_or_time: scannedAIData.pages_or_time||prev.pages_or_time, type: allTypes.includes(scannedAIData.type) ? scannedAIData.type : 'Livro' }));
       setScannedAIData(null);
    }
  }, [scannedAIData, setScannedAIData, allTypes]);

  const displayBoxState = globalAiState !== 'idle' ? globalAiState : scanBox.state;
  const displayBoxMessage = globalAiState !== 'idle' ? globalAiMessage : scanBox.message;

  useEffect(() => {
    let isMounted = true; let scannerInstance = null;
    if (addMode === 'barcode' && isHtml5QrcodeLoaded && window.Html5Qrcode) {
        scannerInstance = new window.Html5Qrcode("reader-barcode"); scannerRef.current = scannerInstance;
        scannerInstance.start({ facingMode: "environment" }, { fps: 10, qrbox: function(w, h) { return { width: window.innerWidth > 400 ? 300 : w * 0.85, height: 150 }; }, useBarCodeDetectorIfSupported: true, formatsToSupport: [ window.Html5QrcodeSupportedFormats.EAN_13, window.Html5QrcodeSupportedFormats.EAN_8, window.Html5QrcodeSupportedFormats.UPC_A, window.Html5QrcodeSupportedFormats.UPC_E, window.Html5QrcodeSupportedFormats.CODE_128, window.Html5QrcodeSupportedFormats.CODE_39 ] }, (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            if (scannerRef.current?.getState() === 2) {
               scannerRef.current.stop().then(() => { if (isMounted) { setAddMode('manual'); setFormData(prev => ({ ...prev, barcode: decodedText })); fetchMultiDatabaseParallel(decodedText); setTimeout(() => { isProcessingScan.current = false; }, 2000); } }).catch(e => {});
            }
          }, () => {}).catch(() => { if (isMounted) { updateStatus('error', 'Erro Câmera.'); setAddMode('manual'); } });
    }
    return () => {
        isMounted = false;
        if (scannerInstance) { try { if (scannerInstance.getState() === 2 || scannerInstance.getState() === 1) { scannerInstance.stop().then(() => scannerInstance.clear()).catch(()=>{}); } else { scannerInstance.clear(); } } catch(e) {} scannerRef.current = null; }
    };
  }, [addMode, isHtml5QrcodeLoaded]);

  const fetchMultiDatabaseParallel = async (barcode) => {
    const cleanCode = barcode.replace(/[-\s]/g, "").toUpperCase();
    updateStatus('loading', 'Consultando bancos de dados...');
    const isBookCode = (cleanCode.length === 13 && (cleanCode.startsWith("978") || cleanCode.startsWith("979"))) || (cleanCode.length === 10 && /^\d{9}[\dX]$/.test(cleanCode));
    const fetchers = [];

    const fetchDiscogs = async () => {
      if (!settings?.discogsToken) throw new Error("No token");
      const res = await fetchTimeout(`https://api.discogs.com/database/search?barcode=${cleanCode}&token=${settings.discogsToken}`); const data = await res.json();
      if (!data.results || data.results.length === 0) throw new Error("Not found");
      const item = data.results[0]; const titleParts = item.title ? item.title.split(' - ') : [];
      let discType = 'CD'; const fStr = (item.format || []).join(' ').toLowerCase();
      if (fStr.includes('vinyl') || fStr.includes('lp')) discType = 'Vinil'; else if (fStr.includes('cassette')) discType = 'Fita Cassete';
      let coverUrl = item.cover_image || ''; if (coverUrl.includes('spacer.gif')) coverUrl = '';
      return { title: titleParts.slice(1).join(' - ').trim() || item.title || '', author_developer: titleParts[0]?.trim() || '', year: item.year || '', publisher: item.label?.[0] || '', cover_url: coverUrl, type: discType };
    };

    const fetchMBrainz = async () => {
      const res = await fetchTimeout(`https://musicbrainz.org/ws/2/release/?query=barcode:${cleanCode}&fmt=json&inc=media+labels`); const data = await res.json();
      if (!data.releases || data.releases.length === 0) throw new Error("Not found");
      const release = data.releases[0]; let fmt = 'CD'; let tc = '';
      if (release.media && release.media.length > 0) { const m = release.media[0]; const fStr = m.format?.toLowerCase() || ''; if (fStr.includes('vinyl') || fStr.includes('12"')) fmt = 'Vinil'; else if (fStr.includes('cassette')) fmt = 'Fita Cassete'; if (m['track-count']) tc = `${m['track-count']}`; }
      let coverUrl = ''; try { const caaRes = await fetchTimeout(`https://coverartarchive.org/release/${release.id}/front`, {}, 3000); if (caaRes.ok) coverUrl = caaRes.url; } catch (e) { }
      return { title: release.title || "", author_developer: release["artist-credit"]?.map(a=>a.name).join(", ") || "", publisher: release.label || release["label-info"]?.[0]?.label?.name || "", year: release.date?.substring(0,4) || "", type: fmt, pages_or_time: tc, cover_url: coverUrl };
    };

    const fetchUPC = async () => {
      const res = await fetchTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`); const data = await res.json();
      if (!data.items || data.items.length === 0) throw new Error("Not found");
      const item = data.items[0]; const cat = String(item.category || "").toLowerCase(); const tit = String(item.title || "").toLowerCase(); let fmt = 'Livro';
      if (cat.includes('music') || tit.includes(' cd') || tit.includes('album')) fmt = 'CD'; else if (cat.includes('video game') || cat.includes('nintendo') || cat.includes('playstation') || cat.includes('xbox') || tit.includes('ps4') || tit.includes('xbox')) fmt = 'PS4'; else if (cat.includes('dvd') || cat.includes('movie') || tit.includes('dvd') || cat.includes('blu-ray') || tit.includes('blu-ray')) fmt = 'DVD';
      return { title: item.title || "", publisher: item.brand || item.publisher || "", cover_url: item.images?.[0] || "", type: fmt, description: item.description || "" };
    };

    const fetchGBooks = async () => {
      const res = await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`); const data = await res.json();
      if (!data.items || data.items.length === 0) throw new Error("Not found");
      const info = data.items[0].volumeInfo; let fmt = 'Livro'; const pub = String(info.publisher || "").toLowerCase();
      if (pub.includes('jbc') || pub.includes('conrad') || pub.includes('panini') || pub.includes('marvel') || pub.includes('dc comics')) fmt = 'Quadrinho';
      let coverUrl = ""; if (info.imageLinks?.thumbnail) { coverUrl = info.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3"); }
      return { title: info.title || "", author_developer: info.authors?.join(", ") || "", publisher: info.publisher || "", year: info.publishedDate?.substring(0,4) || "", pages_or_time: info.pageCount?.toString() || "", cover_url: coverUrl, description: info.description || "", type: fmt };
    };

    const fetchBrasilAPI = async () => {
      const res = await fetchTimeout(`https://brasilapi.com.br/api/isbn/v1/${cleanCode}`); const data = await res.json();
      if (!data || !data.title) throw new Error("Not found");
      return { title: data.title, author_developer: data.authors?.join(", ") || "", publisher: data.publisher || "", year: data.year ? data.year.toString() : "", pages_or_time: data.page_count ? data.page_count.toString() : "", type: 'Livro', cover_url: data.cover_url || "", description: data.synopsis || "" };
    };

    const fetchOpenLibrary = async () => {
      const res = await fetchTimeout(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&format=json&jscmd=data`); const data = await res.json();
      const book = data[`ISBN:${cleanCode}`] || data[`ISBN:${cleanCode.substring(3)}`]; 
      if (!book) throw new Error("Not found");
      return { title: book.title || "", author_developer: book.authors?.map(a=>a.name).join(", ") || "", publisher: book.publishers?.map(p=>p.name).join(", ") || "", year: book.publish_date ? book.publish_date.substring(0,4) : "", pages_or_time: book.number_of_pages ? book.number_of_pages.toString() : "", type: 'Livro', cover_url: book.cover?.large || book.cover?.medium || "" };
    };

    if (isBookCode) fetchers.push(fetchGBooks(), fetchUPC(), fetchBrasilAPI(), fetchOpenLibrary());
    else { fetchers.push(fetchMBrainz(), fetchUPC()); if (settings?.discogsToken) fetchers.push(fetchDiscogs()); }

    try {
      const foundItem = await Promise.any(fetchers); playChipBeep('success'); updateStatus('success', 'Encontrado com velocidade!');
      setFormData(prev => ({ ...prev, ...foundItem, barcode: cleanCode }));
    } catch (e) { playChipBeep('error'); updateStatus('error', 'Item não localizado nos bancos. Preencha manualmente.'); }
  };

  const handleSave = () => {
    if (!formData.title) { playChipBeep('error'); setShowErrorModal(true); return; }
    
    // Treat Backlog as Não Iniciado conceptually, but user can only pick the basic 4 in the form
    const classCode = activeClassCodes[formData.type] || '000'; const prefix = settings?.archivePrefix ? settings.archivePrefix.trim().toUpperCase() : 'MBU'; let maxSeq = 0;
    items.forEach(item => { if(item.archive_code) { const parts = String(item.archive_code).split('-'); if (parts.length >= 3 && parts[1] === classCode) { const seqNum = parseInt(parts[2], 10); if(!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum; } } });
    const sequence = String(maxSeq + 1).padStart(4, '0'); const newItem = { ...formData, id: generateId(items), archive_code: `${prefix}-${classCode}-${sequence}` };
    setItems([...items, newItem]); syncItemToSheets(newItem, settings?.googleSheetsUrl); playChipBeep('save'); onShowToast('success');
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    updateStatus('idle', ''); resetGlobalAi(); setActiveTab('library');
  };

  const isBookOrGame = [...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(formData.type);
  const metricInfo = getMetricInfo(formData.type, activeCategories);

  return (
    <div className="flex flex-col h-full pb-20 max-w-3xl mx-auto w-full">
      <MModal isOpen={showErrorModal} title="Atenção" message="O Título é obrigatório." onConfirm={() => setShowErrorModal(false)} onCancel={() => setShowErrorModal(false)} darkMode={darkMode} confirmText="OK" cancelText="Fechar" />
      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode === 'manual' ? 'cyan' : 'white'} onClick={() => changeMode('manual')} className="flex-1 py-2 text-[10px]"><PlusSquare className="w-4 h-4" /> Manual</MButton>
        <MButton darkMode={darkMode} variant={addMode === 'barcode' ? 'amber' : 'white'} onClick={() => changeMode('barcode')} className="flex-1 py-2 text-[10px]"><ScanLine className="w-4 h-4" /> Barcode</MButton>
        <MButton darkMode={darkMode} variant="pink" onClick={triggerGlobalAI} className="flex-1 py-2 text-[10px]"><Camera className="w-4 h-4" /> Auto IA</MButton>
      </div>

      {displayBoxState !== 'idle' && (
        <div className={`p-4 mb-4 flex items-start gap-3 border-[2px] shadow-[2px_2px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest transition-colors duration-300 ${displayBoxState === 'loading' ? (darkMode ? 'bg-amber-500 border-gray-300 text-black' : 'bg-amber-600 border-black text-white') : displayBoxState === 'success' ? (darkMode ? 'bg-cyan-600 border-gray-300 text-white' : 'bg-cyan-600 border-black text-white') : (darkMode ? 'bg-pink-600 border-gray-300 text-white' : 'bg-pink-600 border-black text-white')}`}>
          {displayBoxState === 'loading' && <DiscoSpinner className="w-6 h-6 flex-shrink-0" speed={2} />}
          {displayBoxState === 'success' && <Check className="w-6 h-6 flex-shrink-0" />}
          {displayBoxState === 'error' && <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />}
          <span className="leading-relaxed break-words whitespace-pre-wrap flex-1">{displayBoxMessage}</span>
        </div>
      )}

      {addMode === 'barcode' && (
        <MContainer darkMode={darkMode} className="flex-1 mb-4 flex flex-col relative overflow-hidden bg-black items-center justify-center min-h-[300px]">
          {!isHtml5QrcodeLoaded && <div className="text-white font-black uppercase text-xs animate-pulse">Carregando Câmera...</div>}
          <div id="reader-barcode" className="w-full h-full object-cover absolute inset-0"></div>
          <div className="absolute inset-0 border-[10px] border-black/30 pointer-events-none z-10" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[300px] h-[150px] border-[2px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none flex flex-col items-center justify-center z-20"><span className="text-white text-[10px] uppercase font-black tracking-widest bg-black px-3 py-1 mt-24">Alinhe o Código</span></div>
        </MContainer>
      )}

      {addMode === 'manual' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Formato</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm outline-none font-black`}>
                {Object.entries(activeCategories || {}).map(([cat, subs]) => (<optgroup label={`--- ${cat.toUpperCase()} ---`} key={cat}>{(Array.isArray(subs) ? subs : []).map(sub => <option key={sub} value={sub}>{sub}</option>)}</optgroup>))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 w-full">
              <div className="md:col-span-3"><MInput darkMode={darkMode} label="Título *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="md:col-span-1"><MInput darkMode={darkMode} label="Ano" type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} /></div>
            </div>

            <MInput darkMode={darkMode} label="Autor / Desenvolvedor" value={formData.author_developer} onChange={e => setFormData({...formData, author_developer: e.target.value})} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 w-full">
              <div className="md:col-span-3"><MInput darkMode={darkMode} label="Editora / Gravadora" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} /></div>
              <div className="md:col-span-1"><MInput darkMode={darkMode} label={metricInfo.label} type="text" value={formData.pages_or_time} onChange={e => setFormData({...formData, pages_or_time: e.target.value})} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <MInput darkMode={darkMode} label="URL da Capa" value={formData.cover_url} onChange={e => setFormData({...formData, cover_url: e.target.value})} />
              <MInput darkMode={darkMode} label="Localização" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>

            <MInput darkMode={darkMode} label="Descrição" multiline value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            
            <div className="flex gap-2 w-full">
              <div className="flex-1">
                <MInput darkMode={darkMode} label="Código de Barras/Catálogo" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
              </div>
              <div className="flex items-end mb-1.5">
                <MButton darkMode={darkMode} variant="amber" onClick={(e) => { e.preventDefault(); if(formData.barcode) fetchMultiDatabaseParallel(formData.barcode); else { playChipBeep('error'); updateStatus('error', 'Digite um código primeiro.'); } }} className="h-[38px] px-3"><Search className="w-4 h-4"/> Buscar</MButton>
              </div>
            </div>
            
            <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-gray-800 border-amber-500/50 text-white' : 'bg-amber-50 text-black'}>
              <MInput darkMode={darkMode} label="Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </MContainer>

            {isBookOrGame && (
              <div className="mb-4 mt-2">
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={() => setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[2px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${formData.status === opt ? (darkMode ? 'bg-cyan-600 border-gray-300 text-white' : 'bg-cyan-600 border-black text-white') : (darkMode ? 'bg-gray-900 border-gray-300 text-gray-400' : 'bg-white border-black text-black')}`}>{opt}</button>)}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Avaliação (Nota)</label>
              <div className={`flex gap-2 p-3 border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white'} justify-center`}>
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setFormData({...formData, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= formData.rating ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
              </div>
            </div>

            <MButton darkMode={darkMode} onClick={handleSave} variant="black" className="mt-2 py-4 text-sm"><Check className="w-6 h-6 mr-2" /> Salvar Item</MButton>
          </MContainer>
        </div>
      )}
    </div>
  );
};


// ==========================================
// BUSINESS INTELLIGENCE DASHBOARD
// ==========================================
const DashboardTab = ({ items, filteredItems, darkMode, activeCategories, globalFilters, setGlobalFilters, settings }) => {
  const chartColors = getChartColors(darkMode);
  const [activeSubTab, setActiveSubTab] = useState('visao_geral');
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'author'|'publisher', name: '' }
  const [selectedTime, setSelectedTime] = useState(null); // { label, count, perc, type }

  // Funções de filtro global ao clicar em gráficos
  const applyFilter = (group, val) => {
     setGlobalFilters(prev => {
        const cur = prev[group] || [];
        if (!cur.includes(val)) return { ...prev, [group]: [...cur, val] };
        return prev;
     });
  };
  const clearFilters = () => setGlobalFilters({ Categorias: [], Subtipos: [], Status: [], Notas: [], Autores: [], Editoras: [] });
  const hasFilters = Object.values(globalFilters).some(arr => arr && arr.length > 0);

  // Helper para agrupar categorias
  const getCategoryOf = (type) => {
    for (const [cat, subs] of Object.entries(activeCategories)) { if ((subs || []).includes(type)) return cat; }
    return 'Outros';
  };

  // =====================================
  // AGRUPAMENTO DE VOLUMES E CÁLCULO
  // =====================================
  const analytics = useMemo(() => {
    // 1. Agrupar volumes em uma única "Obra"
    const groupedMap = new Map();
    filteredItems.forEach(item => {
        const normTitle = normalizeWorkTitle(item.title);
        const normTitleKey = normTitle.toLowerCase();
        const author = applyArtistAlias(item.author_developer, settings?.artistAliases) || '';
        const key = `${normTitleKey}|${author.toLowerCase()}|${item.type}`;

        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                ...item,
                title: normTitle || item.title,
                original_title: item.title,
                volumeCount: 1,
                aggregated_metric: parseInt(item.pages_or_time) || 0,
                isGroup: false
            });
        } else {
            const existing = groupedMap.get(key);
            existing.volumeCount += 1;
            existing.isGroup = true;
            existing.aggregated_metric += (parseInt(item.pages_or_time) || 0);
            existing.rating = Math.max(existing.rating || 0, item.rating || 0); // Considera a melhor nota
            
            // Lógica de Status: Pega o mais avançado
            const statusWeights = {'Concluído':4, 'Em Andamento':3, 'Na Fila':2, 'Não Iniciado':1, 'Backlog':1};
            const currentStatus = existing.status || 'Não Iniciado';
            const itemStatus = item.status || 'Não Iniciado';
            if ((statusWeights[itemStatus] || 0) > (statusWeights[currentStatus] || 0)) {
               existing.status = itemStatus;
            }
            // Manter ano mais antigo se for uma coleção
            const yrCur = getValidYear(existing.year); const yrNew = getValidYear(item.year);
            if (!isNaN(yrCur) && !isNaN(yrNew) && yrNew < yrCur) existing.year = item.year;
        }
    });

    const groupedWorks = Array.from(groupedMap.values());

    const data = {
       total_works: groupedWorks.length,
       total_raw: filteredItems.length,
       concluidos: 0, backlog: 0,
       catCounts: {}, typeCounts: {}, statusCounts: {}, ratingCounts: {},
       authors: {}, publishers: {}, decades: {}, years: {},
       metrics: {
          'Páginas': { sum: 0, count: 0, max: 0, maxName: '' },
          'Faixas': { sum: 0, count: 0, max: 0, maxName: '' },
          'Minutos': { sum: 0, count: 0, max: 0, maxName: '' },
          'Horas': { sum: 0, count: 0, max: 0, maxName: '' }
       },
       oldest: null, newest: null,
       ratedCount: 0, sumRatings: 0,
       completeness: { totalFields: 0, filledFields: 0, missingCovers: 0, missingYears: 0, missingBarcodes: 0 }
    };

    groupedWorks.forEach(i => {
      // Categoria e Suporte
      const cat = getCategoryOf(i.type);
      data.catCounts[cat] = (data.catCounts[cat] || 0) + 1;
      data.typeCounts[i.type || 'Sem Tipo'] = (data.typeCounts[i.type || 'Sem Tipo'] || 0) + 1;

      // Status Analítico (Unificando Backlog e Não Iniciado)
      const isBookGame = ['Livros', 'Games'].includes(cat);
      let analyticalStatus = 'Backlog / Não Iniciado';
      if (isBookGame) {
         if (i.status === 'Concluído') { data.concluidos++; analyticalStatus = 'Concluído'; }
         else if (i.status === 'Em Andamento') { data.backlog++; analyticalStatus = 'Em Andamento'; }
         else if (i.status === 'Na Fila') { data.backlog++; analyticalStatus = 'Na Fila'; }
         else { data.backlog++; analyticalStatus = 'Backlog / Não Iniciado'; } // Não Iniciado vira Backlog
      } else { // Audiovisual usa nota
         if ((Number(i.rating)||0) > 0) { data.concluidos++; analyticalStatus = 'Concluído'; }
         else { data.backlog++; analyticalStatus = 'Backlog / Não Iniciado'; }
      }
      data.statusCounts[analyticalStatus] = (data.statusCounts[analyticalStatus] || 0) + 1;

      // Avaliação
      const rInt = Math.floor(Number(i.rating) || 0);
      data.ratingCounts[rInt] = (data.ratingCounts[rInt] || 0) + 1;
      if (rInt > 0) { data.ratedCount++; data.sumRatings += rInt; }

      // Tempo
      const yr = getValidYear(i.year);
      if (!isNaN(yr)) {
         data.years[yr] = (data.years[yr] || 0) + 1;
         const dec = Math.floor(yr / 10) * 10;
         data.decades[dec] = (data.decades[dec] || 0) + 1;
         if (!data.oldest || yr < getValidYear(data.oldest.year)) data.oldest = i;
         if (!data.newest || yr > getValidYear(data.newest.year)) data.newest = i;
      } else {
         data.completeness.missingYears++;
      }

      // Atores (Autores / Editoras)
      const auth = applyArtistAlias(i.author_developer, settings?.artistAliases) || 'Desconhecido';
      const pub = i.publisher?.trim() || 'Desconhecida';
      
      // Ignorar Various Artists no ranking
      if (!isVariousArtists(auth)) {
         if (!data.authors[auth]) data.authors[auth] = { count: 0, sumRating: 0, ratedCount: 0, concluidos: 0, backlog: 0, items: [] };
         data.authors[auth].count++; data.authors[auth].items.push(i);
         if (rInt > 0) { data.authors[auth].sumRating += rInt; data.authors[auth].ratedCount++; }
         if (analyticalStatus === 'Concluído') data.authors[auth].concluidos++; else data.authors[auth].backlog++;
      }

      if (!data.publishers[pub]) data.publishers[pub] = { count: 0, sumRating: 0, ratedCount: 0, concluidos: 0, backlog: 0, items: [] };
      data.publishers[pub].count++; data.publishers[pub].items.push(i);
      if (rInt > 0) { data.publishers[pub].sumRating += rInt; data.publishers[pub].ratedCount++; }
      if (analyticalStatus === 'Concluído') data.publishers[pub].concluidos++; else data.publishers[pub].backlog++;

      // Dimensões / Métricas
      const val = i.aggregated_metric;
      if (val > 0) {
         let label = 'Unidades';
         if (cat === 'Livros') label = 'Páginas'; else if (cat === 'Discos') label = 'Faixas'; else if (cat === 'Vídeo') label = 'Minutos'; else if (cat === 'Games') label = 'Horas';
         if (data.metrics[label]) {
            data.metrics[label].sum += val; data.metrics[label].count += 1;
            if (val > data.metrics[label].max) { data.metrics[label].max = val; data.metrics[label].maxName = `${i.title}${i.isGroup? ' (Coleção)':''}`; }
         }
      }

      // Qualidade (Completude)
      const expectedFields = ['title', 'author_developer', 'year', 'publisher', 'type', 'barcode', 'cover_url', 'pages_or_time'];
      data.completeness.totalFields += expectedFields.length;
      expectedFields.forEach(f => { if (i[f] && String(i[f]).trim() !== '') data.completeness.filledFields++; });
      if (!i.cover_url) data.completeness.missingCovers++;
      if (!i.barcode) data.completeness.missingBarcodes++;
    });

    return data;
  }, [filteredItems, activeCategories, settings?.artistAliases]);

  // Preparação de dados para Gráficos
  const sortedCats = Object.entries(analytics.catCounts).map(([label, value], i) => ({ label, value, colorHex: getMondrianColorHex(i, darkMode) })).sort((a,b) => b.value - a.value);
  const sortedTypes = Object.entries(analytics.typeCounts).sort((a, b) => b[1] - a[1]);
  const sortedStatus = Object.entries(analytics.statusCounts).map(([label, value], i) => ({ label, value, colorHex: getMondrianColorHex(i+2, darkMode) })).sort((a,b) => b.value - a.value);
  const sortedRatings = [5,4,3,2,1,0].filter(r => analytics.ratingCounts[r]).map((r, i) => ({ label: r===0?'Sem Nota':`${r}★`, value: analytics.ratingCounts[r], colorHex: getMondrianColorHex(i+1, darkMode) }));
  
  const sortedDecades = Object.entries(analytics.decades).sort((a, b) => a[0] - b[0]);
  const sortedYears = Object.entries(analytics.years).sort((a, b) => a[0] - b[0]);
  
  const totalTimedWorks = Object.values(analytics.years).reduce((a,b) => a+b, 0);

  const maxType = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;
  const maxDecade = sortedDecades.length > 0 ? Math.max(...sortedDecades.map(d => d[1])) : 1;
  const maxYear = sortedYears.length > 0 ? Math.max(...sortedYears.map(y => y[1])) : 1;

  const topAuthors = Object.entries(analytics.authors).filter(([n]) => n !== 'Desconhecido').sort((a,b) => b[1].count - a[1].count).slice(0, 20);
  const topPublishers = Object.entries(analytics.publishers).filter(([n]) => n !== 'Desconhecida').sort((a,b) => b[1].count - a[1].count).slice(0, 20);

  // =====================================
  // RENDERIZAÇÃO DAS SUB-ABAS
  // =====================================
  const renderFicha = () => {
    if (!selectedEntity) return null;
    const isAuthor = selectedEntity.type === 'author';
    const entityData = isAuthor ? analytics.authors[selectedEntity.name] : analytics.publishers[selectedEntity.name];
    if (!entityData) return <div className="p-4">Dados não encontrados no filtro atual.</div>;

    const avgRating = entityData.ratedCount > 0 ? (entityData.sumRating / entityData.ratedCount).toFixed(1) : 'N/A';
    
    // Análises internas da Ficha
    const items = entityData.items;
    const catCounts = {}; const yearCounts = {};
    items.forEach(i => {
       const cat = getCategoryOf(i.type); catCounts[cat] = (catCounts[cat] || 0) + 1;
       const yr = getValidYear(i.year); if(!isNaN(yr)) yearCounts[Math.floor(yr/10)*10] = (yearCounts[Math.floor(yr/10)*10] || 0) + 1;
    });

    return (
       <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
         <div className="flex items-center gap-3">
           <button onClick={() => setSelectedEntity(null)} className={`p-2 border-[2px] ${darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-gray-100 text-black'} active:scale-95`}><ChevronLeft className="w-5 h-5" /></button>
           <h2 className="text-xl font-black uppercase tracking-tighter truncate leading-none">{selectedEntity.name}</h2>
         </div>
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCard label="Total de Obras" value={entityData.count} darkMode={darkMode} />
            <MetricCard label="Nota Média" value={avgRating} icon={<Star className="w-4 h-4 text-amber-500 fill-amber-500"/>} darkMode={darkMode} />
            <MetricCard label="Concluídos" value={entityData.concluidos} darkMode={darkMode} highlight={true} />
            <MetricCard label="Backlog" value={entityData.backlog} darkMode={darkMode} />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MContainer darkMode={darkMode} className="p-4 flex flex-col gap-2" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
               <span className="text-[10px] font-black uppercase tracking-widest border-b-[2px] border-current pb-1 mb-2">Composição</span>
               {Object.entries(catCounts).map(([cat, count], i) => <MondrianHBar key={cat} label={cat} value={count} max={entityData.count} index={i} darkMode={darkMode} />)}
            </MContainer>
            <MContainer darkMode={darkMode} className="p-4 flex flex-col gap-2" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
               <span className="text-[10px] font-black uppercase tracking-widest border-b-[2px] border-current pb-1 mb-2">Décadas</span>
               {Object.entries(yearCounts).sort((a,b)=>a[0]-b[0]).map(([dec, count], i) => <MondrianHBar key={dec} label={`${dec}s`} value={count} max={Math.max(...Object.values(yearCounts))} index={i+1} darkMode={darkMode} />)}
            </MContainer>
         </div>
         <MContainer darkMode={darkMode} className="p-0 overflow-hidden" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
            <div className={`p-3 border-b-[2px] ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'} text-[10px] font-black uppercase tracking-widest`}>Obras Associadas ({items.length})</div>
            <div className="max-h-64 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left text-[9px] font-bold uppercase tracking-widest">
                 <thead className={`sticky top-0 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}><tr><th className="p-2 border-b-2">Ano</th><th className="p-2 border-b-2">Título</th><th className="p-2 border-b-2">Suporte</th><th className="p-2 border-b-2">Nota</th></tr></thead>
                 <tbody>
                    {items.sort((a,b)=>(parseInt(b.year)||0)-(parseInt(a.year)||0)).map(i => (
                       <tr key={i.id} className={`border-b border-current opacity-80 hover:opacity-100 ${darkMode ? 'hover:bg-cyan-900/30' : 'hover:bg-cyan-50'}`}>
                          <td className="p-2 w-12">{i.year || '--'}</td>
                          <td className="p-2 truncate max-w-[120px]">{i.title} {i.isGroup ? `(x${i.volumeCount})` : ''}</td>
                          <td className="p-2">{i.type}</td>
                          <td className="p-2">{i.rating>0?`${i.rating}★`:'--'}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
            </div>
         </MContainer>
       </div>
    );
  };

  const renderVisaoGeral = () => (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
         <MetricCard label="Obras Únicas" value={analytics.total_works} darkMode={darkMode} icon={<Library className="w-4 h-4"/>} title="Volumes agrupados contam como 1" />
         <MetricCard label="Concluídos" value={analytics.concluidos} darkMode={darkMode} highlight={true} icon={<Check className="w-4 h-4"/>} />
         <MetricCard label="Backlog (Fila)" value={analytics.backlog} darkMode={darkMode} subtext={`${((analytics.backlog/Math.max(1,analytics.total_works))*100).toFixed(0)}% do acervo`} icon={<RefreshIcon className="w-4 h-4"/>} />
         <MetricCard label="Nota Média" value={analytics.ratedCount > 0 ? (analytics.sumRatings / analytics.ratedCount).toFixed(1) : 'N/A'} darkMode={darkMode} icon={<Star className="w-4 h-4 text-amber-500 fill-amber-500"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-1 flex flex-col gap-4">
            <MondrianDonutChart title="Divisão Categórica" data={sortedCats} darkMode={darkMode} onSliceClick={(val) => applyFilter('Categorias', val)} />
            <MContainer darkMode={darkMode} className="p-4 flex flex-col h-full" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
               <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-[2px] border-current pb-2">Status (Consumo)</div>
               <MondrianStackedBar data={sortedStatus} total={analytics.total_works} darkMode={darkMode} />
               <div className="mt-4 flex-1 flex flex-col gap-2 justify-end">
                  {sortedStatus.map((s,i) => <MondrianHBar key={s.label} label={s.label} value={s.value} max={analytics.total_works} index={i+2} darkMode={darkMode} onClick={() => applyFilter('Status', s.label)} />)}
               </div>
            </MContainer>
         </div>
         <div className="lg:col-span-2 flex flex-col gap-4">
            <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
               <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-[2px] border-current pb-2 flex justify-between"><span>Formatos (Suportes) Populares</span><span className="opacity-50">Clique para filtrar</span></div>
               <div className="flex flex-col max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                  {sortedTypes.map(([type, count], index) => <MondrianHBar key={`type-${type}`} label={type} value={count} max={maxType} index={index} darkMode={darkMode} onClick={() => applyFilter('Subtipos', type)} />)}
               </div>
            </MContainer>
            
            {/* GRÁFICOS DE LINHA DO TEMPO - CORRIGIDOS (Aumentados e Clicáveis com labels e tooltip local) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MContainer darkMode={darkMode} className="p-4 flex-1 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
                 <div className="flex justify-between items-center border-b-[2px] border-current pb-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest">Lançamento (Décadas)</span>
                    {selectedTime && selectedTime.type === 'decade' && <span className="text-[9px] font-black text-pink-600 bg-pink-100 dark:bg-pink-900/30 px-2 py-0.5 animate-in zoom-in duration-200">{selectedTime.label}: {selectedTime.count} ({selectedTime.perc}%)</span>}
                 </div>
                 <div className="flex items-end gap-1 h-48 mt-auto overflow-x-auto scrollbar-hide border-b-[2px] border-current pb-6 px-1 relative">
                    {sortedDecades.map(([dec, count], i) => (
                      <div key={dec} onClick={() => { playChipBeep('click'); setSelectedTime({ type: 'decade', label: `${dec}s`, count, perc: ((count/totalTimedWorks)*100).toFixed(1) }) }} className="flex flex-col justify-end items-center flex-1 min-w-[30px] group cursor-pointer h-full">
                         <div className="text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-cyan-600 dark:text-cyan-400">{count}</div>
                         <div className={`w-full transition-all duration-500 ${getMondrianColor(i, darkMode)} border-[2px] ${darkMode?'border-gray-300':'border-black'} group-hover:opacity-80 active:translate-y-1`} style={{ height: `${Math.max(2, (count / maxDecade) * 100)}%` }}></div>
                         <div className="absolute bottom-0 text-[7px] font-black mt-1 opacity-70 translate-y-4">{String(dec).slice(-2)}s</div>
                      </div>
                    ))}
                 </div>
              </MContainer>
              
              <MContainer darkMode={darkMode} className="p-4 flex-1 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
                 <div className="flex justify-between items-center border-b-[2px] border-current pb-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest">Lançamento (Anos)</span>
                    {selectedTime && selectedTime.type === 'year' && <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 animate-in zoom-in duration-200">{selectedTime.label}: {selectedTime.count} ({selectedTime.perc}%)</span>}
                 </div>
                 <div className="flex items-end gap-0.5 h-48 mt-auto overflow-x-auto scrollbar-hide border-b-[2px] border-current pb-6 px-1 relative">
                    {sortedYears.map(([yr, count], i) => (
                      <div key={yr} onClick={() => { playChipBeep('click'); setSelectedTime({ type: 'year', label: yr, count, perc: ((count/totalTimedWorks)*100).toFixed(1) }) }} className="flex flex-col justify-end items-center flex-1 min-w-[24px] group cursor-pointer h-full">
                         <div className={`w-full transition-all duration-500 bg-pink-500 border-x border-t ${darkMode?'border-gray-800':'border-gray-200'} group-hover:opacity-80 active:translate-y-1`} style={{ height: `${Math.max(1, (count / maxYear) * 100)}%` }}></div>
                         <div className="absolute bottom-0 text-[7px] font-black mt-1 opacity-70 -rotate-45 translate-y-4">{yr}</div>
                      </div>
                    ))}
                 </div>
              </MContainer>
            </div>
         </div>
      </div>
    </div>
  );

  const renderAutoresEditoras = (isAuthors = true) => {
    const list = isAuthors ? topAuthors : topPublishers;
    const title = isAuthors ? "Top 20 Autores & Artistas" : "Top 20 Editoras & Gravadoras";
    const typeLabel = isAuthors ? "author" : "publisher";
    const maxVal = list.length > 0 ? list[0][1].count : 1;

    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
         <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-[2px] border-current pb-2 flex justify-between items-center">
              <span>{title} (Por Volume de Obras)</span>
              <span className="opacity-50 text-[8px]">Clique para abrir a Ficha Analítica</span>
            </div>
            {list.length === 0 ? <div className="opacity-50 text-xs font-bold py-10 text-center">Nenhum dado com o filtro atual.</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                 {list.map(([name, data], i) => (
                    <div key={name} className={`flex flex-col p-2 border-[2px] border-transparent hover:border-current cursor-pointer transition-all active:scale-[0.98] ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={() => setSelectedEntity({ type: typeLabel, name })}>
                       <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest truncate flex-1">{name}</span>
                          <span className={`text-[12px] font-black ml-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{data.count}</span>
                       </div>
                       <div className="w-full h-2 flex border-[2px] border-current opacity-80 overflow-hidden">
                          <div className={`h-full ${darkMode ? 'bg-cyan-400' : 'bg-cyan-600'}`} style={{width:`${(data.count/maxVal)*100}%`}}></div>
                       </div>
                       <div className="flex justify-between text-[7px] font-black uppercase tracking-widest opacity-60 mt-1">
                          <span>Concluídos: {data.concluidos}</span>
                          <span>★ Média: {data.ratedCount > 0 ? (data.sumRating/data.ratedCount).toFixed(1) : '-'}</span>
                       </div>
                    </div>
                 ))}
              </div>
            )}
         </MContainer>
      </div>
    );
  };

  const renderDimensoes = () => (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(analytics.metrics).map(([label, metricInfo], i) => {
             if (metricInfo.count === 0) return null;
             return (
               <MContainer key={label} darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-3 border-b-[2px] border-current pb-1 ${darkMode?'text-amber-400':'text-amber-600'}`}>Métrica: {label}</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                     <div className={`p-2 border-[2px] ${darkMode?'bg-gray-800 border-gray-700':'bg-gray-50 border-gray-200'}`}><div className="text-[8px] font-bold uppercase opacity-60">Total Acumulado</div><div className="text-xl font-black">{metricInfo.sum.toLocaleString('pt-BR')}</div></div>
                     <div className={`p-2 border-[2px] ${darkMode?'bg-gray-800 border-gray-700':'bg-gray-50 border-gray-200'}`}><div className="text-[8px] font-bold uppercase opacity-60">Média por Obra</div><div className="text-xl font-black">{Math.round(metricInfo.sum/metricInfo.count)}</div></div>
                  </div>
                  <div className={`p-2 border-[2px] ${darkMode?'border-gray-600':'border-black'} flex justify-between items-center`}>
                     <div className="flex flex-col overflow-hidden pr-2">
                        <span className="text-[7px] font-black uppercase opacity-70">Maior Registro (Recorde)</span>
                        <span className="text-[10px] font-black truncate">{metricInfo.maxName}</span>
                     </div>
                     <span className="text-lg font-black text-pink-600">{metricInfo.max}</span>
                  </div>
               </MContainer>
             )
          })}
       </div>
    </div>
  );

  const renderQualidadeRecordes = () => {
     const comp = analytics.completeness;
     const score = comp.totalFields > 0 ? (comp.filledFields / comp.totalFields) * 100 : 0;
     
     return (
       <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-[2px] border-current pb-2 flex gap-2 items-center"><Zap className="w-4 h-4"/> Qualidade dos Dados (Completude)</div>
                <div className="flex items-center gap-4 mb-6">
                   <div className={`w-24 h-24 rounded-full border-[4px] flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_currentColor] ${score > 80 ? 'border-cyan-500 text-cyan-500' : score > 50 ? 'border-amber-500 text-amber-500' : 'border-pink-500 text-pink-500'}`}>
                      <span className="text-2xl font-black">{score.toFixed(0)}%</span>
                   </div>
                   <div className="flex flex-col gap-1 w-full text-[9px] font-black uppercase tracking-widest opacity-80">
                      <div className="flex justify-between border-b border-current pb-0.5"><span>Campos Totais:</span><span>{comp.totalFields}</span></div>
                      <div className="flex justify-between border-b border-current pb-0.5"><span>Campos Preenchidos:</span><span>{comp.filledFields}</span></div>
                   </div>
                </div>
                <div className="flex flex-col gap-2">
                   <MondrianHBar label="Sem Capa" value={comp.missingCovers} max={analytics.total_raw} index={1} darkMode={darkMode} />
                   <MondrianHBar label="Sem Código (Barcode)" value={comp.missingBarcodes} max={analytics.total_raw} index={2} darkMode={darkMode} />
                   <MondrianHBar label="Sem Ano" value={comp.missingYears} max={analytics.total_raw} index={3} darkMode={darkMode} />
                </div>
             </MContainer>

             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-[2px] border-current pb-2 flex gap-2 items-center"><Sparkles className="w-4 h-4"/> DNA & Recordes</div>
                <div className="flex-1 flex flex-col gap-3 justify-center">
                   <div className={`p-2 border-[2px] ${darkMode?'border-gray-700 bg-gray-800':'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
                      <span className="text-[8px] font-black uppercase opacity-60">Obra Mais Antiga</span>
                      <span className="text-[10px] font-black truncate max-w-[60%] text-right" title={analytics.oldest?.title}>{analytics.oldest ? `${analytics.oldest.year} - ${analytics.oldest.title}` : '--'}</span>
                   </div>
                   <div className={`p-2 border-[2px] ${darkMode?'border-gray-700 bg-gray-800':'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
                      <span className="text-[8px] font-black uppercase opacity-60">Obra Mais Recente</span>
                      <span className="text-[10px] font-black truncate max-w-[60%] text-right" title={analytics.newest?.title}>{analytics.newest ? `${analytics.newest.year} - ${analytics.newest.title}` : '--'}</span>
                   </div>
                   <div className={`p-2 border-[2px] ${darkMode?'border-gray-700 bg-gray-800':'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
                      <span className="text-[8px] font-black uppercase opacity-60">Categoria Dominante</span>
                      <span className="text-[10px] font-black">{sortedCats.length > 0 ? `${sortedCats[0].label} (${((sortedCats[0].value/analytics.total_works)*100).toFixed(0)}%)` : '--'}</span>
                   </div>
                   <div className={`p-2 border-[2px] ${darkMode?'border-gray-700 bg-gray-800':'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
                      <span className="text-[8px] font-black uppercase opacity-60">Suporte Dominante</span>
                      <span className="text-[10px] font-black">{sortedTypes.length > 0 ? `${sortedTypes[0][0]} (${((sortedTypes[0][1]/analytics.total_works)*100).toFixed(0)}%)` : '--'}</span>
                   </div>
                </div>
             </MContainer>
          </div>
       </div>
     );
  };

  // =====================================
  // ESTRUTURA PRINCIPAL DO DASHBOARD
  // =====================================
  const tabs = [
    { id: 'visao_geral', label: 'Visão Geral' },
    { id: 'autores', label: 'Autores & Artistas' },
    { id: 'editoras', label: 'Editoras & Gravadoras' },
    { id: 'dimensoes', label: 'Dimensões (Páginas/Tempo)' },
    { id: 'qualidade', label: 'Qualidade & Recordes' }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden pb-10 max-w-6xl mx-auto w-full relative">
       {/* FILTRO GLOBAL ALERT */}
       {hasFilters && (
         <div className={`p-3 border-[2px] mb-4 flex items-center justify-between shadow-[2px_2px_0px_currentColor] animate-pulse ${darkMode ? 'border-pink-500 bg-pink-900/30 text-pink-300' : 'border-pink-600 bg-pink-100 text-pink-900'}`}>
            <div className="flex items-center gap-2"><FilterIcon className="w-5 h-5"/> <div className="text-[10px] font-black uppercase tracking-widest">Filtros Ativos: Visualizando Subset do Acervo</div></div>
            <button onClick={clearFilters} className={`px-3 py-1.5 border-[2px] border-current text-[8px] font-black uppercase tracking-widest active:scale-95 transition-transform ${darkMode?'bg-gray-900':'bg-white'}`}>Limpar Tudo</button>
         </div>
       )}

       {/* NAVEGAÇÃO INTERNA DO DASHBOARD */}
       {!selectedEntity && (
         <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 border-b-[2px] border-transparent flex-shrink-0">
           {tabs.map(t => (
             <button key={t.id} onClick={() => { playChipBeep('click'); setActiveSubTab(t.id); }} className={`px-4 py-2 border-[2px] text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${activeSubTab === t.id ? (darkMode ? 'bg-cyan-600 border-gray-300 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-cyan-600 border-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]') : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white' : 'bg-white border-gray-300 text-gray-600 hover:text-black')}`}>{t.label}</button>
           ))}
         </div>
       )}

       {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
       <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 pb-10">
          {analytics.total_raw === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 opacity-50"><Ghost className="w-12 h-12 mb-4" /><span className="text-sm font-black uppercase tracking-widest">Nenhum dado analítico.</span><span className="text-[10px] font-bold mt-2">Remova os filtros ou adicione itens.</span></div>
          ) : selectedEntity ? (
             renderFicha()
          ) : (
             <>
               {activeSubTab === 'visao_geral' && renderVisaoGeral()}
               {activeSubTab === 'autores' && renderAutoresEditoras(true)}
               {activeSubTab === 'editoras' && renderAutoresEditoras(false)}
               {activeSubTab === 'dimensoes' && renderDimensoes()}
               {activeSubTab === 'qualidade' && renderQualidadeRecordes()}
             </>
          )}
       </div>
    </div>
  );
};

const SettingsTab = ({ items, setItems, settings, setSettings, darkMode, setDarkMode, onShowToast, pwa, activeCategories, activeClassCodes }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importData, setImportData] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [newSubclass, setNewSubclass] = useState({ parent: 'Livros', name: '', code: '' });
  const [newAlias, setNewAlias] = useState({ main: '', alias: '' });

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['ID', 'Código Arquivístico', 'Tipo', 'Título', 'Autor/Desenvolvedor', 'Ano', 'Editora/Gravadora', 'Status', 'Nota', 'Páginas/Tempo', 'Código de Barras', 'Descrição', 'URL da Capa', 'Localização', 'Anotações', 'Wiki'];
    const escape = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
    const rows = items.map(i => [escape(i.id), escape(i.archive_code), escape(i.type), escape(i.title), escape(i.author_developer), escape(i.year), escape(i.publisher), escape(i.status), i.rating || 0, escape(i.pages_or_time), escape(i.barcode), escape(i.description), escape(i.cover_url), escape(i.location), escape(i.notes), escape(i.wiki_info)]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), [headers.join(","), ...rows.map(r => r.join(","))].join("\n")], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Memorabilia_Fisico_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const validRows = parseCSVText(evt.target.result); if (validRows.length < 2) return;
      const headers = validRows[0].map(h => h.trim()); const newItems = [];
      for (let i = 1; i < validRows.length; i++) {
        if (validRows[i].length === 1 && !validRows[i][0].trim()) continue;
        const item = {};
        headers.forEach((h, idx) => {
          let key = h; if (h === 'ID') key = 'id'; else if (h === 'Código Arquivístico') key = 'archive_code'; else if (h === 'Tipo') key = 'title'; else if (h === 'Autor/Desenvolvedor') key = 'author_developer'; else if (h === 'Ano' || h === 'Data') key = 'year'; else if (h === 'Editora/Gravadora') key = 'publisher'; else if (h === 'Status') key = 'status'; else if (h === 'Nota') key = 'rating'; else if (h === 'Páginas/Tempo' || h === 'Métrica' || h === 'Páginas') key = 'pages_or_time'; else if (h === 'Código de Barras') key = 'barcode'; else if (h === 'Descrição') key = 'description'; else if (h === 'URL da Capa' || h === 'Localização') key = 'location'; else if (h === 'Anotações') key = 'notes'; else if (h === 'Wiki') key = 'wiki_info';
          item[key] = validRows[i][idx] ? validRows[i][idx].trim() : '';
        });
        if (item.id || item.title) { item.id = item.id || generateId(newItems); item.rating = parseInt(item.rating) || 0; newItems.push(item); }
      }
      if (newItems.length > 0) setImportData(newItems);
    }; reader.readAsText(file); e.target.value = null;
  };

  const handleAddSubclass = () => {
    if (!newSubclass.name || !newSubclass.code) { playChipBeep('error'); onShowToast('error'); return; }
    const updatedCats = { ...activeCategories }; if (!updatedCats[newSubclass.parent]) updatedCats[newSubclass.parent] = [];
    if (!updatedCats[newSubclass.parent].includes(newSubclass.name.trim())) updatedCats[newSubclass.parent] = [...updatedCats[newSubclass.parent], newSubclass.name.trim()];
    setSettings({ ...settings, userCategories: updatedCats, userClassCodes: { ...activeClassCodes, [newSubclass.name.trim()]: newSubclass.code.trim() } });
    setNewSubclass({ parent: 'Livros', name: '', code: '' }); playChipBeep('save'); onShowToast('success');
  };

  const handleAddAlias = () => {
    if (!newAlias.main || !newAlias.alias) { playChipBeep('error'); onShowToast('error'); return; }
    const updatedAliases = [...(settings?.artistAliases || []), { main: newAlias.main.trim(), alias: newAlias.alias.trim() }];
    setSettings({ ...settings, artistAliases: updatedAliases }); setNewAlias({ main: '', alias: '' }); playChipBeep('save'); onShowToast('success');
  };
  const handleRemoveAlias = (index) => {
    const updatedAliases = [...(settings?.artistAliases || [])]; updatedAliases.splice(index, 1);
    setSettings({ ...settings, artistAliases: updatedAliases }); playChipBeep('save'); onShowToast('success');
  };

  const toggleSection = (s) => { playChipBeep('click'); setOpenSection(openSection === s ? null : s); };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative max-w-3xl mx-auto w-full">
      <MModal isOpen={showResetConfirm} title="Aviso Crítico" message="Apagar TODOS os itens do acervo físico?" onConfirm={() => { setItems([]); setShowResetConfirm(false); playChipBeep('save'); onShowToast('success'); }} onCancel={() => setShowResetConfirm(false)} darkMode={darkMode} confirmText="Apagar Tudo" />
      <MModal isOpen={!!importData} title="Importar CSV" message={`Substituir a coleção atual pelos ${importData ? importData.length : 0} itens novos?`} onConfirm={() => { if (importData) { setItems(importData); setImportData(null); playChipBeep('save'); onShowToast('success'); } }} onCancel={() => setImportData(null)} darkMode={darkMode} confirmText="Substituir" />

      {pwa.isInstallable && !pwa.isInstalled && (
        <MContainer darkMode={darkMode} className="p-4 mb-4 flex flex-col items-center justify-center text-center animate-pulse border-cyan-600 bg-cyan-100 dark:bg-cyan-900" colorClass="border-cyan-600"><Smartphone className="w-8 h-8 mb-2 text-cyan-600 dark:text-cyan-400" /><h3 className="font-black uppercase tracking-widest text-cyan-800 dark:text-cyan-300 text-lg mb-1">Instalar App</h3><MButton darkMode={darkMode} onClick={pwa.promptInstall} variant="cyan" className="w-full py-4 text-sm font-black text-white">📲 Instalar Agora</MButton></MContainer>
      )}

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}>
        <button onClick={() => toggleSection('aparencia')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'aparencia' ? (darkMode ? 'border-b-[2px] border-gray-300' : 'border-b-[2px] border-black') : ''}`}><span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Aparência & Interface</span><span className="text-lg font-mono">{openSection === 'aparencia' ? '−' : '+'}</span></button>
        {openSection === 'aparencia' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">Tema Visual</span>
              <button onClick={() => { setDarkMode(!darkMode); playChipBeep('save'); onShowToast('success'); }} className={`px-4 py-2 border-[2px] font-black uppercase tracking-widest text-[10px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] border-gray-300 bg-gray-900 text-white' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] border-black bg-gray-200 text-black'} active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all`}>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</button>
            </div>
            
            <div className={`border-t-[2px] ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-3`}>
               <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-between">
                   <span className="flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Efeitos Sonoros</span>
                   <button onClick={() => { 
                       const val = settings?.soundEnabled === false ? true : false;
                       setSettings({...settings, soundEnabled: val});
                       globalSoundEnabled = val;
                       if(val) { setTimeout(() => playChipBeep('click'), 50); }
                       onShowToast('success');
                   }} className={`w-10 h-5 border-[2px] ${darkMode ? 'border-gray-300' : 'border-black'} flex items-center p-0.5 transition-colors ${settings?.soundEnabled !== false ? 'bg-cyan-500' : (darkMode ? 'bg-gray-700' : 'bg-gray-300')}`}>
                       <div className={`w-3 h-3 ${darkMode ? 'bg-white border-gray-300' : 'bg-black border-black'} border-[2px] transform transition-transform ${settings?.soundEnabled !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                   </button>
               </div>
            </div>

            <div className={`border-t-[2px] ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-3 flex flex-col gap-5`}>
               <div><div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Velocidade LED</div><input type="range" min="10" max="150" step="1" value={160 - (Number(settings?.marqueeSpeed) || 35)} onChange={e => setSettings({...settings, marqueeSpeed: 160 - parseInt(e.target.value)})} onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }} onTouchEnd={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-full h-2 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ accentColor: '#0891b2' }} /></div>
               <div><div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Sun className="w-4 h-4"/> Brilho LED</div><input type="range" min="0" max="100" step="5" value={Number(settings?.marqueeBrightness) ?? 50} onChange={e => setSettings({...settings, marqueeBrightness: parseInt(e.target.value)})} onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }} onTouchEnd={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-full h-2 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ accentColor: '#f59e0b' }} /></div>
            </div>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}>
        <button onClick={() => toggleSection('arquivologia')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'arquivologia' ? (darkMode ? 'border-b-[2px] border-gray-300' : 'border-b-[2px] border-black') : ''}`}><span className="flex items-center gap-2"><ListIcon className="w-4 h-4" /> Gestão de Classes</span><span className="text-lg font-mono">{openSection === 'arquivologia' ? '−' : '+'}</span></button>
        {openSection === 'arquivologia' && (
          <div className="p-4 flex flex-col gap-4">
            <MInput darkMode={darkMode} label="Prefixo do Acervo" value={settings?.archivePrefix || ''} onChange={e => setSettings({...settings, archivePrefix: e.target.value.toUpperCase()})} onBlur={() => { playChipBeep('save'); onShowToast('success'); }} placeholder="Ex: MBU" />
            <div className={`p-3 border-[2px] ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-gray-100'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 border-b-[2px] border-current pb-1">Nova Subclasse</h4>
              <div className="flex flex-col gap-2">
                <select value={newSubclass.parent} onChange={e => setNewSubclass({...newSubclass, parent: e.target.value})} className={`w-full p-2 border-[2px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`}>{Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nome" value={newSubclass.name} onChange={e => setNewSubclass({...newSubclass, name: e.target.value})} className={`flex-1 p-2 border-[2px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                  <input type="text" placeholder="Código" value={newSubclass.code} onChange={e => setNewSubclass({...newSubclass, code: e.target.value})} className={`w-24 p-2 border-[2px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                </div>
                <MButton darkMode={darkMode} variant="black" onClick={handleAddSubclass} className="py-2 text-[10px]">Adicionar Subclasse</MButton>
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-3">Tabela de Códigos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(activeCategories || {}).map(([cat, subs]) => (
                <div key={cat} className="mb-3">
                  <div className={`text-[9px] font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block mb-1`}>{cat}</div>
                  <div className="flex flex-col gap-1 pl-2">
                    {(Array.isArray(subs) ? subs : []).map(sub => (
                      <div key={sub} className="flex items-center justify-between text-xs font-bold"><span className="opacity-80">{sub}</span><input type="text" value={activeClassCodes?.[sub] || ''} onChange={e => setSettings({...settings, userClassCodes: { ...activeClassCodes, [sub]: e.target.value }})} onBlur={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-16 p-1 border-[2px] text-center font-mono text-[10px] outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} /></div>
                    ))}
                  </div>
               </div>
              ))}
              </div>
            </div>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}>
        <button onClick={() => toggleSection('equivalencias')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'equivalencias' ? (darkMode ? 'border-b-[2px] border-gray-300' : 'border-b-[2px] border-black') : ''}`}><span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Equivalências (Artistas)</span><span className="text-lg font-mono">{openSection === 'equivalencias' ? '−' : '+'}</span></button>
        {openSection === 'equivalencias' && (
          <div className="p-4 flex flex-col gap-4">
            <div className={`p-3 border-[2px] ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-gray-100'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 border-b-[2px] border-current pb-1">Agrupar Variações</h4>
              <div className="flex flex-col gap-2">
                <input type="text" placeholder="Nome Correto (Ex: Expresso Rural)" value={newAlias.main} onChange={e => setNewAlias({...newAlias, main: e.target.value})} className={`w-full p-2 border-[2px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                <input type="text" placeholder="Lido Pelo Sist. Como (Ex: Expresso)" value={newAlias.alias} onChange={e => setNewAlias({...newAlias, alias: e.target.value})} className={`w-full p-2 border-[2px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                <MButton darkMode={darkMode} onClick={handleAddAlias} variant="black" className="py-2 text-[10px] mt-1">Salvar Variação</MButton>
              </div>
            </div>
            {settings?.artistAliases && settings.artistAliases.length > 0 && (
              <div className="mt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3">Variações Ativas</h4>
                <div className="flex flex-col gap-2">
                  {settings.artistAliases.map((a, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 border-[2px] ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                      <div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-widest opacity-60">Lido como: {a.alias}</span><span className="text-[11px] font-bold">Corrigido p/: {a.main}</span></div>
                      <button onClick={() => handleRemoveAlias(idx)} className="p-2 text-pink-600 hover:text-pink-800 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}>
        <button onClick={() => toggleSection('integracoes')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'integracoes' ? (darkMode ? 'border-b-[2px] border-gray-300' : 'border-b-[2px] border-black') : ''}`}><span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Integrações & APIs</span><span className="text-lg font-mono">{openSection === 'integracoes' ? '−' : '+'}</span></button>
        {openSection === 'integracoes' && (
          <div className="p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2"><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}><Camera className="w-4 h-4"/> Gemini API (Scan IA)</div><MInput darkMode={darkMode} type="password" value={settings?.geminiApiKey || ''} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} /></div>
            <div className={`border-t-[2px] pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}><DiscIcon className="w-4 h-4"/> Discogs API</div><MInput darkMode={darkMode} type="password" value={settings?.discogsToken || ''} onChange={e => setSettings({...settings, discogsToken: e.target.value})} /></div>
            <div className={`border-t-[2px] pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}><Share className="w-4 h-4"/> Google Sheets</div><MInput darkMode={darkMode} label="Webhook URL" value={settings?.googleSheetsUrl || ''} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} /></div>
            <div className={`border-t-[2px] pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}><Headphones className="w-4 h-4"/> Last.FM</div><MInput darkMode={darkMode} label="Username" value={settings?.lastfmUser || ''} onChange={e => setSettings({...settings, lastfmUser: e.target.value})} /><MInput darkMode={darkMode} label="API Key" type="password" value={settings?.lastfmApiKey || ''} onChange={e => setSettings({...settings, lastfmApiKey: e.target.value})} /></div>
            <MButton darkMode={darkMode} onClick={() => { playChipBeep('save'); onShowToast('success'); }} variant="black" className="w-full mt-2 text-[10px]"><Check className="w-4 h-4" /> Salvar APIs</MButton>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}>
        <button onClick={() => toggleSection('backup')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'backup' ? (darkMode ? 'border-b-[2px] border-gray-300' : 'border-b-[2px] border-black') : ''}`}><span className="flex items-center gap-2"><Download className="w-4 h-4" /> Backup Local</span><span className="text-lg font-mono">{openSection === 'backup' ? '−' : '+'}</span></button>
        {openSection === 'backup' && (
          <div className="p-4 flex gap-2 flex-col sm:flex-row">
            <button onClick={handleExportCSV} className={`flex-1 flex items-center justify-center gap-2 p-3 text-[10px] font-black uppercase tracking-widest border-[2px] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] border-gray-300 bg-gray-900 text-white' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] border-black bg-pink-100 text-pink-900'}`}><Download className="w-4 h-4 flex-shrink-0" /> Exportar</button>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-black uppercase tracking-widest border-[2px] cursor-pointer active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] border-gray-300 bg-gray-900 text-white' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] border-black bg-pink-100 text-pink-900'} `}><Upload className="w-4 h-4 flex-shrink-0" /> Importar<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} /></label>
          </div>
        )}
      </MContainer>

      <div className="mt-8 mb-4 text-center">
        <button onClick={() => setShowResetConfirm(true)} className={`px-4 py-2 border-[2px] text-[8px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all ${darkMode ? 'border-pink-500 text-pink-500' : 'border-pink-600 text-pink-600'}`}>⚠️ Resetar Coleção Física</button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [addMode, setAddMode] = useState('manual');
  const [darkMode, setDarkMode] = useState(false);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ geminiApiKey: '', googleSheetsUrl: '', marqueeSpeed: 35, marqueeBrightness: 50, archivePrefix: 'MBU', lastfmUser: '', lastfmApiKey: '', discogsToken: '', artistAliases: [], soundEnabled: true });

  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success' });
  const [isHtml5QrcodeLoaded, setIsHtml5QrcodeLoaded] = useState(false);

  // Estados Globais de Filtro e UI
  const [globalFilters, setGlobalFilters] = useState({ Categorias: [], Subtipos: [], Status: [], Notas: [], Autores: [], Editoras: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [alphaFilter, setAlphaFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('added');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [libraryPage, setLibraryPage] = useState(0); 

  const pwa = usePWA(LINK_DO_ICONE_NO_GITHUB);
  const globalFileInputRef = useRef(null);

  const [aiBoxState, setAiBoxState] = useState('idle');
  const [aiBoxMessage, setAiBoxMessage] = useState('');
  const [scannedAIData, setScannedAIData] = useState(null);

  const activeCategories = (settings?.userCategories && typeof settings.userCategories === 'object' && !Array.isArray(settings.userCategories)) ? settings.userCategories : DEFAULT_CATEGORIES;
  const activeClassCodes = (settings?.userClassCodes && typeof settings.userClassCodes === 'object' && !Array.isArray(settings.userClassCodes)) ? settings.userClassCodes : DEFAULT_CLASS_CODES;
  const allTypes = Object.values(activeCategories).flat();

  // ---------------------------------------------------------
  // LÓGICA DE FILTRAGEM GLOBAL
  // ---------------------------------------------------------
  const processedItems = useMemo(() => {
     let res = items;

     if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        res = res.filter(i => (i.title || '').toLowerCase().includes(lower) || (i.author_developer || '').toLowerCase().includes(lower) || (i.publisher || '').toLowerCase().includes(lower) || (i.archive_code || '').toLowerCase().includes(lower));
     }

     if (alphaFilter !== 'Todos') {
        res = res.filter(i => {
           let targetText = i.title;
           if (sortBy === 'author' && !isVariousArtists(i.author_developer)) targetText = applyArtistAlias(i.author_developer, settings?.artistAliases);
           const cleanStr = getSortableName(targetText);
           if (alphaFilter === '#') return /^[^a-zA-Záéíóúâêôãõç]/i.test(cleanStr);
           else {
              const firstChar = cleanStr.charAt(0).toUpperCase();
              return firstChar.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === alphaFilter;
           }
        });
     }

     if (globalFilters.Categorias && globalFilters.Categorias.length > 0) res = res.filter(i => globalFilters.Categorias.some(c => (activeCategories[c] || []).includes(i.type)));
     if (globalFilters.Subtipos && globalFilters.Subtipos.length > 0) res = res.filter(i => globalFilters.Subtipos.includes(i.type));
     if (globalFilters.Status && globalFilters.Status.length > 0) {
        res = res.filter(i => {
           const isDisc = (activeCategories['Discos'] || []).includes(i.type);
           const isVideo = (activeCategories['Vídeo'] || []).includes(i.type);
           if (isDisc || isVideo) {
              const st = (Number(i.rating)||0)>0 ? 'Concluído' : 'Não Iniciado';
              // If filter asks for Backlog/Não Iniciado, accept 'Não Iniciado'
              if (globalFilters.Status.includes('Backlog / Não Iniciado') && st === 'Não Iniciado') return true;
              return globalFilters.Status.includes(st);
           }
           const stText = i.status === 'Backlog' ? 'Não Iniciado' : (i.status || 'Não Iniciado');
           if (globalFilters.Status.includes('Backlog / Não Iniciado') && stText === 'Não Iniciado') return true;
           return globalFilters.Status.includes(stText);
        });
     }
     if (globalFilters.Notas && globalFilters.Notas.length > 0) res = res.filter(i => globalFilters.Notas.includes(Math.floor(Number(i.rating)||0)));

     res = [...res].sort((a, b) => {
          let valA = '', valB = '';
          switch (sortBy) {
              case 'title': valA = getSortableName(a.title); valB = getSortableName(b.title); break;
              case 'author':
                  valA = getSortableName(isVariousArtists(a.author_developer) ? a.title : applyArtistAlias(a.author_developer, settings?.artistAliases));
                  valB = getSortableName(isVariousArtists(b.author_developer) ? b.title : applyArtistAlias(b.author_developer, settings?.artistAliases)); break;
              case 'type': valA = (a.type||'').trim(); valB = (b.type||'').trim(); break;
          }
          if (sortBy === 'year') {
              const yA = parseInt(a.year) || 0; const yB = parseInt(b.year) || 0;
              return sortOrder === 'asc' ? yA - yB : yB - yA;
          } else if (sortBy === 'added') {
              valA = a.id || ''; valB = b.id || '';
              return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          } else {
              const cmp = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase(), 'pt-BR', { numeric: true, sensitivity: 'base' });
              return sortOrder === 'asc' ? cmp : -cmp;
          }
     });

     return res;
  }, [items, searchTerm, alphaFilter, globalFilters, sortBy, sortOrder, activeCategories, settings?.artistAliases]);

  const activeFiltersCount = Object.values(globalFilters).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);

  const handleGlobalCheckboxChange = (group, val) => {
     setGlobalFilters(prev => {
        const cur = prev[group] || [];
        if (cur.includes(val)) return { ...prev, [group]: cur.filter(x => x !== val) };
        return { ...prev, [group]: [...cur, val] };
     });
     setLibraryPage(0);
  };
  const clearGlobalFilters = () => { playChipBeep('click'); setGlobalFilters({ Categorias: [], Subtipos: [], Status: [], Notas: [], Autores: [], Editoras: [] }); setLibraryPage(0); };

  const triggerGlobalAI = () => { setActiveTab('add'); setAddMode('manual'); if (globalFileInputRef.current) globalFileInputRef.current.click(); };

  const handleGlobalFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setActiveTab('add'); setAddMode('manual'); processGlobalAIFile(file); }
    e.target.value = null;
  };

  const processGlobalAIFile = async (file) => {
    const apiKey = (settings?.geminiApiKey || "").trim();
    if (!apiKey) { setAiBoxState('error'); setAiBoxMessage('Chave API ausente.'); playChipBeep('error'); return; }
    setAiBoxState('loading'); setAiBoxMessage('Analisando com IA...');

    try {
      const b64 = (await resizeImageForAPI(file)).split(',')[1];
      const promptInstructions = `Aja como arquivista especializado. Seja rápido.
Analise a imagem (capa, etiqueta de disco, ficha catalográfica). Retorne EXCLUSIVAMENTE um JSON.
{
  "type": "Escolha APENAS uma: ${allTypes.join(', ')}",
  "title": "Título Principal",
  "author_developer": "Autor(es) ou Artista",
  "year": "Ano (formato YYYY)",
  "publisher": "Editora ou Gravadora",
  "pages_or_time": "Páginas, faixas ou minutos (apenas números)",
  "barcode": "Código de barras OU Código de Catálogo da Gravadora impresso no selo (ex: 33.062)",
  "description": "Texto descritivo. Deixe VAZIO se não houver texto explícito descrevendo a obra."
}
REGRAS: 1. NÃO invente descrições. 2. Capture código de catálogo no 'barcode'. 3. APENAS JSON puro.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [ { text: promptInstructions }, { inlineData: { mimeType: "image/jpeg", data: b64 } } ] }], generationConfig: { responseMimeType: "application/json" } })
      });

      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
      const data = await res.json(); let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Retorno vazio.");
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim(); text = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);

      setScannedAIData(JSON.parse(text)); setAiBoxState('success'); setAiBoxMessage('Extraído com sucesso da imagem!'); playChipBeep('save'); showToast('success');
    } catch (e) {
      setAiBoxState('error'); setAiBoxMessage(`Falha na IA. Tente modo manual ou Barcode.`); playChipBeep('error'); showToast('error');
    }
  };

  const showToast = (type = 'success') => { setToast({ visible: true, type }); setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000); };

  useEffect(() => {
    let savedSettings = null;
    try {
      if (localStorage.getItem('memorabilia_theme') === 'dark') setDarkMode(true);
      const sItems = localStorage.getItem('memorabilia_items'); if (sItems) setItems(JSON.parse(sItems));
      const sSett = localStorage.getItem('memorabilia_settings'); 
      if (sSett) { 
          savedSettings = JSON.parse(sSett); 
          setSettings(p => ({ ...p, ...savedSettings })); 
          globalSoundEnabled = savedSettings.soundEnabled !== false;
      }
    } catch (e) {}

    if (savedSettings?.googleSheetsUrl) {
       setIsFetchingCloud(true);
       fetch(savedSettings.googleSheetsUrl).then(res => res.json()).then(data => {
          if (Array.isArray(data) && data.length > 0) setItems(data);
          setShowSuccessSplash(true); playLydianSuccess();
          setTimeout(() => { setShowSuccessSplash(false); setIsFetchingCloud(false); setInitialLoadDone(true); setIsLoaded(true); }, 1500);
       }).catch(() => { setIsFetchingCloud(false); setInitialLoadDone(true); setIsLoaded(true); });
    } else { setIsFetchingCloud(false); setInitialLoadDone(true); setIsLoaded(true); }

    if (window.Html5Qrcode) { setIsHtml5QrcodeLoaded(true); }
    else if (!document.getElementById('html5-qrcode')) {
      const script = document.createElement('script'); script.id = 'html5-qrcode'; script.src = "https://unpkg.com/html5-qrcode/html5-qrcode.min.js";
      script.async = true; script.onload = () => setIsHtml5QrcodeLoaded(true); document.head.appendChild(script);
    }
  }, []);

  const [lfmPeriodIdx, setLfmPeriodIdx] = useState(0);
  const [lfmStatIdx, setLfmStatIdx] = useState(0);
  const [lfmCache, setLfmCache] = useState({});
  const [isLfmLoading, setIsLfmLoading] = useState(false);
  const [lastFmTrack, setLastFmTrack] = useState(null);

  const LFM_PERIODS = ['7day', '1month', '12month', 'overall']; const LFM_PERIOD_LABELS = ['7D', '1M', '1A', 'Geral']; const LFM_STATS = ['Última', 'Top Artista', 'Top Álbum', 'Top Faixa', 'Artistas Únicos', 'Faixas Escutadas'];

  useEffect(() => {
    if (!settings?.lastfmUser || !settings?.lastfmApiKey || !isLoaded) return;
    const fetchRec = async () => { try { const data = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&format=json&limit=1`)).json(); const t = data?.recenttracks?.track?.[0]; if (t) setLastFmTrack({ name: t.name, artist: t.artist['#text'] || t.artist?.name || 'Desconhecido', nowPlaying: t['@attr']?.nowplaying === 'true' }); } catch(e){} };
    fetchRec(); const int = setInterval(fetchRec, 60000); return () => clearInterval(int);
  }, [settings?.lastfmUser, settings?.lastfmApiKey, isLoaded]);

  useEffect(() => {
    if (!settings?.lastfmUser || !settings?.lastfmApiKey || !isLoaded || lfmStatIdx === 0) return;
    const p = LFM_PERIODS[lfmPeriodIdx]; const k = `${lfmStatIdx}-${p}`;
    if (!lfmCache[k]) {
      const f = async () => {
        setIsLfmLoading(true);
        try {
          let v = 'N/A';
          if (lfmStatIdx === 1 || lfmStatIdx === 4) { const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&period=${p}&format=json&limit=1`)).json(); if(lfmStatIdx===1) v = d?.topartists?.artist?.[0]?.name||'N/A'; else v = d?.topartists?.['@attr']?.total||'0'; }
          else if (lfmStatIdx === 2) { const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&period=${p}&format=json&limit=1`)).json(); const a = d?.topalbums?.album?.[0]; v = a ? `${a.name} (${a.artist?.name})` : 'N/A'; }
          else if (lfmStatIdx === 3 || lfmStatIdx === 5) { const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&period=${p}&format=json&limit=1`)).json(); if (lfmStatIdx===3) { const t = d?.toptracks?.track?.[0]; v = t ? `${t.name} (${t.artist?.name})` : 'N/A'; } else v = d?.toptracks?.['@attr']?.total||'0'; }
          setLfmCache(pr => ({ ...pr, [k]: String(v) }));
        } catch(e) { setLfmCache(pr => ({ ...pr, [k]: 'Erro' })); } finally { setIsLfmLoading(false); }
      }; f();
    }
  }, [settings?.lastfmUser, settings?.lastfmApiKey, isLoaded, lfmStatIdx, lfmPeriodIdx, lfmCache]);

  const lfmPressTimer = useRef(null); const isLfmLongPress = useRef(false);
  const handleLfmPressStart = () => { isLfmLongPress.current = false; lfmPressTimer.current = setTimeout(() => { isLfmLongPress.current = true; setLfmPeriodIdx(p => (p + 1) % LFM_PERIODS.length); if (lfmStatIdx === 0) setLfmStatIdx(1); }, 500); };
  const handleLfmPressEnd = () => { if (lfmPressTimer.current) clearTimeout(lfmPressTimer.current); };
  const handleLfmClick = () => { if (!isLfmLongPress.current) { playChipBeep('click'); setLfmStatIdx(p => (p + 1) % LFM_STATS.length); } };

  let lfmLabelStr = 'Last.FM:'; let lfmDisplayStr = 'Sem dados'; let isPulsingLfm = false;
  if (!settings?.lastfmUser) lfmDisplayStr = 'Configure em Ajustes';
  else if (lfmStatIdx === 0) { if (lastFmTrack) { lfmLabelStr = lastFmTrack.nowPlaying ? 'Ouvindo:' : 'Última:'; lfmDisplayStr = `${lastFmTrack.artist} - ${lastFmTrack.name}`; isPulsingLfm = lastFmTrack.nowPlaying; } else lfmDisplayStr = 'Carregando...'; }
  else {
    const pl = LFM_PERIOD_LABELS[lfmPeriodIdx]; const ck = `${lfmStatIdx}-${LFM_PERIODS[lfmPeriodIdx]}`;
    if (lfmStatIdx === 1) lfmLabelStr = `(${pl}) Top Artista:`; else if (lfmStatIdx === 2) lfmLabelStr = `(${pl}) Top Álbum:`; else if (lfmStatIdx === 3) lfmLabelStr = `(${pl}) Top Faixa:`; else if (lfmStatIdx === 4) lfmLabelStr = `(${pl}) Artistas Únicos:`; else if (lfmStatIdx === 5) lfmLabelStr = `(${pl}) Total Faixas:`;
    lfmDisplayStr = (isLfmLoading && !lfmCache[ck]) ? 'Carregando...' : (lfmCache[ck] || 'N/A');
  }

  useEffect(() => { if (initialLoadDone) localStorage.setItem('memorabilia_items', JSON.stringify(items)); }, [items, initialLoadDone]);
  useEffect(() => { if (initialLoadDone) localStorage.setItem('memorabilia_settings', JSON.stringify(settings)); }, [settings, initialLoadDone]);
  useEffect(() => { if (initialLoadDone) localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light'); }, [darkMode, initialLoadDone]);

  const hasSuggested = useRef(false); const [suggestion, setSuggestion] = useState(null);
  useEffect(() => { if (isLoaded && items.length > 0 && !hasSuggested.current) { const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type)); if (ms.length > 0) setSuggestion(ms[Math.floor(Math.random() * ms.length)]); hasSuggested.current = true; } }, [isLoaded, items, activeCategories]);
  const shuffleSuggestion = () => { playChipBeep('click'); const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type)); if (ms.length > 0) { let ns = ms[Math.floor(Math.random() * ms.length)]; if (ms.length > 1 && suggestion) { while (ns.id === suggestion?.id) ns = ms[Math.floor(Math.random() * ms.length)]; } setSuggestion(ns); } };
  const suggPressTimer = useRef(null); const isSuggLongPress = useRef(false);
  const handleSuggPressStart = () => { isSuggLongPress.current = false; suggPressTimer.current = setTimeout(() => { isSuggLongPress.current = true; shuffleSuggestion(); }, 500); };
  const handleSuggPressEnd = () => { if (suggPressTimer.current) clearTimeout(suggPressTimer.current); };
  const handleSuggClick = () => { if (!isSuggLongPress.current && suggestion) { playChipBeep('click'); window.open(`https://open.spotify.com/search/${encodeURIComponent((suggestion.title || '') + ' ' + (suggestion.author_developer || ''))}`, '_blank'); } };

  const pressTimer = useRef(null); const isLongPress = useRef(false);
  const handleAddPressStart = () => { isLongPress.current = false; pressTimer.current = setTimeout(() => { isLongPress.current = true; triggerGlobalAI(); }, 500); };
  const handleAddPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleAddClick = () => { if (!isLongPress.current) { playChipBeep('click'); setAddMode('barcode'); setActiveTab('add'); } };

  const libPressTimer = useRef(null); const isLibLongPress = useRef(false);
  const handleLibPressStart = () => { isLibLongPress.current = false; libPressTimer.current = setTimeout(() => { isLibLongPress.current = true; clearGlobalFilters(); setActiveTab('library'); }, 500); };
  const handleLibPressEnd = () => { if (libPressTimer.current) clearTimeout(libPressTimer.current); };
  const handleLibClick = () => { if (!isLibLongPress.current) { playChipBeep('click'); setActiveTab('library'); } };

  const dashPressTimer = useRef(null); const isDashLongPress = useRef(false);
  const handleDashPressStart = () => { isDashLongPress.current = false; dashPressTimer.current = setTimeout(() => { isDashLongPress.current = true; clearGlobalFilters(); setActiveTab('dashboard'); }, 500); };
  const handleDashPressEnd = () => { if (dashPressTimer.current) clearTimeout(dashPressTimer.current); };
  const handleDashClick = () => { if (!isDashLongPress.current) { playChipBeep('click'); setActiveTab('dashboard'); } };

  const speed = settings?.marqueeSpeed || 35;
  const glow = (settings?.marqueeBrightness ?? 50) / 10;
  const currentSpeed = Math.max(3, speed / 4);
  const textShadowStyle = { textShadow: glow > 0 ? `0 0 ${glow}px currentColor, 0 0 ${glow * 1.5}px currentColor` : 'none' };
  const ledItemStyle = "font-led text-[9px] sm:text-[10px] uppercase tracking-normal";

  const renderDiscoSeparator = () => (<div className="flex items-center mx-4 opacity-90 pb-0.5"><DiscoSpinner className="w-5 h-5 flex-shrink-0" glow={glow} speed={currentSpeed} /></div>);
  const renderPacmanEnd = () => (
    <div className="flex items-center gap-2 ml-6 mr-10 opacity-90 pb-0.5">
      <Ghost className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`} style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px currentColor)` : 'none' }} />
      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_3px_currentColor]" /><div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_3px_currentColor]" /><div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_3px_currentColor]" />
      <svg viewBox="0 0 100 100" className="w-4 h-4 flex-shrink-0" style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px #f59e0b)` : 'none' }}><path fill="#f59e0b" transform="scale(-1, 1) translate(-100, 0)"><animate attributeName="d" values="M50 50 L93.3 25 A 50 50 0 1 0 93.3 75 Z; M50 50 L99.9 48 A 50 50 0 1 0 99.9 52 Z; M50 50 L93.3 25 A 50 50 0 1 0 93.3 75 Z" dur="0.4s" repeatCount="indefinite" /></path></svg>
    </div>
  );

  const renderMarqueeContent = () => {
    const statsArr = [];
    statsArr.push(<span key="total" className={`text-white ${ledItemStyle}`}>ACERVO TOTAL: {items.length}</span>);
    
    const gCatCounts = items.reduce((acc, i) => { let mainCat = 'Outros'; for (const [cat, subs] of Object.entries(activeCategories)) { if ((subs || []).includes(i.type)) { mainCat = cat; break; } } acc[mainCat] = (acc[mainCat] || 0) + 1; return acc; }, {});
    
    Object.keys(activeCategories).forEach((cat, index) => {
       const count = gCatCounts[cat] || 0; const perc = items.length > 0 ? ((count / items.length) * 100).toFixed(1) : 0;
       const colors = ['text-pink-600', 'text-amber-500', 'text-cyan-500'];
       statsArr.push(<span key={cat} className={`${colors[index % colors.length]} ${ledItemStyle}`}>{cat.toUpperCase()}: {count} ({perc}%)</span>);
    });
    const globRated = items.filter(i => (Number(i.rating) || 0) > 0);
    if (globRated.length > 0) statsArr.push(<span key="rating" className={`text-amber-500 ${ledItemStyle}`}>NOTA MÉDIA GLOBAL: ★ {(globRated.reduce((acc, i) => acc + (Number(i.rating) || 0), 0) / globRated.length).toFixed(1)}</span>);

    return (<div className="flex items-center py-1" style={textShadowStyle}>{statsArr.map((stat, index) => ( <React.Fragment key={index}>{stat}{index < statsArr.length - 1 ? renderDiscoSeparator() : renderPacmanEnd()}</React.Fragment> ))}</div>);
  };

  if (isFetchingCloud && !showSuccessSplash) {
    return (
       <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-black text-white'} flex flex-col items-center justify-center font-sans font-black tracking-widest relative overflow-hidden`} style={{ backgroundColor: '#0b0b0b', backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)', backgroundSize: '3px 3px' }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; }`}</style>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)] pointer-events-none" /><DiscoSpinner className="w-24 h-24 mb-6 z-10 text-cyan-600" glow={10} speed={currentSpeed} /><p className="text-cyan-600 z-10 font-led text-[10px] text-center drop-shadow-[0_0_8px_currentColor] animate-pulse leading-loose">SINCRONIZANDO<br/>COM GOOGLE SHEETS...</p>
       </div>
    );
  }

  if (showSuccessSplash) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans font-black tracking-widest relative overflow-hidden bg-black text-white`} style={{ backgroundImage: 'radial-gradient(circle, #222 1.5px, transparent 1.5px)', backgroundSize: '4px 4px' }}>
         <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; }`}</style>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)] pointer-events-none" />
         <div className="z-10 flex flex-col items-center justify-center gap-6 animate-in zoom-in duration-300"><img src={LINK_DO_ICONE_NO_GITHUB} alt="Memorabilia Icon" className="w-28 h-28 object-contain drop-shadow-[0_0_15px_rgba(219,39,119,0.8)]" /><h1 className="text-4xl text-pink-600 drop-shadow-[0_0_10px_currentColor] text-center leading-none uppercase tracking-tighter">Memorabilia</h1></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; } .led-board { background-color: #0b0b0b; background-image: radial-gradient(circle, #000 1.5px, transparent 1.5px); background-size: 3px 3px; box-shadow: inset 0 0 15px #000; } @keyframes marqueeLinear { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } } @keyframes titleColorCycle { 0%, 100% { color: #db2777; } 33% { color: #0891b2; } 66% { color: #d97706; } } `}</style>
      
      {/* MENUS GLOBAIS DE FILTRO E ORDENAÇÃO */}
      {isFilterMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex justify-center items-end sm:items-center animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md max-h-[85vh] sm:h-[80vh] flex flex-col border-t-[2px] sm:border-[2px] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[6px_6px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`p-4 border-b-[2px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}><button onClick={() => { playChipBeep('click'); setIsFilterMenuOpen(false); }} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button><span className="text-[12px] font-black uppercase tracking-widest">Filtro Global</span><div className="w-7"/></div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* CATEGORIAS */}
                    <div className={`p-4 border-b-[2px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Categorias Principais</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(activeCategories).map(cat => {
                          const isActive = globalFilters.Categorias && globalFilters.Categorias.includes(cat);
                          return (
                          <label key={cat} className={`flex items-center gap-2 p-2 border-[2px] cursor-pointer transition-colors ${isActive ? (darkMode?'border-cyan-400 bg-cyan-900/30':'border-cyan-600 bg-cyan-50') : (darkMode?'border-gray-700':'border-gray-300')} text-[10px] font-black uppercase`}>
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { playChipBeep('click'); handleGlobalCheckboxChange('Categorias', cat); }} /> {cat}
                          </label>
                        )})}
                      </div>
                    </div>
                    {/* FORMATOS/SUBTIPOS */}
                    <div className={`p-4 border-b-[2px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Formatos Específicos</div>
                      <div className="flex flex-wrap gap-2">
                        {allTypes.map(sub => {
                          const isActive = globalFilters.Subtipos && globalFilters.Subtipos.includes(sub);
                          return (
                          <label key={sub} className={`flex items-center gap-2 p-2 border-[2px] cursor-pointer transition-colors ${isActive ? (darkMode?'border-pink-400 bg-pink-900/30':'border-pink-600 bg-pink-50') : (darkMode?'border-gray-700':'border-gray-300')} text-[10px] font-black uppercase`}>
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { playChipBeep('click'); handleGlobalCheckboxChange('Subtipos', sub); }} /> {sub}
                          </label>
                        )})}
                      </div>
                    </div>
                    {/* STATUS */}
                    <div className={`p-4 border-b-[2px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Status (Universal)</div>
                      <div className="flex flex-wrap gap-2">
                        {['Backlog / Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'].map(st => {
                          const isActive = globalFilters.Status && globalFilters.Status.includes(st);
                          return (
                          <label key={st} className={`flex items-center gap-2 p-2 border-[2px] cursor-pointer transition-colors ${isActive ? (darkMode?'border-amber-400 bg-amber-900/30':'border-amber-600 bg-amber-50') : (darkMode?'border-gray-700':'border-gray-300')} text-[10px] font-black uppercase`}>
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { playChipBeep('click'); handleGlobalCheckboxChange('Status', st); }} /> {st}
                          </label>
                        )})}
                      </div>
                    </div>
                    {/* NOTAS */}
                    <div className={`p-4 border-b-[2px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Avaliação Inteira</div>
                      <div className="flex flex-wrap gap-2">
                        {[5,4,3,2,1,0].map(nt => {
                          const isActive = globalFilters.Notas && globalFilters.Notas.includes(nt);
                          return (
                          <label key={nt} className={`flex items-center gap-2 p-2 border-[2px] cursor-pointer transition-colors ${isActive ? (darkMode?'border-cyan-400 bg-cyan-900/30':'border-cyan-600 bg-cyan-50') : (darkMode?'border-gray-700':'border-gray-300')} text-[10px] font-black uppercase`}>
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { playChipBeep('click'); handleGlobalCheckboxChange('Notas', nt); }} /> {nt===0?'Sem Nota':`${nt}★`}
                          </label>
                        )})}
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 border-t-[2px] flex gap-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <MButton onClick={clearGlobalFilters} variant="white" darkMode={darkMode} className="flex-1 py-4 text-[10px]">Limpar</MButton>
                      <MButton onClick={() => { playChipBeep('click'); setIsFilterMenuOpen(false); }} variant="black" darkMode={darkMode} className="flex-[2] py-4 text-[10px]">Ver {processedItems.length} Itens</MButton>
                  </div>
              </div>
          </div>
      )}

      {isSortMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex flex-col justify-end sm:justify-center items-center sm:p-4 animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md flex flex-col border-t-[2px] sm:border-[2px] max-h-[85vh] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[6px_6px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`p-4 border-b-[2px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}><button onClick={() => { playChipBeep('click'); setIsSortMenuOpen(false); }} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button><span className="text-[12px] font-black uppercase tracking-widest">Ordenação Global</span><div className="w-7"/></div>
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                      <div className="mb-6">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ordem</div>
                          <div className={`border-[2px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <MRadio label="↑ Ascendente" checked={sortOrder==='asc'} onChange={()=>{ playChipBeep('click'); setSortOrder('asc'); }} darkMode={darkMode} />
                              <MRadio label="↓ Descendente" checked={sortOrder==='desc'} onChange={()=>{ playChipBeep('click'); setSortOrder('desc'); }} darkMode={darkMode} />
                          </div>
                      </div>
                      <div>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ordenar por</div>
                          <div className={`border-[2px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <MRadio label="Artista / Autor" checked={sortBy==='author'} onChange={()=>{ playChipBeep('click'); setSortBy('author'); }} darkMode={darkMode} />
                              <MRadio label="Ano" checked={sortBy==='year'} onChange={()=>{ playChipBeep('click'); setSortBy('year'); }} darkMode={darkMode} />
                              <MRadio label="Título" checked={sortBy==='title'} onChange={()=>{ playChipBeep('click'); setSortBy('title'); }} darkMode={darkMode} />
                              <MRadio label="Data Adicionada" checked={sortBy==='added'} onChange={()=>{ playChipBeep('click'); setSortBy('added'); }} darkMode={darkMode} />
                              <MRadio label="Formato" checked={sortBy==='type'} onChange={()=>{ playChipBeep('click'); setSortBy('type'); }} darkMode={darkMode} />
                          </div>
                      </div>
                  </div>
                  <div className={`p-4 border-t-[2px] ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <MButton darkMode={darkMode} variant="pink" onClick={() => { playChipBeep('click'); setIsSortMenuOpen(false); }} className="w-full py-4 text-[10px]">Aplicar Ordenação</MButton>
                  </div>
              </div>
          </div>
      )}

      <div className={`w-full h-screen relative flex flex-col md:flex-row shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        
        {/* NAVEGAÇÃO LATERAL (Desktop) */}
        <nav className={`hidden md:flex flex-col w-20 lg:w-48 flex-none border-r-[2px] z-20 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
          <div className="p-4 border-b-[2px] border-current flex items-center justify-center lg:justify-start gap-2 h-20">
            <img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-8 h-8 object-contain" /><span className="hidden lg:block text-xs font-black uppercase tracking-widest mt-1">Memorabilia</span>
          </div>
          <div className="flex-1 flex flex-col pt-4">
            <button onTouchStart={handleLibPressStart} onTouchEnd={handleLibPressEnd} onMouseDown={handleLibPressStart} onMouseUp={handleLibPressEnd} onMouseLeave={handleLibPressEnd} onClick={handleLibClick} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-cyan-600 text-white border-l-[4px] border-cyan-400' : 'bg-cyan-600 border-l-[4px] border-black text-white') : 'border-l-[4px] border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Library className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Coleção</span>
            </button>
            <button onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd} onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd} onClick={handleAddClick} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-amber-500 text-black border-l-[4px] border-amber-400' : 'bg-amber-500 border-l-[4px] border-black text-black') : 'border-l-[4px] border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <PlusSquare className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Adicionar</span>
            </button>
            <button onTouchStart={handleDashPressStart} onTouchEnd={handleDashPressEnd} onMouseDown={handleDashPressStart} onMouseUp={handleDashPressEnd} onMouseLeave={handleDashPressEnd} onClick={handleDashClick} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-pink-600 text-white border-l-[4px] border-pink-400' : 'bg-pink-600 border-l-[4px] border-black text-white') : 'border-l-[4px] border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <BarChart2 className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </button>
            <div className="mt-auto mb-4">
              <button onClick={() => { playChipBeep('click'); setActiveTab('settings'); }} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white border-l-[4px] border-gray-400' : 'bg-gray-200 border-l-[4px] border-black') : 'border-l-[4px] border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Settings className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Ajustes</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* HEADER (Topo Geral) */}
          <header className={`flex-none p-3 lg:p-4 border-b-[2px] z-20 flex flex-col gap-2 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col flex-1 pr-2 w-full overflow-hidden">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none" style={{ ...textShadowStyle, animation: `titleColorCycle ${Math.max(3, speed / 4)}s linear infinite` }}>
                  Memorabilia
                </h1>
                <div className="flex flex-row gap-2 mt-2 w-full h-[38px] md:h-[42px]">
                  {settings?.lastfmUser ? (
                    <div onMouseDown={handleLfmPressStart} onMouseUp={handleLfmPressEnd} onMouseLeave={handleLfmPressEnd} onTouchStart={handleLfmPressStart} onTouchEnd={handleLfmPressEnd} onClick={handleLfmClick} className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[2px] flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all overflow-hidden ${darkMode ? 'bg-pink-800 border-gray-300 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-pink-600 border-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                      <Headphones className={`w-3.5 h-3.5 flex-shrink-0 ${isPulsingLfm ? 'animate-pulse' : ''}`} /> 
                      <div className="flex flex-col truncate leading-none justify-center w-full">
                        <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-widest opacity-80 truncate">{lfmLabelStr}</span>
                        <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest truncate w-full">{lfmDisplayStr}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[2px] flex items-center gap-1.5 transition-all overflow-hidden opacity-50 ${darkMode ? 'bg-gray-800 border-gray-300 text-white' : 'bg-gray-200 border-black text-black'}`}>
                      <Headphones className="w-3.5 h-3.5 flex-shrink-0" /><span className="text-[7px] font-black uppercase tracking-widest truncate">Last.FM Off</span>
                    </div>
                  )}
                  {suggestion ? (
                    <div role="button" tabIndex={0} title="Sortear outro disco" onContextMenu={e => e.preventDefault()} onTouchStart={handleSuggPressStart} onTouchEnd={handleSuggPressEnd} onMouseDown={handleSuggPressStart} onMouseUp={handleSuggPressEnd} onMouseLeave={handleSuggPressEnd} onClick={handleSuggClick} style={{ WebkitTouchCallout: 'none' }} className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[2px] flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all overflow-hidden ${darkMode ? 'bg-cyan-800 border-gray-300 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-cyan-600 border-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> 
                      <div className="flex flex-col truncate leading-none justify-center w-full">
                        <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-widest opacity-80 truncate">Ouvir Hoje:</span>
                        <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest truncate w-full">{String(suggestion.title || 'S/ Título')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[2px] flex items-center gap-1.5 transition-all overflow-hidden opacity-50 ${darkMode ? 'bg-gray-800 border-gray-300 text-white' : 'bg-gray-200 border-black text-black'}`}>
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /><span className="text-[7px] font-black uppercase tracking-widest truncate">Sem Discos</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 flex items-center justify-center transition-all duration-300 relative ml-2 md:hidden">
                {toast.visible ? (toast.type === 'error' ? <XIcon className="text-pink-600 w-10 h-10 drop-shadow-md animate-in zoom-in duration-200" /> : <Check className="text-cyan-600 w-10 h-10 drop-shadow-[0_0_8px_rgba(8,145,178,0.8)] animate-in zoom-in duration-200" />) : (<img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-full h-full object-contain animate-in zoom-in duration-200 md:hidden" />)}
              </div>
              <div className="hidden md:flex w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 items-center justify-center transition-all duration-300 relative ml-2">
                 {toast.visible && (toast.type === 'error' ? <XIcon className="text-pink-600 w-10 h-10 drop-shadow-md animate-in zoom-in duration-200" /> : <Check className="text-cyan-600 w-10 h-10 drop-shadow-[0_0_8px_rgba(8,145,178,0.8)] animate-in zoom-in duration-200" />)}
              </div>
            </div>

            <div className="flex flex-row mt-2 items-stretch h-[40px] sm:h-[48px]">
              <div className={`flex-1 w-full flex flex-col border-[2px] text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest overflow-hidden relative ${darkMode ? 'border-gray-300 bg-black text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                 <div className="px-1.5 py-0.5 sm:py-1 border-b-[2px] border-gray-800 opacity-80 flex justify-between z-10 bg-black"><span className="truncate">Painel LED - Status da Coleção</span><span className="animate-pulse text-cyan-600 ml-1">REC</span></div>
                 <div className="flex-1 flex items-center overflow-hidden w-full relative led-board">
                    <div className="absolute whitespace-nowrap flex items-center" style={{ animation: `marqueeLinear ${speed}s linear infinite`, width: 'max-content' }}>
                      {renderMarqueeContent()} {renderMarqueeContent()}
                    </div>
                  </div>
              </div>
            </div>
            
            {/* SUB-HEADER COMPARTILHADO: BUSCA, FILTRO E ORDENAÇÃO */}
            {(activeTab === 'library' || activeTab === 'dashboard') && (
              <div className="flex gap-1 sm:gap-2 w-full mt-1">
                  <div className="flex-1 relative min-w-0">
                      <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input type="text" placeholder="Buscar no acervo global..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setLibraryPage(0); }} className={`w-full h-10 pl-8 pr-8 border-[2px] font-black text-[10px] sm:text-[11px] uppercase tracking-wider outline-none transition-all focus:border-cyan-600 ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`} />
                      {searchTerm && (<button onClick={() => { playChipBeep('click'); setSearchTerm(''); setLibraryPage(0);}} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 active:scale-90"><XIcon className="w-4 h-4" /></button>)}
                  </div>
                  <button onClick={() => { playChipBeep('click'); setIsFilterMenuOpen(true); }} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[2px] transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none relative ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`} title="Filtros Globais">
                      <FilterIcon className="w-4 h-4" />
                      {activeFiltersCount > 0 && (<div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-[2px] flex items-center justify-center text-[8px] font-black ${darkMode ? 'bg-pink-600 border-gray-900 text-white' : 'bg-pink-600 border-white text-white'}`}>{activeFiltersCount}</div>)}
                  </button>
                  <button onClick={() => { playChipBeep('click'); setIsSortMenuOpen(true); }} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[2px] transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none relative ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`} title="Ordenação Global">
                      {sortOrder === 'asc' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </button>
                  {activeTab === 'library' && (
                    <select value={alphaFilter} onChange={e => { playChipBeep('click'); setAlphaFilter(e.target.value); setLibraryPage(0); }} className={`w-12 sm:w-14 h-10 p-0 text-center text-[10px] font-black uppercase tracking-widest border-[2px] outline-none cursor-pointer flex-shrink-0 ${darkMode ? 'border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'}`}>
                        {['Todos', '#', ...Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))].map(l => <option key={l} value={l}>{l === 'Todos' ? 'A-Z' : l}</option>)}
                    </select>
                  )}
              </div>
            )}
          </header>

          {/* ROTEAMENTO DE ABAS */}
          <main className="flex-1 overflow-hidden p-0 sm:p-2 lg:p-4 relative flex flex-col">
            <input type="file" accept="image/*" capture="environment" ref={globalFileInputRef} onChange={handleGlobalFileChange} className="hidden" />
            
            {activeTab === 'library' && <LibraryTab items={items} setItems={setItems} filteredItems={processedItems} setFilteredItems={()=>{}} darkMode={darkMode} settings={settings} onShowToast={showToast} activeCategories={activeCategories} page={libraryPage} setPage={setLibraryPage} />}
            {activeTab === 'add' && <div className="p-3 overflow-y-auto w-full h-full"><AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} onShowToast={showToast} triggerGlobalAI={triggerGlobalAI} globalAiState={aiBoxState} globalAiMessage={aiBoxMessage} resetGlobalAi={() => { setAiBoxState('idle'); setAiBoxMessage(''); }} scannedAIData={scannedAIData} setScannedAIData={setScannedAIData} isHtml5QrcodeLoaded={isHtml5QrcodeLoaded} activeCategories={activeCategories} activeClassCodes={activeClassCodes} allTypes={allTypes} /></div>}
            {activeTab === 'dashboard' && <div className="p-1 sm:p-3 overflow-y-auto w-full h-full scrollbar-hide"><DashboardTab items={items} filteredItems={processedItems} darkMode={darkMode} activeCategories={activeCategories} globalFilters={globalFilters} setGlobalFilters={setGlobalFilters} settings={settings} /></div>}
            {activeTab === 'settings' && <div className="p-3 overflow-y-auto w-full h-full scrollbar-hide"><SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} onShowToast={showToast} pwa={pwa} activeCategories={activeCategories} activeClassCodes={activeClassCodes} /></div>}
          </main>

          {/* NAV MOBILE */}
          <nav className={`flex md:hidden flex-none border-t-[2px] z-20 h-16 relative ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
            <button onTouchStart={handleLibPressStart} onTouchEnd={handleLibPressEnd} onMouseDown={handleLibPressStart} onMouseUp={handleLibPressEnd} onMouseLeave={handleLibPressEnd} onClick={handleLibClick} className={`flex-1 flex flex-col items-center justify-center border-r-[2px] transition-colors ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-600 text-white') : ''}`}>
              <Library className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Coleção</span>
            </button>
            <button onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd} onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd} onClick={handleAddClick} className={`flex-1 flex flex-col items-center justify-center border-r-[2px] transition-colors ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-amber-500 text-black' : 'bg-amber-500 text-black') : ''}`}>
              <PlusSquare className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Adicionar</span>
            </button>
            <button onTouchStart={handleDashPressStart} onTouchEnd={handleDashPressEnd} onMouseDown={handleDashPressStart} onMouseUp={handleDashPressEnd} onMouseLeave={handleDashPressEnd} onClick={handleDashClick} className={`flex-1 flex flex-col items-center justify-center border-r-[2px] transition-colors ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-pink-600 text-white' : 'bg-pink-600 text-white') : ''}`}>
              <BarChart2 className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Dashboard</span>
            </button>
            <button onClick={() => { playChipBeep('click'); setActiveTab('settings'); }} className={`flex-1 flex flex-col items-center justify-center transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black') : ''}`}>
              <Settings className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Ajustes</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
