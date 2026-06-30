import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// CONFIGURAÇÕES DO APLICATIVO
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
const initAudio = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { console.warn("Áudio não suportado", e); }
};

const playOscillator = (freqs, dur, type, vol = 0.04) => {
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type;
    
    const now = audioCtx.currentTime;
    const totalDur = freqs.length > 2 ? freqs.length * dur : dur;
    
    if (freqs.length > 2) {
      freqs.forEach((freq, i) => osc.frequency.setValueAtTime(freq, now + i * dur));
    } else {
      osc.frequency.setValueAtTime(freqs[0], now);
      if(freqs[1]) osc.frequency.setValueAtTime(freqs[1], now + (dur/2));
    }
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.setValueAtTime(vol, now + totalDur - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + totalDur);
    
    osc.start(now); osc.stop(now + totalDur);
  } catch (e) {}
};

const playLydianSuccess = () => playOscillator([523.25, 587.33, 659.25, 739.99, 783.99, 880.00], 0.04, 'square');
const playChipBeep = (type) => {
  if (type === 'save' || type === 'success') playOscillator([440, 554.37], 0.1, 'square', 0.02);
  else if (type === 'error') playOscillator([150, 100], 0.2, 'sawtooth', 0.02);
};

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================
let globalSequenceCache = null;

const generateId = (itemsArray = []) => {
  const now = new Date();
  const timeBase = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
  
  if (globalSequenceCache === null) {
     globalSequenceCache = itemsArray.reduce((max, item) => {
        const match = String(item.id || '').match(/-(\d{4})$/);
        return match && parseInt(match[1], 10) > max ? parseInt(match[1], 10) : max;
     }, 0);
  }
  return `${timeBase}-${String(++globalSequenceCache).padStart(4, '0')}`;
};

const parseItemIdToDate = (idStr) => {
    const parts = String(idStr || '').split('-');
    if (parts.length < 2 || parts[0].length !== 8) return new Date(0);
    return new Date(parseInt(parts[0].substring(0, 4), 10), parseInt(parts[0].substring(4, 6), 10) - 1, parseInt(parts[0].substring(6, 8), 10));
};

const reindexCollection = (currentItems) => {
  const sorted = [...currentItems].sort((a, b) => String(a.id || '').substring(0, 18).localeCompare(String(b.id || '').substring(0, 18)));
  const classCodeCounters = {}; let globalCounter = 1;

  const reindexed = sorted.map(item => {
     let newId = item.id;
     if (String(item.id).split('-').length >= 2) newId = `${item.id.split('-').slice(0, 2).join('-')}-${String(globalCounter).padStart(4, '0')}`;

     let newArchiveCode = item.archive_code;
     const archParts = String(item.archive_code || '').split('-');
     if (archParts.length >= 3) {
         classCodeCounters[archParts[1]] = (classCodeCounters[archParts[1]] || 0) + 1;
         newArchiveCode = `${archParts[0]}-${archParts[1]}-${String(classCodeCounters[archParts[1]]).padStart(4, '0')}`;
     }
     globalCounter++;
     return { ...item, id: newId, archive_code: newArchiveCode };
  });
  globalSequenceCache = globalCounter - 1;
  return reindexed;
};

const resizeImageForAPI = (file, maxWidth = 800) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth; canvas.height = img.height * (maxWidth / img.width);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      }; img.onerror = reject;
    }; reader.onerror = reject; reader.readAsDataURL(file);
});

const parseCSVText = (rawText) => {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let inQuotes = false; let val = '';
  for (let i = 0; i < text.length; i++) {
    let char = text[i]; let nextChar = text[i + 1];
    if (char === '"' && inQuotes && nextChar === '"') { val += '"'; i++; } 
    else if (char === '"') inQuotes = !inQuotes; 
    else if (char === ',' && !inQuotes) { row.push(val); val = ''; } 
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(val); rows.push(row); row = []; val = '';
    } else val += char; 
  }
  if (val !== '' || row.length > 0) { row.push(val); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
};

const normalizeWorkTitle = title => title ? String(title).toLowerCase().replace(/(?:\s*[:-]\s*|\s+)(?:vol\.?|volume|livro|book|edição|ed\.?|pt\.?|part|parte|#)?\s*\d+(?:\.\d+)?$/i, '').trim() : '';
const getSortableName = name => name ? String(name).trim().replace(/^(the|a|an|o|os|as)\s+/i, '') : '';
const isVariousArtists = name => ['various', 'vários', 'varios', 'variados', 'compilação', 'compilações'].some(k => String(name || '').toLowerCase().trim().includes(k));
const getValidYear = val => val ? (String(val).match(/\b(1[0-9]{3}|20[0-9]{2})\b/) ? parseInt(String(val).match(/\b(1[0-9]{3}|20[0-9]{2})\b/)[0], 10) : NaN) : NaN;

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
  if ((activeCategories['Games'] || []).includes(itemType)) return { label: 'Horas/Unid', desc: 'Horas/Discos' };
  if ((activeCategories['Vídeo'] || []).includes(itemType)) return { label: 'Min', desc: 'Minutos' };
  return { label: 'Und', desc: 'Métrica' };
};

const fetchTimeout = (url, options = {}, timeoutMs = 8000) => new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); reject(new Error("Timeout limite atingido")); }, timeoutMs);
    fetch(url, { ...options, signal: controller.signal }).then(resolve).catch(reject).finally(() => clearTimeout(timer));
});

const fetchCoverBySearch = async (item, settings, activeCategories) => {
  const [qTitle, qAuthor, qPub] = [item.title, item.author_developer, item.publisher].map(v => encodeURIComponent(v?.trim() || ''));
  const barcodeRaw = item.barcode?.replace(/[-\s]/g, "") || '';
  const isBook = (activeCategories['Livros'] || []).includes(item.type);
  const isDisc = (activeCategories['Discos'] || []).includes(item.type);

  if (barcodeRaw) {
     try { const upcData = await (await fetchTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcodeRaw}`)).json(); if (upcData.items?.[0]?.images?.[0]) return upcData.items[0].images[0]; } catch(e) {}
     if (isBook) {
        try { const gbData = await (await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcodeRaw}`)).json(); if (gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) return gbData.items[0].volumeInfo.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3"); } catch(e) {}
        try { const olData = await (await fetchTimeout(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcodeRaw}&jscmd=data&format=json`)).json(); if (olData[`ISBN:${barcodeRaw}`]?.cover?.large) return olData[`ISBN:${barcodeRaw}`].cover.large; } catch(e) {}
     }
     if (isDisc && settings?.discogsToken) {
        try { const dcData = await (await fetchTimeout(`https://api.discogs.com/database/search?barcode=${barcodeRaw}&token=${settings.discogsToken}`)).json(); if (dcData.results?.[0]?.cover_image && !dcData.results[0].cover_image.includes('spacer.gif')) return dcData.results[0].cover_image; } catch(e) {}
     }
  }

  if (isDisc && settings?.discogsToken) {
      try {
        const dcData = await (await fetchTimeout(`https://api.discogs.com/database/search?release_title=${qTitle}&artist=${qAuthor}&token=${settings.discogsToken}`)).json();
        const match = dcData.results?.find(r => r.year === item.year || (item.publisher && r.label?.some(l => l.toLowerCase().includes(item.publisher.toLowerCase())))) || dcData.results?.[0];
        if (match?.cover_image && !match.cover_image.includes('spacer.gif')) return match.cover_image;
      } catch(e) {}
  } else if (isBook) {
    try {
        const gbData = await (await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:"${item.title}"`)}${item.author_developer ? `+inauthor:"${item.author_developer}"` : ''}&maxResults=10`)).json();
        const match = gbData.items?.find(i => (item.year && i.volumeInfo.publishedDate?.startsWith(item.year)) || (item.publisher && i.volumeInfo.publisher?.toLowerCase().includes(item.publisher.toLowerCase()))) || gbData.items?.find(i => i.volumeInfo?.imageLinks?.thumbnail);
        if (match?.volumeInfo?.imageLinks?.thumbnail) return match.volumeInfo.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3");
    } catch(e) {}
  } else if ((activeCategories['Games'] || []).includes(item.type)) {
      try {
          const wikiData = await (await fetchTimeout(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${item.title} ${item.type} game cover`)}&utf8=&format=json&origin=*`)).json();
          if (wikiData.query?.search?.[0]) {
              const imgData = await (await fetchTimeout(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiData.query.search[0].title)}&prop=pageimages&pithumbsize=800&format=json&origin=*`)).json();
              const pageId = Object.keys(imgData.query?.pages || {})[0];
              if (imgData.query.pages[pageId]?.thumbnail?.source) return imgData.query.pages[pageId].thumbnail.source;
          }
      } catch(e) {}
  } else if ((activeCategories['Vídeo'] || []).includes(item.type)) {
      try {
          const itData = await (await fetchTimeout(`https://itunes.apple.com/search?term=${qTitle}&media=movie&limit=10`)).json();
          const match = (item.year ? itData.results?.find(m => m.releaseDate?.startsWith(item.year)) : null) || itData.results?.[0];
          if (match?.artworkUrl100) return match.artworkUrl100.replace('100x100bb', '600x600bb');
      } catch (e) {}
  }
  return null;
};

// ==========================================
// ÍCONES NATIVOS SVG E STYLES MONDRIAN
// ==========================================
const Icon = ({ path, className = "w-6 h-6", onClick, fill = "none", style }) => <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" className={className} style={style}>{path}</svg>;
const KatamariIcon = ({ className = "w-6 h-6", glow = 0 }) => <svg viewBox="0 0 100 100" className={className} style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px currentColor)` : 'none' }}><g><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur="2.5s" repeatCount="indefinite" /><circle cx="50" cy="50" r="28" fill="#fbbf24" stroke="#fbbf24" strokeWidth="6" strokeDasharray="5 5" /><circle cx="50" cy="50" r="18" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="3 5" opacity="0.8"/><g stroke="#22d3ee" strokeWidth="6" strokeLinecap="round"><line x1="50" y1="4" x2="50" y2="16" /><line x1="50" y1="96" x2="50" y2="84" /><line x1="4" y1="50" x2="16" y2="50" /><line x1="96" y1="50" x2="84" y2="50" /><line x1="17" y1="17" x2="26" y2="26" /><line x1="83" y1="83" x2="74" y2="74" /><line x1="17" y1="83" x2="26" y2="74" /><line x1="83" y1="17" x2="74" y2="26" /></g><g stroke="#ec4899" strokeWidth="7" strokeLinecap="round"><line x1="50" y1="18" x2="50" y2="22" /><line x1="50" y1="82" x2="50" y2="78" /><line x1="18" y1="50" x2="22" y2="50" /><line x1="82" y1="50" x2="78" y2="50" /><line x1="28" y1="28" x2="32" y2="32" /><line x1="72" y1="72" x2="68" y2="68" /><line x1="28" y1="72" x2="32" y2="68" /><line x1="72" y1="28" x2="68" y2="32" /></g></g></svg>;
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
const Clock = p => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></>} />;
const Flame = p => <Icon {...p} path={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>} />;
const Ghost = p => <Icon {...p} path={<><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></>} />;
const LibraryBig = p => <Icon {...p} path={<><rect width="8" height="18" x="3" y="3"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></>} />;
const AlertTriangle = p => <Icon {...p} path={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} />;
const Sparkles = p => <Icon {...p} path={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;
const FilterIcon = p => <Icon {...p} path={<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>} />;
const Calendar = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></>} />;
const Smartphone = p => <Icon {...p} path={<><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>} />;
const DiscIcon = p => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></>} />;
const MonitorPlay = p => <Icon {...p} path={<><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></>} />;
const XIcon = p => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const Zap = p => <Icon {...p} path={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />;
const ListIcon = p => <Icon {...p} path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} />;
const Share = p => <Icon {...p} path={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>} />;
const Headphones = p => <Icon {...p} path={<><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></>} />;
const Music = p => <Icon {...p} path={<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>} />;
const ImageIcon = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></>} />;
const RefreshIcon = p => <Icon {...p} path={<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>} />;
const Trash2 = p => <Icon {...p} path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} />;

// Helper UI Styles MONDRIAN
const getMStyle = (darkMode, size = 4) => {
    const s = {
      2: darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]',
      3: darkMode ? 'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]',
      4: darkMode ? 'border-gray-300 shadow-[4px_4px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]',
      8: darkMode ? 'border-gray-300 shadow-[8px_8px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]',
    };
    return s[size] || s[4];
};
const getChartColors = darkMode => darkMode ? ['#be185d', '#0e7490', '#d97706', '#9d174d', '#164e63', '#b45309'] : ['#ec4899', '#22d3ee', '#fbbf24', '#f472b6', '#06b6d4', '#f59e0b'];
const getMondrianColor = (index, darkMode) => darkMode ? ['bg-pink-800', 'bg-cyan-800', 'bg-amber-700', 'bg-gray-800'][index % 4] : ['bg-pink-500', 'bg-cyan-400', 'bg-amber-400', 'bg-white'][index % 4];

const MContainer = ({ children, className = '', colorClass = '', darkMode, shadow = 4, onClick }) => (
  <div onClick={onClick} className={`border-[4px] ${getMStyle(darkMode, shadow)} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false, shadow = 4 }) => {
  const bgs = {
      'pink': darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500 text-black',
      'cyan': darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black',
      'amber': darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400 text-black',
      'black': darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white',
      'light-cyan': darkMode ? 'bg-cyan-900/50 text-cyan-200' : 'bg-cyan-100 text-cyan-900',
      'light-pink': darkMode ? 'bg-pink-900/50 text-pink-200' : 'bg-pink-100 text-pink-900',
      'white': darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black',
  };
  const bg = bgs[variant] || bgs['white'];
  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[4px] ${getMStyle(darkMode, shadow)} ${disabled ? 'opacity-50 shadow-none translate-y-1 translate-x-1' : 'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bg} ${className}`}>
      {icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, onBlur, type = "text", placeholder = "", multiline = false, darkMode, readOnly = false, shadow = 3 }) => (
  <div className="flex flex-col mb-3 w-full">
    {label && <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>{label}</label>}
    {multiline ? (
      <textarea readOnly={readOnly} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[4px] ${getMStyle(darkMode, shadow)} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-amber-100 dark:focus:bg-amber-900'} transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input readOnly={readOnly} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[4px] ${getMStyle(darkMode, shadow)} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-cyan-100 dark:focus:bg-cyan-900'} transition-colors`} />
    )}
  </div>
);

const MRadio = ({ label, checked, onChange, darkMode }) => (
    <label className={`flex items-center justify-between p-3 cursor-pointer border-b-[2px] transition-colors active:bg-black/5 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} onClick={onChange}>
       <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{label}</span>
       <div className={`w-5 h-5 rounded-full border-[3px] flex items-center justify-center ${checked ? (darkMode ? 'border-cyan-400' : 'border-cyan-500') : (darkMode ? 'border-gray-500' : 'border-gray-400')}`}>
          {checked && <div className={`w-2.5 h-2.5 rounded-full ${darkMode ? 'bg-cyan-400' : 'bg-cyan-500'}`} />}
       </div>
    </label>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-[4px] pb-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>{title}</h3>
        <p className="text-sm font-bold opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="pink" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

const MondrianHBar = ({ label, value, max, index, darkMode }) => (
  <div className="flex items-center gap-2 w-full mb-2">
    <div className="w-16 text-[9px] font-black uppercase tracking-widest truncate" title={label}>{label}</div>
    <div className={`flex-1 h-5 border-[3px] ${getMStyle(darkMode, 2).replace('border-[4px]', '')} ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} flex relative overflow-hidden`}>
      <div className={`h-full transition-all duration-1000 ${getMondrianColor(index, darkMode)}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      <span className={`absolute inset-0 flex items-center ml-2 text-[10px] font-black ${darkMode ? 'text-white' : 'text-black'} drop-shadow-md`}>{value}</span>
    </div>
  </div>
);

const MondrianDonutChart = ({ title, data, darkMode }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) return null;
  let currentAngle = 0;
  const grad = data.map(item => { 
    const e = currentAngle + ((item.value / total) * 100); 
    const s = currentAngle; currentAngle = e; 
    return `${item.colorHex} ${s}% ${e}%`; 
  }).join(', ');
  
  return (
    <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center h-full w-full" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
      <div className={`text-[10px] font-black uppercase tracking-widest mb-4 w-full border-b-[4px] pb-2 text-center ${darkMode ? 'border-gray-300' : 'border-black'}`}>{title}</div>
      <div className={`relative w-24 h-24 rounded-full border-[4px] flex-shrink-0 ${getMStyle(darkMode, 4).replace('border-[4px]', '')}`} style={{ background: `conic-gradient(${grad})` }}>
        <div className={`absolute inset-0 m-auto w-10 h-10 rounded-full border-[4px] ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}></div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-4 w-full px-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
            <div className={`w-3 h-3 border-[2px] ${darkMode ? 'border-gray-300' : 'border-black'}`} style={{ backgroundColor: item.colorHex }}></div>
            <span className="truncate max-w-[60px]">{item.label}</span> ({item.value})
          </div>
        ))}
      </div>
    </MContainer>
  );
};

// ==========================================
// PWA ENGINE E GOOGLE SHEETS SYNC
// ==========================================
const usePWA = (iconUrl) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    const manifest = { name: "Memorabilia", short_name: "Memorabilia", display: "standalone", background_color: "#ffffff", theme_color: "#000000", icons: [ { src: iconUrl, sizes: "192x192", type: "image/png" }, { src: iconUrl, sizes: "512x512", type: "image/png" } ] };
    const manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement('link'); manifestLink.rel = 'manifest'; document.head.appendChild(manifestLink); }
    manifestLink.href = manifestUrl;
    
    const handlePrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, [iconUrl]);
  
  const promptInstall = async () => { if (!installPrompt) return; installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') { setInstallPrompt(null); setIsInstalled(true); } };
  return { isInstallable: !!installPrompt, promptInstall, isInstalled };
};

const syncItemToSheets = (item, url) => { if (url) fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(item) }).catch(()=>{}); };
const syncDeleteToSheets = (id, url) => { if (url) fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _action: 'delete', id }) }).catch(()=>{}); };

// Filtros Helpers
const getAddedBucket = date => { const d = Math.ceil(Math.abs(new Date() - date) / 86400000); return d<=1?'Hoje':d<=7?'Últimos 7 Dias':d<=30?'Este Mês':date.getFullYear()===new Date().getFullYear()?'Este Ano':'Mais Antigos'; };
const getYearBucket = year => { const y=parseInt(year,10); return isNaN(y)?'Sem Ano':y>=2020?'Anos 2020':y>=2010?'Anos 2010':y>=2000?'Anos 2000':y>=1990?'Anos 1990':'Antes de 1990'; };
const getPagesBucket = pages => { const p=parseInt(pages,10); return (isNaN(p)||p===0)?'Nenhum / Não Informado':p<=50?'Mínimo (1-50)':p<=150?'Mínimo Médio (51-150)':p<=300?'Médio (151-300)':p<=600?'Máximo Médio (301-600)':'Máximo (601+)'; };

// ==========================================
// ABAS DA APLICAÇÃO
// ==========================================

const LibraryTab = ({ items, setItems, darkMode, settings, onShowToast, activeCategories }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const [page, setPage] = useState(0);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [alphaFilter, setAlphaFilter] = useState('Todos');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState('added');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pendingSortBy, setPendingSortBy] = useState('added');
  const [pendingSortOrder, setPendingSortOrder] = useState('desc');
  const [expandedSections, setExpandedSections] = useState({ 'Adicionado': false, 'Suporte': true, 'Ano': false, 'Nota': false, 'Páginas/Faixa': false });
  const [pendingFilters, setPendingFilters] = useState({ Adicionado: [], Suporte: [], Ano: [], Nota: [], 'Páginas/Faixa': [] });
  const [activeFilters, setActiveFilters] = useState({ Adicionado: [], Suporte: [], Ano: [], Nota: [], 'Páginas/Faixa': [] });
  const pressTimer = useRef(null); const isLongPress = useRef(false);

  const toggleSection = (section) => setExpandedSections(p => ({ ...p, [section]: !p[section] }));
  const handleCheckboxChange = (category, value) => setPendingFilters(p => ({ ...p, [category]: p[category].includes(value) ? p[category].filter(i => i !== value) : [...p[category], value] }));
  const applyFilters = () => { setActiveFilters(pendingFilters); setIsFilterMenuOpen(false); setPage(0); };
  const clearFilters = () => { const empty = { Adicionado: [], Suporte: [], Ano: [], Nota: [], 'Páginas/Faixa': [] }; setPendingFilters(empty); setActiveFilters(empty); setPage(0); };
  const applySort = () => { setSortBy(pendingSortBy); setSortOrder(pendingSortOrder); setIsSortMenuOpen(false); setPage(0); };

  const baseFilteredItems = useMemo(() => {
      let result = items;
      if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(i => (i.title || '').toLowerCase().includes(lower) || (i.author_developer || '').toLowerCase().includes(lower) || (i.publisher || '').toLowerCase().includes(lower) || (i.archive_code || '').toLowerCase().includes(lower));
      }
      if (alphaFilter !== 'Todos') {
          result = result.filter(i => {
              const cleanStr = getSortableName(sortBy === 'author' && !isVariousArtists(i.author_developer) ? i.author_developer : i.title);
              return alphaFilter === '#' ? /^[^a-zA-Záéíóúâêôãõç]/i.test(cleanStr) : cleanStr.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === alphaFilter;
          });
      }
      return result;
  }, [items, searchTerm, alphaFilter, sortBy]);

  const filterCounts = useMemo(() => {
      const counts = { Adicionado: {}, Suporte: {}, Ano: {}, Nota: {}, 'Páginas/Faixa': {} };
      baseFilteredItems.forEach(item => {
          counts.Suporte[item.type || 'Sem Tipo'] = (counts.Suporte[item.type || 'Sem Tipo'] || 0) + 1;
          const ab = getAddedBucket(parseItemIdToDate(item.id)); counts.Adicionado[ab] = (counts.Adicionado[ab] || 0) + 1;
          const yb = getYearBucket(item.year); counts.Ano[yb] = (counts.Ano[yb] || 0) + 1;
          const nota = item.rating ? `${item.rating} Estrelas` : 'Sem Nota'; counts.Nota[nota] = (counts.Nota[nota] || 0) + 1;
          const pb = getPagesBucket(item.pages_or_time); counts['Páginas/Faixa'][pb] = (counts['Páginas/Faixa'][pb] || 0) + 1;
      });
      return counts;
  }, [baseFilteredItems]);

  const FILTER_OPTIONS = {
      Adicionado: ['Hoje', 'Últimos 7 Dias', 'Este Mês', 'Este Ano', 'Mais Antigos'],
      Suporte: Array.from(new Set(items.map(i => i.type).filter(Boolean))).sort(),
      Ano: ['Anos 2020', 'Anos 2010', 'Anos 2000', 'Anos 1990', 'Antes de 1990', 'Sem Ano'],
      Nota: ['5 Estrelas', '4 Estrelas', '3 Estrelas', '2 Estrelas', '1 Estrelas', 'Sem Nota'],
      'Páginas/Faixa': ['Mínimo (1-50)', 'Mínimo Médio (51-150)', 'Médio (151-300)', 'Máximo Médio (301-600)', 'Máximo (601+)', 'Nenhum / Não Informado']
  };

  const finalProcessedItems = useMemo(() => {
      let result = baseFilteredItems;
      if (activeFilters.Suporte.length) result = result.filter(i => activeFilters.Suporte.includes(i.type));
      if (activeFilters.Adicionado.length) result = result.filter(i => activeFilters.Adicionado.includes(getAddedBucket(parseItemIdToDate(i.id))));
      if (activeFilters.Ano.length) result = result.filter(i => activeFilters.Ano.includes(getYearBucket(i.year)));
      if (activeFilters.Nota.length) result = result.filter(i => activeFilters.Nota.includes(i.rating ? `${i.rating} Estrelas` : 'Sem Nota'));
      if (activeFilters['Páginas/Faixa'].length) result = result.filter(i => activeFilters['Páginas/Faixa'].includes(getPagesBucket(i.pages_or_time)));

      return [...result].sort((a, b) => {
          let valA = '', valB = '';
          if (sortBy === 'title') { valA = getSortableName(a.title); valB = getSortableName(b.title); }
          else if (sortBy === 'author') { valA = getSortableName(isVariousArtists(a.author_developer) ? a.title : a.author_developer); valB = getSortableName(isVariousArtists(b.author_developer) ? b.title : b.author_developer); }
          else if (sortBy === 'type') { valA = (a.type||'').trim(); valB = (b.type||'').trim(); }
          
          if (sortBy === 'year') return sortOrder === 'asc' ? (parseInt(a.year)||0) - (parseInt(b.year)||0) : (parseInt(b.year)||0) - (parseInt(a.year)||0);
          if (sortBy === 'added') return sortOrder === 'asc' ? (a.id||'').localeCompare(b.id||'') : (b.id||'').localeCompare(a.id||'');
          const cmp = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase(), 'pt-BR', { numeric: true, sensitivity: 'base' });
          return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [baseFilteredItems, activeFilters, sortBy, sortOrder]);

  const handleItemPressStart = (item) => { isLongPress.current = false; pressTimer.current = setTimeout(() => { isLongPress.current = true; setContextMenuItem(item); }, 500); };
  const handleItemPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleItemClick = (item) => { if (!isLongPress.current) { setSelectedItem(item); setEditedItem({ ...item }); } };

  const totalPages = Math.ceil(finalProcessedItems.length / 12) || 1;
  const paginatedItems = useMemo(() => finalProcessedItems.slice(page * 12, (page + 1) * 12), [finalProcessedItems, page]);
  
  const updateRatingList = (id, r) => { 
    const u = { ...items.find(i => i.id === id), rating: r };
    setItems(items.map(item => item.id === id ? u : item)); 
    playChipBeep('save'); onShowToast('success'); syncItemToSheets(u, settings?.googleSheetsUrl);
  };
  
  const saveModifications = () => { setItems(items.map(i => i.id === editedItem.id ? editedItem : i)); setSelectedItem(editedItem); playChipBeep('save'); onShowToast('success'); syncItemToSheets(editedItem, settings?.googleSheetsUrl); };
  
  const handleSearchCover = async () => {
    setIsSearchingCover(true);
    try {
      const newCover = await fetchCoverBySearch(editedItem, settings, activeCategories);
      if (newCover) { setEditedItem(p => ({ ...p, cover_url: newCover })); playChipBeep('success'); onShowToast('success'); }
      else playChipBeep('error');
    } catch (e) { playChipBeep('error'); } finally { setIsSearchingCover(false); }
  };

  const confirmDelete = async () => {
    if (itemToDelete) { 
       const updatedList = items.filter(item => item.id !== itemToDelete);
       const reindexedList = reindexCollection(updatedList);
       setItems(reindexedList); setItemToDelete(null); setSelectedItem(null); setEditedItem(null); playChipBeep('save'); onShowToast('success'); 
       
       if (settings?.googleSheetsUrl) {
          syncDeleteToSheets(itemToDelete, settings.googleSheetsUrl);
          for (let i = 0; i < reindexedList.length; i++) {
             if (reindexedList[i].id !== updatedList[i].id) {
                syncDeleteToSheets(updatedList[i].id, settings.googleSheetsUrl);
                syncItemToSheets(reindexedList[i], settings.googleSheetsUrl);
             } else if (reindexedList[i].archive_code !== updatedList[i].archive_code) syncItemToSheets(reindexedList[i], settings.googleSheetsUrl);
          }
       }
    }
  };

  const fetchWikiInfo = async () => {
    if (!settings?.geminiApiKey?.trim()) { setWikiError("Chave API ausente."); playChipBeep('error'); return; }
    setLoadingWiki(true); setWikiError('');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: `Aja como arquivista. Escreva 1 parágrafo fascinante (máx 4 linhas) sobre "${editedItem.title || ''}" (${editedItem.author_developer || ''}). Apenas o texto.` }] }] }) 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { setEditedItem({...editedItem, wiki_info: text}); playChipBeep('save'); onShowToast('success'); }
    } catch (e) { setWikiError(e.message.includes('429') ? "⚠️ Cota da IA esgotada." : `Erro IA: ${e.message}`); playChipBeep('error'); } finally { setLoadingWiki(false); }
  };

  const countActiveFilters = Object.values(activeFilters).reduce((acc, curr) => acc + curr.length, 0);

  if (selectedItem && editedItem) {
    const isBookOrGame = [...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(editedItem.type);
    const linkInfo = getExternalLinkInfo(editedItem.type, editedItem.title);
    return (
      <div className="flex flex-col h-full pb-20 relative max-w-4xl mx-auto w-full">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title}"?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <MButton variant="white" darkMode={darkMode} onClick={() => { setSelectedItem(null); setEditedItem(null); }} className="p-2"><ChevronLeft className="w-5 h-5" /></MButton>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <MButton variant="cyan" darkMode={darkMode} onClick={saveModifications} className="px-4 py-2 text-[10px]">Salvar</MButton>
        </MContainer>
        
        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10 scrollbar-hide">
          <div className="flex gap-4 flex-col md:flex-row md:items-start">
            <MContainer darkMode={darkMode} className={`${(activeCategories['Discos'] || []).includes(editedItem.type) ? "w-40 h-40 md:w-56 md:h-56 aspect-square" : "w-32 h-44 md:w-48 md:h-64 aspect-[3/4]"} flex-shrink-0 flex items-center justify-center overflow-hidden mx-auto md:mx-0`} colorClass={darkMode ? 'bg-gray-800' : 'bg-black'}>
              {editedItem.cover_url ? <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90" /> : <LibraryBig className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[3px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-300 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} darkMode={darkMode} />
            <MInput label={getMetricInfo(editedItem.type, activeCategories).label} value={editedItem.pages_or_time || ''} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} darkMode={darkMode} />
            <div className="col-span-2"><MInput label="Editora/Gravadora" value={editedItem.publisher || ''} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <MInput label="URL da Capa" value={editedItem.cover_url || ''} onChange={e => setEditedItem({...editedItem, cover_url: e.target.value})} darkMode={darkMode} />
            <MInput label="Localização" value={editedItem.location || ''} onChange={e => setEditedItem({...editedItem, location: e.target.value})} darkMode={darkMode} />
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            {isBookOrGame && (
              <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
                <label className="text-[10px] font-black uppercase mb-2 block border-b-[3px] pb-1">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase border-[3px] ${getMStyle(darkMode, 2).replace('border-[4px]','')} active:translate-y-0.5 active:translate-x-0.5 transition-all ${editedItem.status === opt ? (darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black') : (darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-black')}`}>{opt}</button>)}
                </div>
              </MContainer>
            )}
            <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
              <label className="text-[10px] font-black uppercase mb-2 block border-b-[3px] pb-1">Avaliação</label>
              <div className="flex gap-1.5 mt-2">{[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setEditedItem({...editedItem, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 ${star <= (editedItem.rating || 0) ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}</div>
            </MContainer>
          </div>
          <MInput label="Descrição" multiline value={editedItem.description || ''} onChange={e => setEditedItem({...editedItem, description: e.target.value})} darkMode={darkMode} />
          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-amber-900/30 text-white' : 'bg-amber-100 text-black'}><MInput label="Anotações" multiline value={editedItem.notes || ''} onChange={e => setEditedItem({...editedItem, notes: e.target.value})} darkMode={darkMode} /></MContainer>
          <div className="flex gap-2 flex-col sm:flex-row">
            <MButton disabled={isSearchingCover} onClick={handleSearchCover} variant="light-pink" darkMode={darkMode} className="flex-1">
              {isSearchingCover ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} <span className="truncate">{isSearchingCover ? 'Buscando...' : 'Recuperar Capa'}</span>
            </MButton>
            <MButton onClick={() => window.open(linkInfo.url, '_blank')} variant="light-cyan" darkMode={darkMode} className="flex-1">
              <ExternalLink className="w-4 h-4" /> <span className="truncate">Web Search</span>
            </MButton>
            {(activeCategories['Discos'] || []).includes(editedItem.type) && (
               <MButton onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent((editedItem.title || '') + ' ' + (editedItem.author_developer || ''))}`, '_blank')} variant="light-cyan" darkMode={darkMode} className="flex-1">
                  <Headphones className="w-4 h-4" /> <span className="truncate">Spotify</span>
               </MButton>
            )}
          </div>
          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-pink-900/20 text-white' : 'bg-pink-100 text-black'}>
            <div className={`flex justify-between items-center mb-3 border-b-[4px] pb-1 ${darkMode ? 'border-gray-300' : 'border-black'}`}><span className="text-[10px] font-black uppercase flex items-center gap-1"><Sparkles className="w-4 h-4" /> Enciclopédia (IA)</span></div>
            {editedItem.wiki_info ? (
              <div><p className="text-xs font-bold leading-relaxed opacity-90 whitespace-pre-wrap text-justify mb-3 italic">"{editedItem.wiki_info}"</p><button onClick={fetchWikiInfo} className="text-[9px] font-black uppercase underline opacity-70 hover:opacity-100">Gerar Nova Pesquisa</button></div>
            ) : (
             <div className="text-center py-2">
                {loadingWiki ? (<div className="flex flex-col items-center"><Sparkles className="w-6 h-6 animate-pulse mb-2 text-pink-500" /><span className="text-[10px] font-black animate-pulse opacity-70">Consultando oráculo...</span></div>) : 
                (<div className="flex flex-col items-center gap-2">{wikiError && <div className="text-[9px] font-bold text-white bg-pink-600 p-2 border-[2px] border-black rounded shadow-sm text-center">{wikiError}</div>}<MButton onClick={fetchWikiInfo} darkMode={darkMode} variant="black" className="w-full text-[10px] bg-pink-500 text-white">✨ Pesquisar sobre a Obra</MButton></div>)}
              </div>
            )}
          </MContainer>
          <MButton onClick={saveModifications} variant="cyan" darkMode={darkMode} className="w-full mt-4 py-3 text-[12px]"><Check className="w-5 h-5" /> Salvar Alterações</MButton>
          <div className="mt-8 mb-2 flex justify-center"><button onClick={() => setItemToDelete(editedItem.id)} className={`text-[9px] font-black uppercase opacity-40 hover:opacity-100 underline flex items-center gap-1 ${darkMode ? 'text-gray-400 hover:text-pink-400' : 'text-gray-500 hover:text-pink-600'}`}><Trash2 className="w-3 h-3" /> Apagar item</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem?.title}"?`} onConfirm={confirmDelete} onCancel={() => {setItemToDelete(null); setEditedItem(null);}} darkMode={darkMode} confirmText="Apagar" />
      
      {contextMenuItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setContextMenuItem(null)}>
          <MContainer darkMode={darkMode} className="w-full max-w-xs p-0 flex flex-col overflow-hidden animate-in zoom-in duration-200" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} onClick={e => e.stopPropagation()}>
             <div className={`p-4 border-b-[4px] ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'} flex justify-between items-center`}><div className="flex flex-col overflow-hidden pr-2"><span className="text-sm font-black truncate leading-tight">{contextMenuItem.title}</span><span className="text-[9px] uppercase tracking-widest opacity-70 truncate mt-0.5">{contextMenuItem.author_developer||'--'}</span></div><button onClick={() => setContextMenuItem(null)} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button></div>
             <div className="flex flex-col">
                <button onClick={() => { handleItemClick(contextMenuItem); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase border-b-[4px] ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-white' : 'border-gray-200 hover:bg-gray-50 text-black'} text-left`}><Settings className="w-5 h-5" /> Editar Detalhes</button>
                <button onClick={() => { window.open(`https://open.spotify.com/search/${encodeURIComponent((contextMenuItem.title||'')+' '+(contextMenuItem.author_developer||''))}`, '_blank'); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase border-b-[4px] ${darkMode ? 'border-gray-700 hover:bg-cyan-900/30 text-cyan-400' : 'border-gray-200 hover:bg-cyan-50 text-cyan-600'} text-left`}><Headphones className="w-5 h-5" /> Ouvir (Spotify)</button>
                <button onClick={() => { window.open(`https://www.discogs.com/search?q=${contextMenuItem.barcode||encodeURIComponent((contextMenuItem.title||'')+' '+(contextMenuItem.author_developer||''))}&type=all`, '_blank'); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase border-b-[4px] ${darkMode ? 'border-gray-700 hover:bg-amber-900/30 text-amber-500' : 'border-gray-200 hover:bg-amber-50 text-amber-600'} text-left`}><DiscIcon className="w-5 h-5" /> Buscar (Discogs)</button>
                <button onClick={() => { setEditedItem(contextMenuItem); setItemToDelete(contextMenuItem.id); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[10px] font-black uppercase opacity-60 hover:opacity-100 ${darkMode ? 'text-pink-400' : 'text-pink-600'} text-left`}><XIcon className="w-4 h-4" /> Apagar</button>
             </div>
          </MContainer>
        </div>
      )}

      {isFilterMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex justify-center items-end sm:items-center animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md max-h-[85vh] sm:h-[80vh] flex flex-col border-[4px] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[8px_8px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`p-4 border-b-[4px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}><button onClick={() => setIsFilterMenuOpen(false)} className="p-1"><XIcon className="w-5 h-5" /></button><span className="text-[12px] font-black uppercase">Filtros</span><div className="w-7"/></div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {Object.entries(FILTER_OPTIONS).map(([category, options]) => {
                          const isOpen = expandedSections[category]; const activeCount = pendingFilters[category].length;
                          return (
                              <div key={category} className={`border-b-[4px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                  <button onClick={() => toggleSection(category)} className={`w-full p-4 flex justify-between items-center ${isOpen ? (darkMode ? 'bg-black/30' : 'bg-gray-100') : ''}`}><div className="flex items-center gap-2"><span className="text-[11px] font-black uppercase">{category}</span>{activeCount > 0 && <span className="px-1.5 py-0.5 text-[8px] font-black bg-pink-500 text-white">{activeCount}</span>}</div>{isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}</button>
                                  {isOpen && (<div className="flex flex-col">{options.map(opt => {
                                      const isChecked = pendingFilters[category].includes(opt);
                                      return (
                                          <div key={opt} onClick={() => handleCheckboxChange(category, opt)} className={`flex items-center justify-between p-3 cursor-pointer ${darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'}`}><span className="text-[10px] font-black uppercase mr-2">{opt}</span><div className="flex items-center gap-3"><span className="text-[10px] font-bold opacity-50">{filterCounts[category]?.[opt] || 0}</span><div className={`w-5 h-5 border-[3px] flex items-center justify-center ${isChecked ? (darkMode ? 'border-cyan-400 bg-cyan-900/40' : 'border-cyan-500 bg-cyan-100') : (darkMode ? 'border-gray-500' : 'border-gray-400')}`}>{isChecked && <Check className="w-3 h-3" />}</div></div></div>
                                      );
                                  })}</div>)}
                              </div>
                          );
                      })}
                  </div>
                  <div className={`p-4 border-t-[4px] flex gap-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}><MButton onClick={clearFilters} variant="white" darkMode={darkMode} className="flex-1 text-[10px]">Limpar</MButton><MButton onClick={applyFilters} variant="pink" darkMode={darkMode} className="flex-[2] text-[10px]">Aplicar</MButton></div>
              </div>
          </div>
      )}

      {isSortMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex flex-col justify-end sm:justify-center items-center sm:p-4 animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md flex flex-col border-[4px] max-h-[85vh] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[8px_8px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`p-4 border-b-[4px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}><button onClick={() => setIsSortMenuOpen(false)} className="p-1"><XIcon className="w-5 h-5" /></button><span className="text-[12px] font-black uppercase">Ordenar</span><div className="w-7"/></div>
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                      <div className="mb-6"><div className="text-[10px] font-black uppercase opacity-60 mb-2">Ordem</div><div className={`border-[3px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}><MRadio label="↑ Ascendente" checked={pendingSortOrder==='asc'} onChange={()=>setPendingSortOrder('asc')} darkMode={darkMode} /><MRadio label="↓ Descendente" checked={pendingSortOrder==='desc'} onChange={()=>setPendingSortOrder('desc')} darkMode={darkMode} /></div></div>
                      <div><div className="text-[10px] font-black uppercase opacity-60 mb-2">Ordenar por</div><div className={`border-[3px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}><MRadio label="Artista / Autor" checked={pendingSortBy==='author'} onChange={()=>setPendingSortBy('author')} darkMode={darkMode} /><MRadio label="Ano" checked={pendingSortBy==='year'} onChange={()=>setPendingSortBy('year')} darkMode={darkMode} /><MRadio label="Título" checked={pendingSortBy==='title'} onChange={()=>setPendingSortBy('title')} darkMode={darkMode} /><MRadio label="Data Adicionada" checked={pendingSortBy==='added'} onChange={()=>setPendingSortBy('added')} darkMode={darkMode} /><MRadio label="Formato" checked={pendingSortBy==='type'} onChange={()=>setPendingSortBy('type')} darkMode={darkMode} /></div></div>
                  </div>
                  <div className={`p-4 border-t-[4px] ${darkMode ? 'border-gray-300' : 'border-black'}`}><MButton darkMode={darkMode} variant="black" onClick={applySort} className="w-full text-[10px]">Aplicar</MButton></div>
              </div>
          </div>
      )}

      <div className={`sticky top-0 z-20 flex flex-col gap-2 pb-2 pt-1 border-b-[4px] ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} mb-3 px-1`}>
          <div className="flex gap-1 sm:gap-2 w-full">
              <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                  <input type="text" placeholder="Buscar no acervo..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} className={`w-full h-10 pl-8 pr-8 border-[3px] font-black text-[10px] sm:text-[11px] uppercase outline-none focus:border-cyan-400 ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`} />
                  {searchTerm && <button onClick={() => {setSearchTerm(''); setPage(0);}} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 active:scale-90"><XIcon className="w-4 h-4" /></button>}
              </div>
              <button onClick={() => { setPendingFilters(activeFilters); setIsFilterMenuOpen(true); }} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[3px] active:translate-y-0.5 relative ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}><FilterIcon className="w-4 h-4" />{countActiveFilters > 0 && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-[2px] flex items-center justify-center text-[8px] font-black bg-pink-500 text-white">{countActiveFilters}</div>}</button>
              <button onClick={() => { setPendingSortBy(sortBy); setPendingSortOrder(sortOrder); setIsSortMenuOpen(true); }} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[3px] active:translate-y-0.5 ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>{sortOrder === 'asc' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}</button>
              <select value={alphaFilter} onChange={e => { setAlphaFilter(e.target.value); setPage(0); }} className={`w-14 sm:w-16 h-10 text-center text-[10px] font-black uppercase border-[3px] outline-none flex-shrink-0 ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
                  {['Todos', '#', ...Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))].map(l => <option key={l} value={l}>{l === 'Todos' ? 'A-Z' : l}</option>)}
              </select>
          </div>
          <div className="px-1 text-[9px] font-black uppercase opacity-60 mt-1">Exibindo {finalProcessedItems.length} {countActiveFilters > 0 || searchTerm ? 'resultados' : 'itens da coleção'}</div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 px-1 pt-1 scrollbar-hide">
        {paginatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] opacity-50 text-center"><Ghost className="w-12 h-12 mb-4" /><span className="text-sm font-black uppercase">Nenhum item localizado.</span></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row min-h-[140px] cursor-pointer active:scale-[0.98] transition-transform hover:-translate-y-1 hover:shadow-lg" onContextMenu={e => e.preventDefault()} onTouchStart={() => handleItemPressStart(item)} onTouchEnd={handleItemPressEnd} onClick={() => handleItemClick(item)}>
                <MContainer darkMode={darkMode} className="w-5 border-r-0 rounded-l-sm flex-shrink-0" colorClass={getMondrianColor(idx, darkMode)} shadow={0} />
                <MContainer darkMode={darkMode} className="flex-1 flex flex-row p-2 rounded-r-sm" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} shadow={4}>
                  <div className="flex-1 flex flex-col justify-between pr-3 pointer-events-none">
                    <div className="flex flex-col">
                      <div className="text-[9px] font-black uppercase opacity-60 mb-1.5">{item.type||'--'} • {item.year||'--'} {item.pages_or_time ? `• ${item.pages_or_time}` : ''}</div>
                      <div className="text-sm font-black leading-tight break-words mb-1">{item.title || 'S/ Título'}</div>
                      <div className="text-[10px] font-bold opacity-80 uppercase">{item.author_developer || '--'}</div>
                    </div>
                    <div className="mt-3 flex items-end">
                      {[...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(item.type) ? <div className={`text-[8px] px-2 py-1 border-[3px] ${darkMode ? 'border-gray-300 bg-cyan-900 text-cyan-300' : 'border-black bg-amber-400 text-black'} font-black uppercase w-max`}>{item.status || '--'}</div> : <div />}
                    </div>
                 </div>
                 <div className={`w-24 sm:w-28 flex-shrink-0 flex flex-col items-center justify-between border-l-[3px] pl-2 py-0.5 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className={`w-full ${(activeCategories['Discos'] || []).includes(item.type) ? 'aspect-square' : 'border-[3px] aspect-[3/4]'} ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-black'} flex items-center justify-center overflow-hidden mb-2 shadow-[2px_2px_0px_currentColor]`}>
                       {item.cover_url ? <img src={item.cover_url} alt="Capa" className="w-full h-full object-cover"/> : <LibraryBig className={`w-6 h-6 opacity-50`}/>}
                    </div>
                    <div className="flex flex-nowrap justify-center items-center gap-0.5 pointer-events-auto w-full" onClick={e => e.stopPropagation()}>
                       {item.rating === 5 ? (
                         <Star onClick={() => updateRatingList(item.id, 0)} className="w-6 h-6 sm:w-7 sm:h-7 cursor-pointer fill-current active:scale-90" style={{ animation: `titleColorCycle ${settings?.marqueeSpeed || 35}s linear infinite` }} />
                       ) : (
                         [1, 2, 3, 4, 5].map((star) => <Star key={star} onClick={() => updateRatingList(item.id, star)} className={`w-3 h-3 sm:w-4 sm:h-4 cursor-pointer active:scale-90 ${star <= (item.rating || 0) ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)
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
            <div className="font-sans text-[10px] font-black uppercase">Pág {page + 1} / {totalPages}</div>
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

  useEffect(() => {
    if (scannedAIData) {
       setFormData(p => ({ ...p, title: scannedAIData.title||'', author_developer: scannedAIData.author_developer||'', year: scannedAIData.year?.toString()||'', publisher: scannedAIData.publisher||'', description: scannedAIData.description||'', pages_or_time: scannedAIData.pages_or_time||p.pages_or_time, type: allTypes.includes(scannedAIData.type) ? scannedAIData.type : 'Livro' }));
       setScannedAIData(null); 
    }
  }, [scannedAIData, setScannedAIData, allTypes]);
  
  const displayBoxState = globalAiState !== 'idle' ? globalAiState : scanBox.state;
  const displayBoxMessage = globalAiState !== 'idle' ? globalAiMessage : scanBox.message;
  
  useEffect(() => {
    let isMounted = true; let scannerInstance = null;
    if (addMode === 'barcode' && isHtml5QrcodeLoaded && window.Html5Qrcode) {
        scannerInstance = new window.Html5Qrcode("reader-barcode");
        scannerRef.current = scannerInstance;
        scannerInstance.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            if (scannerRef.current?.getState() === 2) {
               scannerRef.current.stop().then(() => {
                  if (isMounted) { setAddMode('manual'); setFormData(p => ({ ...p, barcode: decodedText })); fetchMultiDatabaseParallel(decodedText); setTimeout(() => { isProcessingScan.current = false; }, 2000); }
               }).catch(()=>{});
            }
          }, () => {}).catch(() => { if (isMounted) { setScanBox({ state: 'error', message: 'Erro Câmera.' }); setAddMode('manual'); } });
    }
    return () => { isMounted = false; if (scannerInstance) { try { scannerInstance.stop().then(() => scannerInstance.clear()).catch(()=>{}); } catch(e) {} scannerRef.current = null; } };
  }, [addMode, isHtml5QrcodeLoaded]);

  const fetchMultiDatabaseParallel = async (barcode) => {
    const cleanCode = barcode.replace(/[-\s]/g, ""); setScanBox({ state: 'loading', message: 'Consultando bancos de dados...' });
    const isISBN = cleanCode.startsWith("978") || cleanCode.startsWith("979");
    const fetchers = [];

    const fetchDiscogs = async () => {
      const data = await (await fetchTimeout(`https://api.discogs.com/database/search?barcode=${cleanCode}&token=${settings.discogsToken}`)).json();
      if (!data.results?.[0]) throw new Error();
      const item = data.results[0]; const fStr = (item.format || []).join(' ').toLowerCase();
      return { title: item.title.split(' - ').slice(1).join(' - ').trim() || item.title || '', author_developer: item.title.split(' - ')[0]?.trim() || '', year: item.year || '', publisher: item.label?.[0] || '', cover_url: item.cover_image || '', type: fStr.includes('vinyl') || fStr.includes('lp') ? 'Vinil' : fStr.includes('cassette') ? 'Fita Cassete' : 'CD' };
    };

    const fetchMBrainz = async () => {
      const data = await (await fetchTimeout(`https://musicbrainz.org/ws/2/release/?query=barcode:${cleanCode}&fmt=json&inc=media+labels`)).json();
      if (!data.releases?.[0]) throw new Error();
      const r = data.releases[0]; const m = r.media?.[0]; const fStr = m?.format?.toLowerCase() || '';
      return { title: r.title || "", author_developer: r["artist-credit"]?.map(a=>a.name).join(", ") || "", publisher: r.label || r["label-info"]?.[0]?.label?.name || "", year: r.date?.substring(0,4) || "", type: fStr.includes('vinyl') ? 'Vinil' : fStr.includes('cassette') ? 'Fita Cassete' : 'CD', pages_or_time: m?.['track-count']?.toString() || "", cover_url: `https://coverartarchive.org/release/${r.id}/front` };
    };

    const fetchUPC = async () => {
      const data = await (await fetchTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`)).json();
      if (!data.items?.[0]) throw new Error();
      const i = data.items[0]; const c = String(i.category).toLowerCase(); const t = String(i.title).toLowerCase();
      let fmt = 'Livro'; if (c.includes('music') || t.includes(' cd')) fmt = 'CD'; else if (c.includes('video game')) fmt = 'PS4'; else if (c.includes('dvd')) fmt = 'DVD';
      return { title: i.title || "", publisher: i.brand || i.publisher || "", cover_url: i.images?.[0] || "", type: fmt };
    };

    const fetchGBooks = async () => {
      const data = await (await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`)).json();
      if (!data.items?.[0]) throw new Error();
      const info = data.items[0].volumeInfo;
      return { title: info.title || "", author_developer: info.authors?.join(", ") || "", publisher: info.publisher || "", year: info.publishedDate?.substring(0,4) || "", pages_or_time: info.pageCount?.toString() || "", cover_url: info.imageLinks?.thumbnail?.replace("http://", "https://") || "", description: info.description || "", type: String(info.publisher).toLowerCase().includes('panini') ? 'Quadrinho' : 'Livro' };
    };

    if (isISBN) fetchers.push(fetchGBooks(), (async () => { const data = await (await fetchTimeout(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&jscmd=data&format=json`)).json(); const info = data[`ISBN:${cleanCode}`]; if (!info) throw new Error(); return { title: info.title || '', author_developer: info.authors?.map(a => a.name).join(', ') || '', year: info.publish_date?.substring(0,4) || '', publisher: info.publishers?.map(p => p.name).join(', ') || '', pages_or_time: info.number_of_pages?.toString() || '', description: info.subtitle || '', cover_url: `https://covers.openlibrary.org/b/isbn/${cleanCode}-L.jpg`, type: 'Livro' }; })());
    else { fetchers.push(fetchMBrainz(), fetchUPC()); if (settings?.discogsToken) fetchers.push(fetchDiscogs()); }

    try {
      const foundItem = await Promise.any(fetchers.map(f => typeof f === 'function' ? f() : f));
      playChipBeep('success'); setScanBox({ state: 'success', message: 'Encontrado com sucesso!' });
      setFormData(prev => ({ ...prev, ...foundItem, barcode: cleanCode }));
    } catch (e) {
      playChipBeep('error'); setScanBox({ state: 'error', message: 'Não encontrado. Preencha manualmente.' });
    }
  };

  const handleSave = () => {
    if (!formData.title) { playChipBeep('error'); setShowErrorModal(true); return; }
    const classCode = activeClassCodes[formData.type] || '000'; 
    const prefix = settings?.archivePrefix?.trim().toUpperCase() || 'MBU';
    const sequence = String(items.reduce((max, i) => i.archive_code?.split('-')[1] === classCode ? Math.max(max, parseInt(i.archive_code.split('-')[2]) || 0) : max, 0) + 1).padStart(4, '0');
    
    const newItem = { ...formData, id: generateId(items), archive_code: `${prefix}-${classCode}-${sequence}` };
    setItems([...items, newItem]); syncItemToSheets(newItem, settings?.googleSheetsUrl);
    playChipBeep('save'); onShowToast('success'); 
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    setScanBox({ state: 'idle', message: '' }); resetGlobalAi(); setActiveTab('library');
  };

  return (
    <div className="flex flex-col h-full pb-20 max-w-3xl mx-auto w-full">
      <MModal isOpen={showErrorModal} title="Atenção" message="O Título é obrigatório." onConfirm={() => setShowErrorModal(false)} onCancel={() => setShowErrorModal(false)} darkMode={darkMode} confirmText="OK" cancelText="Fechar" />
      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode === 'manual' ? 'cyan' : 'white'} onClick={() => {setAddMode('manual'); setScanBox({state:'idle', message:''}); resetGlobalAi();}} className="flex-1 py-2"><PlusSquare className="w-4 h-4" /> Manual</MButton>
        <MButton darkMode={darkMode} variant={addMode === 'barcode' ? 'amber' : 'white'} onClick={() => {setAddMode('barcode'); setScanBox({state:'idle', message:''}); resetGlobalAi();}} className="flex-1 py-2"><ScanLine className="w-4 h-4" /> Barcode</MButton>
        <MButton darkMode={darkMode} variant="pink" onClick={triggerGlobalAI} className="flex-1 py-2"><Camera className="w-4 h-4" /> Auto IA</MButton>
      </div>
      
      {displayBoxState !== 'idle' && (
        <div className={`p-4 mb-4 flex items-start gap-3 border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black text-xs uppercase transition-colors ${displayBoxState === 'loading' ? (darkMode ? 'bg-amber-700 text-white border-gray-300' : 'bg-amber-400 text-black border-black') : displayBoxState === 'success' ? (darkMode ? 'bg-cyan-800 text-white border-gray-300' : 'bg-cyan-400 text-black border-black') : (darkMode ? 'bg-pink-800 text-white border-gray-300' : 'bg-pink-600 text-white border-black')}`}>
          {displayBoxState === 'loading' && <div className="w-5 h-5 border-4 border-current border-t-transparent rounded-sm animate-spin" />}
          {displayBoxState === 'success' && <Check className="w-6 h-6" />}
          {displayBoxState === 'error' && <AlertTriangle className="w-6 h-6 mt-0.5" />}
          <span className="leading-relaxed flex-1">{displayBoxMessage}</span>
        </div>
      )}
      
      {addMode === 'barcode' && (
        <MContainer darkMode={darkMode} className="flex-1 mb-4 flex flex-col relative overflow-hidden bg-black items-center justify-center min-h-[300px]">
          {!isHtml5QrcodeLoaded && <div className="text-white font-black uppercase text-xs animate-pulse">Carregando Câmera...</div>}
          <div id="reader-barcode" className="w-full h-full object-cover absolute inset-0"></div>
          <div className="absolute inset-0 border-[10px] border-black/30 z-10" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-[4px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-end justify-center z-20 pb-4"><span className="text-white text-[10px] uppercase font-black bg-black px-3 py-1">Alinhe o Código</span></div>
        </MContainer>
      )}
      
      {addMode === 'manual' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase mb-1 block">Formato</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[4px] ${getMStyle(darkMode, 3)} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} font-sans text-sm outline-none font-black`}>
                {Object.entries(activeCategories || {}).map(([cat, subs]) => (<optgroup label={`--- ${cat.toUpperCase()} ---`} key={cat}>{(Array.isArray(subs) ? subs : []).map(sub => <option key={sub} value={sub}>{sub}</option>)}</optgroup>))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 w-full"><div className="md:col-span-3"><MInput darkMode={darkMode} label="Título *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div><div className="md:col-span-1"><MInput darkMode={darkMode} label="Ano" type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} /></div></div>
            <MInput darkMode={darkMode} label="Autor / Desenvolvedor" value={formData.author_developer} onChange={e => setFormData({...formData, author_developer: e.target.value})} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 w-full"><div className="md:col-span-3"><MInput darkMode={darkMode} label="Editora / Gravadora" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} /></div><div className="md:col-span-1"><MInput darkMode={darkMode} label={getMetricInfo(formData.type, activeCategories).label} type="text" value={formData.pages_or_time} onChange={e => setFormData({...formData, pages_or_time: e.target.value})} /></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2"><MInput darkMode={darkMode} label="URL da Capa" value={formData.cover_url} onChange={e => setFormData({...formData, cover_url: e.target.value})} /><MInput darkMode={darkMode} label="Localização" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
            <MInput darkMode={darkMode} label="Descrição" multiline value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <MInput darkMode={darkMode} label="Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            
            {[...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(formData.type) && (
              <div className="mb-4">
                <label className="text-[10px] font-black uppercase mb-1 block">Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={() => setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase border-[3px] ${getMStyle(darkMode, 2).replace('border-[4px]','')} active:translate-y-0.5 transition-all ${formData.status === opt ? (darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black') : (darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-black')}`}>{opt}</button>)}
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase mb-1 block">Avaliação (Nota)</label>
              <div className={`flex gap-2 p-3 border-[4px] justify-center ${getMStyle(darkMode, 3)} ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setFormData({...formData, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 ${star <= formData.rating ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
              </div>
            </div>
            <MButton darkMode={darkMode} onClick={handleSave} variant="black" className="mt-2 py-4"><Check className="w-6 h-6 mr-2" /> Salvar Item</MButton>
          </MContainer>
        </div>
      )}
    </div>
  );
};

const DashboardTab = ({ items, darkMode, activeCategories }) => {
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterSubtype, setFilterSubtype] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterRating, setFilterRating] = useState('Todas');
  
  const dashItems = useMemo(() => items.filter(item => {
      let mCat = true, mStatus = true, mRating = true;
      if (filterCat !== 'Todas') mCat = filterSubtype !== 'Todos' ? item.type === filterSubtype : (activeCategories[filterCat] || []).includes(item.type); 
      if (filterStatus !== 'Todos') mStatus = ((activeCategories['Discos'] || []).includes(item.type) || (activeCategories['Vídeo'] || []).includes(item.type)) ? false : item.status === filterStatus;
      if (filterRating !== 'Todas') mRating = item.rating === parseInt(filterRating);
      return mCat && mStatus && mRating;
  }), [items, filterCat, filterSubtype, filterStatus, filterRating, activeCategories]);
  
  const chartColors = getChartColors(darkMode);
  const catCounts = {}; const statusCounts = {};

  dashItems.forEach(item => {
    let foundCat = Object.entries(activeCategories).find(([, subs]) => (subs || []).includes(item.type))?.[0] || 'Outros';
    catCounts[foundCat] = (catCounts[foundCat] || 0) + 1;
    if (!((activeCategories['Discos'] || []).includes(item.type) || (activeCategories['Vídeo'] || []).includes(item.type))) {
      statusCounts[item.status || 'Não Iniciado'] = (statusCounts[item.status || 'Não Iniciado'] || 0) + 1;
    }
  });

  const catChartData = Object.entries(catCounts).map(([label, value], idx) => ({ label, value, colorHex: chartColors[idx % chartColors.length] })).sort((a,b) => b.value - a.value);
  const statusChartData = Object.entries(statusCounts).map(([label, value], idx) => ({ label, value, colorHex: chartColors[(idx + 2) % chartColors.length] })).sort((a,b) => b.value - a.value);

  const byType = Object.entries(dashItems.reduce((acc, i) => { acc[i.type || 'Outro'] = (acc[i.type || 'Outro'] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedAuthors = Object.entries(dashItems.reduce((acc, i) => {
    if (i.author_developer && !isVariousArtists(i.author_developer)) {
      const na = getSortableName(i.author_developer).toLowerCase();
      if (!acc[na]) acc[na] = { d: i.author_developer.trim(), t: new Set() };
      acc[na].t.add(normalizeWorkTitle(i.title));
    }
    return acc;
  }, {})).map(([, data]) => [data.d, data.t.size]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  const byYear = dashItems.reduce((acc, i) => { const y = getValidYear(i.year); if (!isNaN(y) && y >= 1900 && y <= new Date().getFullYear() + 5) acc[y] = (acc[y] || 0) + 1; return acc; }, {});
  
  const validYears = dashItems.filter(i => !isNaN(getValidYear(i.year)));
  const reliquia = validYears.length ? validYears.reduce((a, b) => getValidYear(a.year) < getValidYear(b.year) ? a : b) : null;
  const vergonha = dashItems.filter(i => ((activeCategories['Discos'] || []).includes(i.type) || (activeCategories['Vídeo'] || []).includes(i.type)) ? (Number(i.rating)||0) === 0 : i.status === 'Não Iniciado').length;
  
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4 scrollbar-hide max-w-5xl mx-auto w-full">
      <MContainer darkMode={darkMode} className="p-3 sticky top-0 z-20 flex flex-col gap-2" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase border-b-[3px] pb-1 mb-1 border-current"><FilterIcon className="w-4 h-4" /> Filtros</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterSubtype('Todos'); }} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}><option value="Todas">Tudo</option>{Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
          <select value={filterSubtype} onChange={e => setFilterSubtype(e.target.value)} disabled={filterCat === 'Todas' || !activeCategories[filterCat]} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? (filterCat === 'Todas' ? 'bg-gray-800 opacity-50' : 'bg-cyan-900') : (filterCat === 'Todas' ? 'bg-gray-100 opacity-50' : 'bg-cyan-100')}`}><option value="Todos">Todos (Subtipo)</option>{(activeCategories[filterCat]||[]).map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}><option value="Todos">Status</option>{STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}><option value="Todas">Notas</option>{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Estrelas</option>)}</select>
        </div>
      </MContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black'}><LibraryBig className="absolute -right-4 -bottom-4 w-20 h-20 opacity-20" /><div className="text-5xl font-black z-10">{dashItems.length}</div><div className="text-[9px] font-black uppercase mt-1 z-10">Itens no Filtro</div></MContainer>
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}><Ghost className="absolute -right-4 -bottom-4 w-20 h-20 opacity-20" /><div className="text-5xl font-black z-10">{vergonha}</div><div className="text-[9px] font-black uppercase mt-1 z-10">Intocados / Backlog</div></MContainer>
        {reliquia && <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between h-28 md:col-span-2" colorClass={darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400 text-black'}><div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase">A Relíquia</div><Clock className="w-5 h-5 opacity-50" /></div><div><div className="text-xs font-black line-clamp-2">{String(reliquia.title)}</div><div className="text-[9px] font-bold mt-1">Ano {getValidYear(reliquia.year)}</div></div></MContainer>}
      </div>

      {dashItems.length === 0 ? <div className="p-10 text-center text-[10px] font-black uppercase opacity-50">Nenhum dado para este filtro.</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
            {catChartData.length > 0 && <MondrianDonutChart title="Categorias" data={catChartData} darkMode={darkMode} />}
            {statusChartData.length > 0 && <MondrianDonutChart title="Progresso" data={statusChartData} darkMode={darkMode} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}><div className={`text-[10px] font-black uppercase mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>Formatos Populares</div><div className="flex flex-col">{byType.map(([type, count], idx) => <MondrianHBar key={type} label={type} value={count} max={byType[0][1]} index={idx} darkMode={darkMode} />)}</div></MContainer>
            <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}><div className={`text-[10px] font-black uppercase mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>Top 5 Autores</div><div className="flex flex-col">{sortedAuthors.map(([author, count], idx) => <MondrianHBar key={author} label={String(author)} value={count} max={sortedAuthors[0]?.[1]} index={idx + 1} darkMode={darkMode} />)}</div></MContainer>
            {Object.keys(byYear).length > 0 && (
              <MContainer darkMode={darkMode} className="p-4 flex flex-col md:col-span-2" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
                <div className={`text-[10px] font-black uppercase mb-4 border-b-[4px] pb-2 flex justify-between ${darkMode ? 'border-gray-300' : 'border-black'}`}><span>Linha do Tempo</span><Calendar className="w-4 h-4" /></div>
                <div className="flex items-end gap-1.5 h-32 pt-6 border-b-[3px] border-current overflow-x-auto scrollbar-hide">
                  {Object.keys(byYear).sort().map((year, idx) => (
                      <div key={year} className="flex-none w-8 h-full flex flex-col justify-end group">
                        <div className={`w-full border-[3px] border-b-0 transition-all flex justify-center relative ${getMondrianColor(idx, darkMode)} ${darkMode ? 'border-gray-300' : 'border-black'}`} style={{ height: `${Math.max(5, (byYear[year] / Math.max(...Object.values(byYear))) * 100)}%` }}><div className="text-[10px] font-black opacity-0 group-hover:opacity-100 absolute bottom-full mb-1">{byYear[year]}</div></div>
                        <div className="text-center text-[7px] font-black mt-1 opacity-70">{year}</div>
                     </div>
                  ))}
                </div>
              </MContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SettingsTab = ({ items, setItems, settings, setSettings, darkMode, setDarkMode, onShowToast, pwa, activeCategories, activeClassCodes }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false); 
  const [showClearCoversConfirm, setShowClearCoversConfirm] = useState(false);
  const [importData, setImportData] = useState(null); 
  const [openSection, setOpenSection] = useState(null); 
  const [newSubclass, setNewSubclass] = useState({ parent: 'Livros', name: '', code: '' });
  const [isBatchCoverLoading, setIsBatchCoverLoading] = useState(false);
  const [batchCoverProgress, setBatchCoverProgress] = useState({ current: 0, total: 0 });
  
  const handleExportCSV = () => {
    if (!items.length) return;
    const headers = ['ID', 'Código Arquivístico', 'Tipo', 'Título', 'Autor/Desenvolvedor', 'Ano', 'Editora/Gravadora', 'Status', 'Nota', 'Páginas/Tempo', 'Código de Barras', 'Descrição', 'URL da Capa', 'Localização', 'Anotações', 'Wiki'];
    const esc = str => `"${String(str || "").replace(/"/g, '""')}"`;
    const rows = items.map(i => [esc(i.id), esc(i.archive_code), esc(i.type), esc(i.title), esc(i.author_developer), esc(i.year), esc(i.publisher), esc(i.status), i.rating || 0, esc(i.pages_or_time), esc(i.barcode), esc(i.description), esc(i.cover_url), esc(i.location), esc(i.notes), esc(i.wiki_info)]);
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), [headers.join(","), ...rows.map(r => r.join(","))].join("\n")], { type: 'text/csv;charset=utf-8;' })); link.download = `Memorabilia_Fisico_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0]; if (!file) return; 
    const reader = new FileReader();
    reader.onload = (evt) => {
      const validRows = parseCSVText(evt.target.result); if (validRows.length < 2) return;
      const headers = validRows[0].map(h => h.trim()); const newItems = [];
      const mapKey = h => h==='ID'?'id':h==='Código Arquivístico'?'archive_code':h==='Tipo'?'type':h==='Autor/Desenvolvedor'?'author_developer':(h==='Ano'||h==='Data')?'year':h==='Editora/Gravadora'?'publisher':h==='Status'?'status':h==='Nota'?'rating':(h==='Páginas/Tempo'||h==='Páginas')?'pages_or_time':(h==='Código de Barras'||h==='ISBN')?'barcode':h==='Descrição'?'description':(h==='URL da Capa'||h==='Localização')?'location':h==='Anotações'?'notes':h==='Wiki'?'wiki_info':h;
      for (let i = 1; i < validRows.length; i++) {
        if (validRows[i].length === 1 && !validRows[i][0].trim()) continue;
        const item = {}; headers.forEach((h, idx) => item[mapKey(h)] = validRows[i][idx] ? validRows[i][idx].trim() : '');
        if (item.id || item.title) { item.id = item.id || generateId(newItems); item.rating = parseInt(item.rating) || 0; newItems.push(item); }
      }
      if (newItems.length > 0) setImportData(newItems);
    }; reader.readAsText(file); e.target.value = null;
  };

  const handleBatchCoverSearch = async (mode) => {
    const targetItems = mode === 'missing' ? items.filter(i => !i.cover_url) : [...items];
    if (!targetItems.length) { onShowToast('success'); return; }
    setIsBatchCoverLoading(true); setBatchCoverProgress({ current: 0, total: targetItems.length });
    let updatedItems = [...items];
    for (let i = 0; i < targetItems.length; i++) {
       const cur = targetItems[i]; setBatchCoverProgress({ current: i + 1, total: targetItems.length });
       try { const newCover = await fetchCoverBySearch(cur, settings, activeCategories); if (newCover) { updatedItems = updatedItems.map(item => item.id === cur.id ? { ...item, cover_url: newCover } : item); syncItemToSheets({ ...cur, cover_url: newCover }, settings?.googleSheetsUrl); } } catch (e) {}
       await new Promise(r => setTimeout(r, 1000));
    }
    setItems(updatedItems); setIsBatchCoverLoading(false); playChipBeep('save'); onShowToast('success');
  };

  const clearAllCovers = () => {
    const updated = items.map(i => ({ ...i, cover_url: '' })); setItems(updated);
    updated.forEach(i => { if (items.find(old => old.id === i.id)?.cover_url) syncItemToSheets({...i, cover_url: ''}, settings?.googleSheetsUrl); }); 
    setShowClearCoversConfirm(false); playChipBeep('save'); onShowToast('success');
  };

  const handleAddSubclass = () => {
    if (!newSubclass.name || !newSubclass.code) { playChipBeep('error'); onShowToast('error'); return; }
    const updatedCats = { ...activeCategories }; 
    if (!updatedCats[newSubclass.parent]) updatedCats[newSubclass.parent] = [];
    if (!updatedCats[newSubclass.parent].includes(newSubclass.name.trim())) updatedCats[newSubclass.parent] = [...updatedCats[newSubclass.parent], newSubclass.name.trim()];
    setSettings({ ...settings, userCategories: updatedCats, userClassCodes: { ...activeClassCodes, [newSubclass.name.trim()]: newSubclass.code.trim() } });
    setNewSubclass({ parent: 'Livros', name: '', code: '' }); playChipBeep('save'); onShowToast('success');
  };

  const AccordionBtn = ({ section, title, icon }) => (
      <button onClick={() => setOpenSection(openSection === section ? null : section)} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase ${openSection === section ? (darkMode ? 'border-b-[4px] border-gray-300' : 'border-b-[4px] border-black') : ''}`}><span className="flex items-center gap-2">{icon} {title}</span><span className="text-lg font-mono">{openSection === section ? '−' : '+'}</span></button>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative max-w-3xl mx-auto w-full">
      <MModal isOpen={showResetConfirm} title="Aviso Crítico" message="Apagar TODOS os itens do acervo?" onConfirm={() => { setItems([]); setShowResetConfirm(false); playChipBeep('save'); onShowToast('success'); }} onCancel={() => setShowResetConfirm(false)} darkMode={darkMode} confirmText="Apagar Tudo" />
      <MModal isOpen={!!importData} title="Importar CSV" message={`Substituir a coleção pelos ${importData ? importData.length : 0} itens novos?`} onConfirm={() => { if (importData) { setItems(importData); setImportData(null); playChipBeep('save'); onShowToast('success'); } }} onCancel={() => setImportData(null)} darkMode={darkMode} confirmText="Substituir" />
      <MModal isOpen={showClearCoversConfirm} title="Aviso Crítico" message="Apagar TODAS as capas salvas?" onConfirm={clearAllCovers} onCancel={() => setShowClearCoversConfirm(false)} darkMode={darkMode} confirmText="Apagar Capas" />
      
      {pwa.isInstallable && !pwa.isInstalled && (
        <MContainer darkMode={darkMode} className="p-4 mb-4 flex flex-col items-center text-center animate-pulse border-cyan-400 bg-cyan-100 dark:bg-cyan-900" colorClass="border-cyan-400"><Smartphone className="w-8 h-8 mb-2 text-cyan-600 dark:text-cyan-400" /><h3 className="font-black uppercase text-cyan-700 dark:text-cyan-300 text-lg mb-1">Instalar App</h3><MButton darkMode={darkMode} onClick={pwa.promptInstall} variant="cyan" className="w-full">📲 Instalar Agora</MButton></MContainer>
      )}
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-amber-900/20 text-white' : 'bg-amber-50 text-black'}>
        <AccordionBtn section="aparencia" title="Aparência & Interface" icon={<Sun className="w-4 h-4" />} />
        {openSection === 'aparencia' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase">Tema Visual</span><MButton variant={darkMode ? 'white' : 'black'} darkMode={darkMode} onClick={() => { setDarkMode(!darkMode); playChipBeep('save'); onShowToast('success'); }} className="py-2">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</MButton></div>
            <div className={`border-t-[4px] ${darkMode ? 'border-amber-900' : 'border-amber-200'} pt-3 flex flex-col gap-5`}>
               <div><div className="text-[10px] font-black uppercase mb-1 flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Velocidade LED</div><input type="range" min="10" max="150" step="1" value={160 - (Number(settings?.marqueeSpeed) || 35)} onChange={e => setSettings({...settings, marqueeSpeed: 160 - parseInt(e.target.value)})} onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-full h-2 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ accentColor: '#22d3ee' }} /></div>
               <div><div className="text-[10px] font-black uppercase mb-1 flex items-center gap-2"><Sun className="w-4 h-4"/> Brilho LED</div><input type="range" min="0" max="100" step="5" value={Number(settings?.marqueeBrightness) ?? 50} onChange={e => setSettings({...settings, marqueeBrightness: parseInt(e.target.value)})} onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-full h-2 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ accentColor: '#fbbf24' }} /></div>
            </div>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-cyan-900/20 text-white' : 'bg-cyan-50 text-black'}>
        <AccordionBtn section="arquivologia" title="Gestão de Classes" icon={<ListIcon className="w-4 h-4" />} />
        {openSection === 'arquivologia' && (
          <div className="p-4 flex flex-col gap-4">
            <MInput darkMode={darkMode} label="Prefixo do Acervo" value={settings?.archivePrefix || ''} onChange={e => setSettings({...settings, archivePrefix: e.target.value.toUpperCase()})} onBlur={() => { playChipBeep('save'); onShowToast('success'); }} />
            <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow={2}>
             <h4 className="text-[10px] font-black uppercase mb-2 border-b-[2px] pb-1">Nova Subclasse</h4>
              <div className="flex flex-col gap-2">
                <select value={newSubclass.parent} onChange={e => setNewSubclass({...newSubclass, parent: e.target.value})} className={`w-full p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`}>{Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <div className="flex gap-2"><input type="text" placeholder="Nome" value={newSubclass.name} onChange={e => setNewSubclass({...newSubclass, name: e.target.value})} className={`flex-1 p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} /><input type="text" placeholder="Cód" value={newSubclass.code} onChange={e => setNewSubclass({...newSubclass, code: e.target.value})} className={`w-24 p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} /></div>
                <MButton darkMode={darkMode} onClick={handleAddSubclass} variant="light-cyan" className="py-2 text-[10px]">Adicionar Subclasse</MButton>
              </div>
            </MContainer>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-cyan-900/20 text-white' : 'bg-cyan-50 text-black'}>
        <AccordionBtn section="capas" title="Recuperação de Capas" icon={<ImageIcon className="w-4 h-4" />} />
        {openSection === 'capas' && (
          <div className="p-4 flex flex-col gap-4">
            {isBatchCoverLoading ? (
               <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center gap-3" shadow={2}>
                 <RefreshIcon className="w-8 h-8 animate-spin text-cyan-500" /><span className="text-[10px] font-black uppercase text-center">Processando... {batchCoverProgress.current} de {batchCoverProgress.total}</span>
                 <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1"><div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${batchCoverProgress.total > 0 ? (batchCoverProgress.current / batchCoverProgress.total) * 100 : 0}%` }} /></div>
               </MContainer>
            ) : (
               <div className="flex flex-col gap-2">
                 <MButton darkMode={darkMode} onClick={() => handleBatchCoverSearch('missing')} variant="cyan" className="py-3 text-[10px]"><ImageIcon className="w-4 h-4" /> Faltantes e Com Erros</MButton>
                 <MButton darkMode={darkMode} onClick={() => handleBatchCoverSearch('all')} variant="amber" className="py-3 text-[10px]"><RefreshIcon className="w-4 h-4" /> Sobrescrever Todas</MButton>
                 <button onClick={() => setShowClearCoversConfirm(true)} className={`mt-2 text-[9px] font-black uppercase underline self-center ${darkMode ? 'text-gray-400 hover:text-pink-400' : 'text-gray-500 hover:text-pink-600'}`}>Apagar Todas as Capas</button>
               </div>
            )}
          </div>
        )}
      </MContainer>
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-pink-900/20 text-white' : 'bg-pink-50 text-black'}>
        <AccordionBtn section="integracoes" title="Integrações & APIs" icon={<Zap className="w-4 h-4" />} />
        {openSection === 'integracoes' && (
          <div className="p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2"><div className={`text-[10px] font-black uppercase mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><Camera className="w-4 h-4"/> Gemini API (Scan IA)</div><MInput darkMode={darkMode} type="password" value={settings?.geminiApiKey || ''} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} /></div>
            <div className={`border-t-[4px] pt-4 ${darkMode ? 'border-pink-900' : 'border-pink-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><DiscIcon className="w-4 h-4"/> Discogs API</div><MInput darkMode={darkMode} type="password" value={settings?.discogsToken || ''} onChange={e => setSettings({...settings, discogsToken: e.target.value})} /></div>
            <div className={`border-t-[4px] pt-4 ${darkMode ? 'border-pink-900' : 'border-pink-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><Share className="w-4 h-4"/> Google Sheets</div><MInput darkMode={darkMode} value={settings?.googleSheetsUrl || ''} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} /></div>
            <div className={`border-t-[4px] pt-4 ${darkMode ? 'border-pink-900' : 'border-pink-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><Headphones className="w-4 h-4"/> Last.FM</div><MInput darkMode={darkMode} label="Username" value={settings?.lastfmUser || ''} onChange={e => setSettings({...settings, lastfmUser: e.target.value})} /><MInput darkMode={darkMode} label="API Key" type="password" value={settings?.lastfmApiKey || ''} onChange={e => setSettings({...settings, lastfmApiKey: e.target.value})} /></div>
            <MButton darkMode={darkMode} onClick={() => { playChipBeep('save'); onShowToast('success'); }} variant="light-pink"><Check className="w-4 h-4" /> Salvar APIs</MButton>
          </div>
        )}
      </MContainer>
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-pink-900/20 text-white' : 'bg-pink-50 text-black'}>
        <AccordionBtn section="backup" title="Backup Local" icon={<Download className="w-4 h-4" />} />
        {openSection === 'backup' && (
          <div className="p-4 flex gap-2 flex-col sm:flex-row">
            <MButton darkMode={darkMode} onClick={handleExportCSV} variant="light-pink" className="flex-1 text-[10px]"><Download className="w-4 h-4" /> Exportar Coleção</MButton>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-black uppercase border-[4px] cursor-pointer active:translate-y-1 transition-all ${getMStyle(darkMode, 4)} ${darkMode ? 'bg-pink-900/50 text-pink-200' : 'bg-pink-100 text-pink-900'} `}>
              <Upload className="w-4 h-4" /> Importar Coleção<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
          </div>
        )}
      </MContainer>
      
      <div className="mt-8 mb-4 text-center">
        <button onClick={() => setShowResetConfirm(true)} className={`px-4 py-2 border-[3px] text-[8px] font-black uppercase opacity-60 hover:opacity-100 transition-all ${darkMode ? 'border-pink-500 text-pink-500' : 'border-pink-600 text-pink-600'}`}>⚠️ Resetar Coleção Física</button>
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
  const [settings, setSettings] = useState({ geminiApiKey: '', googleSheetsUrl: '', marqueeSpeed: 35, marqueeBrightness: 50, archivePrefix: 'MBU', lastfmUser: '', lastfmApiKey: '', discogsToken: '' });
  
  const [isFetchingCloud, setIsFetchingCloud] = useState(false); 
  const [showSuccessSplash, setShowSuccessSplash] = useState(false); 
  const [initialLoadDone, setInitialLoadDone] = useState(false); 
  const [toast, setToast] = useState({ visible: false, type: 'success' }); 
  const [isHtml5QrcodeLoaded, setIsHtml5QrcodeLoaded] = useState(false);
  const [libraryResetKey, setLibraryResetKey] = useState(0);
  
  const pwa = usePWA(LINK_DO_ICONE_NO_GITHUB); 
  const globalFileInputRef = useRef(null);
  
  const [aiBoxState, setAiBoxState] = useState('idle'); 
  const [aiBoxMessage, setAiBoxMessage] = useState(''); 
  const [scannedAIData, setScannedAIData] = useState(null);
  
  const activeCategories = settings?.userCategories || DEFAULT_CATEGORIES;
  const activeClassCodes = settings?.userClassCodes || DEFAULT_CLASS_CODES;
  const allTypes = Object.values(activeCategories).flat();

  const triggerGlobalAI = () => { setActiveTab('add'); setAddMode('manual'); globalFileInputRef.current?.click(); };
  const handleGlobalFileChange = (e) => { if (e.target.files[0]) { setActiveTab('add'); setAddMode('manual'); processGlobalAIFile(e.target.files[0]); } e.target.value = null; };

  const processGlobalAIFile = async (file) => {
    if (!settings?.geminiApiKey?.trim()) { setAiBoxState('error'); setAiBoxMessage('Chave API ausente.'); playChipBeep('error'); return; }
    setAiBoxState('loading'); setAiBoxMessage('Analisando imagem com IA...');
    try {
      const b64 = (await resizeImageForAPI(file)).split(',')[1];
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ parts: [
              { text: `Extraia JSON puro da capa ou ficha catalográfica:\n{"type":"Escolha APENAS uma: ${allTypes.join(', ')}", "title":"Título Principal", "author_developer":"Autor(es)", "year":"YYYY", "publisher":"Editora", "pages_or_time":"Número métrico", "description":"Sinopse"}` }, 
              { inlineData: { mimeType: "image/jpeg", data: b64 } }
        ]}], generationConfig: { responseMimeType: "application/json" } }) 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text; 
      if (!text) throw new Error("Retorno vazio.");
      text = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      setScannedAIData(JSON.parse(text)); setAiBoxState('success'); setAiBoxMessage('Extraído com sucesso!'); playChipBeep('save'); showToast('success');
    } catch (e) {
      setAiBoxState('error'); setAiBoxMessage(e.message.includes('429') ? "Cota gratuita esgotada ⚠️" : `Falha: ${e.message}`); playChipBeep('error'); showToast('error'); 
    }
  };

  useEffect(() => {
    if (window.Html5Qrcode) { setIsHtml5QrcodeLoaded(true); return; }
    if (!document.getElementById('html5-qrcode')) {
      const script = document.createElement('script'); script.id = 'html5-qrcode'; script.src = "https://unpkg.com/html5-qrcode/html5-qrcode.min.js"; 
      script.onload = () => setIsHtml5QrcodeLoaded(true); document.head.appendChild(script);
    }
  }, []);
  
  const showToast = (type = 'success') => { setToast({ visible: true, type }); setTimeout(() => setToast(p => ({ ...p, visible: false })), 2000); };
  
  useEffect(() => {
    let savedSettings = null;
    try {
      if (localStorage.getItem('memorabilia_theme') === 'dark') setDarkMode(true);
      const sItems = localStorage.getItem('memorabilia_items'); if (sItems) setItems(JSON.parse(sItems));
      const sSett = localStorage.getItem('memorabilia_settings'); if (sSett) { savedSettings = JSON.parse(sSett); setSettings(p => ({ ...p, ...savedSettings })); }
    } catch (e) {}
    
    if (savedSettings?.googleSheetsUrl) {
       setIsFetchingCloud(true);
       fetch(savedSettings.googleSheetsUrl).then(res => res.json()).then(data => {
          if (Array.isArray(data) && data.length > 0) setItems(data);
          setShowSuccessSplash(true); playLydianSuccess(); 
          setTimeout(() => { setShowSuccessSplash(false); setIsFetchingCloud(false); setInitialLoadDone(true); }, 1500);
       }).catch(() => { setIsFetchingCloud(false); setInitialLoadDone(true); });
    } else { setInitialLoadDone(true); }
  }, []);

  const [lfmTrack, setLfmTrack] = useState(null);
  useEffect(() => {
    if (!settings?.lastfmUser || !settings?.lastfmApiKey || !initialLoadDone) return;
    const fetchRec = async () => { try { const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&format=json&limit=1`)).json(); const t = d?.recenttracks?.track?.[0]; if(t) setLfmTrack({ name: t.name, artist: t.artist['#text']||t.artist?.name, nowPlaying: t['@attr']?.nowplaying === 'true' }); } catch(e){} };
    fetchRec(); const int = setInterval(fetchRec, 60000); return () => clearInterval(int);
  }, [settings, initialLoadDone]);

  useEffect(() => {
    if (initialLoadDone) {
      localStorage.setItem('memorabilia_items', JSON.stringify(items));
      localStorage.setItem('memorabilia_settings', JSON.stringify(settings));
      localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light');
    }
  }, [items, settings, darkMode, initialLoadDone]);
  
  const [suggestion, setSuggestion] = useState(null);
  useEffect(() => {
    const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type));
    if (initialLoadDone && ms.length > 0 && !suggestion) setSuggestion(ms[Math.floor(Math.random() * ms.length)]);
  }, [initialLoadDone, items, activeCategories, suggestion]);
  
  const shuffleSuggestion = () => { const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type)); if (ms.length) setSuggestion(ms[Math.floor(Math.random() * ms.length)]); };

  const speed = settings?.marqueeSpeed || 35;
  const glow = (settings?.marqueeBrightness ?? 50) / 10;
  const textShadowStyle = { textShadow: glow > 0 ? `0 0 ${glow}px currentColor, 0 0 ${glow * 1.5}px currentColor` : 'none' };
  
  if (isFetchingCloud && !showSuccessSplash) {
    return (
       <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-black text-white'} flex flex-col items-center justify-center font-sans font-black tracking-widest relative`} style={{ backgroundColor: '#0b0b0b', backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)', backgroundSize: '3px 3px' }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; }`}</style>
          <KatamariIcon className="w-24 h-24 mb-6 z-10 text-cyan-400" glow={10} />
          <p className="text-cyan-400 z-10 font-led text-[10px] text-center drop-shadow-[0_0_8px_currentColor] animate-pulse">SINCRONIZANDO...</p>
       </div>
    );
  }

  if (showSuccessSplash) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans font-black tracking-widest relative bg-black text-white`} style={{ backgroundImage: 'radial-gradient(circle, #222 1.5px, transparent 1.5px)', backgroundSize: '4px 4px' }}>
         <div className="z-10 flex flex-col items-center justify-center gap-6 animate-in zoom-in duration-300">
           <img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-28 h-28 object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
           <h1 className="text-4xl text-pink-500 drop-shadow-[0_0_10px_currentColor] text-center">Memorabilia</h1>
         </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; } .led-board { background-color: #0b0b0b; background-image: radial-gradient(circle, #000 1.5px, transparent 1.5px); background-size: 3px 3px; box-shadow: inset 0 0 15px #000; } @keyframes marqueeLinear { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } } @keyframes titleColorCycle { 0%, 100% { color: #f472b6; } 33% { color: #22d3ee; } 66% { color: #fbbf24; } } `}</style>
      <div className={`w-full h-screen relative flex flex-col md:flex-row shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <nav className={`hidden md:flex flex-col w-20 lg:w-48 flex-none border-r-[4px] z-20 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
          <div className="p-4 border-b-[4px] border-current flex items-center justify-center lg:justify-start gap-2 h-20"><img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-8 h-8 object-contain" /><span className="hidden lg:block text-xs font-black uppercase">Memorabilia</span></div>
          <div className="flex-1 flex flex-col pt-4">
            <button onClick={() => { setLibraryResetKey(k=>k+1); setActiveTab('library'); }} className={`w-full flex items-center justify-center lg:justify-start gap-3 p-4 ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-cyan-800 text-white border-l-[4px] border-cyan-400' : 'bg-cyan-400 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}><Library className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Coleção</span></button>
            <button onClick={() => setActiveTab('add')} className={`w-full flex items-center justify-center lg:justify-start gap-3 p-4 ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-amber-700 text-white border-l-[4px] border-amber-400' : 'bg-amber-400 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}><PlusSquare className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Adicionar</span></button>
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center justify-center lg:justify-start gap-3 p-4 ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-pink-800 text-white border-l-[4px] border-pink-400' : 'bg-pink-500 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}><BarChart2 className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Dashboard</span></button>
            <button onClick={() => setActiveTab('settings')} className={`mt-auto mb-4 w-full flex items-center justify-center lg:justify-start gap-3 p-4 ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white border-l-[4px] border-gray-400' : 'bg-gray-200 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}><Settings className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Ajustes</span></button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <header className={`flex-none p-3 lg:p-4 border-b-[4px] z-20 flex flex-col gap-2 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col flex-1 pr-2 w-full overflow-hidden">
                <h1 className="text-3xl lg:text-4xl font-black uppercase leading-none" style={{ ...textShadowStyle, animation: `titleColorCycle ${Math.max(3, speed / 4)}s linear infinite` }}>Memorabilia</h1>
                <div className="flex flex-row gap-2 mt-2 w-full h-[38px] md:h-[42px]">
                  {settings?.lastfmUser ? (
                    <div className={`flex-1 w-1/2 p-1 px-1.5 border-[3px] flex items-center gap-1.5 ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-pink-900 text-white' : 'bg-pink-400 text-black'}`}><Headphones className={`w-3.5 h-3.5 flex-shrink-0 ${lfmTrack?.nowPlaying?'animate-pulse':''}`} /> <div className="flex flex-col truncate w-full"><span className="text-[6px] lg:text-[7px] font-black uppercase opacity-80 truncate">{lfmTrack?.nowPlaying?'Ouvindo:':'Última:'}</span><span className="text-[8px] lg:text-[9px] font-black uppercase truncate">{lfmTrack?`${lfmTrack.artist} - ${lfmTrack.name}`:'Carregando...'}</span></div></div>
                  ) : (<div className={`flex-1 w-1/2 p-1 px-1.5 border-[3px] flex items-center gap-1.5 opacity-50 ${darkMode?'bg-gray-800 border-gray-300':'bg-gray-200 border-black'}`}><Headphones className="w-3.5 h-3.5" /><span className="text-[7px] font-black uppercase">Last.FM Off</span></div>)}
                  {suggestion ? (
                    <div onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent((suggestion.title || '') + ' ' + (suggestion.author_developer || ''))}`, '_blank')} className={`flex-1 w-1/2 p-1 px-1.5 border-[3px] flex items-center gap-1.5 cursor-pointer active:scale-95 ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-cyan-900 text-white' : 'bg-cyan-400 text-black'}`}><Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> <div className="flex flex-col truncate w-full"><span className="text-[6px] lg:text-[7px] font-black uppercase opacity-80 truncate">Ouvir Hoje:</span><span className="text-[8px] lg:text-[9px] font-black uppercase truncate">{suggestion.title||'S/ Título'}</span></div></div>
                  ) : (<div className={`flex-1 w-1/2 p-1 px-1.5 border-[3px] flex items-center gap-1.5 opacity-50 ${darkMode?'bg-gray-800 border-gray-300':'bg-gray-200 border-black'}`}><Sparkles className="w-3.5 h-3.5" /><span className="text-[7px] font-black uppercase">Sem Discos</span></div>)}
                </div>
              </div>
              <div className="w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 flex items-center justify-center relative ml-2">
                {toast.visible ? (toast.type === 'error' ? <XIcon className="text-pink-500 w-10 h-10 drop-shadow-md animate-in zoom-in" /> : <Check className="text-cyan-400 w-10 h-10 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-in zoom-in" />) : (<img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-full h-full object-contain md:hidden" />)}
              </div>
            </div>

            <div className="flex gap-2 mt-2 h-[86px]">
              <div className={`flex-1 w-1/2 flex flex-col p-1.5 border-[3px] text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase leading-tight ${getMStyle(darkMode, 2).replace('border-[4px]','')} ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}>
                <div className="border-b-[2px] border-current pb-0.5 mb-0.5 flex justify-between opacity-80"><span className="truncate">Coleção Física</span><span className="ml-1">{items.length} UN</span></div>
                <div className="flex justify-between text-amber-500 font-bold mb-0.5"><span className="truncate">Lidos:</span><span className="ml-1">{items.filter(i=>i.status==='Concluído'&&(activeCategories['Livros']||[]).includes(i.type)).reduce((a,b)=>a+(parseInt(b.pages_or_time)||0),0)} Pgs</span></div>
                <div className="flex justify-between text-cyan-500 mt-auto pt-0.5"><span className="truncate">Nota (Geral):</span><span className="ml-1">★ {(items.filter(i=>(Number(i.rating)||0)>0).reduce((a,b)=>a+Number(b.rating),0)/Math.max(1,items.filter(i=>(Number(i.rating)||0)>0).length)).toFixed(1)}</span></div>
              </div>
              <div className={`flex-1 w-1/2 flex flex-col border-[3px] text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase overflow-hidden relative ${getMStyle(darkMode, 2).replace('border-[4px]','')} bg-black text-white`}>
                 <div className="px-1.5 py-1 border-b-[2px] border-gray-800 opacity-80 flex justify-between z-10 bg-black"><span className="truncate">Painel de Status</span><span className="animate-pulse text-cyan-400 ml-1">REC</span></div>
                 <div className="flex-1 flex items-center overflow-hidden w-full relative led-board">
                    <div className="absolute whitespace-nowrap flex items-center" style={{ animation: `marqueeLinear ${speed}s linear infinite`, width: 'max-content' }}>
                      <div className="flex items-center py-1" style={textShadowStyle}><span className="text-cyan-400 font-led text-[10px]">TOTAL: {items.length}</span><div className="flex items-center mx-4"><KatamariIcon className="w-5 h-5" glow={glow} /></div><span className="text-pink-400 font-led text-[10px]">MEMORABILIA</span><div className="flex items-center gap-2 ml-6 mr-10"><Ghost className="w-4 h-4 text-pink-500" style={{ filter: `drop-shadow(0 0 ${glow}px currentColor)` }} /><div className="w-1.5 h-1.5 bg-amber-200 rounded-full" /></div></div>
                      <div className="flex items-center py-1" style={textShadowStyle}><span className="text-cyan-400 font-led text-[10px]">TOTAL: {items.length}</span><div className="flex items-center mx-4"><KatamariIcon className="w-5 h-5" glow={glow} /></div><span className="text-pink-400 font-led text-[10px]">MEMORABILIA</span><div className="flex items-center gap-2 ml-6 mr-10"><Ghost className="w-4 h-4 text-pink-500" style={{ filter: `drop-shadow(0 0 ${glow}px currentColor)` }} /><div className="w-1.5 h-1.5 bg-amber-200 rounded-full" /></div></div>
                    </div>
                  </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden p-0 sm:p-2 lg:p-6 relative flex flex-col">
            <input type="file" accept="image/*" capture="environment" ref={globalFileInputRef} onChange={handleGlobalFileChange} className="hidden" />
            {activeTab === 'library' && <LibraryTab key={libraryResetKey} items={items} setItems={setItems} darkMode={darkMode} settings={settings} onShowToast={showToast} activeCategories={activeCategories} />}
            {activeTab === 'add' && <div className="p-3 overflow-y-auto w-full"><AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} onShowToast={showToast} triggerGlobalAI={triggerGlobalAI} globalAiState={aiBoxState} globalAiMessage={aiBoxMessage} resetGlobalAi={() => { setAiBoxState('idle'); setAiBoxMessage(''); }} scannedAIData={scannedAIData} setScannedAIData={setScannedAIData} isHtml5QrcodeLoaded={isHtml5QrcodeLoaded} activeCategories={activeCategories} activeClassCodes={activeClassCodes} allTypes={allTypes} /></div>}
            {activeTab === 'dashboard' && <div className="p-3 overflow-y-auto w-full"><DashboardTab items={items} darkMode={darkMode} activeCategories={activeCategories} /></div>}
            {activeTab === 'settings' && <div className="p-3 overflow-y-auto w-full"><SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} onShowToast={showToast} pwa={pwa} activeCategories={activeCategories} activeClassCodes={activeClassCodes} /></div>}
          </main>

          <nav className={`flex md:hidden flex-none border-t-[4px] z-20 h-16 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
            <button onClick={() => { setLibraryResetKey(k=>k+1); setActiveTab('library'); }} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400') : ''}`}><Library className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Coleção</span></button>
            <button onClick={() => setActiveTab('add')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400') : ''}`}><PlusSquare className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Adicionar</span></button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500') : ''}`}><BarChart2 className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Geral</span></button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center justify-center ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200') : ''}`}><Settings className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Ajustes</span></button>
          </nav>
        </div>
      </div>
    </div>
  );
}
