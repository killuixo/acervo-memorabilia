import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// CONFIGURAÇÕES DO APLICATIVO E ARQUIVOLOGIA
// ==========================================
const LINK_DO_ICONE_NO_GITHUB = "https://raw.githubusercontent.com/killuixo/acervo-memorabilia/main/icon-192.png";
const GEMINI_MODEL = "gemini-1.5-flash"; // Nome exato do modelo (sempre em minúsculo)

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
  } catch (e) { 
    console.warn("Áudio não suportado", e); 
  }
};

const playLydianSuccess = () => {
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    
    const now = audioCtx.currentTime;
    const notes = [523.25, 587.33, 659.25, 739.99, 783.99, 880.00]; 
    const dur = 0.04; 
    
    notes.forEach((freq, i) => osc.frequency.setValueAtTime(freq, now + i * dur));
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.setValueAtTime(0.04, now + notes.length * dur - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + notes.length * dur);
    
    osc.start(now); 
    osc.stop(now + notes.length * dur);
  } catch (e) {}
};

const playChipBeep = (type) => {
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    const vol = 0.02; 
    
    if (type === 'save' || type === 'success') {
      osc.type = 'square'; 
      osc.frequency.setValueAtTime(440, now); 
      osc.frequency.setValueAtTime(554.37, now + 0.05); 
      gain.gain.setValueAtTime(vol, now); 
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now); 
      osc.stop(now + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(150, now); 
      osc.frequency.setValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(vol, now); 
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); 
      osc.stop(now + 0.2);
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

const parseItemIdToDate = (idStr) => {
    if (!idStr) return new Date(0);
    const parts = String(idStr).split('-');
    if (parts.length < 2) return new Date(0);
    const datePart = parts[0]; 
    if (datePart.length !== 8) return new Date(0);
    
    const y = parseInt(datePart.substring(0, 4), 10);
    const m = parseInt(datePart.substring(4, 6), 10) - 1; 
    const d = parseInt(datePart.substring(6, 8), 10);
    return new Date(y, m, d);
};

const reindexCollection = (currentItems) => {
  const sorted = [...currentItems].sort((a, b) => {
     const timeA = String(a.id || '').substring(0, 18);
     const timeB = String(b.id || '').substring(0, 18);
     return timeA.localeCompare(timeB);
  });

  const classCodeCounters = {};
  let globalCounter = 1;

  const reindexed = sorted.map(item => {
     const idParts = String(item.id || '').split('-');
     let newId = item.id;
     if (idParts.length >= 2) {
         const timePrefix = idParts.slice(0, 2).join('-');
         newId = `${timePrefix}-${String(globalCounter).padStart(4, '0')}`;
     }

     let newArchiveCode = item.archive_code;
     if (item.archive_code) {
         const archParts = String(item.archive_code).split('-');
         if (archParts.length >= 3) {
             const prefix = archParts[0];
             const classCode = archParts[1];
             classCodeCounters[classCode] = (classCodeCounters[classCode] || 0) + 1;
             newArchiveCode = `${prefix}-${classCode}-${String(classCodeCounters[classCode]).padStart(4, '0')}`;
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
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image(); 
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth; 
        canvas.height = img.height * (maxWidth / img.width);
        const ctx = canvas.getContext('2d'); 
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const parseCSVText = (rawText) => {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let inQuotes = false; let val = '';
  
  for (let i = 0; i < text.length; i++) {
    let char = text[i]; let nextChar = text[i + 1];
    if (char === '"' && inQuotes && nextChar === '"') { 
      val += '"'; i++; 
    } else if (char === '"') { 
      inQuotes = !inQuotes; 
    } else if (char === ',' && !inQuotes) { 
      row.push(val); val = ''; 
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(val); rows.push(row); row = []; val = '';
    } else { 
      val += char; 
    }
  }
  if (val !== '' || row.length > 0) { 
    row.push(val); rows.push(row); 
  }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
};

const normalizeWorkTitle = title => title ? String(title).toLowerCase().replace(/(?:\s*[:-]\s*|\s+)(?:vol\.?|volume|livro|book|edição|ed\.?|pt\.?|part|parte|#)?\s*\d+(?:\.\d+)?$/i, '').trim() : '';
const getSortableName = name => name ? String(name).trim().replace(/^(the|a|an|o|os|as)\s+/i, '') : '';
const isVariousArtists = name => {
  const n = String(name || '').toLowerCase().trim();
  return ['various', 'vários', 'varios', 'variados', 'coleção', 'coleções', 'colecoes', 'collection', 'compilação', 'compilações'].some(k => n.includes(k));
};
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
  return { label: 'Und', desc: 'Métrica' };
};

const isImageBroken = (url) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return resolve(true);
    const img = new Image();
    img.onload = () => resolve(false);
    img.onerror = () => resolve(true);
    img.src = url;
  });
};

const fetchCoverBySearch = async (item, settings, activeCategories) => {
  const titleRaw = item.title ? item.title.trim() : '';
  const authorRaw = item.author_developer ? item.author_developer.trim() : '';
  const typeRaw = item.type ? item.type.trim() : '';
  const yearRaw = item.year ? String(item.year).trim() : '';
  const pubRaw = item.publisher ? item.publisher.trim() : '';
  const barcodeRaw = item.barcode ? item.barcode.replace(/[-\s]/g, "") : '';

  const qTitle = encodeURIComponent(titleRaw);
  const qAuthor = encodeURIComponent(authorRaw);
  const qPub = encodeURIComponent(pubRaw);

  const isBook = (activeCategories['Livros'] || []).includes(typeRaw);
  const isDisc = (activeCategories['Discos'] || []).includes(typeRaw);
  const isGame = (activeCategories['Games'] || []).includes(typeRaw);
  const isVideo = (activeCategories['Vídeo'] || []).includes(typeRaw);

  // 1. CÓDIGO DE BARRAS / ISBN (Busca mais exata e fiel possível)
  if (barcodeRaw) {
     try {
        const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcodeRaw}`);
        const upcData = await upcRes.json();
        if (upcData.items?.[0]?.images?.[0]) return upcData.items[0].images[0];
     } catch(e) {}

     if (isBook) {
        try {
           const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcodeRaw}`);
           const gbData = await gbRes.json();
           if (gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
               return gbData.items[0].volumeInfo.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3");
           }
        } catch(e) {}
        try {
           const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcodeRaw}&jscmd=data&format=json`);
           const olData = await olRes.json();
           const olKey = `ISBN:${barcodeRaw}`;
           if (olData[olKey]?.cover?.large) return olData[olKey].cover.large;
        } catch(e) {}
     }
     
     if (isDisc && settings?.discogsToken) {
        try {
           const dcRes = await fetch(`https://api.discogs.com/database/search?barcode=${barcodeRaw}&token=${settings.discogsToken}`);
           const dcData = await dcRes.json();
           if (dcData.results?.[0]?.cover_image && !dcData.results[0].cover_image.includes('spacer.gif')) {
               return dcData.results[0].cover_image;
           }
        } catch(e) {}
     }
  }

  // 2. DISCOS (Música) - Refinado por Gravadora, Formato e Ano
  if (isDisc) {
    if (settings?.discogsToken) {
      try {
        let formatQuery = '';
        const tLower = typeRaw.toLowerCase();
        if (tLower.includes('vinil') || tLower.includes('lp')) formatQuery = '&format=vinyl';
        else if (tLower.includes('cd')) formatQuery = '&format=cd';
        else if (tLower.includes('cassete') || tLower.includes('fita')) formatQuery = '&format=cassette';

        let queryUrl = `https://api.discogs.com/database/search?release_title=${qTitle}&artist=${qAuthor}${formatQuery}&token=${settings.discogsToken}`;
        if (yearRaw) queryUrl += `&year=${yearRaw}`;
        if (pubRaw) queryUrl += `&label=${qPub}`;

        const dcRes = await fetch(queryUrl);
        const dcData = await dcRes.json();
        
        if (dcData.results?.[0]?.cover_image && !dcData.results[0].cover_image.includes('spacer.gif')) {
            return dcData.results[0].cover_image;
        }

        // Fallback: tenta sem a gravadora caso seja muito restritiva e falhe
        if (pubRaw) {
            const dcResFallback = await fetch(`https://api.discogs.com/database/search?release_title=${qTitle}&artist=${qAuthor}${formatQuery}&token=${settings.discogsToken}`);
            const dcDataFallback = await dcResFallback.json();
            if (dcDataFallback.results?.[0]?.cover_image && !dcDataFallback.results[0].cover_image.includes('spacer.gif')) {
                return dcDataFallback.results[0].cover_image;
            }
        }
      } catch(e) { console.warn("Discogs API err", e); }
    }

    try {
        let mbQuery = `release:${qTitle}`;
        if (authorRaw) mbQuery += ` AND artist:${qAuthor}`;
        if (pubRaw) mbQuery += ` AND label:${qPub}`;
        
        const mbRes = await fetch(`https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(mbQuery)}&fmt=json`);
        const mbData = await mbRes.json();
        
        if (mbData.releases?.length > 0) {
            let targetReleases = mbData.releases;
            // Força a prioridade na exatidão do Ano de Lançamento se disponível
            if (yearRaw) {
                const exactYearReleases = targetReleases.filter(r => r.date && r.date.startsWith(yearRaw));
                if (exactYearReleases.length > 0) targetReleases = exactYearReleases;
            }
            for (const release of targetReleases) {
                try {
                    const caaRes = await fetch(`https://coverartarchive.org/release/${release.id}/front`);
                    if (caaRes.ok) return caaRes.url; 
                } catch(e) {}
            }
        }
    } catch(e) { console.warn("MusicBrainz err", e); }
  }

  // 3. LIVROS (Busca Refinada por Editora e Ano)
  else if (isBook) {
    try {
        let gbQuery = `intitle:"${titleRaw}"`;
        if (authorRaw) gbQuery += `+inauthor:"${authorRaw}"`;
        
        // Tenta cruzar exato com a editora
        let gbQueryExact = pubRaw ? `${gbQuery}+inpublisher:"${pubRaw}"` : gbQuery;
        let gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbQueryExact)}&maxResults=10`);
        let gbData = await gbRes.json();
        
        // Se a busca com editora exata falhar, tenta só título e autor
        if ((!gbData.items || gbData.items.length === 0) && pubRaw) {
            gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbQuery)}&maxResults=10`);
            gbData = await gbRes.json();
        }
        
        if (gbData.items) {
            let bestMatch = null;
            // Prioridade 1: Mesmo Ano de Lançamento
            if (yearRaw) bestMatch = gbData.items.find(i => i.volumeInfo?.publishedDate?.startsWith(yearRaw) && i.volumeInfo?.imageLinks?.thumbnail);
            // Prioridade 2: Mesma Editora
            if (!bestMatch && pubRaw) bestMatch = gbData.items.find(i => i.volumeInfo?.publisher?.toLowerCase().includes(pubRaw.toLowerCase()) && i.volumeInfo?.imageLinks?.thumbnail);
            // Prioridade 3: O primeiro que tiver capa
            if (!bestMatch) bestMatch = gbData.items.find(i => i.volumeInfo?.imageLinks?.thumbnail);

            if (bestMatch?.volumeInfo?.imageLinks?.thumbnail) {
                return bestMatch.volumeInfo.imageLinks.thumbnail.replace("http://", "https://").replace("&zoom=1", "&zoom=3");
            }
        }
        
        // Fallback OpenLibrary
        let olQuery = `title=${qTitle}`;
        if (authorRaw) olQuery += `&author=${qAuthor}`;
        const olRes = await fetch(`https://openlibrary.org/search.json?${olQuery}`);
        const olData = await olRes.json();
        
        if (olData.docs?.length > 0) {
            let bestDoc = null;
            if (yearRaw || pubRaw) {
                bestDoc = olData.docs.find(d => 
                    ((yearRaw && (d.first_publish_year == yearRaw || (d.publish_year && d.publish_year.includes(parseInt(yearRaw))))) ||
                    (pubRaw && d.publisher && d.publisher.some(p => p.toLowerCase().includes(pubRaw.toLowerCase())))) && d.cover_i
                );
            }
            if (!bestDoc) bestDoc = olData.docs.find(d => d.cover_i);
            if (bestDoc?.cover_i) return `https://covers.openlibrary.org/b/id/${bestDoc.cover_i}-L.jpg`;
        }
    } catch(e) { console.warn("Books API err", e); }
  }

  // 4. GAMES (Foco na Plataforma Exata)
  else if (isGame) {
      try {
          const gameQuery = `${titleRaw} ${typeRaw} game cover`;
          const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(gameQuery)}&utf8=&format=json&origin=*`);
          const wikiData = await wikiRes.json();
          
          if (wikiData.query?.search?.length > 0) {
              // Tenta priorizar artigos que mencionem a plataforma no snippet ou título para isolar versões (ex: Mega Drive vs PS4)
              let bestResult = wikiData.query.search.find(s => 
                  s.title.toLowerCase().includes(typeRaw.toLowerCase()) || 
                  s.snippet.toLowerCase().includes(typeRaw.toLowerCase())
              );
              if (!bestResult) bestResult = wikiData.query.search[0];

              const title = bestResult.title;
              const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=800&format=json&origin=*`);
              const imgData = await imgRes.json();
              const pages = imgData.query?.pages;
              if (pages) {
                  const pageId = Object.keys(pages)[0];
                  if (pages[pageId]?.thumbnail?.source) return pages[pageId].thumbnail.source;
              }
          }
      } catch(e) { console.warn("Wikipedia Game err", e); }
  }

  // 5. VÍDEO (Filmes em DVD/VHS)
  else if (isVideo) {
      try {
          const itRes = await fetch(`https://itunes.apple.com/search?term=${qTitle}&media=movie&limit=10`);
          const itData = await itRes.json();
          if (itData.results?.length > 0) {
              let bestMovie = itData.results[0];
              // Restringe ao ano exato caso o filme possua diversos remakes (ex: Duna 1984 vs 2021)
              if (yearRaw) {
                  const exact = itData.results.find(m => m.releaseDate?.startsWith(yearRaw));
                  if (exact) bestMovie = exact;
              }
              if (bestMovie?.artworkUrl100) return bestMovie.artworkUrl100.replace('100x100bb', '600x600bb');
          }
      } catch (e) {}
  }

  return null;
};

// ==========================================
// ÍCONES NATIVOS SVG
// ==========================================
const Icon = ({ path, className = "w-6 h-6", onClick, fill = "none", style }) => (
  <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" className={className} style={style}>{path}</svg>
);
const KatamariIcon = ({ className = "w-6 h-6", glow = 0 }) => (
  <svg viewBox="0 0 100 100" className={className} style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px currentColor)` : 'none' }}>
    <g><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur="2.5s" repeatCount="indefinite" />
    <circle cx="50" cy="50" r="28" fill="#fbbf24" stroke="#fbbf24" strokeWidth="6" strokeDasharray="5 5" />
    <circle cx="50" cy="50" r="18" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="3 5" opacity="0.8"/>
    <g stroke="#22d3ee" strokeWidth="6" strokeLinecap="round"><line x1="50" y1="4" x2="50" y2="16" /><line x1="50" y1="96" x2="50" y2="84" /><line x1="4" y1="50" x2="16" y2="50" /><line x1="96" y1="50" x2="84" y2="50" /><line x1="17" y1="17" x2="26" y2="26" /><line x1="83" y1="83" x2="74" y2="74" /><line x1="17" y1="83" x2="26" y2="74" /><line x1="83" y1="17" x2="74" y2="26" /></g>
    <g stroke="#ec4899" strokeWidth="7" strokeLinecap="round"><line x1="50" y1="18" x2="50" y2="22" /><line x1="50" y1="82" x2="50" y2="78" /><line x1="18" y1="50" x2="22" y2="50" /><line x1="82" y1="50" x2="78" y2="50" /><line x1="28" y1="28" x2="32" y2="32" /><line x1="72" y1="72" x2="68" y2="68" /><line x1="28" y1="72" x2="32" y2="68" /><line x1="72" y1="28" x2="68" y2="32" /></g></g>
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


// ==========================================
// PWA ENGINE
// ==========================================
const usePWA = (iconUrl) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    const manifest = { 
      name: "Memorabilia", 
      short_name: "Memorabilia", 
      description: "Sua coleção física na palma da mão.", 
      start_url: ".", 
      display: "standalone", 
      background_color: "#ffffff", 
      theme_color: "#000000", 
      icons: [ 
        { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" }, 
        { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" } 
      ] 
    };
    
    const manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
    let manifestLink = document.querySelector('link[rel="manifest"]');
    
    if (!manifestLink) { 
      manifestLink = document.createElement('link'); 
      manifestLink.rel = 'manifest'; 
      document.head.appendChild(manifestLink); 
    }
    manifestLink.href = manifestUrl;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(URL.createObjectURL(new Blob([`self.addEventListener('fetch', (e) => {});`], { type: 'application/javascript' }))).catch(() => {});
    }
    
    const handlePrompt = (e) => { 
      e.preventDefault(); 
      setInstallPrompt(e); 
    };
    
    window.addEventListener('beforeinstallprompt', handlePrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, [iconUrl]);
  
  const promptInstall = async () => { 
    if (!installPrompt) return; 
    installPrompt.prompt(); 
    const { outcome } = await installPrompt.userChoice; 
    if (outcome === 'accepted') { 
      setInstallPrompt(null); 
      setIsInstalled(true); 
    } 
  };
  
  return { isInstallable: !!installPrompt, promptInstall, isInstalled };
};

// ==========================================
// COMPONENTES UI MONDRIAN
// ==========================================
const getChartColors = darkMode => darkMode ? ['#be185d', '#0e7490', '#d97706', '#b91c1c', '#7e22ce', '#15803d'] : ['#ec4899', '#22d3ee', '#fbbf24', '#f87171', '#a855f7', '#4ade80'];
const getMondrianColor = (index, darkMode) => darkMode ? ['bg-pink-800', 'bg-cyan-800', 'bg-amber-700', 'bg-gray-800'][index % 4] : ['bg-pink-500', 'bg-cyan-400', 'bg-amber-400', 'bg-white'][index % 4];

const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[4px] ${darkMode ? 'border-gray-300 shadow-[4px_4px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]'} ${colorClass} ${className} transition-colors duration-300`}>
    {children}
  </div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bg = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (['pink', 'red'].includes(variant)) bg = darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500 text-black';
  if (['cyan', 'blue'].includes(variant)) bg = darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black';
  if (['amber', 'yellow'].includes(variant)) bg = darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400 text-black';
  if (variant === 'black') bg = darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white';
  if (variant === 'light-cyan') bg = darkMode ? 'bg-cyan-900/50 text-cyan-200' : 'bg-cyan-100 text-cyan-900';
  if (variant === 'light-pink') bg = darkMode ? 'bg-pink-900/50 text-pink-200' : 'bg-pink-100 text-pink-900';
  
  return (
    <button 
      disabled={disabled} 
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[4px] ${darkMode ? 'border-gray-300 shadow-[4px_4px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]'} ${disabled ? 'opacity-50 shadow-none translate-y-1 translate-x-1' : 'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bg} ${className}`}
    >
      {icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, onBlur, type = "text", placeholder = "", multiline = false, darkMode, readOnly = false }) => (
  <div className="flex flex-col mb-3 w-full">
    {label && <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>{label}</label>}
    {multiline ? (
      <textarea 
        readOnly={readOnly} 
        value={value} 
        onChange={onChange} 
        onBlur={onBlur} 
        placeholder={placeholder} 
        className={`w-full p-2 border-[4px] ${darkMode ? 'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-amber-100 dark:focus:bg-amber-900'} transition-colors min-h-[80px] resize-none`} 
      />
    ) : (
      <input 
        readOnly={readOnly} 
        type={type} 
        value={value} 
        onChange={onChange} 
        onBlur={onBlur} 
        placeholder={placeholder} 
        className={`w-full p-2 border-[4px] ${darkMode ? 'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-cyan-100 dark:focus:bg-cyan-900'} transition-colors`} 
      />
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

const MondrianHBar = ({ label, value, max, index, darkMode, valueFormatter = (v)=>v }) => (
  <div className="flex items-center gap-2 w-full mb-2">
    <div className="w-16 text-[9px] font-black uppercase tracking-widest truncate" title={label}>{label}</div>
    <div className={`flex-1 h-5 border-[3px] ${darkMode ? 'bg-gray-800 border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-gray-200 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} flex relative overflow-hidden`}>
      <div className={`h-full transition-all duration-1000 ${getMondrianColor(index, darkMode)}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      <span className={`absolute inset-0 flex items-center ml-2 text-[10px] font-black ${darkMode ? 'text-white' : 'text-black'} drop-shadow-md`}>{valueFormatter(value)}</span>
    </div>
  </div>
);

const MondrianDonutChart = ({ title, data, darkMode }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) return null;
  let currentAngle = 0;
  
  const grad = data.map(item => { 
    const p = (item.value / total) * 100; 
    const s = currentAngle; 
    const e = currentAngle + p; 
    currentAngle = e; 
    return `${item.colorHex} ${s}% ${e}%`; 
  }).join(', ');
  
  return (
    <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center h-full w-full" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
      <div className={`text-[10px] font-black uppercase tracking-widest mb-4 w-full border-b-[4px] pb-2 text-center ${darkMode ? 'border-gray-300' : 'border-black'}`}>{title}</div>
      <div className={`relative w-24 h-24 rounded-full border-[4px] flex-shrink-0 ${darkMode ? 'border-gray-300 shadow-[4px_4px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]'}`} style={{ background: `conic-gradient(${grad})` }}>
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

const syncItemToSheets = (itemToSync, googleSheetsUrl) => {
  if (googleSheetsUrl) {
    fetch(googleSheetsUrl, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(itemToSync) 
    }).catch(e => console.error("Erro Google Sheets:", e));
  }
};

const syncDeleteToSheets = (deletedId, googleSheetsUrl) => {
  if (googleSheetsUrl) {
    fetch(googleSheetsUrl, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ _action: 'delete', id: deletedId }) 
    }).catch(e => console.error("Erro Google Sheets:", e));
  }
};

// ==========================================
// FUNÇÕES DE CLASSIFICAÇÃO PARA FILTROS
// ==========================================
const getAddedBucket = (itemDate) => {
    const now = new Date();
    const diffTime = Math.abs(now - itemDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'Hoje';
    if (diffDays <= 7) return 'Últimos 7 Dias';
    if (diffDays <= 30) return 'Este Mês';
    if (itemDate.getFullYear() === now.getFullYear()) return 'Este Ano';
    return 'Mais Antigos';
};

const getYearBucket = (yearVal) => {
    const y = parseInt(yearVal, 10);
    if (isNaN(y)) return 'Sem Ano';
    if (y >= 2020) return 'Anos 2020';
    if (y >= 2010) return 'Anos 2010';
    if (y >= 2000) return 'Anos 2000';
    if (y >= 1990) return 'Anos 1990';
    return 'Antes de 1990';
};

const getPagesBucket = (pagesVal) => {
    const p = parseInt(pagesVal, 10);
    if (isNaN(p) || p === 0) return 'Nenhum / Não Informado';
    if (p <= 50) return 'Mínimo (1-50)';
    if (p <= 150) return 'Mínimo Médio (51-150)';
    if (p <= 300) return 'Médio (151-300)';
    if (p <= 600) return 'Máximo Médio (301-600)';
    return 'Máximo (601+)';
};

// ==========================================
// ABAS DA APLICAÇÃO
// ==========================================

const LibraryTab = ({ items, setItems, darkMode, settings, onShowToast, activeCategories }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const [page, setPage] = useState(0);
  
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const itemsPerPage = 12; 

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

  const pressTimer = useRef(null); 
  const isLongPress = useRef(false);

  const toggleSection = (section) => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (category, value) => {
      setPendingFilters(prev => {
          const currentList = prev[category];
          if (currentList.includes(value)) {
              return { ...prev, [category]: currentList.filter(item => item !== value) };
          } else {
              return { ...prev, [category]: [...currentList, value] };
          }
      });
  };

  const applyFilters = () => {
      setActiveFilters(pendingFilters);
      setIsFilterMenuOpen(false);
      setPage(0);
  };

  const clearFilters = () => {
      const empty = { Adicionado: [], Suporte: [], Ano: [], Nota: [], 'Páginas/Faixa': [] };
      setPendingFilters(empty);
      setActiveFilters(empty);
      setPage(0);
  };

  const applySort = () => {
      setSortBy(pendingSortBy);
      setSortOrder(pendingSortOrder);
      setIsSortMenuOpen(false);
      setPage(0);
  };

  const baseFilteredItems = useMemo(() => {
      let result = items;
      if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(i => 
              (i.title || '').toLowerCase().includes(lower) || 
              (i.author_developer || '').toLowerCase().includes(lower) ||
              (i.publisher || '').toLowerCase().includes(lower) ||
              (i.archive_code || '').toLowerCase().includes(lower)
          );
      }
      if (alphaFilter !== 'Todos') {
          if (alphaFilter === '#') {
              result = result.filter(i => /^[^a-zA-Z]/.test((i.title || '').trim()));
          } else {
              result = result.filter(i => (i.title || '').trim().toUpperCase().startsWith(alphaFilter));
          }
      }
      return result;
  }, [items, searchTerm, alphaFilter]);

  const filterCounts = useMemo(() => {
      const counts = { Adicionado: {}, Suporte: {}, Ano: {}, Nota: {}, 'Páginas/Faixa': {} };
      
      baseFilteredItems.forEach(item => {
          counts.Suporte[item.type || 'Sem Tipo'] = (counts.Suporte[item.type || 'Sem Tipo'] || 0) + 1;
          
          const addedBucket = getAddedBucket(parseItemIdToDate(item.id));
          counts.Adicionado[addedBucket] = (counts.Adicionado[addedBucket] || 0) + 1;
          
          const yearBucket = getYearBucket(item.year);
          counts.Ano[yearBucket] = (counts.Ano[yearBucket] || 0) + 1;
          
          const nota = item.rating ? `${item.rating} Estrelas` : 'Sem Nota';
          counts.Nota[nota] = (counts.Nota[nota] || 0) + 1;
          
          const pageBucket = getPagesBucket(item.pages_or_time);
          counts['Páginas/Faixa'][pageBucket] = (counts['Páginas/Faixa'][pageBucket] || 0) + 1;
      });
      return counts;
  }, [baseFilteredItems]);

  const allAvailableTypes = useMemo(() => {
      const types = new Set();
      items.forEach(i => { if (i.type) types.add(i.type); });
      return Array.from(types).sort();
  }, [items]);

  const FILTER_OPTIONS = {
      Adicionado: ['Hoje', 'Últimos 7 Dias', 'Este Mês', 'Este Ano', 'Mais Antigos'],
      Suporte: allAvailableTypes,
      Ano: ['Anos 2020', 'Anos 2010', 'Anos 2000', 'Anos 1990', 'Antes de 1990', 'Sem Ano'],
      Nota: ['5 Estrelas', '4 Estrelas', '3 Estrelas', '2 Estrelas', '1 Estrelas', 'Sem Nota'],
      'Páginas/Faixa': ['Mínimo (1-50)', 'Mínimo Médio (51-150)', 'Médio (151-300)', 'Máximo Médio (301-600)', 'Máximo (601+)', 'Nenhum / Não Informado']
  };

  const sortLabels = {
      'added': 'Data Adicionada',
      'title': 'Título',
      'author': 'Artista / Autor',
      'year': 'Ano',
      'type': 'Formato'
  };

  const finalProcessedItems = useMemo(() => {
      let result = baseFilteredItems;

      if (activeFilters.Suporte.length > 0) result = result.filter(i => activeFilters.Suporte.includes(i.type));
      if (activeFilters.Adicionado.length > 0) result = result.filter(i => activeFilters.Adicionado.includes(getAddedBucket(parseItemIdToDate(i.id))));
      if (activeFilters.Ano.length > 0) result = result.filter(i => activeFilters.Ano.includes(getYearBucket(i.year)));
      if (activeFilters.Nota.length > 0) result = result.filter(i => activeFilters.Nota.includes(i.rating ? `${i.rating} Estrelas` : 'Sem Nota'));
      if (activeFilters['Páginas/Faixa'].length > 0) result = result.filter(i => activeFilters['Páginas/Faixa'].includes(getPagesBucket(i.pages_or_time)));

      result = [...result].sort((a, b) => {
          let valA, valB;
          switch (sortBy) {
              case 'title': valA = (a.title||'').toLowerCase(); valB = (b.title||'').toLowerCase(); break;
              case 'author': valA = (a.author_developer||'').toLowerCase(); valB = (b.author_developer||'').toLowerCase(); break;
              case 'year': valA = parseInt(a.year) || 0; valB = parseInt(b.year) || 0; break;
              case 'type': valA = (a.type||'').toLowerCase(); valB = (b.type||'').toLowerCase(); break;
              case 'added': default: valA = a.id || ''; valB = b.id || ''; break;
          }
          if (sortBy === 'year') {
              return sortOrder === 'asc' ? valA - valB : valB - valA;
          } else {
              return sortOrder === 'asc' 
                  ? String(valA).localeCompare(String(valB), 'pt-BR')
                  : String(valB).localeCompare(String(valA), 'pt-BR');
          }
      });

      return result;
  }, [baseFilteredItems, activeFilters, sortBy, sortOrder]);


  const handleItemPressStart = (item) => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => { isLongPress.current = true; setContextMenuItem(item); }, 500);
  };
  
  const handleItemPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleItemClick = (item) => { if (!isLongPress.current) handleSelect(item); };
  
  const paginatedItems = useMemo(() => {
    return finalProcessedItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  }, [finalProcessedItems, page, itemsPerPage]);

  const totalPages = Math.ceil(finalProcessedItems.length / itemsPerPage) || 1;
  const alphabetOptions = ['Todos', '#', ...Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))];

  const handleSelect = (item) => { setSelectedItem(item); setEditedItem({ ...item }); };
  
  const updateRatingList = (id, r) => { 
    const u = { ...items.find(i => i.id === id), rating: r };
    setItems(items.map(item => item.id === id ? u : item)); 
    playChipBeep('save'); 
    onShowToast('success'); 
    syncItemToSheets(u, settings?.googleSheetsUrl);
  };
  
  const saveModifications = () => {
    setItems(items.map(i => i.id === editedItem.id ? editedItem : i)); 
    setSelectedItem(editedItem); 
    playChipBeep('save'); 
    onShowToast('success'); 
    syncItemToSheets(editedItem, settings?.googleSheetsUrl);
  };
  
  const confirmDelete = async () => {
    if (itemToDelete) { 
       const updatedList = items.filter(item => item.id !== itemToDelete);
       const reindexedList = reindexCollection(updatedList);
       
       setItems(reindexedList); 
       setItemToDelete(null); 
       setSelectedItem(null); 
       setEditedItem(null); 
       playChipBeep('save'); 
       onShowToast('success'); 
       
       if (settings?.googleSheetsUrl) {
          syncDeleteToSheets(itemToDelete, settings.googleSheetsUrl);
          
          for (let i = 0; i < reindexedList.length; i++) {
             const newItem = reindexedList[i];
             const oldItem = updatedList[i]; 
             
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

  const fetchWikiInfo = async () => {
    const apiKey = settings?.geminiApiKey || ""; 
    if (!apiKey) { setWikiError("Chave API ausente."); playChipBeep('error'); return; }
    
    setLoadingWiki(true); 
    setWikiError('');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          contents: [{ 
            role: "user", 
            parts: [{ text: `Aja como arquivista. Escreva 1 parágrafo fascinante (máx 4 linhas) sobre "${editedItem.title || ''}" (${editedItem.author_developer || ''}). Apenas o texto sem formatação.` }] 
          }] 
        }) 
      });
      
      const data = await res.json(); 
      if (data.error) throw new Error(data.error.message);
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { 
        setEditedItem({...editedItem, wiki_info: text}); 
        playChipBeep('save'); 
        onShowToast('success'); 
      }
    } catch (e) {
      let errorMsg = e.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.includes('exceeded')) {
        errorMsg = "⚠️ Cota gratuita da IA (Gemini) esgotada no momento. Aguarde o reset da API para fazer novas pesquisas.";
      } else {
        errorMsg = `Erro na comunicação com a IA: ${errorMsg}`;
      }
      setWikiError(errorMsg); 
      playChipBeep('error'); 
    } finally { 
      setLoadingWiki(false); 
    }
  };

  const countActiveFilters = Object.values(activeFilters).reduce((acc, curr) => acc + curr.length, 0);

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
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[4px] ${darkMode ? 'border-gray-300 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black bg-gray-100 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[4px] font-black uppercase text-[10px] tracking-widest ${darkMode ? 'bg-cyan-400 border-gray-300 text-black shadow-[3px_3px_0px_rgba(209,213,219,1)]' : 'bg-cyan-400 border-black text-black shadow-[3px_3px_0px_rgba(0,0,0,1)]'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}>
            Salvar
          </button>
        </MContainer>
        
        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10 scrollbar-hide">
          <div className="flex gap-4 flex-col md:flex-row md:items-start">
            <MContainer darkMode={darkMode} className={`${imageContainerClass} flex-shrink-0 flex items-center justify-center overflow-hidden mx-auto md:mx-0`} colorClass={`border-[4px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {editedItem.cover_url ? 
                <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" /> 
                : <LibraryBig className={`w-10 h-10 md:w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[3px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-300 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>
          
          <a href={linkInfo.url} target="_blank" rel="noopener noreferrer" className={`w-full p-3 border-[4px] ${darkMode ? 'shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 border-gray-300 text-cyan-400' : 'shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-cyan-100 border-black text-cyan-800'} flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none`}>
            <ExternalLink className="w-4 h-4" /> Buscar na Web
          </a>
          
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
              <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[3px] pb-1 ${darkMode ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Status</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[3px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${editedItem.status === opt ? (darkMode ? 'bg-cyan-800 border-gray-300 text-white' : 'bg-cyan-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-300 text-gray-400' : 'bg-white border-black text-black')}`}>{opt}</button>
                  ))}
                </div>
              </MContainer>
            )}
            <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[3px] pb-1 ${darkMode ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Sua Avaliação</label>
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setEditedItem({...editedItem, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= (editedItem.rating || 0) ? (darkMode ? 'fill-amber-400 text-amber-400' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
              </div>
            </MContainer>
          </div>
          
          <MInput label="Descrição" multiline value={editedItem.description || ''} onChange={e => setEditedItem({...editedItem, description: e.target.value})} darkMode={darkMode} />
          
          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-amber-900/30 text-white' : 'bg-amber-100 text-black'}>
            <MInput label="Anotações" multiline value={editedItem.notes || ''} onChange={e => setEditedItem({...editedItem, notes: e.target.value})} darkMode={darkMode} />
          </MContainer>
          
          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-pink-900/20 text-white' : 'bg-pink-100 text-black'}>
            <div className={`flex justify-between items-center mb-3 border-b-[4px] pb-1 ${darkMode ? 'border-gray-300' : 'border-black'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-4 h-4" /> Enciclopédia (IA)</span>
            </div>
            {editedItem.wiki_info ? (
              <div>
                <p className="text-xs font-bold leading-relaxed opacity-90 whitespace-pre-wrap text-justify mb-3 italic">"{editedItem.wiki_info}"</p>
                <button onClick={fetchWikiInfo} className="text-[9px] font-black uppercase tracking-widest underline opacity-70 hover:opacity-100 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gerar Nova Pesquisa</button>
              </div>
            ) : (
             <div className="text-center py-2">
                {loadingWiki ? (
                  <div className="flex flex-col items-center"><Sparkles className="w-6 h-6 animate-pulse mb-2 text-pink-500" /><span className="text-[10px] font-black uppercase tracking-widest animate-pulse opacity-70">Consultando oráculo...</span></div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {wikiError && <div className="text-[9px] font-bold text-white bg-pink-600 p-2 border-[2px] border-black rounded shadow-sm text-center">{wikiError}</div>}
                    <MButton onClick={fetchWikiInfo} darkMode={darkMode} variant="black" className="w-full text-[10px] bg-pink-500 border-black dark:bg-pink-600 text-white">✨ Pesquisar sobre a Obra</MButton>
                  </div>
                )}
              </div>
            )}
          </MContainer>
          
          <button onClick={saveModifications} className={`w-full mt-4 py-3 border-[4px] font-black uppercase text-[12px] tracking-widest flex items-center justify-center gap-2 ${darkMode ? 'shadow-[4px_4px_0px_rgba(209,213,219,1)] bg-cyan-400 border-gray-300 text-black' : 'shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-cyan-400 border-black text-black'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}>
            <Check className="w-5 h-5" /> Salvar Alterações
          </button>
          
          <div className="mt-8 mb-2 text-center">
            <button onClick={() => setItemToDelete(editedItem.id)} className={`text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 underline ${darkMode ? 'text-gray-400 hover:text-pink-400' : 'text-gray-500 hover:text-pink-600'}`}>Apagar este item</button>
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
             <div className={`p-4 border-b-[4px] ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'} flex justify-between items-center`}>
               <div className="flex flex-col overflow-hidden pr-2">
                 <span className="text-sm font-black truncate leading-tight">{contextMenuItem.title}</span>
                 <span className="text-[9px] uppercase tracking-widest opacity-70 truncate mt-0.5">{contextMenuItem.author_developer||'--'}</span>
               </div>
               <button onClick={() => setContextMenuItem(null)} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button>
             </div>
             <div className="flex flex-col">
                <button onClick={() => { handleSelect(contextMenuItem); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-[4px] ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-white' : 'border-gray-200 hover:bg-gray-50 text-black'} transition-colors text-left`}><Settings className="w-5 h-5" /> Editar Detalhes</button>
                <button onClick={() => { window.open(`https://open.spotify.com/search/${encodeURIComponent((contextMenuItem.title||'')+' '+(contextMenuItem.author_developer||''))}`, '_blank'); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-[4px] ${darkMode ? 'border-gray-700 hover:bg-cyan-900/30' : 'border-gray-200 hover:bg-cyan-50'} transition-colors text-cyan-600 dark:text-cyan-400 text-left`}><Headphones className="w-5 h-5" /> Ouvir (Spotify)</button>
                <button onClick={() => { window.open(`https://www.discogs.com/search?q=${contextMenuItem.barcode||encodeURIComponent((contextMenuItem.title||'')+' '+(contextMenuItem.author_developer||''))}&type=all`, '_blank'); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-[4px] ${darkMode ? 'border-gray-700 hover:bg-amber-900/30' : 'border-gray-200 hover:bg-amber-50'} transition-colors text-amber-600 dark:text-amber-500 text-left`}><DiscIcon className="w-5 h-5" /> Buscar Preço (Discogs)</button>
                <button onClick={() => { setEditedItem(contextMenuItem); setItemToDelete(contextMenuItem.id); setContextMenuItem(null); }} className={`p-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-colors text-pink-600 dark:text-pink-400 text-left`}><XIcon className="w-4 h-4" /> Apagar Item</button>
             </div>
          </MContainer>
        </div>
      )}

      {isFilterMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex justify-center items-end sm:items-center animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md max-h-[85vh] sm:h-[80vh] flex flex-col border-t-[4px] sm:border-[4px] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[8px_8px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]'}`}>
                  {/* Header Modal Filtro */}
                  <div className={`p-4 border-b-[4px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <button onClick={() => setIsFilterMenuOpen(false)} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button>
                      <span className="text-[12px] font-black uppercase tracking-widest">Filtros</span>
                      <div className="w-7"/> {/* placeholder centering */}
                  </div>
                  
                  {/* Conteúdo Accordion */}
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {Object.entries(FILTER_OPTIONS).map(([category, options]) => {
                          const isOpen = expandedSections[category];
                          const activeCount = pendingFilters[category].length;
                          return (
                              <div key={category} className={`border-b-[4px] ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                  <button 
                                      onClick={() => toggleSection(category)}
                                      className={`w-full p-4 flex justify-between items-center transition-colors ${isOpen ? (darkMode ? 'bg-black/30' : 'bg-gray-100') : ''}`}
                                  >
                                      <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-black uppercase tracking-widest">{category}</span>
                                          {activeCount > 0 && <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-sm ${darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500 text-white'}`}>{activeCount}</span>}
                                      </div>
                                      {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                                  </button>
                                  
                                  {isOpen && (
                                      <div className={`flex flex-col`}>
                                          {options.map(option => {
                                              const isChecked = pendingFilters[category].includes(option);
                                              const count = filterCounts[category]?.[option] || 0;
                                              return (
                                                  <div key={option} onClick={() => handleCheckboxChange(category, option)} className={`flex items-center justify-between p-3 cursor-pointer transition-colors active:bg-black/5 ${darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'}`}>
                                                      <span className={`text-[10px] font-black uppercase tracking-wider truncate mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{option}</span>
                                                      <div className="flex items-center gap-3">
                                                          <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{count}</span>
                                                          <div className={`w-5 h-5 border-[3px] flex items-center justify-center flex-shrink-0 ${isChecked ? (darkMode ? 'border-cyan-400 bg-cyan-900/40' : 'border-cyan-500 bg-cyan-100') : (darkMode ? 'border-gray-500' : 'border-gray-400')}`}>
                                                              {isChecked && <Check className="w-3 h-3 text-black dark:text-white" />}
                                                          </div>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
                  
                  {/* Footer Modal Filtro */}
                  <div className={`p-4 border-t-[4px] flex gap-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <MButton onClick={clearFilters} variant="white" darkMode={darkMode} className="flex-1 py-4 text-[10px]">Limpar tudo</MButton>
                      <MButton onClick={applyFilters} variant="pink" darkMode={darkMode} className="flex-[2] py-4 text-[10px]">Aplicar</MButton>
                  </div>
              </div>
          </div>
      )}

      {isSortMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/80 flex flex-col justify-end sm:justify-center items-center sm:p-4 animate-in fade-in duration-200">
              <div className={`w-full sm:max-w-md flex flex-col border-t-[4px] sm:border-[4px] max-h-[85vh] ${darkMode ? 'bg-gray-900 border-gray-300 shadow-[8px_8px_0px_rgba(209,213,219,1)]' : 'bg-white border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`p-4 border-b-[4px] flex justify-between items-center ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <button onClick={() => setIsSortMenuOpen(false)} className="p-1 active:scale-90"><XIcon className="w-5 h-5" /></button>
                      <span className="text-[12px] font-black uppercase tracking-widest">Ordenar</span>
                      <div className="w-7"/> {/* placeholder */}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                      <div className="mb-6">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ordem</div>
                          <div className={`border-[3px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <MRadio label="↑ Ascendente" checked={pendingSortOrder==='asc'} onChange={()=>setPendingSortOrder('asc')} darkMode={darkMode} />
                              <MRadio label="↓ Descendente" checked={pendingSortOrder==='desc'} onChange={()=>setPendingSortOrder('desc')} darkMode={darkMode} />
                          </div>
                      </div>
                      <div>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Ordenar por</div>
                          <div className={`border-[3px] flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <MRadio label="Artista / Autor" checked={pendingSortBy==='author'} onChange={()=>setPendingSortBy('author')} darkMode={darkMode} />
                              <MRadio label="Ano" checked={pendingSortBy==='year'} onChange={()=>setPendingSortBy('year')} darkMode={darkMode} />
                              <MRadio label="Título" checked={pendingSortBy==='title'} onChange={()=>setPendingSortBy('title')} darkMode={darkMode} />
                              <MRadio label="Data Adicionada" checked={pendingSortBy==='added'} onChange={()=>setPendingSortBy('added')} darkMode={darkMode} />
                              <MRadio label="Formato" checked={pendingSortBy==='type'} onChange={()=>setPendingSortBy('type')} darkMode={darkMode} />
                          </div>
                      </div>
                  </div>
                  <div className={`p-4 border-t-[4px] ${darkMode ? 'border-gray-300' : 'border-black'}`}>
                      <MButton darkMode={darkMode} variant="black" onClick={applySort} className="w-full py-4 text-[10px]">Aplicar</MButton>
                  </div>
              </div>
          </div>
      )}

      <div className={`sticky top-0 z-20 flex flex-col gap-2 pb-2 pt-1 border-b-[4px] ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} mb-3 px-1`}>
          
          <div className="flex gap-1 sm:gap-2 w-full">
              <div className="flex-1 relative min-w-0">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input 
                      type="text" 
                      placeholder="Buscar no acervo..." 
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                      className={`w-full h-10 pl-8 pr-8 border-[3px] font-black text-[10px] sm:text-[11px] uppercase tracking-wider outline-none transition-all focus:border-cyan-400 ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}
                  />
                  {searchTerm && (
                      <button onClick={() => {setSearchTerm(''); setPage(0);}} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 active:scale-90"><XIcon className="w-4 h-4" /></button>
                  )}
              </div>

              <button 
                  onClick={() => {
                      setPendingFilters(activeFilters); 
                      setIsFilterMenuOpen(true);
                  }}
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[3px] transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none relative ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}
                  title="Filtros Avançados"
              >
                  <FilterIcon className="w-4 h-4" /> 
                  {countActiveFilters > 0 && (
                      <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-[2px] flex items-center justify-center text-[8px] font-black ${darkMode ? 'bg-pink-600 border-gray-900 text-white' : 'bg-pink-500 border-white text-white'}`}>
                          {countActiveFilters}
                      </div>
                  )}
              </button>
              
              <button 
                  onClick={() => {
                      setPendingSortBy(sortBy);
                      setPendingSortOrder(sortOrder);
                      setIsSortMenuOpen(true);
                  }}
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-[3px] transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none relative ${darkMode ? 'bg-gray-800 text-white border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}
                  title={`Ordenar: ${sortLabels[sortBy]}`}
              >
                  {sortOrder === 'asc' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>

              <select 
                  value={alphaFilter} 
                  onChange={e => { setAlphaFilter(e.target.value); setPage(0); }}
                  className={`w-14 sm:w-16 h-10 p-0 text-center text-[10px] font-black uppercase tracking-widest border-[3px] outline-none cursor-pointer flex-shrink-0 ${darkMode ? 'border-gray-400 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'}`}
              >
                  {alphabetOptions.map(l => <option key={l} value={l}>{l === 'Todos' ? 'A-Z' : l}</option>)}
              </select>
          </div>
          
          <div className="px-1 text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">
              Exibindo {finalProcessedItems.length} {countActiveFilters > 0 || searchTerm ? 'resultados encontrados' : 'itens da coleção'}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 px-1 pt-1 scrollbar-hide">
        {paginatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] p-10 opacity-50 text-center">
                <Ghost className="w-12 h-12 mb-4" />
                <span className="text-sm font-sans font-black uppercase tracking-widest">Nenhum item localizado.</span>
                <span className="text-[10px] font-bold mt-2">Ajuste seus filtros ou barra de busca.</span>
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row min-h-[140px] cursor-pointer active:scale-[0.98] transition-transform hover:-translate-y-1 hover:shadow-lg" onContextMenu={e => e.preventDefault()} onTouchStart={() => handleItemPressStart(item)} onTouchEnd={handleItemPressEnd} onTouchMove={handleItemPressEnd} onMouseDown={() => handleItemPressStart(item)} onMouseUp={handleItemPressEnd} onMouseLeave={handleItemPressEnd} onClick={() => handleItemClick(item)}>
                
                <MContainer darkMode={darkMode} className="w-5 border-r-0 rounded-l-sm flex-shrink-0" colorClass={getMondrianColor(idx, darkMode)} />
                
                <MContainer darkMode={darkMode} className="flex-1 flex flex-row p-2 rounded-r-sm" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>
                  
                  <div className="flex-1 flex flex-col justify-between pr-3 pointer-events-none">
                    <div className="flex flex-col">
                      <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1.5 break-words">
                        {item.type||'--'} • {item.year||'--'} {item.pages_or_time ? `• ${item.pages_or_time} ${getMetricInfo(item.type, activeCategories).label}` : ''}
                      </div>
                      <div className="text-sm font-black leading-tight break-words whitespace-normal mb-1">{item.title || 'S/ Título'}</div>
                      <div className="text-[10px] font-bold opacity-80 uppercase tracking-wide break-words whitespace-normal">{item.author_developer || '--'}</div>
                    </div>
                    <div className="mt-3 flex items-end">
                      {[...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(item.type) ? <div className={`text-[8px] px-2 py-1 border-[3px] ${darkMode ? 'border-gray-300 bg-cyan-900 text-cyan-300' : 'border-black bg-amber-400 text-black'} font-black uppercase tracking-widest w-max`}>{item.status || '--'}</div> : <div />}
                    </div>
                 </div>

                 <div className={`w-24 sm:w-28 flex-shrink-0 flex flex-col items-center justify-between border-l-[3px] pl-2 py-0.5 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className={`w-full ${(activeCategories['Discos'] || []).includes(item.type) ? 'aspect-square' : 'aspect-[3/4]'} border-[3px] ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-black'} flex items-center justify-center overflow-hidden mb-2 shadow-[2px_2px_0px_currentColor]`}>
                       {item.cover_url ? <img src={item.cover_url} alt="Capa" className="w-full h-full object-cover"/> : <LibraryBig className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'} opacity-50`}/>}
                    </div>
                    <div className="flex flex-nowrap justify-center items-center gap-0.5 pointer-events-auto w-full" onClick={e => e.stopPropagation()}>
                       {item.rating === 5 ? (
                         <div title="Obra-Prima! (Clique para redefinir a nota)">
                           <Star 
                             onClick={() => updateRatingList(item.id, 0)} 
                             className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] cursor-pointer fill-current drop-shadow-[0_0_5px_currentColor] active:scale-90 transition-transform" 
                             style={{ animation: `titleColorCycle ${settings?.marqueeSpeed || 35}s linear infinite` }} 
                           />
                         </div>
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
  const scannerRef = useRef(null); 
  const isProcessingScan = useRef(false);
  const [formData, setFormData] = useState({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);

  const updateStatus = (state, message) => setScanBox({ state, message });
  const changeMode = (newMode) => { setAddMode(newMode); if (newMode !== 'manual') { updateStatus('idle', ''); resetGlobalAi(); } };
  
  useEffect(() => {
    if (scannedAIData) {
       setFormData(prev => ({ 
           ...prev, 
           title: scannedAIData.title||'', 
           author_developer: scannedAIData.author_developer||'', 
           year: scannedAIData.year?.toString()||'', 
           publisher: scannedAIData.publisher||'', 
           description: scannedAIData.description||'', 
           pages_or_time: scannedAIData.pages_or_time||prev.pages_or_time, 
           type: allTypes.includes(scannedAIData.type) ? scannedAIData.type : 'Livro' 
        }));
      setScannedAIData(null); 
    }
  }, [scannedAIData, setScannedAIData, allTypes]);
  
  const displayBoxState = globalAiState !== 'idle' ? globalAiState : scanBox.state;
  const displayBoxMessage = globalAiState !== 'idle' ? globalAiMessage : scanBox.message;
  
  useEffect(() => {
    let isMounted = true; 
    let scannerInstance = null;
    
    if (addMode === 'barcode' && isHtml5QrcodeLoaded && window.Html5Qrcode) {
        scannerInstance = new window.Html5Qrcode("reader-barcode");
        scannerRef.current = scannerInstance;
        scannerInstance.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            if (scannerRef.current?.getState() === 2) {
               scannerRef.current.stop().then(() => {
                  if (isMounted) { 
                      setAddMode('manual'); 
                      setFormData(prev => ({ ...prev, barcode: decodedText })); 
                      fetchMultiDatabaseParallel(decodedText); 
                      setTimeout(() => { isProcessingScan.current = false; }, 2000); 
                  }
               }).catch(e => console.error("Erro scanner:", e));
            }
          }, () => {}).catch(() => { 
              if (isMounted) { updateStatus('error', 'Erro Câmera.'); setAddMode('manual'); } 
          });
    }
    return () => { 
        isMounted = false; 
        if (scannerInstance) { 
            try { 
                if (scannerInstance.getState() === 2 || scannerInstance.getState() === 1) { 
                    scannerInstance.stop().then(() => scannerInstance.clear()).catch(()=>{}); 
                } else { 
                    scannerInstance.clear(); 
                } 
            } catch(e) {} 
            scannerRef.current = null; 
        } 
    };
  }, [addMode, isHtml5QrcodeLoaded]);

  const fetchMultiDatabaseParallel = async (barcode) => {
    const cleanCode = barcode.replace(/[-\s]/g, "");
    updateStatus('loading', 'Consultando bancos de dados simultaneamente...');
    const isISBN = cleanCode.startsWith("978") || cleanCode.startsWith("979");

    const fetchers = [];

    const fetchDiscogs = async () => {
      if (!settings?.discogsToken) throw new Error("No token");
      const res = await fetch(`https://api.discogs.com/database/search?barcode=${cleanCode}&token=${settings.discogsToken}`);
      const data = await res.json();
      if (!data.results || data.results.length === 0) throw new Error("Not found");
      const item = data.results[0]; 
      const titleParts = item.title ? item.title.split(' - ') : [];
      let discType = 'CD'; 
      const fStr = (item.format || []).join(' ').toLowerCase();
      if (fStr.includes('vinyl') || fStr.includes('lp')) discType = 'Vinil'; 
      else if (fStr.includes('cassette')) discType = 'Fita Cassete';
      return { title: titleParts.slice(1).join(' - ').trim() || item.title || '', author_developer: titleParts[0]?.trim() || '', year: item.year || '', publisher: item.label?.[0] || '', cover_url: item.cover_image || '', type: discType };
    };

    const fetchMBrainz = async () => {
      const res = await fetch(`https://musicbrainz.org/ws/2/release/?query=barcode:${cleanCode}&fmt=json&inc=media+labels`);
      const data = await res.json();
      if (!data.releases || data.releases.length === 0) throw new Error("Not found");
      const release = data.releases[0]; let fmt = 'CD'; let tc = '';
      if (release.media && release.media.length > 0) {
         const m = release.media[0]; const fStr = m.format?.toLowerCase() || '';
         if (fStr.includes('vinyl') || fStr.includes('12"')) fmt = 'Vinil'; else if (fStr.includes('cassette')) fmt = 'Fita Cassete';
         if (m['track-count']) tc = `${m['track-count']}`;
      }
      return { title: release.title || "", author_developer: release["artist-credit"]?.map(a=>a.name).join(", ") || "", publisher: release.label || release["label-info"]?.[0]?.label?.name || "", year: release.date?.substring(0,4) || "", type: fmt, pages_or_time: tc, cover_url: `https://coverartarchive.org/release/${release.id}/front` };
    };

    const fetchUPC = async () => {
      const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`);
      const data = await res.json();
      if (!data.items || data.items.length === 0) throw new Error("Not found");
      const item = data.items[0]; const cat = String(item.category || "").toLowerCase(); const tit = String(item.title || "").toLowerCase();
      let fmt = 'Livro';
      if (cat.includes('music') || tit.includes(' cd') || tit.includes('album')) fmt = 'CD';
      else if (cat.includes('video game') || cat.includes('nintendo') || cat.includes('playstation') || cat.includes('xbox')) fmt = 'PS4';
      else if (cat.includes('dvd') || cat.includes('movie') || tit.includes('dvd')) fmt = 'DVD';
      return { title: item.title || "", publisher: item.brand || item.publisher || "", cover_url: item.images?.[0] || "", type: fmt };
    };

    const fetchGBooks = async () => {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`);
      const data = await res.json();
      if (!data.items || data.items.length === 0) throw new Error("Not found");
      const info = data.items[0].volumeInfo;
      let fmt = 'Livro'; const pub = String(info.publisher || "").toLowerCase();
      if (pub.includes('jbc') || pub.includes('conrad') || pub.includes('panini')) fmt = 'Quadrinho';
      return { title: info.title || "", author_developer: info.authors?.join(", ") || "", publisher: info.publisher || "", year: info.publishedDate?.substring(0,4) || "", pages_or_time: info.pageCount?.toString() || "", cover_url: info.imageLinks?.thumbnail?.replace("http://", "https://") || "", description: info.description || "", type: fmt };
    };

    const fetchOpenLib = async () => {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&jscmd=data&format=json`);
      const data = await res.json();
      const info = data[`ISBN:${cleanCode}`];
      if (!info) throw new Error("Not found");
      return { title: info.title || '', author_developer: info.authors?.map(a => a.name).join(', ') || '', year: info.publish_date?.substring(0,4) || '', publisher: info.publishers?.map(p => p.name).join(', ') || '', pages_or_time: info.number_of_pages?.toString() || '', description: info.subtitle || '', cover_url: `https://covers.openlibrary.org/b/isbn/${cleanCode}-L.jpg`, type: 'Livro' };
    };

    if (isISBN) { 
      fetchers.push(fetchGBooks(), fetchOpenLib()); 
    } else { 
      fetchers.push(fetchMBrainz(), fetchUPC()); 
      if (settings?.discogsToken) fetchers.push(fetchDiscogs()); 
    }

    try {
      const foundItem = await Promise.any(fetchers);
      playChipBeep('success'); 
      updateStatus('success', 'Encontrado com velocidade!');
      setFormData(prev => ({ ...prev, ...foundItem, barcode: cleanCode }));
    } catch (e) {
      playChipBeep('error'); 
      updateStatus('error', 'Item não localizado em nenhum banco de dados. Por favor, preencha manualmente.');
    }
  };

  const handleSave = () => {
    if (!formData.title) { 
      playChipBeep('error'); 
      setShowErrorModal(true); 
      return; 
    }
    
    const classCode = activeClassCodes[formData.type] || '000'; 
    const prefix = settings?.archivePrefix ? settings.archivePrefix.trim().toUpperCase() : 'MBU';
    let maxSeq = 0;
    
    items.forEach(item => { 
      if(item.archive_code) { 
        const parts = String(item.archive_code).split('-'); 
        if (parts.length >= 3 && parts[1] === classCode) { 
          const seqNum = parseInt(parts[2], 10); 
          if(!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum; 
        } 
      } 
    });
    
    const sequence = String(maxSeq + 1).padStart(4, '0');
    const newItem = { ...formData, id: generateId(items), archive_code: `${prefix}-${classCode}-${sequence}` };
    
    setItems([...items, newItem]); 
    syncItemToSheets(newItem, settings?.googleSheetsUrl);
    playChipBeep('save'); 
    onShowToast('success'); 
    
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    updateStatus('idle', ''); 
    resetGlobalAi(); 
    setActiveTab('library');
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
        <div className={`p-4 mb-4 flex items-start gap-3 border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest transition-colors duration-300 ${displayBoxState === 'loading' ? (darkMode ? 'bg-amber-700 border-gray-300 text-white' : 'bg-amber-400 border-black text-black') : displayBoxState === 'success' ? (darkMode ? 'bg-cyan-800 border-gray-300 text-white' : 'bg-cyan-400 border-black text-black') : (darkMode ? 'bg-pink-800 border-gray-300 text-white' : 'bg-pink-600 border-black text-white')}`}>
          {displayBoxState === 'loading' && <div className="w-5 h-5 border-4 border-current border-t-transparent rounded-sm animate-spin flex-shrink-0" />}
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
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-[4px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none flex flex-col items-center justify-center z-20"><span className="text-white text-[10px] uppercase font-black tracking-widest bg-black px-3 py-1 mt-24">Alinhe o Código</span></div>
        </MContainer>
      )}
      
      {addMode === 'manual' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Formato</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[4px] ${darkMode ? 'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm outline-none font-black`}>
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
            <MInput darkMode={darkMode} label="Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            
            {isBookOrGame && (
              <div className="mb-4">
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={() => setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[3px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)]'} active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${formData.status === opt ? (darkMode ? 'bg-cyan-800 border-gray-300 text-white' : 'bg-cyan-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-300 text-gray-400' : 'bg-white border-black text-black')}`}>{opt}</button>)}
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Avaliação (Nota)</label>
              <div className={`flex gap-2 p-3 border-[4px] ${darkMode ? 'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800' : 'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white'} justify-center`}>
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

const DashboardTab = ({ items, darkMode, activeCategories }) => {
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterSubtype, setFilterSubtype] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterRating, setFilterRating] = useState('Todas');
  
  const dashItems = useMemo(() => {
    return items.filter(item => {
      let mCat = true, mStatus = true, mRating = true;
      if (filterCat !== 'Todas') { 
        if (filterSubtype !== 'Todos') mCat = item.type === filterSubtype;
        else mCat = (activeCategories[filterCat] || []).includes(item.type); 
      }
      if (filterStatus !== 'Todos') {
         const isDisc = (activeCategories['Discos'] || []).includes(item.type);
         if (isDisc) mStatus = false;
         else mStatus = item.status === filterStatus;
      }
      if (filterRating !== 'Todas') mRating = item.rating === parseInt(filterRating);
      return mCat && mStatus && mRating;
    });
  }, [items, filterCat, filterSubtype, filterStatus, filterRating, activeCategories]);
  
  const chartColors = getChartColors(darkMode);
  const catCounts = {}; const statusCounts = {};

  dashItems.forEach(item => {
    let foundCat = 'Outros';
    for (const [cat, subs] of Object.entries(activeCategories)) { if ((subs || []).includes(item.type)) { foundCat = cat; break; } }
    catCounts[foundCat] = (catCounts[foundCat] || 0) + 1;

    const isDisc = (activeCategories['Discos'] || []).includes(item.type);
    if (!isDisc) {
      const st = item.status || 'Não Iniciado';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }
  });

  const catChartData = Object.entries(catCounts).map(([label, value], idx) => ({ label, value, colorHex: chartColors[idx % chartColors.length] })).sort((a,b) => b.value - a.value);
  const statusChartData = Object.entries(statusCounts).map(([label, value], idx) => ({ label, value, colorHex: chartColors[(idx + 2) % chartColors.length] })).sort((a,b) => b.value - a.value);

  const totalDash = dashItems.length;
  const byType = dashItems.reduce((acc, i) => { acc[i.type || 'Outro'] = (acc[i.type || 'Outro'] || 0) + 1; return acc; }, {});
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxType = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;
  
  const byAuthor = dashItems.reduce((acc, i) => {
    if (i.author_developer) {
      const rawAuthor = i.author_developer.trim(); 
      if (isVariousArtists(rawAuthor)) return acc;
      
      const normTitle = normalizeWorkTitle(i.title);
      let normAuthor = getSortableName(rawAuthor).toLowerCase();
      if (!acc[normAuthor]) acc[normAuthor] = { display: rawAuthor, titles: new Set() };
      acc[normAuthor].titles.add(normTitle);
    }
    return acc;
  }, {});
  
  const sortedAuthors = Object.entries(byAuthor).map(([key, data]) => [data.display, data.titles.size]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxAuthor = sortedAuthors.length > 0 ? sortedAuthors[0][1] : 1;
  
  const byYear = dashItems.reduce((acc, i) => {
    const y = getValidYear(i.year);
    if (!isNaN(y) && y >= 1900 && y <= new Date().getFullYear() + 5) { acc[y] = (acc[y] || 0) + 1; }
    return acc;
  }, {});
  const yearsKeys = Object.keys(byYear).sort();
  const maxYearCount = yearsKeys.length > 0 ? Math.max(...Object.values(byYear)) : 1;
  
  const stats = useMemo(() => {
    if (totalDash === 0) return {};
    const validYears = dashItems.filter(i => !isNaN(getValidYear(i.year)));
    const reliquia = validYears.length > 0 ? validYears.reduce((a, b) => getValidYear(a.year) < getValidYear(b.year) ? a : b) : null;
    
    const validLengths = dashItems.filter(i => i.pages_or_time && !isNaN(parseInt(i.pages_or_time)));
    let epico = null;
    if (validLengths.length > 0) {
        const titleToPages = {};
        validLengths.forEach(i => {
            const normTitle = normalizeWorkTitle(i.title);
            if (!titleToPages[normTitle]) titleToPages[normTitle] = { total: 0, sampleItem: i };
            titleToPages[normTitle].total += parseInt(i.pages_or_time);
        });
        let maxPages = 0; let bestNorm = '';
        for (const [norm, data] of Object.entries(titleToPages)) { if (data.total > maxPages) { maxPages = data.total; bestNorm = norm; } }
        if (bestNorm) epico = { ...titleToPages[bestNorm].sampleItem, title: normalizeWorkTitle(titleToPages[bestNorm].sampleItem.title).toUpperCase(), pages_or_time: maxPages };
    }

    const vergonha = dashItems.filter(i => {
       const isDisc = (activeCategories['Discos'] || []).includes(i.type);
       if (isDisc) return (Number(i.rating) || 0) === 0;
       return i.status === 'Não Iniciado';
    }).length;

    return { reliquia, epico, vergonha };
  }, [dashItems, totalDash, activeCategories]);

  const musicItems = dashItems.filter(i => (activeCategories['Discos'] || []).includes(i.type));
  const hasMusicStats = musicItems.length > 0 && (filterCat === 'Todas' || filterCat === 'Discos');
  
  const musicStats = useMemo(() => {
     if (!hasMusicStats) return null;
     const ouvidos = musicItems.filter(i => (Number(i.rating) || 0) > 0);
     const qtyOuvidos = ouvidos.length;
     const mediaNota = qtyOuvidos > 0 ? (ouvidos.reduce((acc, i) => acc + Number(i.rating), 0) / qtyOuvidos).toFixed(1) : 0;
     const percOuvidos = musicItems.length > 0 ? Math.round((qtyOuvidos / musicItems.length) * 100) : 0;
     
     let totalFaixas = 0;
     const trackByArtist = {};
     
     const discsWithTracks = musicItems.filter(i => parseInt(i.pages_or_time) > 0);
     
     discsWithTracks.forEach(i => {
         const faixas = parseInt(i.pages_or_time);
         totalFaixas += faixas;
         if (i.author_developer) {
            const rawAuthor = i.author_developer.trim();
            if (!isVariousArtists(rawAuthor)) {
               let auth = getSortableName(rawAuthor);
               trackByArtist[auth] = (trackByArtist[auth] || 0) + faixas;
            }
         }
     });
     
     const mediaFaixas = discsWithTracks.length > 0 ? Math.round(totalFaixas / discsWithTracks.length) : 0;
     
     let topArtist = { name: '--', count: 0 };
     for (const [art, count] of Object.entries(trackByArtist)) {
         if (count > topArtist.count) topArtist = { name: art, count };
     }

     return { qtyOuvidos, percOuvidos, mediaNota, totalFaixas, mediaFaixas, topArtist };
  }, [musicItems, hasMusicStats]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4 scrollbar-hide max-w-5xl mx-auto w-full">
      <MContainer darkMode={darkMode} className="p-3 sticky top-0 z-20 flex flex-col gap-2" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-b-[3px] pb-1 mb-1 border-current"><FilterIcon className="w-4 h-4" /> Filtros Interativos</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterSubtype('Todos'); }} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase outline-none cursor-pointer ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'}`}><option value="Todas">Tudo</option>{Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
          {filterCat !== 'Todas' && activeCategories[filterCat] ? (
            <select value={filterSubtype} onChange={e => setFilterSubtype(e.target.value)} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase outline-none cursor-pointer ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-cyan-900 text-cyan-100' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-cyan-100 text-cyan-900'}`}><option value="Todos">Todos (Subtipo)</option>{activeCategories[filterCat].map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
          ) : <select disabled className={`w-full p-2 border-[3px] text-[9px] font-black uppercase outline-none opacity-50 cursor-not-allowed ${darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-gray-100 text-gray-500'}`}><option>Todos (Subtipo)</option></select>}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase outline-none cursor-pointer ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'}`}><option value="Todos">Status</option>{STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className={`w-full p-2 border-[3px] text-[9px] font-black uppercase outline-none cursor-pointer ${darkMode ? 'border-gray-300 shadow-[2px_2px_0px_rgba(209,213,219,1)] bg-gray-800 text-white' : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white text-black'}`}><option value="Todas">Notas</option>{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Estrelas</option>)}</select>
        </div>
      </MContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black'}><LibraryBig className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-20`} /><div className="text-5xl font-black z-10">{totalDash}</div><div className="text-[9px] font-black uppercase tracking-widest mt-1 z-10 text-center">Itens no Filtro</div></MContainer>
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}><Ghost className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-20`} /><div className="text-5xl font-black z-10">{stats.vergonha || 0}</div><div className="text-[9px] font-black uppercase tracking-widest mt-1 z-10 text-center">Intocados / Backlog</div></MContainer>
        {stats.reliquia && (
          <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between h-28 md:col-span-1" colorClass={darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400 text-black'}><div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">A Relíquia</div><Clock className="w-5 h-5 opacity-50" /></div><div><div className="text-xs font-black leading-tight break-words line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{String(stats.reliquia.title || 'Sem Título')}</div><div className="text-[9px] font-bold mt-1">Ano {getValidYear(stats.reliquia.year)}</div></div></MContainer>
        )}
        {stats.epico && (
          <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between h-28 md:col-span-1" colorClass={darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500 text-black'}><div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">O Épico</div><Flame className="w-5 h-5 opacity-50" /></div><div><div className="text-xs font-black leading-tight break-words line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{String(stats.epico.title || 'Sem Título')}</div><div className="text-[9px] font-bold mt-1">{stats.epico.pages_or_time} {getMetricInfo(stats.epico.type, activeCategories).label} Totais</div></div></MContainer>
        )}
      </div>

      {hasMusicStats && (
        <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-indigo-900/40 text-white' : 'bg-indigo-100 text-black'}>
           <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 flex items-center gap-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}><Music className="w-4 h-4" /> Auditoria Musical (Discos no Filtro: {musicItems.length})</div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col"><span className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Discos Ouvidos</span><span className="text-xl font-black">{musicStats.qtyOuvidos} <span className="text-[10px]">({musicStats.percOuvidos}%)</span></span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Total Faixas</span><span className="text-xl font-black">{musicStats.totalFaixas} <span className="text-[10px]">Músicas</span></span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Média Faixas/Disco</span><span className="text-xl font-black">{musicStats.mediaFaixas} <span className="text-[10px]">Músicas/Und</span></span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold opacity-70 uppercase tracking-widest truncate">Mais Faixas: {musicStats.topArtist.name}</span><span className="text-xl font-black truncate">{musicStats.topArtist.count} <span className="text-[10px]">Músicas</span></span></div>
           </div>
        </MContainer>
      )}

      {totalDash === 0 && <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest opacity-50">Nenhum dado para este filtro.</div>}

      {totalDash > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
            {catChartData.length > 0 && <MondrianDonutChart title="Categorias" data={catChartData} darkMode={darkMode} />}
            {statusChartData.length > 0 && <MondrianDonutChart title="Progresso (Livros/Games)" data={statusChartData} darkMode={darkMode} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}><div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>Formatos Populares</div><div className="flex flex-col">{sortedTypes.map(([type, count], index) => <MondrianHBar key={`type-${type}`} label={type} value={count} max={maxType} index={index} darkMode={darkMode} />)}</div></MContainer>
            <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}><div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-300' : 'border-black'}`}>Top 5 Autores / Estúdios</div><div className="flex flex-col">{sortedAuthors.map(([author, count], index) => <MondrianHBar key={`author-${index}`} label={String(author || 'Desconhecido')} value={count} max={maxAuthor} index={index + 1} darkMode={darkMode} />)}</div></MContainer>
            
            {yearsKeys.length > 0 && (
              <MContainer darkMode={darkMode} className="p-4 flex flex-col md:col-span-2" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
                <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 flex justify-between ${darkMode ? 'border-gray-300' : 'border-black'}`}><span>Linha do Tempo (Exata)</span><Calendar className="w-4 h-4" /></div>
                <div className="flex items-end gap-1.5 h-32 pt-6 border-b-[3px] border-current overflow-x-auto scrollbar-hide">
                  {yearsKeys.map((yearStr, idx) => {
                    const count = byYear[yearStr]; const heightPerc = (count / maxYearCount) * 100;
                    return (
                      <div key={yearStr} className="flex-none w-8 h-full flex flex-col justify-end group">
                        <div className={`w-full border-[3px] border-b-0 shadow-[-2px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-1000 flex justify-center relative ${getMondrianColor(idx, darkMode)} ${darkMode ? 'border-gray-300' : 'border-black'}`} style={{ height: `${Math.max(5, heightPerc)}%` }}>
                          <div className="text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1">{count}</div>
                        </div>
                        <div className="text-center text-[7px] font-black mt-1 opacity-70 transform">{yearStr}</div>
                     </div>
                    );
                  })}
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
  const [importData, setImportData] = useState(null); 
  const [openSection, setOpenSection] = useState(null); 
  const [newSubclass, setNewSubclass] = useState({ parent: 'Livros', name: '', code: '' });
  
  const coverSyncActiveRef = useRef(false); 
  const [coverSync, setCoverSync] = useState({ active: false, progress: 0, total: 0, log: '' });
  
  useEffect(() => { 
    return () => { coverSyncActiveRef.current = false; }; 
  }, []);

  const runCoverSync = async (mode) => {
    coverSyncActiveRef.current = true;
    setCoverSync({ active: true, progress: 0, total: items.length, log: 'Iniciando varredura...' });
    let updatedItems = [...items];
    let changedCount = 0;

    for (let i = 0; i < updatedItems.length; i++) {
        if (!coverSyncActiveRef.current) {
            setCoverSync(prev => ({ ...prev, active: false, log: 'Busca cancelada pelo usuário.' }));
            break;
        }
        let item = updatedItems[i];
        let needsFetch = false;

        setCoverSync(prev => ({ ...prev, progress: i, log: `Analisando: ${item.title}` }));

        if (mode === 'all') needsFetch = true;
        else if (mode === 'missing_errors') needsFetch = !item.cover_url || await isImageBroken(item.cover_url);
        else if (mode === 'errors_only') needsFetch = item.cover_url && await isImageBroken(item.cover_url);

        if (needsFetch) {
            setCoverSync(prev => ({ ...prev, log: `Buscando capa: ${item.title}` }));
            const newCover = await fetchCoverBySearch(item, settings, activeCategories);
            if (newCover && newCover !== item.cover_url) {
                updatedItems[i] = { ...item, cover_url: newCover };
                changedCount++;
                syncItemToSheets(updatedItems[i], settings?.googleSheetsUrl);
            }
            await new Promise(r => setTimeout(r, 600)); 
        }
    }
    
    if (coverSyncActiveRef.current) {
        setItems(updatedItems);
        setCoverSync({ active: false, progress: items.length, total: items.length, log: `Concluído! ${changedCount} atualizadas.` });
        if (changedCount > 0) { playChipBeep('success'); onShowToast('success'); }
    } else {
        setItems(updatedItems); 
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['ID', 'Código Arquivístico', 'Tipo', 'Título', 'Autor/Desenvolvedor', 'Ano', 'Editora/Gravadora', 'Status', 'Nota', 'Páginas/Tempo', 'Código de Barras', 'Descrição', 'URL da Capa', 'Localização', 'Anotações', 'Wiki'];
    const escape = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
    const rows = items.map(i => [escape(i.id), escape(i.archive_code), escape(i.type), escape(i.title), escape(i.author_developer), escape(i.year), escape(i.publisher), escape(i.status), i.rating || 0, escape(i.pages_or_time), escape(i.barcode), escape(i.description), escape(i.cover_url), escape(i.location), escape(i.notes), escape(i.wiki_info)]);
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), [headers.join(","), ...rows.map(r => r.join(","))].join("\n")], { type: 'text/csv;charset=utf-8;' })); 
    link.download = `Memorabilia_Fisico_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click();
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0]; 
    if (!file) return; 
    const reader = new FileReader();
    reader.onload = (evt) => {
      const validRows = parseCSVText(evt.target.result); 
      if (validRows.length < 2) return;
      
      const headers = validRows[0].map(h => h.trim()); 
      const newItems = [];
      
      for (let i = 1; i < validRows.length; i++) {
        if (validRows[i].length === 1 && !validRows[i][0].trim()) continue;
        const item = {};
        headers.forEach((h, idx) => {
          let key = h;
          if (h === 'ID') key = 'id'; 
          else if (h === 'Código Arquivístico') key = 'archive_code'; 
          else if (h === 'Tipo') key = 'title'; 
          else if (h === 'Autor/Desenvolvedor') key = 'author_developer'; 
          else if (h === 'Ano' || h === 'Data' || h === 'Ano Lançamento') key = 'year'; 
          else if (h === 'Editora/Gravadora') key = 'publisher'; 
          else if (h === 'Status') key = 'status'; 
          else if (h === 'Nota') key = 'rating'; 
          else if (h === 'Páginas/Tempo' || h === 'Métrica' || h === 'Páginas') key = 'pages_or_time'; 
          else if (h === 'Código de Barras' || h === 'ISBN/Código') key = 'barcode'; 
          else if (h === 'Descrição') key = 'description'; 
          else if (h === 'URL da Capa') key = 'location'; 
          else if (h === 'Localização') key = 'location'; 
          else if (h === 'Anotações') key = 'notes'; 
          else if (h === 'Wiki') key = 'wiki_info';
          item[key] = validRows[i][idx] ? validRows[i][idx].trim() : '';
        });
        if (item.id || item.title) { 
          item.id = item.id || generateId(newItems); 
          item.rating = parseInt(item.rating) || 0; 
          newItems.push(item); 
        }
      }
      if (newItems.length > 0) setImportData(newItems);
    }; 
    reader.readAsText(file); 
    e.target.value = null;
  };

  const handleAddSubclass = () => {
    if (!newSubclass.name || !newSubclass.code) { 
      playChipBeep('error'); 
      onShowToast('error'); 
      return; 
    }
    const updatedCats = { ...activeCategories }; 
    if (!updatedCats[newSubclass.parent]) updatedCats[newSubclass.parent] = [];
    if (!updatedCats[newSubclass.parent].includes(newSubclass.name.trim())) {
      updatedCats[newSubclass.parent] = [...updatedCats[newSubclass.parent], newSubclass.name.trim()];
    }
    
    setSettings({ 
      ...settings, 
      userCategories: updatedCats, 
      userClassCodes: { ...activeClassCodes, [newSubclass.name.trim()]: newSubclass.code.trim() } 
    });
    setNewSubclass({ parent: 'Livros', name: '', code: '' }); 
    playChipBeep('save'); 
    onShowToast('success');
  };

  const toggleSection = (s) => setOpenSection(openSection === s ? null : s);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative max-w-3xl mx-auto w-full">
      <MModal isOpen={showResetConfirm} title="Aviso Crítico" message="Apagar TODOS os itens do acervo físico?" onConfirm={() => { setItems([]); setShowResetConfirm(false); playChipBeep('save'); onShowToast('success'); }} onCancel={() => setShowResetConfirm(false)} darkMode={darkMode} confirmText="Apagar Tudo" />
      <MModal isOpen={!!importData} title="Importar CSV" message={`Substituir a coleção atual pelos ${importData ? importData.length : 0} itens novos?`} onConfirm={() => { if (importData) { setItems(importData); setImportData(null); playChipBeep('save'); onShowToast('success'); } }} onCancel={() => setImportData(null)} darkMode={darkMode} confirmText="Substituir" />
      
      {pwa.isInstallable && !pwa.isInstalled && (
        <MContainer darkMode={darkMode} className="p-4 mb-4 flex flex-col items-center justify-center text-center animate-pulse border-cyan-400 bg-cyan-100 dark:bg-cyan-900" colorClass="border-cyan-400"><Smartphone className="w-8 h-8 mb-2 text-cyan-600 dark:text-cyan-400" /><h3 className="font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300 text-lg mb-1">Instalar App</h3><MButton darkMode={darkMode} onClick={pwa.promptInstall} variant="cyan" className="w-full py-4 text-sm font-black text-black">📲 Instalar Agora</MButton></MContainer>
      )}
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-amber-900/20 text-white' : 'bg-amber-50 text-black'}>
        <button onClick={() => toggleSection('aparencia')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'aparencia' ? (darkMode ? 'border-b-[4px] border-gray-300' : 'border-b-[4px] border-black') : ''}`}><span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Aparência & Interface</span><span className="text-lg font-mono">{openSection === 'aparencia' ? '−' : '+'}</span></button>
        {openSection === 'aparencia' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">Tema Visual</span>
              <button onClick={() => { setDarkMode(!darkMode); playChipBeep('save'); onShowToast('success'); }} className={`px-4 py-2 border-[4px] font-black uppercase tracking-widest text-[10px] ${darkMode ? 'shadow-[2px_2px_0px_rgba(209,213,219,1)] border-gray-300 bg-gray-800 text-white' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] border-black bg-gray-200 text-black'} active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all`}>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</button>
            </div>
            <div className={`border-t-[4px] ${darkMode ? 'border-amber-900' : 'border-amber-200'} pt-3 flex flex-col gap-5`}>
               <div>
                 <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Velocidade LED</div>
                 <input type="range" min="10" max="150" step="1" value={160 - (Number(settings?.marqueeSpeed) || 35)} onChange={e => setSettings({...settings, marqueeSpeed: 160 - parseInt(e.target.value)})} onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }} onTouchEnd={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-full h-2 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ accentColor: '#22d3ee' }} />
               </div>
               <div>
                 <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Sun className="w-4 h-4"/> Brilho LED</div>
                 <input type="range" min="0" max="100" step="5" value={Number(settings?.marqueeBrightness) ?? 50} onChange={e => setSettings({...settings, marqueeBrightness: parseInt(e.target.value)})} onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }} onTouchEnd={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-full h-2 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ accentColor: '#fbbf24' }} />
               </div>
            </div>
          </div>
        )}
      </MContainer>
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-cyan-900/20 text-white' : 'bg-cyan-50 text-black'}>
        <button onClick={() => toggleSection('arquivologia')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'arquivologia' ? (darkMode ? 'border-b-[4px] border-gray-300' : 'border-b-[4px] border-black') : ''}`}><span className="flex items-center gap-2"><ListIcon className="w-4 h-4" /> Gestão de Classes</span><span className="text-lg font-mono">{openSection === 'arquivologia' ? '−' : '+'}</span></button>
        {openSection === 'arquivologia' && (
          <div className="p-4 flex flex-col gap-4">
            <MInput darkMode={darkMode} label="Prefixo do Acervo" value={settings?.archivePrefix || ''} onChange={e => setSettings({...settings, archivePrefix: e.target.value.toUpperCase()})} onBlur={() => { playChipBeep('save'); onShowToast('success'); }} placeholder="Ex: MBU" />
            <div className={`p-3 border-[4px] ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-gray-100'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 border-b-[2px] border-current pb-1">Nova Subclasse</h4>
              <div className="flex flex-col gap-2">
                <select value={newSubclass.parent} onChange={e => setNewSubclass({...newSubclass, parent: e.target.value})} className={`w-full p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`}>{Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nome" value={newSubclass.name} onChange={e => setNewSubclass({...newSubclass, name: e.target.value})} className={`flex-1 p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                  <input type="text" placeholder="Código" value={newSubclass.code} onChange={e => setNewSubclass({...newSubclass, code: e.target.value})} className={`w-24 p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                </div>
                <MButton darkMode={darkMode} onClick={handleAddSubclass} variant="light-cyan" className="py-2 text-[10px]">Adicionar Subclasse</MButton>
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
                      <div key={sub} className="flex items-center justify-between text-xs font-bold">
                        <span className="opacity-80">{sub}</span>
                        <input type="text" value={activeClassCodes?.[sub] || ''} onChange={e => setSettings({...settings, userClassCodes: { ...activeClassCodes, [sub]: e.target.value }})} onBlur={() => { playChipBeep('save'); onShowToast('success'); }} className={`w-16 p-1 border-[2px] text-center font-mono text-[10px] outline-none ${darkMode ? 'border-gray-300 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                      </div>
                    ))}
                  </div>
               </div>
              ))}
              </div>
            </div>
          </div>
        )}
      </MContainer>
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-pink-900/20 text-white' : 'bg-pink-50 text-black'}>
        <button onClick={() => toggleSection('integracoes')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'integracoes' ? (darkMode ? 'border-b-[4px] border-gray-300' : 'border-b-[4px] border-black') : ''}`}><span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Integrações & APIs</span><span className="text-lg font-mono">{openSection === 'integracoes' ? '−' : '+'}</span></button>
        {openSection === 'integracoes' && (
          <div className="p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2"><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><Camera className="w-4 h-4"/> Gemini API (Scan IA)</div><MInput darkMode={darkMode} label="API Key" type="password" value={settings?.geminiApiKey || ''} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} /></div>
            <div className={`border-t-[4px] pt-4 ${darkMode ? 'border-pink-900' : 'border-pink-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><DiscIcon className="w-4 h-4"/> Discogs API</div><MInput darkMode={darkMode} label="Discogs Token" type="password" value={settings?.discogsToken || ''} onChange={e => setSettings({...settings, discogsToken: e.target.value})} /></div>
            <div className={`border-t-[4px] pt-4 ${darkMode ? 'border-pink-900' : 'border-pink-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><Share className="w-4 h-4"/> Google Sheets</div><MInput darkMode={darkMode} label="Webhook URL" value={settings?.googleSheetsUrl || ''} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} /></div>
            <div className={`border-t-[4px] pt-4 ${darkMode ? 'border-pink-900' : 'border-pink-200'} flex flex-col gap-2`}><div className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}><Headphones className="w-4 h-4"/> Last.FM</div><MInput darkMode={darkMode} label="Username" value={settings?.lastfmUser || ''} onChange={e => setSettings({...settings, lastfmUser: e.target.value})} /><MInput darkMode={darkMode} label="API Key" type="password" value={settings?.lastfmApiKey || ''} onChange={e => setSettings({...settings, lastfmApiKey: e.target.value})} /></div>
            <MButton darkMode={darkMode} onClick={() => { playChipBeep('save'); onShowToast('success'); }} variant="light-pink" className="w-full mt-2 text-[10px]"><Check className="w-4 h-4" /> Salvar APIs</MButton>
          </div>
        )}
      </MContainer>
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-indigo-900/20 text-white' : 'bg-indigo-50 text-black'}>
        <button onClick={() => toggleSection('capas')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'capas' ? (darkMode ? 'border-b-[4px] border-gray-300' : 'border-b-[4px] border-black') : ''}`}><span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Recuperação de Capas</span><span className="text-lg font-mono">{openSection === 'capas' ? '−' : '+'}</span></button>
        {openSection === 'capas' && (
          <div className="p-4 flex flex-col gap-3">
            {coverSync.active ? (
              <div className={`p-4 border-[4px] flex flex-col items-center justify-center text-center ${darkMode ? 'border-gray-300 bg-gray-800' : 'border-black bg-white'}`}>
                  <RefreshIcon className="w-8 h-8 mb-2 animate-spin text-cyan-500" />
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1">{coverSync.log}</div>
                  <div className="w-full bg-gray-200 h-2 mb-3 border-[2px] border-black dark:border-gray-300"><div className="bg-cyan-500 h-full transition-all duration-300" style={{width: `${(coverSync.progress / Math.max(1, coverSync.total)) * 100}%`}}></div></div>
                  <div className="text-[8px] font-bold mb-3">{coverSync.progress} / {coverSync.total} Itens Analisados</div>
                  <MButton darkMode={darkMode} onClick={() => coverSyncActiveRef.current = false} variant="pink" className="py-2 text-[9px] w-full max-w-[200px]">Cancelar Busca</MButton>
              </div>
            ) : (
              <>
                <div className="text-[9px] font-bold opacity-80 mb-2">Selecione o modo de varredura automática de capas:</div>
                <MButton darkMode={darkMode} onClick={() => runCoverSync('missing_errors')} variant="cyan" className="w-full py-3 text-[9px]"><Search className="w-4 h-4" /> Recuperar Faltantes e Com Erro</MButton>
                <MButton darkMode={darkMode} onClick={() => runCoverSync('errors_only')} variant="amber" className="w-full py-3 text-[9px]"><AlertTriangle className="w-4 h-4" /> Corrigir Apenas Erros (Links Quebrados)</MButton>
                <MButton darkMode={darkMode} onClick={() => runCoverSync('all')} variant="light-pink" className="w-full py-3 text-[9px]"><RefreshIcon className="w-4 h-4" /> Recarregar Todas (Forçar Substituição)</MButton>
                {coverSync.log && !coverSync.active && <div className="text-[9px] font-black uppercase tracking-widest text-center mt-2 text-pink-500 border-[2px] p-2 border-pink-500 bg-pink-100 dark:bg-pink-900/30">{coverSync.log}</div>}
              </>
            )}
          </div>
        )}
      </MContainer>
      
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-pink-900/20 text-white' : 'bg-pink-50 text-black'}>
        <button onClick={() => toggleSection('backup')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'backup' ? (darkMode ? 'border-b-[4px] border-gray-300' : 'border-b-[4px] border-black') : ''}`}><span className="flex items-center gap-2"><Download className="w-4 h-4" /> Backup Local</span><span className="text-lg font-mono">{openSection === 'backup' ? '−' : '+'}</span></button>
        {openSection === 'backup' && (
          <div className="p-4 flex gap-2 flex-col sm:flex-row">
            <button onClick={handleExportCSV} className={`flex-1 flex items-center justify-center gap-2 p-3 text-[10px] font-black uppercase tracking-widest border-[4px] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'shadow-[4px_4px_0px_rgba(209,213,219,1)] border-gray-300 bg-pink-900/50 text-pink-200' : 'shadow-[4px_4px_0px_rgba(0,0,0,1)] border-black bg-pink-100 text-pink-900'}`}>
              <Download className="w-4 h-4 flex-shrink-0" /> Exportar Coleção
            </button>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-black uppercase tracking-widest border-[4px] cursor-pointer active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'shadow-[4px_4px_0px_rgba(209,213,219,1)] border-gray-300 bg-pink-900/50 text-pink-200' : 'shadow-[4px_4px_0px_rgba(0,0,0,1)] border-black bg-pink-100 text-pink-900'} `}>
              <Upload className="w-4 h-4 flex-shrink-0" /> Importar Coleção<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
          </div>
        )}
      </MContainer>
      
      <div className="mt-8 mb-4 text-center">
        <button onClick={() => setShowResetConfirm(true)} className={`px-4 py-2 border-[3px] text-[8px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all ${darkMode ? 'border-pink-500 text-pink-500' : 'border-pink-600 text-pink-600'}`}>
          ⚠️ Resetar Coleção Física
        </button>
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success' }); 
  const [isHtml5QrcodeLoaded, setIsHtml5QrcodeLoaded] = useState(false);
  const [libraryResetKey, setLibraryResetKey] = useState(0);
  
  const pwa = usePWA(LINK_DO_ICONE_NO_GITHUB); 
  const globalFileInputRef = useRef(null);
  
  const [aiBoxState, setAiBoxState] = useState('idle'); 
  const [aiBoxMessage, setAiBoxMessage] = useState(''); 
  const [scannedAIData, setScannedAIData] = useState(null);
  
  const activeCategories = (settings?.userCategories && typeof settings.userCategories === 'object' && !Array.isArray(settings.userCategories)) ? settings.userCategories : DEFAULT_CATEGORIES;
  const activeClassCodes = (settings?.userClassCodes && typeof settings.userClassCodes === 'object' && !Array.isArray(settings.userClassCodes)) ? settings.userClassCodes : DEFAULT_CLASS_CODES;
  const allTypes = Object.values(activeCategories).flat();

  const [ratingCatIdx, setRatingCatIdx] = useState(0); 
  const ratingCategories = useMemo(() => ['Todas', ...Object.keys(activeCategories || {})], [activeCategories]);
  const currentRatingCat = ratingCategories[ratingCatIdx % Math.max(1, ratingCategories.length)] || 'Todas';
  
  const dynamicAvgRating = useMemo(() => {
    const rated = items.filter(i => (Number(i.rating) || 0) !== 0 && (currentRatingCat === 'Todas' || (activeCategories[currentRatingCat] || []).includes(i.type)));
    return rated.length > 0 ? (rated.reduce((acc, i) => acc + (Number(i.rating) || 0), 0) / rated.length).toFixed(1) : 0;
  }, [items, currentRatingCat, activeCategories]);

  const triggerGlobalAI = () => { 
    setActiveTab('add'); 
    setAddMode('manual'); 
    if (globalFileInputRef.current) globalFileInputRef.current.click(); 
  };
  
  const handleGlobalFileChange = (e) => { 
    const file = e.target.files[0]; 
    if (file) { 
      setActiveTab('add'); 
      setAddMode('manual'); 
      processGlobalAIFile(file); 
    } 
    e.target.value = null; 
  };

  const processGlobalAIFile = async (file) => {
    const apiKey = settings?.geminiApiKey || ""; 
    if (!apiKey) { 
      setAiBoxState('error'); 
      setAiBoxMessage('Chave API ausente.'); 
      playChipBeep('error'); 
      return; 
    }
    
    setAiBoxState('loading'); 
    setAiBoxMessage('Analisando imagem com IA...');
    
    try {
      const b64 = (await resizeImageForAPI(file)).split(',')[1];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
      
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          contents: [{ 
            parts: [
              { text: `Analise esta imagem (pode ser uma capa, contracapa ou ficha catalográfica/expediente). Extraia os metadados da obra. Retorne APENAS um JSON válido.
Formato: {"type": "Livro", "title": "Nome", "author_developer": "Autor", "year": "Ano", "publisher": "Editora", "pages_or_time": "Quantidade", "description": "Resumo"}.
Regras:
- type deve ser um destes: ${allTypes.join(', ')}. Tente inferir.
- Converta datas abreviadas para ano exato (Ex: Julho/90 = "1990").
- Extraia o Título principal destacado, Editora e Nomes de autores/roteiristas/artistas.` }, 
              { inlineData: { mimeType: "image/jpeg", data: b64 } }
            ] 
          }], 
          generationConfig: { responseMimeType: "application/json" } 
        }) 
      });
      
      if (!res.ok) throw new Error(`Erro API Google HTTP: ${res.status}`);
      
      const data = await res.json(); 
      if (data.error) throw new Error(data.error.message);
      
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text; 
      if (!text) throw new Error("Retorno vazio da IA.");
      
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim(); 
      text = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      
      setScannedAIData(JSON.parse(text)); 
      setAiBoxState('success'); 
      setAiBoxMessage('Extraído com sucesso!'); 
      playChipBeep('save'); 
      showToast('success');
      
    } catch (e) {
      let errorMsg = e.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.includes('exceeded')) {
         errorMsg = "Cota gratuita da IA esgotada no momento. ⚠️\nUse o botão 'Barcode' (Código de Barras) para pesquisar bases de dados sem limite, ou preencha manualmente até a cota resetar.";
      } else {
         errorMsg = `Falha na IA: ${errorMsg}\nTente focar bem a capa ou use o modo Barcode.`;
      }
      setAiBoxState('error'); 
      setAiBoxMessage(errorMsg); 
      playChipBeep('error'); 
      showToast('error'); 
    }
  };

  useEffect(() => {
    if (window.Html5Qrcode) { setIsHtml5QrcodeLoaded(true); return; }
    if (!document.getElementById('html5-qrcode')) {
      const script = document.createElement('script'); 
      script.id = 'html5-qrcode'; 
      script.src = "https://unpkg.com/html5-qrcode/html5-qrcode.min.js"; 
      script.async = true;
      script.onload = () => setIsHtml5QrcodeLoaded(true); 
      document.head.appendChild(script);
    }
  }, []);
  
  const showToast = (type = 'success') => { 
    setToast({ visible: true, type }); 
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000); 
  };
  
  useEffect(() => {
    let savedSettings = null;
    try {
      if (localStorage.getItem('memorabilia_theme') === 'dark') setDarkMode(true);
      const sItems = localStorage.getItem('memorabilia_items'); 
      if (sItems) setItems(JSON.parse(sItems));
      
      const sSett = localStorage.getItem('memorabilia_settings'); 
      if (sSett) { 
        savedSettings = JSON.parse(sSett); 
        setSettings(p => ({ ...p, ...savedSettings })); 
      }
    } catch (e) {}
    
    if (savedSettings?.googleSheetsUrl) {
       setIsFetchingCloud(true);
       fetch(savedSettings.googleSheetsUrl).then(res => res.json()).then(data => {
          if (Array.isArray(data) && data.length > 0) setItems(data);
          setShowSuccessSplash(true); 
          playLydianSuccess(); 
          setTimeout(() => { 
            setShowSuccessSplash(false); 
            setIsFetchingCloud(false); 
            setInitialLoadDone(true); 
            setIsLoaded(true); 
          }, 1500);
       }).catch(() => { 
         setIsFetchingCloud(false); 
         setInitialLoadDone(true); 
         setIsLoaded(true); 
       });
    } else { 
      setIsFetchingCloud(false); 
      setInitialLoadDone(true); 
      setIsLoaded(true); 
    }
  }, []);

  const [lfmPeriodIdx, setLfmPeriodIdx] = useState(0); 
  const [lfmStatIdx, setLfmStatIdx] = useState(0); 
  const [lfmCache, setLfmCache] = useState({}); 
  const [isLfmLoading, setIsLfmLoading] = useState(false); 
  const [lastFmTrack, setLastFmTrack] = useState(null);
  
  const LFM_PERIODS = ['7day', '1month', '12month', 'overall']; 
  const LFM_PERIOD_LABELS = ['7D', '1M', '1A', 'Geral']; 
  const LFM_STATS = ['Última', 'Top Artista', 'Top Álbum', 'Top Faixa', 'Artistas Únicos', 'Faixas Escutadas'];

  useEffect(() => {
    if (!settings?.lastfmUser || !settings?.lastfmApiKey || !isLoaded) return;
    
    const fetchRec = async () => { 
      try { 
        const data = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&format=json&limit=1`)).json(); 
        const t = data?.recenttracks?.track?.[0]; 
        if (t) setLastFmTrack({ name: t.name, artist: t.artist['#text'] || t.artist?.name || 'Desconhecido', nowPlaying: t['@attr']?.nowplaying === 'true' }); 
      } catch(e){} 
    };
    
    fetchRec(); 
    const int = setInterval(fetchRec, 60000); 
    return () => clearInterval(int);
  }, [settings?.lastfmUser, settings?.lastfmApiKey, isLoaded]);

  useEffect(() => {
    if (!settings?.lastfmUser || !settings?.lastfmApiKey || !isLoaded || lfmStatIdx === 0) return;
    
    const p = LFM_PERIODS[lfmPeriodIdx]; 
    const k = `${lfmStatIdx}-${p}`;
    
    if (!lfmCache[k]) {
      const f = async () => {
        setIsLfmLoading(true);
        try {
          let v = 'N/A';
          if (lfmStatIdx === 1 || lfmStatIdx === 4) { 
            const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&period=${p}&format=json&limit=1`)).json(); 
            if(lfmStatIdx===1) v = d?.topartists?.artist?.[0]?.name||'N/A'; else v = d?.topartists?.['@attr']?.total||'0'; 
          }
          else if (lfmStatIdx === 2) { 
            const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&period=${p}&format=json&limit=1`)).json(); 
            const a = d?.topalbums?.album?.[0]; 
            v = a ? `${a.name} (${a.artist?.name})` : 'N/A'; 
          }
          else if (lfmStatIdx === 3 || lfmStatIdx === 5) { 
            const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&period=${p}&format=json&limit=1`)).json(); 
            if (lfmStatIdx===3) { const t = d?.toptracks?.track?.[0]; v = t ? `${t.name} (${t.artist?.name})` : 'N/A'; } else v = d?.toptracks?.['@attr']?.total||'0'; 
          }
          setLfmCache(pr => ({ ...pr, [k]: String(v) }));
        } catch(e) { 
          setLfmCache(pr => ({ ...pr, [k]: 'Erro' })); 
        } finally { 
          setIsLfmLoading(false); 
        }
      }; 
      f();
    }
  }, [settings?.lastfmUser, settings?.lastfmApiKey, isLoaded, lfmStatIdx, lfmPeriodIdx, lfmCache]);

  const lfmPressTimer = useRef(null); 
  const isLfmLongPress = useRef(false);
  
  const handleLfmPressStart = () => { 
    isLfmLongPress.current = false; 
    lfmPressTimer.current = setTimeout(() => { 
      isLfmLongPress.current = true; 
      setLfmPeriodIdx(p => (p + 1) % LFM_PERIODS.length); 
      if (lfmStatIdx === 0) setLfmStatIdx(1); 
    }, 500); 
  };
  
  const handleLfmPressEnd = () => { if (lfmPressTimer.current) clearTimeout(lfmPressTimer.current); };
  const handleLfmClick = () => { if (!isLfmLongPress.current) { setLfmStatIdx(p => (p + 1) % LFM_STATS.length); } };

  let lfmLabelStr = 'Last.FM:'; 
  let lfmDisplayStr = 'Sem dados'; 
  let isPulsingLfm = false;
  
  if (!settings?.lastfmUser) lfmDisplayStr = 'Configure em Ajustes';
  else if (lfmStatIdx === 0) { 
    if (lastFmTrack) { 
      lfmLabelStr = lastFmTrack.nowPlaying ? 'Ouvindo:' : 'Última:'; 
      lfmDisplayStr = `${lastFmTrack.artist} - ${lastFmTrack.name}`; 
      isPulsingLfm = lastFmTrack.nowPlaying; 
    } else {
      lfmDisplayStr = 'Carregando...'; 
    }
  }
  else {
    const pl = LFM_PERIOD_LABELS[lfmPeriodIdx]; 
    const ck = `${lfmStatIdx}-${LFM_PERIODS[lfmPeriodIdx]}`;
    
    if (lfmStatIdx === 1) lfmLabelStr = `(${pl}) Top Artista:`; 
    else if (lfmStatIdx === 2) lfmLabelStr = `(${pl}) Top Álbum:`; 
    else if (lfmStatIdx === 3) lfmLabelStr = `(${pl}) Top Faixa:`; 
    else if (lfmStatIdx === 4) lfmLabelStr = `(${pl}) Artistas Únicos:`; 
    else if (lfmStatIdx === 5) lfmLabelStr = `(${pl}) Total Faixas:`;
    
    lfmDisplayStr = (isLfmLoading && !lfmCache[ck]) ? 'Carregando...' : (lfmCache[ck] || 'N/A');
  }
  
  useEffect(() => { if (initialLoadDone) localStorage.setItem('memorabilia_items', JSON.stringify(items)); }, [items, initialLoadDone]);
  useEffect(() => { if (initialLoadDone) localStorage.setItem('memorabilia_settings', JSON.stringify(settings)); }, [settings, initialLoadDone]);
  useEffect(() => { if (initialLoadDone) localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light'); }, [darkMode, initialLoadDone]);
  
  const [rotatingStatIdx, setRotatingStatIdx] = useState(0);
  
  const rotatingStats = useMemo(() => {
    if (items.length === 0) return ["Acervo em Formação"]; 
    const stats = [];
    const tc = items.reduce((acc, i) => { acc[i.type || 'Outro'] = (acc[i.type || 'Outro'] || 0) + 1; return acc; }, {});
    
    if (tc['Livro']) stats.push(`${tc['Livro']} Livros na Estante`); 
    if (tc['CD']) stats.push(`${tc['CD']} CDs Catalogados`); 
    if (tc['Vinil']) stats.push(`${tc['Vinil']} Vinis (LPs)`); 
    if (tc['Quadrinho']) stats.push(`${tc['Quadrinho']} HQs & Mangás`); 
    if (tc['DVD']) stats.push(`${tc['DVD']} Filmes (DVD)`);
    
    const vy = items.filter(i => !isNaN(getValidYear(i.year)));
    if (vy.length > 0) {
      const o = vy.reduce((a, b) => getValidYear(a.year) < getValidYear(b.year) ? a : b); 
      const n = vy.reduce((a, b) => getValidYear(a.year) > getValidYear(b.year) ? a : b);
      stats.push(`Relíquia: ${getValidYear(o.year)} (${String(o.title || '').substring(0,12)}...)`); 
      stats.push(`Recente: ${getValidYear(n.year)} (${String(n.title || '').substring(0,12)}...)`);
    }
    
    const vl = items.filter(i => i.pages_or_time && !isNaN(parseInt(i.pages_or_time)) && ((activeCategories['Livros']||[]).includes(i.type)));
    if (vl.length > 0) {
        const tp = {}; 
        vl.forEach(i => { 
          const nm = normalizeWorkTitle(i.title); 
          if (!tp[nm]) tp[nm] = { t: 0, r: i.title }; 
          tp[nm].t += parseInt(i.pages_or_time); 
        });
        let mx = 0; let mObj = null; 
        for (const [n, d] of Object.entries(tp)) { if (d.t > mx) { mx = d.t; mObj = d; } }
        if (mObj) stats.push(`Mais Longo: ${mx} Págs (${normalizeWorkTitle(mObj.r).toUpperCase().substring(0,10)}...)`);
    }
    
    const ac = items.reduce((acc, i) => { 
       if(i.author_developer) {
          let ra = i.author_developer.trim(); 
          if (isVariousArtists(ra)) return acc;
          const na = getSortableName(ra).toLowerCase(); 
          const nt = normalizeWorkTitle(i.title);
          if (!acc[na]) acc[na] = { d: ra, t: new Set() }; 
          acc[na].t.add(nt);
       } 
       return acc; 
    }, {});
    
    const sortedAuthorsStat = Object.entries(ac).map(([na, d]) => [d.d, d.t.size]).sort((a,b)=>b[1]-a[1]);
    const ta = sortedAuthorsStat[0];
    if (ta && ta[1] > 1) stats.push(`+ Freq: ${String(ta[0] || '').substring(0, 15)} (${ta[1]} Obras)`);
    
    return stats.length > 0 ? stats : ["Sua Coleção Física"];
  }, [items, activeCategories]);

  const hasSuggested = useRef(false); 
  const [suggestion, setSuggestion] = useState(null);
  
  useEffect(() => {
    if (isLoaded && items.length > 0 && !hasSuggested.current) {
      const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type));
      if (ms.length > 0) setSuggestion(ms[Math.floor(Math.random() * ms.length)]);
      hasSuggested.current = true;
    }
  }, [isLoaded, items, activeCategories]);
  
  const shuffleSuggestion = () => {
    const ms = items.filter(i => (activeCategories['Discos'] || []).includes(i.type));
    if (ms.length > 0) {
      let ns = ms[Math.floor(Math.random() * ms.length)];
      if (ms.length > 1 && suggestion) { 
        while (ns.id === suggestion?.id) ns = ms[Math.floor(Math.random() * ms.length)]; 
      }
      setSuggestion(ns);
    }
  };

  const totalItens = items.length; 
  const livros = items.filter(i => (activeCategories['Livros'] || []).includes(i.type));
  const totalPagesCount = livros.reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const readPages = livros.filter(i => i.status === 'Concluído').reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const readPercentage = totalPagesCount > 0 ? ((readPages / totalPagesCount) * 100).toFixed(1) : 0;
  
  const catCounts = items.reduce((acc, i) => {
    let mainCat = 'Outros';
    for (const [cat, subs] of Object.entries(activeCategories)) {
      if ((subs || []).includes(i.type)) { mainCat = cat; break; }
    }
    acc[mainCat] = (acc[mainCat] || 0) + 1;
    return acc;
  }, {});

  const allRated = items.filter(i => (Number(i.rating) || 0) > 0);
  const globalAvgRating = allRated.length > 0 ? (allRated.reduce((acc, i) => acc + (Number(i.rating) || 0), 0) / allRated.length).toFixed(1) : 0;
  
  const speed = settings?.marqueeSpeed || 35; 
  const glow = (settings?.marqueeBrightness ?? 50) / 10;
  
  const textShadowStyle = { textShadow: glow > 0 ? `0 0 ${glow}px currentColor, 0 0 ${glow * 1.5}px currentColor` : 'none' };
  const ledItemStyle = "font-led text-[9px] sm:text-[10px] uppercase tracking-normal";

  const renderKatamariSeparator = () => (<div className="flex items-center mx-4 opacity-90 pb-0.5"><KatamariIcon className="w-5 h-5 flex-shrink-0" glow={glow} /></div>);
  const renderPacmanEnd = () => (
    <div className="flex items-center gap-2 ml-6 mr-10 opacity-90 pb-0.5">
      <Ghost className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-pink-400' : 'text-pink-500'}`} style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px currentColor)` : 'none' }} />
      <div className="w-1.5 h-1.5 bg-amber-200 rounded-full shadow-[0_0_3px_currentColor]" />
      <div className="w-1.5 h-1.5 bg-amber-200 rounded-full shadow-[0_0_3px_currentColor]" />
      <div className="w-1.5 h-1.5 bg-amber-200 rounded-full shadow-[0_0_3px_currentColor]" />
      <svg viewBox="0 0 100 100" className="w-4 h-4 flex-shrink-0" style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px #fbbf24)` : 'none' }}>
        <path fill="#fbbf24" transform="scale(-1, 1) translate(-100, 0)">
          <animate attributeName="d" values="M50 50 L93.3 25 A 50 50 0 1 0 93.3 75 Z; M50 50 L99.9 48 A 50 50 0 1 0 99.9 52 Z; M50 50 L93.3 25 A 50 50 0 1 0 93.3 75 Z" dur="0.4s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
  
  const renderMarqueeContent = () => {
    const statsArr = [];
    statsArr.push(<span key="1" className={`text-cyan-400 ${ledItemStyle}`}>TOTAL: {totalItens}</span>);
    if (catCounts['Livros']) statsArr.push(<span key="2" className={`text-pink-400 ${ledItemStyle}`}>LIVROS: {catCounts['Livros']}</span>);
    if (catCounts['Discos']) statsArr.push(<span key="3" className={`text-amber-400 ${ledItemStyle}`}>DISCOS: {catCounts['Discos']}</span>);
    if (catCounts['Games']) statsArr.push(<span key="4" className={`text-cyan-400 ${ledItemStyle}`}>GAMES: {catCounts['Games']}</span>);
    if (catCounts['Vídeo']) statsArr.push(<span key="5" className={`text-pink-400 ${ledItemStyle}`}>VÍDEO: {catCounts['Vídeo']}</span>);
    
    if (Number(globalAvgRating) > 0) {
      const fullStars = Math.floor(Number(globalAvgRating));
      const hasHalf = (Number(globalAvgRating) - fullStars) >= 0.5;
      const starsStr = '★'.repeat(fullStars) + (hasHalf ? '½' : '');
      statsArr.push(<span key="6" className={`text-amber-400 ${ledItemStyle}`}>NOTA MÉDIA: {starsStr}</span>);
    }

    return (
      <div className="flex items-center py-1" style={textShadowStyle}>
        {statsArr.map((stat, index) => ( <React.Fragment key={index}>{stat}{index < statsArr.length - 1 ? renderKatamariSeparator() : renderPacmanEnd()}</React.Fragment> ))}
      </div>
    );
  };
  
  const suggPressTimer = useRef(null); 
  const isSuggLongPress = useRef(false);
  const handleSuggPressStart = () => { isSuggLongPress.current = false; suggPressTimer.current = setTimeout(() => { isSuggLongPress.current = true; shuffleSuggestion(); }, 500); };
  const handleSuggPressEnd = () => { if (suggPressTimer.current) clearTimeout(suggPressTimer.current); };
  const handleSuggClick = () => { if (!isSuggLongPress.current && suggestion) window.open(`https://open.spotify.com/search/${encodeURIComponent((suggestion.title || '') + ' ' + (suggestion.author_developer || ''))}`, '_blank'); };

  const pressTimer = useRef(null); 
  const isLongPress = useRef(false);
  const handleAddPressStart = () => { isLongPress.current = false; pressTimer.current = setTimeout(() => { isLongPress.current = true; triggerGlobalAI(); }, 500); };
  const handleAddPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleAddClick = () => { if (!isLongPress.current) { setAddMode('barcode'); setActiveTab('add'); } };

  const libPressTimer = useRef(null); 
  const isLibLongPress = useRef(false);
  const handleLibPressStart = () => { isLibLongPress.current = false; libPressTimer.current = setTimeout(() => { isLibLongPress.current = true; setLibraryResetKey(k => k + 1); setActiveTab('library'); }, 500); };
  const handleLibPressEnd = () => { if (libPressTimer.current) clearTimeout(libPressTimer.current); };
  const handleLibClick = () => { if (!isLibLongPress.current) { setActiveTab('library'); } };

  if (isFetchingCloud && !showSuccessSplash) {
    return (
       <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-black text-white'} flex flex-col items-center justify-center font-sans font-black tracking-widest relative overflow-hidden`} style={{ backgroundColor: '#0b0b0b', backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)', backgroundSize: '3px 3px' }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; }`}</style>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)] pointer-events-none" />
          <KatamariIcon className="w-24 h-24 mb-6 z-10 text-cyan-400" glow={10} />
          <p className="text-cyan-400 z-10 font-led text-[10px] text-center drop-shadow-[0_0_8px_currentColor] animate-pulse leading-loose">SINCRONIZANDO<br/>COM GOOGLE SHEETS...</p>
       </div>
    );
  }

  if (showSuccessSplash) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans font-black tracking-widest relative overflow-hidden bg-black text-white`} style={{ backgroundImage: 'radial-gradient(circle, #222 1.5px, transparent 1.5px)', backgroundSize: '4px 4px' }}>
         <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; }`}</style>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)] pointer-events-none" />
         <div className="z-10 flex flex-col items-center justify-center gap-6 animate-in zoom-in duration-300">
           <img src={LINK_DO_ICONE_NO_GITHUB} alt="Memorabilia Icon" className="w-28 h-28 object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
           <h1 className="text-4xl text-pink-500 drop-shadow-[0_0_10px_currentColor] text-center leading-none uppercase tracking-tighter">Memorabilia</h1>
         </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led { font-family: 'Press Start 2P', monospace; } .led-board { background-color: #0b0b0b; background-image: radial-gradient(circle, #000 1.5px, transparent 1.5px); background-size: 3px 3px; box-shadow: inset 0 0 15px #000; } @keyframes marqueeLinear { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } } @keyframes titleColorCycle { 0%, 100% { color: #f472b6; } 33% { color: #22d3ee; } 66% { color: #fbbf24; } } `}</style>
      <div className={`w-full h-screen relative flex flex-col md:flex-row shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <nav className={`hidden md:flex flex-col w-20 lg:w-48 flex-none border-r-[4px] z-20 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
          <div className="p-4 border-b-[4px] border-current flex items-center justify-center lg:justify-start gap-2 h-20">
            <img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="hidden lg:block text-xs font-black uppercase tracking-widest mt-1">Memorabilia</span>
          </div>
          <div className="flex-1 flex flex-col pt-4">
            <button onTouchStart={handleLibPressStart} onTouchEnd={handleLibPressEnd} onMouseDown={handleLibPressStart} onMouseUp={handleLibPressEnd} onMouseLeave={handleLibPressEnd} onClick={handleLibClick} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-cyan-800 text-white border-l-[4px] border-cyan-400' : 'bg-cyan-400 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}>
              <Library className="w-6 h-6" />
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Coleção</span>
            </button>
            <button onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd} onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd} onClick={handleAddClick} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-amber-700 text-white border-l-[4px] border-amber-400' : 'bg-amber-400 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}>
              <PlusSquare className="w-6 h-6" />
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Adicionar</span>
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-pink-800 text-white border-l-[4px] border-pink-400' : 'bg-pink-500 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}>
              <BarChart2 className="w-6 h-6" />
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </button>
            <div className="mt-auto mb-4">
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white border-l-[4px] border-gray-400' : 'bg-gray-200 border-l-[4px] border-black') : 'border-l-[4px] border-transparent'}`}>
                <Settings className="w-6 h-6" />
                <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Ajustes</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <header className={`flex-none p-3 lg:p-4 border-b-[4px] z-20 flex flex-col gap-2 ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col flex-1 pr-2 w-full overflow-hidden">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none" style={{ ...textShadowStyle, animation: `titleColorCycle ${Math.max(3, speed / 4)}s linear infinite` }}>
                  Memorabilia
                </h1>
                <div className="flex flex-row gap-2 mt-2 w-full h-[38px] md:h-[42px]">
                  {settings?.lastfmUser ? (
                    <div onMouseDown={handleLfmPressStart} onMouseUp={handleLfmPressEnd} onMouseLeave={handleLfmPressEnd} onTouchStart={handleLfmPressStart} onTouchEnd={handleLfmPressEnd} onClick={handleLfmClick} className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[3px] flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all overflow-hidden ${darkMode ? 'bg-pink-900 border-gray-300 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-pink-400 border-black text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                      <Headphones className={`w-3.5 h-3.5 flex-shrink-0 ${isPulsingLfm ? 'animate-pulse' : ''}`} /> 
                      <div className="flex flex-col truncate leading-none justify-center w-full">
                        <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-widest opacity-80 truncate">{lfmLabelStr}</span>
                        <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest truncate w-full">{lfmDisplayStr}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[3px] flex items-center gap-1.5 transition-all overflow-hidden opacity-50 ${darkMode ? 'bg-gray-800 border-gray-300 text-white' : 'bg-gray-200 border-black text-black'}`}>
                      <Headphones className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-[7px] font-black uppercase tracking-widest truncate">Last.FM Off</span>
                    </div>
                  )}
                  {suggestion ? (
                    <div role="button" tabIndex={0} title="Sortear outro disco" onContextMenu={e => e.preventDefault()} onTouchStart={handleSuggPressStart} onTouchEnd={handleSuggPressEnd} onMouseDown={handleSuggPressStart} onMouseUp={handleSuggPressEnd} onMouseLeave={handleSuggPressEnd} onClick={handleSuggClick} style={{ WebkitTouchCallout: 'none' }} className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[3px] flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all overflow-hidden ${darkMode ? 'bg-cyan-900 border-gray-300 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'bg-cyan-400 border-black text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> 
                      <div className="flex flex-col truncate leading-none justify-center w-full">
                        <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-widest opacity-80 truncate">Ouvir Hoje:</span>
                        <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest truncate w-full">{String(suggestion.title || 'S/ Título')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex-1 w-1/2 min-w-0 p-1 px-1.5 border-[3px] flex items-center gap-1.5 transition-all overflow-hidden opacity-50 ${darkMode ? 'bg-gray-800 border-gray-300 text-white' : 'bg-gray-200 border-black text-black'}`}>
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-[7px] font-black uppercase tracking-widest truncate">Sem Discos</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 flex items-center justify-center transition-all duration-300 relative ml-2 md:hidden">
                {toast.visible ? (toast.type === 'error' ? <XIcon className="text-pink-500 w-10 h-10 drop-shadow-md animate-in zoom-in duration-200" /> : <Check className="text-cyan-400 w-10 h-10 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-in zoom-in duration-200" />) : (<img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-full h-full object-contain animate-in zoom-in duration-200 md:hidden" />)}
              </div>
              <div className="hidden md:flex w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 items-center justify-center transition-all duration-300 relative ml-2">
                 {toast.visible && (toast.type === 'error' ? <XIcon className="text-pink-500 w-10 h-10 drop-shadow-md animate-in zoom-in duration-200" /> : <Check className="text-cyan-400 w-10 h-10 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-in zoom-in duration-200" />)}
              </div>
            </div>

            <div className="flex gap-2 flex-row mt-2 items-stretch h-[86px]">
              <div className={`flex-1 w-1/2 flex flex-col p-1.5 border-[3px] text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest leading-tight ${darkMode ? 'border-gray-300 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black bg-gray-100 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                <div className="border-b-[2px] border-current pb-0.5 mb-0.5 flex justify-between opacity-80"><span className="truncate">Coleção Física</span><span className="ml-1 flex-shrink-0">{totalItens}</span></div>
                <div className="flex justify-between truncate mb-0.5"><span className="truncate">Págs Adicionadas:</span><span className="ml-1 truncate">{totalPagesCount}</span></div>
                <div className="flex justify-between truncate mb-0.5"><span className="truncate">Págs Lidas:</span><span className="ml-1 truncate">{readPages} ({readPercentage}%)</span></div>
                <div className="flex justify-between text-amber-500 font-bold transition-opacity duration-500 cursor-pointer active:scale-95 mb-0.5" onClick={() => setRotatingStatIdx(prev => (prev + 1) % rotatingStats.length)}><span className="w-full truncate">{rotatingStats[rotatingStatIdx]}</span></div>
                <div className="flex justify-between text-cyan-500 mt-auto pt-0.5 cursor-pointer active:scale-95" onClick={() => setRatingCatIdx(prev => (prev + 1) % ratingCategories.length)}><span className="truncate">Nota ({currentRatingCat}):</span><span className="ml-1">★ {dynamicAvgRating}</span></div>
              </div>
              <div className={`flex-1 w-1/2 flex flex-col border-[3px] text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest overflow-hidden relative ${darkMode ? 'border-gray-300 bg-black text-white shadow-[2px_2px_0px_rgba(209,213,219,1)]' : 'border-black bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}>
                 <div className="px-1.5 py-1 border-b-[2px] border-gray-800 opacity-80 flex justify-between z-10 bg-black"><span className="truncate">Painel de Status</span><span className="animate-pulse text-cyan-400 ml-1">REC</span></div>
                 <div className="flex-1 flex items-center overflow-hidden w-full relative led-board">
                    <div className="absolute whitespace-nowrap flex items-center" style={{ animation: `marqueeLinear ${speed}s linear infinite`, width: 'max-content' }}>
                      {renderMarqueeContent()} {renderMarqueeContent()}
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

          <nav className={`flex md:hidden flex-none border-t-[4px] z-20 h-16 relative ${darkMode ? 'border-gray-300 bg-gray-900' : 'border-black bg-white'}`}>
            <button onTouchStart={handleLibPressStart} onTouchEnd={handleLibPressEnd} onMouseDown={handleLibPressStart} onMouseUp={handleLibPressEnd} onMouseLeave={handleLibPressEnd} onClick={handleLibClick} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400') : ''}`}>
              <Library className="w-5 h-5 mb-1" />
              <span className="text-[7px] font-black uppercase tracking-widest">Coleção</span>
            </button>
            <button onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd} onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd} onClick={handleAddClick} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400') : ''}`}>
              <PlusSquare className="w-5 h-5 mb-1" />
              <span className="text-[7px] font-black uppercase tracking-widest">Adicionar</span>
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-300 text-gray-300' : 'border-black text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500') : ''}`}>
              <BarChart2 className="w-5 h-5 mb-1" />
              <span className="text-[7px] font-black uppercase tracking-widest">Geral</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center justify-center transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200') : ''}`}>
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-[7px] font-black uppercase tracking-widest">Ajustes</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
