import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// CONFIGURAÇÕES DO APLICATIVO E ARQUIVOLOGIA
// ==========================================
// Ícone local: o arquivo fica em public/icon-192.png e é servido pelo próprio site em /icon-192.png
const LINK_DO_ICONE_NO_GITHUB = "/icon-192.png";

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
// AUDIO ENGINE (CHIPTUNE 8-BIT / NES)
// Apenas 3 efeitos: início (fanfarra lídia), acerto (suave) e erro (suave)
// ==========================================
let audioCtx = null;
let globalSoundEnabled = true;
let pulseWaves = {};
let lastErrorAt = 0;

const initAudio = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
};

// Onda de pulso (como os canais de pulso do NES). duty: 0.125, 0.25 ou 0.5
const getPulse = (duty) => {
  if (pulseWaves[duty]) return pulseWaves[duty];
  const N = 32; const real = new Float32Array(N); const imag = new Float32Array(N);
  for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  pulseWaves[duty] = audioCtx.createPeriodicWave(real, imag);
  return pulseWaves[duty];
};

// Toca uma nota: wave = 'triangle' | duty numérico (pulso)
const chipNote = (freq, start, dur, vol, wave = 0.25) => {
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  if (wave === 'triangle') osc.type = 'triangle'; else osc.setPeriodicWave(getPulse(wave));
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.006);
  gain.gain.setValueAtTime(vol, start + Math.max(0.008, dur * 0.55));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(start); osc.stop(start + dur + 0.02);
};

// 1) INÍCIO — fanfarra à la vitória de Dragon Quest, escala lídia ascendente
//    Dó Ré Mi Fá# Sol Lá (1 2 3 #4 5 6): notas curtas, a última sustentada, com baixo em triângulo
const playLydianSuccess = () => {
  if (!globalSoundEnabled) return;
  try {
    initAudio(); if (!audioCtx) return;
    const t = audioCtx.currentTime + 0.03;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, Fs5 = 739.99, G5 = 783.99, A5 = 880.0;
    const step = 0.085;
    // melodia (pulso 25%) — ritmo de fanfarra: quatro notas rápidas, Sol curto, Lá longo
    [[C5, 0], [D5, 1], [E5, 2], [Fs5, 3], [G5, 4]].forEach(([f, i]) => chipNote(f, t + i * step, step * 0.92, 0.05, 0.25));
    chipNote(A5, t + 5 * step, 0.55, 0.055, 0.25);
    // segunda voz em pulso 12,5% uma oitava abaixo da melodia, só no final (dá corpo)
    chipNote(A5 / 2, t + 5 * step, 0.55, 0.03, 0.125);
    // baixo em triângulo: Dó curto e Ré/Lá sustentado
    chipNote(130.81, t, step * 5, 0.07, 'triangle');
    chipNote(146.83, t + 5 * step, 0.55, 0.07, 'triangle');
  } catch (e) {}
};

// 2) ACERTO e 3) ERRO — curtos e suaves
const playChipBeep = (type) => {
  if (!globalSoundEnabled) return;
  try {
    initAudio(); if (!audioCtx) return;
    const t = audioCtx.currentTime + 0.01;
    if (type === 'save' || type === 'success') {
      // dois toques ascendentes (quarta justa): Sol5 → Dó6, triângulo + pulso baixinho
      chipNote(783.99, t, 0.07, 0.05, 'triangle');
      chipNote(1046.5, t + 0.07, 0.16, 0.05, 'triangle');
      chipNote(1046.5, t + 0.07, 0.12, 0.012, 0.125);
    } else if (type === 'error') {
      // evita som duplo quando mais de um ponto do app sinaliza o mesmo erro
      const nowMs = Date.now(); if (nowMs - lastErrorAt < 350) return; lastErrorAt = nowMs;
      // dois toques descendentes e graves (trítono → quarta abaixo): Mi4 → Si3
      chipNote(329.63, t, 0.1, 0.055, 'triangle');
      chipNote(233.08, t + 0.1, 0.22, 0.055, 'triangle');
      chipNote(233.08, t + 0.1, 0.18, 0.015, 0.5);
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
const getDecade = year => year && !isNaN(year) ? Math.floor(year / 10) * 10 : null;

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
      try { const res = await fetchTimeout(`https://api.discogs.com/database/search?q=${barcodeRaw}&token=${settings.discogsToken}`); const data = await res.json(); if (data.results?.[0]?.cover_image && !data.results[0].cover_image.includes('spacer.gif')) return data.results[0].cover_image; } catch(e) {}
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
      <circle cx="50" cy="50" r="4" fill="gray" opacity="0.8" />
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
const Sparkles = p => <Icon {...p} path={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;
const FilterIcon = p => <Icon {...p} path={<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>} />;
const Smartphone = p => <Icon {...p} path={<><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>} />;
const DiscIcon = p => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></>} />;
const XIcon = p => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const Zap = p => <Icon {...p} path={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />;
const ListIcon = p => <Icon {...p} path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} />;
const Share = p => <Icon {...p} path={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>} />;
const Headphones = p => <Icon {...p} path={<><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></>} />;
const ImageIcon = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></>} />;
const RefreshIcon = p => <Icon {...p} path={<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>} />;
const Trash2 = p => <Icon {...p} path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} />;
const MonitorPlay = p => <Icon {...p} path={<><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M14 21h-4"/><path d="M12 17v4"/><path d="m10 13 5-3-5-3v6z"/></>} />;

// ==========================================
// PWA ENGINE
// ==========================================
const usePWA = (iconUrl) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Manifest e ícones agora são arquivos reais em /public (ligados no index.html).
    // O service worker (/sw.js) só é registrado no site publicado, para não atrapalhar o desenvolvimento.
    const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
    if (isProd && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado:', err));
    }

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
    <button title={title} disabled={disabled} onClick={(e) => { onClick && onClick(e); }} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[2px] ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} ${disabled ? 'opacity-50 shadow-none translate-y-1 translate-x-1' : 'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bg} ${className}`}>
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
  <div className={`flex items-center gap-2 w-full mb-2 ${onClick ? 'cursor-pointer group' : ''}`} onClick={(e) => { if(onClick) { onClick(e); } }}>
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
          <div key={idx} onClick={() => { if(onSliceClick) { onSliceClick(item.originalLabel || item.label); } }} className={`flex items-center justify-between text-[9px] font-black uppercase tracking-widest p-1 border-[2px] border-transparent ${onSliceClick ? 'cursor-pointer hover:border-current active:scale-95 transition-all' : ''}`}>
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
                {isSearchingCover ? <DiscoSpinner className="w-3 h-3 flex-shrink-0" speed={2} glow={0} /> : <ImageIcon className="w-3 h-3" />}{isSearchingCover ? 'Buscando...' : 'Procurar Capa'}
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

  const updateStatus = (state, message) => { if (state === 'error') playChipBeep('error'); setScanBox({ state, message }); };
  const changeMode = (newMode) => { setAddMode(newMode); if (newMode !== 'manual') { updateStatus('idle', ''); resetGlobalAi(); } };

  useEffect(() => {
    if (scannedAIData) {
       setFormData(prev => ({ ...prev, title: scannedAIData.title||'', author_developer: scannedAIData.author_developer||'', year: scannedAIData.year?.toString()||'', publisher: scannedAIData.publisher||'', description: scannedAIData.description||'', barcode: scannedAIData.barcode||'', pages_or_time: scannedAIData.pages_or_time||prev.pages_or_time, type: allTypes.includes(scannedAIData.type) ? scannedAIData.type : 'Livro' }));
       
       if (scannedAIData.barcode) {
          fetchMultiDatabaseParallel(scannedAIData.barcode, scannedAIData.author_developer, scannedAIData);
       }
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
               scannerRef.current.stop().then(() => { if (isMounted) { setAddMode('manual'); setFormData(prev => ({ ...prev, barcode: decodedText })); fetchMultiDatabaseParallel(decodedText, '', null); setTimeout(() => { isProcessingScan.current = false; }, 2000); } }).catch(e => {});
            }
          }, () => {}).catch(() => { if (isMounted) { updateStatus('error', 'Erro Câmera.'); setAddMode('manual'); } });
    }
    return () => {
        isMounted = false;
        if (scannerInstance) { try { if (scannerInstance.getState() === 2 || scannerInstance.getState() === 1) { scannerInstance.stop().then(() => scannerInstance.clear()).catch(()=>{}); } else { scannerInstance.clear(); } } catch(e) {} scannerRef.current = null; }
    };
  }, [addMode, isHtml5QrcodeLoaded]);

  const fetchMultiDatabaseParallel = async (barcode, artistName = '', aiData = null) => {
    const rawBarcode = barcode.trim();
    const cleanCode = barcode.replace(/[-\s]/g, "").toUpperCase();
    updateStatus('loading', 'Consultando bancos de dados...');
    const isBookCode = (cleanCode.length === 13 && (cleanCode.startsWith("978") || cleanCode.startsWith("979"))) || (cleanCode.length === 10 && /^\d{9}[\dX]$/.test(cleanCode));
    const fetchers = [];

    const fetchDiscogs = async () => {
      if (!settings?.discogsToken) throw new Error("No token");
      const query = artistName ? `${rawBarcode} ${artistName}` : rawBarcode;
      const res = await fetchTimeout(`https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&token=${settings.discogsToken}`); const data = await res.json();
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

    if (isBookCode) fetchers.push(fetchGBooks(), fetchUPC());
    else { fetchers.push(fetchMBrainz(), fetchUPC()); if (settings?.discogsToken) fetchers.push(fetchDiscogs()); }

    try {
      const foundItem = await Promise.any(fetchers); updateStatus('success', 'Encontrado com velocidade!');
      setFormData(prev => {
         const merged = { ...prev };
         if (aiData) {
             const apiArtist = (foundItem.author_developer || '').toLowerCase();
             const aiArtist = (aiData.author_developer || '').toLowerCase();
             const isMatch = apiArtist && aiArtist && (apiArtist.includes(aiArtist) || aiArtist.includes(apiArtist));

             if (isMatch) {
                 merged.title = foundItem.title || aiData.title || prev.title;
                 merged.author_developer = foundItem.author_developer || aiData.author_developer || prev.author_developer;
                 merged.year = foundItem.year || aiData.year || prev.year;
                 merged.publisher = foundItem.publisher || aiData.publisher || prev.publisher;
                 merged.pages_or_time = foundItem.pages_or_time || aiData.pages_or_time || prev.pages_or_time;
             } else {
                 merged.title = aiData.title || prev.title;
                 merged.author_developer = aiData.author_developer || prev.author_developer;
                 merged.year = aiData.year || foundItem.year || prev.year;
                 merged.publisher = aiData.publisher || foundItem.publisher || prev.publisher;
                 merged.pages_or_time = aiData.pages_or_time || foundItem.pages_or_time || prev.pages_or_time;
             }
             merged.cover_url = foundItem.cover_url || prev.cover_url;
         } else {
             Object.assign(merged, foundItem);
         }
         merged.barcode = rawBarcode;
         return merged;
      });
    } catch (e) { updateStatus('error', 'Item não localizado nos bancos. Preencha manualmente.'); }
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
        <div className={`p-4 mb-4 flex items-start gap-3 border-[2px] shadow-[2px_2px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest transition-colors duration-300 relative overflow-hidden ${displayBoxState === 'loading' ? (darkMode ? 'bg-amber-500 border-gray-300 text-black' : 'bg-amber-600 border-black text-white') : displayBoxState === 'success' ? (darkMode ? 'bg-cyan-600 border-gray-300 text-white' : 'bg-cyan-600 border-black text-white') : (darkMode ? 'bg-pink-600 border-gray-300 text-white' : 'bg-pink-600 border-black text-white')}`}>
          {displayBoxState === 'loading' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.5)_100%)] pointer-events-none" />}
          {displayBoxState === 'loading' && <DiscoSpinner className="w-6 h-6 flex-shrink-0 z-10" speed={2} glow={5} />}
          {displayBoxState === 'success' && <Check className="w-6 h-6 flex-shrink-0 z-10" />}
          {displayBoxState === 'error' && <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5 z-10" />}
          <span className="leading-relaxed break-words whitespace-pre-wrap flex-1 z-10">{displayBoxMessage}</span>
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
                <MButton darkMode={darkMode} variant="amber" onClick={(e) => { e.preventDefault(); if(formData.barcode) fetchMultiDatabaseParallel(formData.barcode, formData.author_developer, null); else { playChipBeep('error'); updateStatus('error', 'Digite um código primeiro.'); } }} className="h-[38px] px-3"><Search className="w-4 h-4"/> Buscar</MButton>
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
// ==========================================
// DASHBOARD — composição Mondrian interativa
// Tudo em CSS/SVG puro (sem bibliotecas externas).
// Clicar em qualquer bloco aplica o filtro global; "Limpar" desfaz.
// ==========================================
const MB_STATUS_ORDER = ['Concluído', 'Em Andamento', 'Na Fila', 'Backlog / Não Iniciado'];
const MB_STATUS_SHORT = { 'Concluído': 'Concluído', 'Em Andamento': 'Em andamento', 'Na Fila': 'Na fila', 'Backlog / Não Iniciado': 'Backlog' };

// Paleta Mondrian: ciano, pink, amarelo, tinta e neutro
const mbPalette = (dark) => [
  { hex: '#0891b2', fg: '#ffffff' },
  { hex: '#db2777', fg: '#ffffff' },
  { hex: '#f59e0b', fg: '#000000' },
  { hex: dark ? '#d1d5db' : '#111827', fg: dark ? '#000000' : '#ffffff' },
  { hex: dark ? '#4b5563' : '#e5e7eb', fg: dark ? '#ffffff' : '#000000' },
];

const mbTitle = (w) => w.isGroup ? String(w.title || '').replace(/(^|\s)\S/g, c => c.toUpperCase()) : (w.original_title || w.title || 'Sem título');

// Número que "sobe" até o valor (respeita prefers-reduced-motion)
const useCountUp = (target, ms = 900) => {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const to = Number(target) || 0; const from = prev.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from === to) { setVal(to); prev.current = to; return; }
    let raf; const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
};

// Treemap "squarified": devolve retângulos {x,y,w,h} dentro de um quadro w×h
const mbSquarify = (list, W, H) => {
  const data = list.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return [];
  let x = 0, y = 0, w = W, h = H;
  const scale = (W * H) / total;
  const nodes = data.map(d => ({ ...d, area: d.value * scale }));
  const out = [];
  const worst = (row, side) => {
    const s = row.reduce((a, n) => a + n.area, 0);
    const mx = Math.max(...row.map(n => n.area)); const mn = Math.min(...row.map(n => n.area));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const place = (row) => {
    const s = row.reduce((a, n) => a + n.area, 0);
    if (w >= h) {
      const cw = s / h; let cy = y;
      row.forEach(n => { const nh = n.area / cw; out.push({ ...n, x, y: cy, w: cw, h: nh }); cy += nh; });
      x += cw; w -= cw;
    } else {
      const rh = s / w; let cx = x;
      row.forEach(n => { const nw = n.area / rh; out.push({ ...n, x: cx, y, w: nw, h: rh }); cx += nw; });
      y += rh; h -= rh;
    }
  };
  let row = []; let i = 0;
  while (i < nodes.length) {
    const side = Math.min(w, h); const next = [...row, nodes[i]];
    if (row.length === 0 || worst(next, side) <= worst(row, side)) { row = next; i++; }
    else { place(row); row = []; }
  }
  if (row.length) place(row);
  return out;
};

// Cartão com título e dica
const MCard = ({ title, hint, darkMode, children, className = '', right }) => (
  <MContainer darkMode={darkMode} className={`p-3 sm:p-4 flex flex-col min-w-0 ${className}`} colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
    <div className={`flex items-baseline justify-between gap-3 mb-3 pb-2 border-b-[2px] ${darkMode ? 'border-gray-300' : 'border-black'}`}>
      <h3 className="text-sm font-black tracking-tight leading-tight">{title}</h3>
      {right ? right : (hint && <span className="text-[10px] font-bold opacity-60 text-right leading-tight">{hint}</span>)}
    </div>
    {children}
  </MContainer>
);

// Barra horizontal simples com preenchimento sólido
const MBar = ({ pct, hex, darkMode, className = 'h-3' }) => (
  <div className={`w-full ${className} border-[2px] ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'} overflow-hidden`}>
    <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: hex }} />
  </div>
);

// Linha de obra (listas de cruzamentos, anos e fichas)
const MWorkRow = ({ w, darkMode }) => (
  <div className={`flex items-center gap-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
    <div className={`w-9 h-9 flex-shrink-0 border-[2px] overflow-hidden ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'}`}>
      {w.cover_url ? <img src={w.cover_url} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs font-black truncate">{mbTitle(w)}</div>
      <div className="text-[10px] font-bold opacity-60 truncate">{applyArtistAlias(w.author_developer) || 'Autor desconhecido'}</div>
    </div>
    <div className="flex flex-col items-end flex-shrink-0 text-[10px] font-black leading-tight">
      <span>{w.type}</span>
      <span className="opacity-60">{Number.isFinite(w.yr) ? w.yr : 's/ ano'}{w.rating > 0 ? `  ${w.rating}★` : ''}</span>
    </div>
  </div>
);

const MB_FOCUS = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-pink-500';

const MChip = ({ darkMode, active, onClick, swatch, children, title }) => (
  <button title={title} onClick={onClick} className={`flex items-center gap-1.5 px-2 py-1 border-[2px] text-[10px] font-black transition-all active:translate-y-0.5 ${MB_FOCUS} ${active ? (darkMode ? 'bg-gray-200 text-black border-gray-300' : 'bg-black text-white border-black') : (darkMode ? 'bg-gray-800 text-white border-gray-500 hover:border-gray-300' : 'bg-white text-black border-gray-400 hover:border-black')}`}>
    {swatch && <span className={`w-3 h-3 border-[2px] flex-shrink-0 ${darkMode ? 'border-gray-300' : 'border-black'}`} style={{ backgroundColor: swatch }} />}{children}
  </button>
);

const MSeg = ({ darkMode, value, options, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(o => (
      <button key={o.id} onClick={() => onChange(o.id)} className={`px-3 py-1.5 border-[2px] text-[11px] font-black transition-colors ${MB_FOCUS} ${value === o.id ? `bg-cyan-600 text-white ${darkMode ? 'border-gray-300' : 'border-black'}` : (darkMode ? 'bg-gray-800 text-gray-300 border-gray-600 hover:text-white' : 'bg-white text-gray-700 border-gray-300 hover:text-black')}`}>{o.label}</button>
    ))}
  </div>
);

const MTile = ({ darkMode, className = '', style, children }) => (
  <div className={`p-3 sm:p-4 border-r-[2px] border-b-[2px] ${darkMode ? 'border-gray-300' : 'border-black'} flex flex-col justify-between min-w-0 ${className}`} style={style}>{children}</div>
);

const DashboardTab = ({ items, filteredItems, darkMode, activeCategories, globalFilters, setGlobalFilters, settings }) => {
  const [sub, setSub] = useState('visao');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hoverTile, setHoverTile] = useState(null);
  const [hoverYear, setHoverYear] = useState(null);
  const [yearFocus, setYearFocus] = useState(null);
  const [cross, setCross] = useState({ cols: 'decada', cell: null });
  const [peopleMode, setPeopleMode] = useState('autores');
  const [peopleQuery, setPeopleQuery] = useState('');

  const pal = mbPalette(darkMode);
  const ink = darkMode ? 'border-gray-300' : 'border-black';
  const focusRing = MB_FOCUS;

  // ---------- filtros globais ----------
  const toggleFilter = (group, val) => setGlobalFilters(prev => {
    const cur = prev[group] || [];
    return { ...prev, [group]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
  });
  const clearFilters = () => setGlobalFilters({ Categorias: [], Subtipos: [], Status: [], Notas: [], Autores: [], Editoras: [] });
  const activeChips = Object.entries(globalFilters).flatMap(([g, arr]) => (arr || []).map(v => ({ g, v })));
  const isOn = (group, val) => (globalFilters[group] || []).includes(val);

  const catKeys = Object.keys(activeCategories || {});
  const getCategoryOf = (type) => { for (const [cat, subs] of Object.entries(activeCategories || {})) { if ((subs || []).includes(type)) return cat; } return 'Outros'; };
  const catColor = (cat) => { const i = catKeys.indexOf(cat); return i < 0 ? pal[4] : pal[i % 4]; };
  const statusColor = (st) => ({ 'Concluído': pal[0], 'Em Andamento': pal[2], 'Na Fila': pal[1] }[st] || pal[4]);

  // ---------- análise (obras agrupadas: volumes da mesma obra contam 1) ----------
  const analytics = useMemo(() => {
    const groupedMap = new Map();
    const statusWeights = { 'Concluído': 4, 'Em Andamento': 3, 'Na Fila': 2, 'Não Iniciado': 1, 'Backlog': 1 };
    filteredItems.forEach(item => {
      const normTitle = normalizeWorkTitle(item.title);
      const author = applyArtistAlias(item.author_developer, settings?.artistAliases) || '';
      const key = `${normTitle.toLowerCase()}|${author.toLowerCase()}|${item.type}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, { ...item, title: normTitle || item.title, original_title: item.title, volumeCount: 1, aggregated_metric: parseInt(item.pages_or_time) || 0, isGroup: false });
      } else {
        const ex = groupedMap.get(key);
        ex.volumeCount += 1; ex.isGroup = true;
        ex.aggregated_metric += (parseInt(item.pages_or_time) || 0);
        ex.rating = Math.max(ex.rating || 0, item.rating || 0);
        if ((statusWeights[item.status || 'Não Iniciado'] || 0) > (statusWeights[ex.status || 'Não Iniciado'] || 0)) ex.status = item.status;
        const a = getValidYear(ex.year); const b = getValidYear(item.year);
        if (!isNaN(a) && !isNaN(b) && b < a) ex.year = item.year;
        if (!ex.cover_url && item.cover_url) ex.cover_url = item.cover_url;
      }
    });
    const works = Array.from(groupedMap.values());

    const A = {
      works, totalWorks: works.length, totalRaw: filteredItems.length,
      concluidos: 0, backlog: 0, ratedCount: 0, sumRatings: 0,
      statusCounts: {}, ratingCounts: {}, typeStats: {}, catStats: {}, yearCat: {},
      people: { autores: {}, editoras: {} },
      metrics: { 'Páginas': { sum: 0, count: 0, max: 0, top: [] }, 'Faixas': { sum: 0, count: 0, max: 0, top: [] }, 'Minutos': { sum: 0, count: 0, max: 0, top: [] }, 'Horas': { sum: 0, count: 0, max: 0, top: [] } },
      fields: { title: 0, author_developer: 0, year: 0, publisher: 0, type: 0, barcode: 0, cover_url: 0, pages_or_time: 0 },
      oldest: null, newest: null
    };
    const addPerson = (bucket, name, w) => {
      if (!bucket[name]) bucket[name] = { count: 0, sumRating: 0, ratedCount: 0, concluidos: 0, backlog: 0, items: [], cats: {} };
      const e = bucket[name]; e.count++; e.items.push(w); e.cats[w.cat] = (e.cats[w.cat] || 0) + 1;
      if (w.rInt > 0) { e.sumRating += w.rInt; e.ratedCount++; }
      if (w.statusA === 'Concluído') e.concluidos++; else e.backlog++;
    };

    works.forEach(w => {
      const cat = getCategoryOf(w.type); w.cat = cat;
      const tp = w.type || 'Sem tipo';
      if (!A.typeStats[tp]) A.typeStats[tp] = { count: 0, cat, sumRating: 0, rated: 0 };
      A.typeStats[tp].count++;
      A.catStats[cat] = (A.catStats[cat] || 0) + 1;

      // status: livros e games usam o campo status; discos e vídeos usam a nota
      let st = 'Backlog / Não Iniciado';
      if (['Livros', 'Games'].includes(cat)) {
        if (w.status === 'Concluído') st = 'Concluído'; else if (w.status === 'Em Andamento') st = 'Em Andamento'; else if (w.status === 'Na Fila') st = 'Na Fila';
      } else if ((Number(w.rating) || 0) > 0) st = 'Concluído';
      w.statusA = st;
      if (st === 'Concluído') A.concluidos++; else A.backlog++;
      A.statusCounts[st] = (A.statusCounts[st] || 0) + 1;

      w.rInt = Math.floor(Number(w.rating) || 0);
      A.ratingCounts[w.rInt] = (A.ratingCounts[w.rInt] || 0) + 1;
      if (w.rInt > 0) { A.ratedCount++; A.sumRatings += w.rInt; A.typeStats[tp].sumRating += w.rInt; A.typeStats[tp].rated++; }

      const yr = getValidYear(w.year); w.yr = yr; w.decade = isNaN(yr) ? null : Math.floor(yr / 10) * 10;
      if (!isNaN(yr)) {
        if (!A.yearCat[yr]) A.yearCat[yr] = {};
        A.yearCat[yr][cat] = (A.yearCat[yr][cat] || 0) + 1;
        if (!A.oldest || yr < A.oldest.yr) A.oldest = w;
        if (!A.newest || yr > A.newest.yr) A.newest = w;
      }

      const auth = applyArtistAlias(w.author_developer, settings?.artistAliases) || 'Desconhecido';
      const pub = (w.publisher || '').trim() || 'Desconhecida';
      if (!isVariousArtists(auth) && auth !== 'Desconhecido') addPerson(A.people.autores, auth, w);
      if (pub !== 'Desconhecida') addPerson(A.people.editoras, pub, w);

      const val = w.aggregated_metric;
      if (val > 0) {
        const label = cat === 'Livros' ? 'Páginas' : cat === 'Discos' ? 'Faixas' : cat === 'Vídeo' ? 'Minutos' : cat === 'Games' ? 'Horas' : null;
        if (label && A.metrics[label]) {
          const m = A.metrics[label]; m.sum += val; m.count++; if (val > m.max) m.max = val;
          m.top.push({ name: mbTitle(w) + (w.isGroup ? ' (coleção)' : ''), val, cat });
        }
      }
      Object.keys(A.fields).forEach(f => { if (w[f] && String(w[f]).trim() !== '') A.fields[f]++; });
    });
    Object.values(A.metrics).forEach(m => { m.top.sort((a, b) => b.val - a.val); m.top = m.top.slice(0, 5); });
    return A;
  }, [filteredItems, activeCategories, settings?.artistAliases]);

  // ---------- cruzamento: suporte × (década | status | nota) ----------
  const matrix = useMemo(() => {
    const colKey = (w) => cross.cols === 'decada' ? (w.decade != null ? String(w.decade) : null) : cross.cols === 'status' ? w.statusA : String(w.rInt);
    const cells = {}; const rowTot = {}; const colTot = {}; const colSet = new Set();
    analytics.works.forEach(w => {
      const c = colKey(w); if (c == null) return;
      colSet.add(c); const k = `${w.type}||${c}`;
      if (!cells[k]) cells[k] = []; cells[k].push(w);
      rowTot[w.type] = (rowTot[w.type] || 0) + 1; colTot[c] = (colTot[c] || 0) + 1;
    });
    let cols = Array.from(colSet);
    if (cross.cols === 'decada') cols.sort((a, b) => a - b);
    else if (cross.cols === 'status') cols = MB_STATUS_ORDER.filter(s => colSet.has(s));
    else cols = ['5', '4', '3', '2', '1', '0'].filter(s => colSet.has(s));
    const rows = Object.keys(rowTot).sort((a, b) => rowTot[b] - rowTot[a]);
    let max = 1; let best = null;
    rows.forEach(r => cols.forEach(c => { const n = (cells[`${r}||${c}`] || []).length; if (n > max) max = n; if (!best || n > best.n) best = { r, c, n }; }));
    return { rows, cols, cells, rowTot, colTot, max, best };
  }, [analytics.works, cross.cols]);
  const colLabel = (c) => cross.cols === 'decada' ? `${c}s` : cross.cols === 'status' ? MB_STATUS_SHORT[c] : (c === '0' ? 'Sem nota' : `${c}★`);

  // ---------- números do mosaico ----------
  const pctDone = analytics.totalWorks ? Math.round((analytics.concluidos / analytics.totalWorks) * 100) : 0;
  const pctBack = analytics.totalWorks ? Math.round((analytics.backlog / analytics.totalWorks) * 100) : 0;
  const avgRating = analytics.ratedCount ? analytics.sumRatings / analytics.ratedCount : 0;
  const nWorks = useCountUp(analytics.totalWorks);
  const nDone = useCountUp(analytics.concluidos);
  const nBack = useCountUp(analytics.backlog);
  const nAvg = useCountUp(Math.round(avgRating * 10));

  // =====================================
  // VISÃO GERAL
  // =====================================
  const renderVisao = () => {
    const types = Object.entries(analytics.typeStats).map(([label, s]) => ({ label, value: s.count, cat: s.cat, avg: s.rated ? s.sumRating / s.rated : 0 }));
    const rects = mbSquarify(types, 100, 70);
    const hovered = types.find(t => t.label === hoverTile);
    const cats = Object.entries(analytics.catStats).sort((a, b) => b[1] - a[1]);

    // linha do tempo
    const years = Object.keys(analytics.yearCat).map(Number).sort((a, b) => a - b);
    const full = years.length > 0 && (years[years.length - 1] - years[0]) <= 160;
    const yearList = years.length === 0 ? [] : full ? Array.from({ length: years[years.length - 1] - years[0] + 1 }, (_, i) => years[0] + i) : years;
    const yTotal = (y) => Object.values(analytics.yearCat[y] || {}).reduce((a, b) => a + b, 0);
    const yMax = Math.max(1, ...yearList.map(yTotal));
    const infoYear = hoverYear != null ? hoverYear : yearFocus;
    const focusWorks = yearFocus != null ? analytics.works.filter(w => w.yr === yearFocus) : [];

    const ratingCols = [5, 4, 3, 2, 1, 0];
    const maxRating = Math.max(1, ...ratingCols.map(r => analytics.ratingCounts[r] || 0));

    return (
      <div className="flex flex-col gap-4">
        {/* Mosaico de números */}
        <div className={`grid grid-cols-2 md:grid-cols-6 border-t-[2px] border-l-[2px] ${ink} ${darkMode ? 'shadow-[4px_4px_0px_rgba(209,213,219,1)]' : 'shadow-[4px_4px_0px_rgba(0,0,0,1)]'}`}>
          <MTile darkMode={darkMode} className="col-span-2 md:col-span-3 md:row-span-2 min-h-[150px]" style={{ background: pal[0].hex, color: pal[0].fg }}>
            <span className="text-xs font-black">Obras únicas</span>
            <div>
              <div className="text-7xl sm:text-8xl font-black leading-none tracking-tighter tabular-nums">{nWorks}</div>
              <div className="text-[11px] font-bold mt-2 opacity-90">{analytics.totalRaw} itens físicos. Volumes da mesma obra contam como um só.</div>
            </div>
          </MTile>
          <MTile darkMode={darkMode} className="md:col-span-2" style={{ background: pal[1].hex, color: pal[1].fg }}>
            <span className="text-xs font-black">Concluídos</span>
            <div>
              <div className="text-4xl sm:text-5xl font-black leading-none tabular-nums">{nDone}</div>
              <div className="text-[11px] font-bold mt-1 opacity-90">{pctDone}% do acervo</div>
            </div>
          </MTile>
          <MTile darkMode={darkMode} className="md:col-span-1" style={{ background: pal[2].hex, color: pal[2].fg }}>
            <span className="text-xs font-black">Nota média</span>
            <div>
              <div className="text-4xl sm:text-5xl font-black leading-none tabular-nums">{analytics.ratedCount ? (nAvg / 10).toFixed(1) : '–'}</div>
              <div className="text-[11px] font-bold mt-1">{analytics.ratedCount} avaliadas</div>
            </div>
          </MTile>
          <MTile darkMode={darkMode} className={`col-span-2 md:col-span-3 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
            <span className="text-xs font-black">Backlog</span>
            <div className="flex items-end justify-between gap-3">
              <div className="text-4xl sm:text-5xl font-black leading-none tabular-nums">{nBack}</div>
              <div className="text-[11px] font-bold opacity-70 text-right">{pctBack}% ainda sem concluir.<br />Livros e games por status, discos e vídeos por nota.</div>
            </div>
          </MTile>
        </div>

        {/* Treemap do acervo */}
        <MCard title="O acervo por suporte" hint="A área de cada bloco é a quantidade de obras. Toque para filtrar."
          right={<span className="text-[10px] font-bold opacity-60 text-right leading-tight">Toque num bloco para filtrar</span>}>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cats.map(([cat, n]) => (
              <MChip darkMode={darkMode} key={cat} active={isOn('Categorias', cat)} swatch={catColor(cat).hex} onClick={() => toggleFilter('Categorias', cat)}>{cat} <span className="opacity-60">{n}</span></MChip>
            ))}
          </div>
          <div className={`relative w-full border-t-[2px] border-l-[2px] ${ink}`} style={{ aspectRatio: '10 / 7' }}>
            {rects.map(r => {
              const c = catColor(r.cat); const pw = r.w; const ph = r.h / 0.7;
              const on = isOn('Subtipos', r.label); const dim = hoverTile && hoverTile !== r.label;
              return (
                <button key={r.label} onClick={() => toggleFilter('Subtipos', r.label)} onMouseEnter={() => setHoverTile(r.label)} onMouseLeave={() => setHoverTile(null)} onFocus={() => setHoverTile(r.label)} onBlur={() => setHoverTile(null)}
                  aria-label={`${r.label}: ${r.value} obras`}
                  className={`absolute text-left overflow-hidden border-r-[2px] border-b-[2px] ${ink} p-1.5 sm:p-2 transition-[opacity,filter] duration-150 ${focusRing} focus-visible:z-10`}
                  style={{ left: `${r.x}%`, top: `${r.y / 0.7}%`, width: `${pw}%`, height: `${ph}%`, backgroundColor: c.hex, color: c.fg, opacity: dim ? 0.55 : 1, boxShadow: on ? `inset 0 0 0 4px ${darkMode ? '#030712' : '#ffffff'}` : 'none' }}>
                  {pw > 11 && ph > 13 && <div className="text-[10px] sm:text-xs font-black leading-tight truncate">{r.label}</div>}
                  {pw > 18 && ph > 26 && <div className="text-2xl sm:text-4xl font-black leading-none mt-1 tabular-nums">{r.value}</div>}
                  {pw > 11 && ph > 13 && !(pw > 18 && ph > 26) && <div className="text-[10px] font-black leading-none mt-0.5">{r.value}</div>}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] font-bold mt-3 min-h-[1.25rem] opacity-80">
            {hovered ? `${hovered.label} (${hovered.cat}): ${hovered.value} ${hovered.value === 1 ? 'obra' : 'obras'}, ${((hovered.value / analytics.totalWorks) * 100).toFixed(0)}% do acervo${hovered.avg ? `, nota média ${hovered.avg.toFixed(1)}` : ''}` : 'Passe o mouse sobre um bloco para ver os detalhes.'}
          </div>
        </MCard>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Status */}
          <MCard title="Situação das obras" hint="Toque para filtrar" className="md:col-span-3">
            <div className={`flex w-full h-8 border-[2px] ${ink} mb-4`}>
              {MB_STATUS_ORDER.filter(s => analytics.statusCounts[s]).map(s => (
                <button key={s} title={`${MB_STATUS_SHORT[s]}: ${analytics.statusCounts[s]}`} onClick={() => toggleFilter('Status', s)} className={`h-full border-r-[2px] last:border-r-0 ${ink} transition-[width] duration-700 ${focusRing}`} style={{ width: `${(analytics.statusCounts[s] / analytics.totalWorks) * 100}%`, backgroundColor: statusColor(s).hex, boxShadow: isOn('Status', s) ? `inset 0 0 0 3px ${darkMode ? '#030712' : '#ffffff'}` : 'none' }} />
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {MB_STATUS_ORDER.filter(s => analytics.statusCounts[s]).map(s => {
                const n = analytics.statusCounts[s];
                return (
                  <button key={s} onClick={() => toggleFilter('Status', s)} className={`flex items-center gap-3 text-left ${focusRing} ${isOn('Status', s) ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
                    <span className="w-24 text-[11px] font-black flex-shrink-0">{MB_STATUS_SHORT[s]}</span>
                    <div className="flex-1"><MBar pct={(n / analytics.totalWorks) * 100} hex={statusColor(s).hex} darkMode={darkMode} /></div>
                    <span className="w-16 text-right text-[11px] font-black tabular-nums">{n} <span className="opacity-50">{Math.round((n / analytics.totalWorks) * 100)}%</span></span>
                  </button>
                );
              })}
            </div>
          </MCard>

          {/* Notas */}
          <MCard title="Notas" hint="Toque numa coluna" className="md:col-span-2">
            <div className="flex items-end gap-2 h-36 flex-1">
              {ratingCols.map(r => {
                const n = analytics.ratingCounts[r] || 0;
                return (
                  <button key={r} disabled={!n} onClick={() => toggleFilter('Notas', r)} className={`flex-1 h-full flex flex-col justify-end items-center gap-1 group ${focusRing} disabled:cursor-default`} title={`${r === 0 ? 'Sem nota' : r + ' estrelas'}: ${n}`}>
                    <span className="text-[10px] font-black tabular-nums">{n || ''}</span>
                    <div className={`w-full border-[2px] ${ink} transition-[height] duration-700 ease-out ${n ? 'group-hover:opacity-80' : 'border-dashed opacity-30'}`} style={{ height: `${n ? Math.max(6, (n / maxRating) * 100) : 4}%`, backgroundColor: r === 0 ? pal[4].hex : (r >= 4 ? pal[0].hex : r === 3 ? pal[2].hex : pal[1].hex), boxShadow: isOn('Notas', r) ? `inset 0 0 0 3px ${darkMode ? '#030712' : '#ffffff'}` : 'none' }} />
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              {ratingCols.map(r => <span key={r} className="flex-1 text-center text-[10px] font-black">{r === 0 ? 'Sem' : `${r}★`}</span>)}
            </div>
          </MCard>
        </div>

        {/* Linha do tempo empilhada por categoria */}
        <MCard title="Ano de lançamento" hint="Cores por categoria. Toque numa barra para ver as obras.">
          {yearList.length === 0 ? <div className="text-xs font-bold opacity-60 py-6 text-center">Nenhuma obra com ano informado neste recorte.</div> : (
            <>
              <div className="text-[11px] font-bold min-h-[2.25rem] mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {infoYear != null ? (
                  <>
                    <span className="text-base font-black">{infoYear}</span>
                    <span>{yTotal(infoYear)} {yTotal(infoYear) === 1 ? 'obra' : 'obras'}</span>
                    {Object.entries(analytics.yearCat[infoYear] || {}).map(([cat, n]) => (
                      <span key={cat} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 border ${ink}`} style={{ backgroundColor: catColor(cat).hex }} />{cat} {n}</span>
                    ))}
                  </>
                ) : <span className="opacity-60">Passe o mouse ou toque numa barra.</span>}
              </div>
              <div className="overflow-x-auto scrollbar-hide pb-6">
                <div className={`relative flex items-end gap-px h-44 border-b-[2px] ${ink} min-w-full`} style={{ minWidth: `${yearList.length * 9}px` }} onMouseLeave={() => setHoverYear(null)}>
                  {yearList.map(y => {
                    const tot = yTotal(y); const cs = Object.entries(analytics.yearCat[y] || {});
                    return (
                      <button key={y} onMouseEnter={() => setHoverYear(y)} onClick={() => setYearFocus(yearFocus === y ? null : y)} aria-label={`${y}: ${tot} obras`}
                        className={`relative flex-1 min-w-[6px] h-full flex flex-col justify-end items-stretch ${focusRing} ${yearFocus === y ? 'bg-pink-500/20' : ''}`}>
                        <div className="flex flex-col-reverse transition-[height] duration-700 ease-out" style={{ height: `${(tot / yMax) * 100}%` }}>
                          {cs.map(([cat, n]) => <div key={cat} style={{ height: `${(n / tot) * 100}%`, backgroundColor: catColor(cat).hex }} className={`border-t ${darkMode ? 'border-gray-900' : 'border-white'}`} />)}
                        </div>
                        {y % 10 === 0 && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black whitespace-nowrap">{y}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {yearFocus != null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">Obras de {yearFocus} ({focusWorks.length})</span>
                    <button onClick={() => setYearFocus(null)} className={`text-[10px] font-black underline ${focusRing}`}>Fechar</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-hide">{focusWorks.map(w => <MWorkRow key={w.id} w={w} darkMode={darkMode} />)}</div>
                </div>
              )}
            </>
          )}
        </MCard>
      </div>
    );
  };

  // =====================================
  // CRUZAMENTOS
  // =====================================
  const renderCruzamentos = () => {
    const { rows, cols, cells, rowTot, colTot, max, best } = matrix;
    const sel = cross.cell; const selWorks = sel ? (cells[`${sel.r}||${sel.c}`] || []) : [];
    const applyCell = () => {
      if (!sel) return;
      setGlobalFilters(prev => ({ ...prev, Subtipos: [sel.r], ...(cross.cols === 'status' ? { Status: [sel.c] } : {}), ...(cross.cols === 'nota' ? { Notas: [Number(sel.c)] } : {}) }));
      setCross(c => ({ ...c, cell: null }));
    };
    return (
      <div className="flex flex-col gap-4">
        <MCard title="Suporte cruzado com…" hint="Cada célula é uma quantidade de obras">
          <MSeg darkMode={darkMode} value={cross.cols} onChange={(id) => setCross({ cols: id, cell: null })} options={[{ id: 'decada', label: 'Década' }, { id: 'status', label: 'Situação' }, { id: 'nota', label: 'Nota' }]} />
          {rows.length === 0 ? <div className="text-xs font-bold opacity-60 py-8 text-center">Sem dados para cruzar neste recorte.</div> : (
            <>
              <div className="overflow-x-auto scrollbar-hide mt-4">
                <table className="border-collapse w-full" style={{ minWidth: `${140 + cols.length * 52}px` }}>
                  <thead>
                    <tr>
                      <th className={`sticky left-0 z-10 ${darkMode ? 'bg-gray-900' : 'bg-white'}`} />
                      {cols.map(c => <th key={c} className="px-1 pb-1.5 text-[10px] font-black text-center whitespace-nowrap">{colLabel(c)}</th>)}
                      <th className="px-2 pb-1.5 text-[10px] font-black text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r}>
                        <th className={`sticky left-0 z-10 pr-2 py-0 text-left text-[11px] font-black whitespace-nowrap ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>{r}</th>
                        {cols.map(c => {
                          const n = (cells[`${r}||${c}`] || []).length; const a = n ? 0.15 + 0.85 * (n / max) : 0;
                          const isSel = sel && sel.r === r && sel.c === c;
                          return (
                            <td key={c} className={`border-[2px] ${ink} p-0`}>
                              <button disabled={!n} onClick={() => setCross(x => ({ ...x, cell: isSel ? null : { r, c } }))} aria-label={`${r}, ${colLabel(c)}: ${n}`}
                                className={`w-full h-10 text-[11px] font-black tabular-nums transition-colors ${focusRing} disabled:cursor-default`}
                                style={{ backgroundColor: n ? `rgba(8,145,178,${a})` : 'transparent', color: a > 0.5 ? '#ffffff' : 'inherit', boxShadow: isSel ? 'inset 0 0 0 4px #db2777' : 'none' }}>{n || ''}</button>
                            </td>
                          );
                        })}
                        <td className="pl-2 text-right text-[11px] font-black tabular-nums">{rowTot[r]}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th className={`sticky left-0 z-10 pt-1.5 text-left text-[10px] font-black ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>Total</th>
                      {cols.map(c => <td key={c} className="pt-1.5 text-center text-[10px] font-black tabular-nums">{colTot[c]}</td>)}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {best && best.n > 0 && <p className="text-[11px] font-bold opacity-80 mt-3">Maior concentração: {best.r} em {colLabel(best.c)}, com {best.n} {best.n === 1 ? 'obra' : 'obras'}.</p>}
            </>
          )}
        </MCard>

        {sel && (
          <MCard title={`${sel.r} em ${colLabel(sel.c)} (${selWorks.length})`}
            right={<div className="flex gap-2">
              {cross.cols !== 'decada' && <button onClick={applyCell} className={`px-2 py-1 border-[2px] text-[10px] font-black ${ink} ${darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white'} ${focusRing}`}>Filtrar o acervo</button>}
              <button onClick={() => setCross(x => ({ ...x, cell: null }))} className={`px-2 py-1 border-[2px] text-[10px] font-black ${ink} ${focusRing}`}>Fechar</button>
            </div>}>
            <div className="max-h-80 overflow-y-auto scrollbar-hide">{selWorks.map(w => <MWorkRow key={w.id} w={w} darkMode={darkMode} />)}</div>
          </MCard>
        )}
      </div>
    );
  };

  // =====================================
  // AUTORES E EDITORAS
  // =====================================
  const renderPessoas = () => {
    const isAut = peopleMode === 'autores';
    const q = peopleQuery.trim().toLowerCase();
    const list = Object.entries(analytics.people[peopleMode]).filter(([n]) => !q || n.toLowerCase().includes(q)).sort((a, b) => b[1].count - a[1].count).slice(0, 40);
    const maxVal = list.length ? list[0][1].count : 1;
    return (
      <MCard title={isAut ? 'Autores e artistas' : 'Editoras e gravadoras'} hint="Toque para abrir a ficha. As cores mostram as categorias de cada um.">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <MSeg darkMode={darkMode} value={peopleMode} onChange={(id) => { setPeopleMode(id); setPeopleQuery(''); }} options={[{ id: 'autores', label: 'Autores e artistas' }, { id: 'editoras', label: 'Editoras e gravadoras' }]} />
          <input value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} placeholder="Buscar nome" className={`flex-1 min-w-[140px] px-2 py-1.5 border-[2px] text-[11px] font-bold outline-none focus:border-cyan-600 ${darkMode ? 'bg-gray-800 border-gray-500 text-white' : 'bg-white border-gray-400 text-black'}`} />
        </div>
        {list.length === 0 ? <div className="text-xs font-bold opacity-60 py-8 text-center">Nenhum nome encontrado neste recorte.</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 max-h-[62vh] overflow-y-auto scrollbar-hide pr-1">
            {list.map(([name, d], i) => (
              <button key={name} onClick={() => setSelectedEntity({ type: peopleMode, name })} className={`text-left py-2 border-b ${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} ${focusRing}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="w-5 text-[10px] font-black opacity-40 tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-xs font-black truncate">{name}</span>
                  <span className="text-sm font-black tabular-nums">{d.count}</span>
                </div>
                <div className="pl-7">
                  <div className={`flex h-3 border-[2px] ${ink} overflow-hidden`} style={{ width: `${Math.max(8, (d.count / maxVal) * 100)}%` }}>
                    {Object.entries(d.cats).map(([cat, n]) => <div key={cat} style={{ width: `${(n / d.count) * 100}%`, backgroundColor: catColor(cat).hex }} />)}
                  </div>
                  <div className="text-[10px] font-bold opacity-60 mt-1">{d.concluidos} concluídos{d.ratedCount ? `, nota média ${(d.sumRating / d.ratedCount).toFixed(1)}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </MCard>
    );
  };

  const renderFicha = () => {
    const d = analytics.people[selectedEntity.type]?.[selectedEntity.name];
    const back = <button onClick={() => setSelectedEntity(null)} className={`p-2 border-[2px] ${ink} ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'} active:scale-95 ${focusRing}`} aria-label="Voltar"><ChevronLeft className="w-5 h-5" /></button>;
    if (!d) return <div className="flex flex-col gap-3">{back}<div className="text-xs font-bold opacity-60">Nenhum dado para este nome no recorte atual.</div></div>;
    const decs = {}; d.items.forEach(w => { if (w.decade != null) decs[w.decade] = (decs[w.decade] || 0) + 1; });
    const maxDec = Math.max(1, ...Object.values(decs));
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">{back}<h2 className="text-xl font-black tracking-tight truncate">{selectedEntity.name}</h2></div>
        <div className={`grid grid-cols-2 md:grid-cols-4 border-t-[2px] border-l-[2px] ${ink}`}>
          <MTile darkMode={darkMode} style={{ background: pal[0].hex, color: pal[0].fg }}><span className="text-[11px] font-black">Obras</span><div className="text-3xl font-black">{d.count}</div></MTile>
          <MTile darkMode={darkMode} style={{ background: pal[1].hex, color: pal[1].fg }}><span className="text-[11px] font-black">Concluídos</span><div className="text-3xl font-black">{d.concluidos}</div></MTile>
          <MTile darkMode={darkMode} style={{ background: pal[2].hex, color: pal[2].fg }}><span className="text-[11px] font-black">Nota média</span><div className="text-3xl font-black">{d.ratedCount ? (d.sumRating / d.ratedCount).toFixed(1) : '–'}</div></MTile>
          <MTile darkMode={darkMode} className={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}><span className="text-[11px] font-black">Backlog</span><div className="text-3xl font-black">{d.backlog}</div></MTile>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MCard title="Categorias">
            <div className="flex flex-col gap-2">{Object.entries(d.cats).map(([cat, n]) => (
              <div key={cat} className="flex items-center gap-3"><span className="w-20 text-[11px] font-black truncate">{cat}</span><div className="flex-1"><MBar pct={(n / d.count) * 100} hex={catColor(cat).hex} darkMode={darkMode} /></div><span className="w-6 text-right text-[11px] font-black tabular-nums">{n}</span></div>
            ))}</div>
          </MCard>
          <MCard title="Décadas">
            {Object.keys(decs).length === 0 ? <div className="text-xs font-bold opacity-60">Sem anos informados.</div> : (
              <div className="flex flex-col gap-2">{Object.entries(decs).sort((a, b) => a[0] - b[0]).map(([dec, n]) => (
                <div key={dec} className="flex items-center gap-3"><span className="w-12 text-[11px] font-black">{dec}s</span><div className="flex-1"><MBar pct={(n / maxDec) * 100} hex={pal[1].hex} darkMode={darkMode} /></div><span className="w-6 text-right text-[11px] font-black tabular-nums">{n}</span></div>
              ))}</div>
            )}
          </MCard>
        </div>
        <MCard title={`Obras (${d.items.length})`}>
          <div className="max-h-72 overflow-y-auto scrollbar-hide">{[...d.items].sort((a, b) => (b.yr || 0) - (a.yr || 0)).map(w => <MWorkRow key={w.id} w={w} darkMode={darkMode} />)}</div>
        </MCard>
      </div>
    );
  };

  // =====================================
  // PÁGINAS E TEMPO
  // =====================================
  const renderDimensoes = () => {
    const entries = Object.entries(analytics.metrics).filter(([, m]) => m.count > 0);
    const colorOf = { 'Páginas': pal[0], 'Faixas': pal[1], 'Minutos': pal[2], 'Horas': pal[3] };
    if (entries.length === 0) return <div className="text-xs font-bold opacity-60 py-10 text-center">Nenhuma obra com páginas, faixas ou tempo informados neste recorte.</div>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map(([label, m]) => {
          const c = colorOf[label];
          return (
            <MContainer key={label} darkMode={darkMode} className="flex flex-col min-w-0" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
              <div className={`p-3 sm:p-4 border-b-[2px] ${ink} flex items-end justify-between`} style={{ backgroundColor: c.hex, color: c.fg }}>
                <div><div className="text-xs font-black">{label}</div><div className="text-4xl font-black leading-none tabular-nums mt-1">{m.sum.toLocaleString('pt-BR')}</div></div>
                <div className="text-right text-[11px] font-bold leading-tight">média de {Math.round(m.sum / m.count).toLocaleString('pt-BR')}<br />em {m.count} {m.count === 1 ? 'obra' : 'obras'}</div>
              </div>
              <div className="p-3 sm:p-4 flex flex-col gap-2.5">
                <div className="text-[11px] font-black opacity-70">Maiores registros</div>
                {m.top.map((t, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-3 text-[11px] font-black"><span className="truncate">{t.name}</span><span className="tabular-nums">{t.val.toLocaleString('pt-BR')}</span></div>
                    <MBar pct={(t.val / m.max) * 100} hex={c.hex} darkMode={darkMode} className="h-2.5" />
                  </div>
                ))}
              </div>
            </MContainer>
          );
        })}
      </div>
    );
  };

  // =====================================
  // QUALIDADE E RECORDES
  // =====================================
  const renderQualidade = () => {
    const names = { title: 'Título', author_developer: 'Autor ou artista', year: 'Ano', publisher: 'Editora ou gravadora', type: 'Suporte', barcode: 'Código de barras', cover_url: 'Capa', pages_or_time: 'Páginas, faixas ou tempo' };
    const keys = Object.keys(names); const n = Math.max(1, analytics.totalWorks);
    const filled = keys.reduce((s, k) => s + analytics.fields[k], 0);
    const score = (filled / (n * keys.length)) * 100;
    const scoreColor = score > 80 ? pal[0].hex : score > 50 ? pal[2].hex : pal[1].hex;
    const R = 52; const C = 2 * Math.PI * R;
    const topCat = Object.entries(analytics.catStats).sort((a, b) => b[1] - a[1])[0];
    const topType = Object.entries(analytics.typeStats).sort((a, b) => b[1].count - a[1].count)[0];
    const topAut = Object.entries(analytics.people.autores).sort((a, b) => b[1].count - a[1].count)[0];
    const recs = [
      ['Obra mais antiga', analytics.oldest ? `${analytics.oldest.yr}: ${mbTitle(analytics.oldest)}` : '–'],
      ['Obra mais recente', analytics.newest ? `${analytics.newest.yr}: ${mbTitle(analytics.newest)}` : '–'],
      ['Categoria dominante', topCat ? `${topCat[0]} (${Math.round((topCat[1] / n) * 100)}%)` : '–'],
      ['Suporte dominante', topType ? `${topType[0]} (${Math.round((topType[1].count / n) * 100)}%)` : '–'],
      ['Autor ou artista mais presente', topAut ? `${topAut[0]} (${topAut[1].count})` : '–'],
    ];
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MCard title="Completude dos dados" hint="Campos preenchidos por obra">
          <div className="flex items-center gap-5 mb-5">
            <svg viewBox="0 0 120 120" className="w-28 h-28 flex-shrink-0 -rotate-90" role="img" aria-label={`Completude ${score.toFixed(0)}%`}>
              <circle cx="60" cy="60" r={R} fill="none" stroke={darkMode ? '#374151' : '#e5e7eb'} strokeWidth="14" />
              <circle cx="60" cy="60" r={R} fill="none" stroke={scoreColor} strokeWidth="14" strokeDasharray={`${(score / 100) * C} ${C}`} className="transition-[stroke-dasharray] duration-1000" />
            </svg>
            <div>
              <div className="text-5xl font-black leading-none tabular-nums">{score.toFixed(0)}%</div>
              <div className="text-[11px] font-bold opacity-70 mt-2">{filled} de {n * keys.length} campos preenchidos</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {keys.map(k => {
              const pct = (analytics.fields[k] / n) * 100;
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-36 text-[11px] font-black truncate">{names[k]}</span>
                  <div className="flex-1"><MBar pct={pct} hex={pct > 80 ? pal[0].hex : pct > 50 ? pal[2].hex : pal[1].hex} darkMode={darkMode} className="h-2.5" /></div>
                  <span className="w-9 text-right text-[11px] font-black tabular-nums">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
        </MCard>
        <MCard title="Recordes e perfil do acervo">
          <div className="flex flex-col">
            {recs.map(([k, v]) => (
              <div key={k} className={`flex items-baseline justify-between gap-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className="text-[11px] font-bold opacity-60 flex-shrink-0">{k}</span>
                <span className="text-xs font-black text-right truncate">{v}</span>
              </div>
            ))}
          </div>
        </MCard>
      </div>
    );
  };

  // =====================================
  // ESTRUTURA
  // =====================================
  const tabs = [
    { id: 'visao', label: 'Visão geral' },
    { id: 'cruzamentos', label: 'Cruzamentos' },
    { id: 'pessoas', label: 'Autores e editoras' },
    { id: 'dimensoes', label: 'Páginas e tempo' },
    { id: 'qualidade', label: 'Qualidade' }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden pb-10 max-w-6xl mx-auto w-full relative">
      {/* Filtros ativos */}
      {activeChips.length > 0 && (
        <div className={`mb-3 p-2 border-[2px] flex flex-wrap items-center gap-2 flex-shrink-0 ${darkMode ? 'border-pink-500 bg-pink-900/30 text-pink-100' : 'border-pink-600 bg-pink-50 text-pink-900'}`}>
          <FilterIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-[11px] font-black">Recorte ativo</span>
          {activeChips.map(({ g, v }) => (
            <button key={`${g}-${v}`} onClick={() => toggleFilter(g, v)} title="Remover este filtro" className={`flex items-center gap-1 px-2 py-0.5 border-[2px] border-current text-[10px] font-black ${darkMode ? 'bg-gray-900' : 'bg-white'} ${focusRing}`}>{g === 'Notas' ? `${v}★` : (MB_STATUS_SHORT[v] || v)} <XIcon className="w-3 h-3" /></button>
          ))}
          <button onClick={clearFilters} className={`ml-auto px-2 py-0.5 border-[2px] border-current text-[10px] font-black ${darkMode ? 'bg-gray-900' : 'bg-white'} ${focusRing}`}>Limpar tudo</button>
        </div>
      )}

      {!selectedEntity && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSub(t.id)} className={`px-4 py-2 border-[2px] text-[11px] font-black whitespace-nowrap transition-colors ${focusRing} ${sub === t.id ? `bg-cyan-600 text-white ${ink} ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)]'}` : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white' : 'bg-white border-gray-300 text-gray-600 hover:text-black')}`}>{t.label}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 pb-10">
        {analytics.totalRaw === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Ghost className="w-12 h-12 opacity-50" />
            <span className="text-sm font-black">Nenhuma obra neste recorte.</span>
            {activeChips.length > 0 ? <button onClick={clearFilters} className={`px-3 py-2 border-[2px] text-xs font-black ${ink} ${darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white'} ${focusRing}`}>Limpar filtros</button> : <span className="text-[11px] font-bold opacity-60">Adicione itens na aba Adicionar.</span>}
          </div>
        ) : selectedEntity ? renderFicha() : (
          <>
            {sub === 'visao' && renderVisao()}
            {sub === 'cruzamentos' && renderCruzamentos()}
            {sub === 'pessoas' && renderPessoas()}
            {sub === 'dimensoes' && renderDimensoes()}
            {sub === 'qualidade' && renderQualidade()}
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
    if (!newSubclass.name || !newSubclass.code) { onShowToast('error'); return; }
    const updatedCats = { ...activeCategories }; if (!updatedCats[newSubclass.parent]) updatedCats[newSubclass.parent] = [];
    if (!updatedCats[newSubclass.parent].includes(newSubclass.name.trim())) updatedCats[newSubclass.parent] = [...updatedCats[newSubclass.parent], newSubclass.name.trim()];
    setSettings({ ...settings, userCategories: updatedCats, userClassCodes: { ...activeClassCodes, [newSubclass.name.trim()]: newSubclass.code.trim() } });
    setNewSubclass({ parent: 'Livros', name: '', code: '' }); playChipBeep('save'); onShowToast('success');
  };

  const handleAddAlias = () => {
    if (!newAlias.main || !newAlias.alias) { onShowToast('error'); return; }
    const updatedAliases = [...(settings?.artistAliases || []), { main: newAlias.main.trim(), alias: newAlias.alias.trim() }];
    setSettings({ ...settings, artistAliases: updatedAliases }); setNewAlias({ main: '', alias: '' }); playChipBeep('save'); onShowToast('success');
  };
  const handleRemoveAlias = (index) => {
    const updatedAliases = [...(settings?.artistAliases || [])]; updatedAliases.splice(index, 1);
    setSettings({ ...settings, artistAliases: updatedAliases }); playChipBeep('save'); onShowToast('success');
  };

  const toggleSection = (s) => { setOpenSection(openSection === s ? null : s); };

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
  const [aiBoxMessage, setAiBoxMessage] = useState(null);
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
  const clearGlobalFilters = () => { setGlobalFilters({ Categorias: [], Subtipos: [], Status: [], Notas: [], Autores: [], Editoras: [] }); setLibraryPage(0); };

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
      const b64 = (await resizeImageForAPI(file, 600)).split(',')[1];
      const promptInstructions = `Aja rápido. Leia o disco/capa. Retorne EXCLUSIVAMENTE um JSON:
{
  "type": "Escolha APENAS uma: ${allTypes.join(', ')}",
  "title": "Título Principal",
  "author_developer": "Artista",
  "year": "Ano",
  "publisher": "Gravadora",
  "pages_or_time": "Total faixas (se visível)",
  "barcode": "Código de catálogo EXATO (NÃO remova espaços ou hífens. Ex: BKL 21)",
  "description": ""
}
MANTENHA espaços e hífens originais no código ('barcode'). Sem formatações textuais, só JSON puro.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [ { text: promptInstructions }, { inlineData: { mimeType: "image/jpeg", data: b64 } } ] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1 } })
      });

      if (!res.ok) {
         if (res.status === 429) throw new Error("Cota da IA excedida (Aguarde alguns minutos e tente novamente).");
         if (res.status === 400) throw new Error("Imagem inválida ou formato não suportado.");
         if (res.status === 403) throw new Error("Sua chave da API do Gemini é inválida ou expirou.");
         if (res.status === 503) throw new Error("ERRO_503");
         throw new Error(`Erro de Servidor na IA (${res.status}).`);
      }
      
      const data = await res.json(); let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Retorno vazio.");
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim(); text = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);

      setScannedAIData(JSON.parse(text)); setAiBoxState('success'); setAiBoxMessage('Extraído com sucesso da imagem!'); playChipBeep('save'); showToast('success');
    } catch (e) {
      setAiBoxState('error');
      let msg = e.message;
      if (msg === "ERRO_503") {
          setAiBoxMessage(<span>A IA falhou (Erro 503 - Servidor Ocupado). O Google está com tráfego alto, aguarde e tente de novo. <a href="https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Status/503" target="_blank" rel="noopener noreferrer" className="underline font-bold opacity-80 hover:opacity-100">O que é Erro 503?</a></span>);
      } else if (msg.includes("JSON") || msg.includes("Unexpected token") || msg.includes("is not valid JSON") || msg.includes("Retorno vazio")) {
          setAiBoxMessage("Erro de Leitura: A IA falhou ao formatar os dados ou a imagem estava muito confusa. Tente tirar outra foto mais nítida.");
      } else if (msg.includes("Failed to fetch")) {
          setAiBoxMessage("Erro de Conexão: Verifique sua internet ou a disponibilidade da API do Gemini.");
      } else {
          setAiBoxMessage(msg);
      }
      playChipBeep('error'); showToast('error');
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
    } else { setIsFetchingCloud(false); setInitialLoadDone(true); setIsLoaded(true); playLydianSuccess(); }

    // Navegadores só liberam áudio após um toque: se a fanfarra foi bloqueada, toca no primeiro toque
    const unlockAudio = () => {
      initAudio();
      if (audioCtx && audioCtx.state !== 'running' && !window.__mbStartupPlayed) { window.__mbStartupPlayed = true; playLydianSuccess(); }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });

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
  const handleLfmClick = () => { if (!isLfmLongPress.current) { setLfmStatIdx(p => (p + 1) % LFM_STATS.length); } };

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
  const shuffleSuggestion = () => { const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type)); if (ms.length > 0) { let ns = ms[Math.floor(Math.random() * ms.length)]; if (ms.length > 1 && suggestion) { while (ns.id === suggestion?.id) ns = ms[Math.floor(Math.random() * ms.length)]; } setSuggestion(ns); } };
  const suggPressTimer = useRef(null); const isSuggLongPress = useRef(false);
  const handleSuggPressStart = () => { isSuggLongPress.current = false; suggPressTimer.current = setTimeout(() => { isSuggLongPress.current = true; shuffleSuggestion(); }, 500); };
  const handleSuggPressEnd = () => { if (suggPressTimer.current) clearTimeout(suggPressTimer.current); };
  const handleSuggClick = () => { if (!isSuggLongPress.current && suggestion) { window.open(`https://open.spotify.com/search/${encodeURIComponent((suggestion.title || '') + ' ' + (suggestion.author_developer || ''))}`, '_blank'); } };

  const pressTimer = useRef(null); const isLongPress = useRef(false);
  const handleAddPressStart = () => { isLongPress.current = false; pressTimer.current = setTimeout(() => { isLongPress.current = true; triggerGlobalAI(); }, 500); };
  const handleAddPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleAddClick = () => { if (!isLongPress.current) { setAddMode('barcode'); setActiveTab('add'); } };

  const libPressTimer = useRef(null); const isLibLongPress = useRef(false);
  const handleLibPressStart = () => { isLibLongPress.current = false; libPressTimer.current = setTimeout(() => { isLibLongPress.current = true; clearGlobalFilters(); setActiveTab('library'); }, 500); };
  const handleLibPressEnd = () => { if (libPressTimer.current) clearTimeout(libPressTimer.current); };
  const handleLibClick = () => { if (!isLibLongPress.current) { setActiveTab('library'); } };

  const dashPressTimer = useRef(null); const isDashLongPress = useRef(false);
  const handleDashPressStart = () => { isDashLongPress.current = false; dashPressTimer.current = setTimeout(() => { isDashLongPress.current = true; clearGlobalFilters(); setActiveTab('dashboard'); }, 500); };
  const handleDashPressEnd = () => { if (dashPressTimer.current) clearTimeout(dashPressTimer.current); };
  const handleDashClick = () => { if (!isDashLongPress.current) { setActiveTab('dashboard'); } };

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
                  <div className={`p-4 border-b-[2px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}><button onClick={() => { setIsFilterMenuOpen(false); }} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button><span className="text-[12px] font-black uppercase tracking-widest">Filtro Global</span><div className="w-7"/></div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* CATEGORIAS */}
                    <div className={`p-4 border-b-[2px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">Categorias Principais</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(activeCategories).map(cat => {
                          const isActive = globalFilters.Categorias && globalFilters.Categorias.includes(cat);
                          return (
                          <label key={cat} className={`flex items-center gap-2 p-2 border-[2px] cursor-pointer transition-colors ${isActive ? (darkMode?'border-cyan-400 bg-cyan-900/30':'border-cyan-600 bg-cyan-50') : (darkMode?'border-gray-700':'border-gray-300')} text-[10px] font-black uppercase`}>
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { handleGlobalCheckboxChange('Categorias', cat); }} /> {cat}
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
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { handleGlobalCheckboxChange('Subtipos', sub); }} /> {sub}
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
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { handleGlobalCheckboxChange('Status', st); }} /> {st}
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
                            <input type="checkbox" className="hidden" checked={isActive} onChange={() => { handleGlobalCheckboxChange('Notas', nt); }} /> {nt===0?'Sem Nota':`${nt}★`}
                          </label>
                        )})}
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 border-t-[2px] flex gap-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <MButton onClick={clearGlobalFilters} variant="white" darkMode={darkMode} className="flex-1 py-4 text-[10px]">Limpar</MButton>
                      <MButton onClick={() => { setIsFilterMenuOpen(false); }} variant="black" darkMode={darkMode} className="flex-[2] py-4 text-[10px]">Ver {processedItems.length} Itens</MButton>
                  </div>
              </div>
          </div>
      )}

      {isSortMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex flex-col justify-end sm:justify-center items-center sm:p-4 animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md flex flex-col border-t-[2px] sm:border-[2px] max-h-[85vh] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[6px_6px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`p-4 border-b-[2px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}><button onClick={() => { setIsSortMenuOpen(false); }} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button><span className="text-[12px] font-black uppercase tracking-widest">Ordenação Global</span><div className="w-7"/></div>
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                      <div className="mb-6">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ordem</div>
                          <div className={`border-[2px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <MRadio label="↑ Ascendente" checked={sortOrder==='asc'} onChange={()=>{ setSortOrder('asc'); }} darkMode={darkMode} />
                              <MRadio label="↓ Descendente" checked={sortOrder==='desc'} onChange={()=>{ setSortOrder('desc'); }} darkMode={darkMode} />
                          </div>
                      </div>
                      <div>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ordenar por</div>
                          <div className={`border-[2px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <MRadio label="Artista / Autor" checked={sortBy==='author'} onChange={()=>{ setSortBy('author'); }} darkMode={darkMode} />
                              <MRadio label="Ano" checked={sortBy==='year'} onChange={()=>{ setSortBy('year'); }} darkMode={darkMode} />
                              <MRadio label="Título" checked={sortBy==='title'} onChange={()=>{ setSortBy('title'); }} darkMode={darkMode} />
                              <MRadio label="Data Adicionada" checked={sortBy==='added'} onChange={()=>{ setSortBy('added'); }} darkMode={darkMode} />
                              <MRadio label="Formato" checked={sortBy==='type'} onChange={()=>{ setSortBy('type'); }} darkMode={darkMode} />
                          </div>
                      </div>
                  </div>
                  <div className={`p-4 border-t-[2px] ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <MButton darkMode={darkMode} variant="pink" onClick={() => { setIsSortMenuOpen(false); }} className="w-full py-4 text-[10px]">Aplicar Ordenação</MButton>
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
              <button onClick={() => { setActiveTab('settings'); }} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white border-l-[4px] border-gray-400' : 'bg-gray-200 border-l-[4px] border-black') : 'border-l-[4px] border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
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
                      {searchTerm && (<button onClick={() => { setSearchTerm(''); setLibraryPage(0);}} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 active:scale-90"><XIcon className="w-4 h-4" /></button>)}
                  </div>
                  <button onClick={() => { setIsFilterMenuOpen(true); }} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[2px] transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none relative ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`} title="Filtros Globais">
                      <FilterIcon className="w-4 h-4" />
                      {activeFiltersCount > 0 && (<div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-[2px] flex items-center justify-center text-[8px] font-black ${darkMode ? 'bg-pink-600 border-gray-900 text-white' : 'bg-pink-600 border-white text-white'}`}>{activeFiltersCount}</div>)}
                  </button>
                  <button onClick={() => { setIsSortMenuOpen(true); }} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[2px] transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none relative ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`} title="Ordenação Global">
                      {sortOrder === 'asc' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </button>
                  {activeTab === 'library' && (
                    <select value={alphaFilter} onChange={e => { setAlphaFilter(e.target.value); setLibraryPage(0); }} className={`w-12 sm:w-14 h-10 p-0 text-center text-[10px] font-black uppercase tracking-widest border-[2px] outline-none cursor-pointer flex-shrink-0 ${darkMode ? 'border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'}`}>
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
            <button onClick={() => { setActiveTab('settings'); }} className={`flex-1 flex flex-col items-center justify-center transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black') : ''}`}>
              <Settings className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Ajustes</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
