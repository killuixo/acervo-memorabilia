```react
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
// AUDIO ENGINE E ANIMAÇÕES EXTRAS
// ==========================================
let audioCtx = null;
const initAudio = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { console.warn("Áudio não suportado", e); }
};

const playChipBeep = (type) => {
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'save' || type === 'success') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'error') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  } catch (e) {}
};

// ==========================================
// GERADOR DE ID - PADRÃO CRONOLÓGICO + AUTO-INCREMENTO GLOBAL
// ==========================================
let globalSequenceCache = null;

const generateId = (itemsArray = []) => {
  const now = new Date();
  const AAAA = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const Min = String(now.getMinutes()).padStart(2, '0');
  const Seg = String(now.getSeconds()).padStart(2, '0');
  const Ms = String(now.getMilliseconds()).padStart(3, '0');
  
  const timeBase = `${AAAA}${MM}${DD}-${HH}${Min}${Seg}${Ms}`;

  // Se o cache global não foi inicializado, varre os itens para achar a maior sequência
  if (globalSequenceCache === null) {
     let maxSeq = 0;
     itemsArray.forEach(item => {
        const idStr = String(item.id || '');
        // Procura pelo padrão -XXXX no final do ID
        const match = idStr.match(/-(\d{4})$/);
        if (match) {
           const seq = parseInt(match[1], 10);
           if (seq > maxSeq) maxSeq = seq;
        }
     });
     globalSequenceCache = maxSeq;
  }

  globalSequenceCache++; // Incrementa globalmente
  const seqStr = String(globalSequenceCache).padStart(4, '0');
  
  return `${timeBase}-${seqStr}`;
};

// ==========================================
// FUNÇÕES UTILITÁRIAS GLOBAIS
// ==========================================

const resizeImageForAPI = (file, maxWidth = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
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

const normalizeStr = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

const parseTimeStr = (timeStr) => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    return parseInt(parts[0] || 0) + (parseInt(parts[1] || 0) / 60);
  }
  return parseFloat(str.replace(',', '.')) || 0;
};

const getExternalLinkInfo = (type, title, specificLink = '') => {
  if (specificLink && specificLink.trim().startsWith('http')) return { url: specificLink.trim(), isExact: true };
  if (!title) return { url: '#', isExact: false };
  const q = encodeURIComponent(title);
  if (['CD', 'Vinil', 'Fita Cassete'].includes(type)) return { url: `https://www.discogs.com/search?q=${q}&type=all`, isExact: false };
  if (['Livro', 'Quadrinho', 'Revista'].includes(type)) return { url: `https://www.skoob.com.br/livro/lista/busca:${q}`, isExact: false };
  return { url: `https://gamefaqs.gamespot.com/search?game=${q}`, isExact: false };
};

const processCompletedGamesCSV = (csvText) => {
  const rows = parseCSVText(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => normalizeStr(h));
  
  const getIdx = (keywords) => {
    const kws = Array.isArray(keywords) ? keywords : [keywords];
    const normalizedKws = kws.map(k => normalizeStr(k));
    return headers.findIndex(h => normalizedKws.some(kw => h === kw || h.includes(kw)));
  };
  
  const iNome = getIdx(['nome', 'título', 'jogo']); 
  const iConsole = getIdx(['console', 'plataforma']); 
  const iGenero = getIdx(['gênero', 'genero']);
  const iTempo = getIdx(['tempo', 'horas']); 
  const iNota = getIdx(['nota', 'avaliação']); 
  const iSuporte = getIdx(['suporte', 'mídia', 'midia']);
  const iDif = getIdx(['dificuldade']); 
  const iCond = getIdx(['condição', 'condicao', 'objetivo']); 
  const iObs = getIdx(['observação', 'observacao', 'comentário']);
  const iInicio = getIdx(['início', 'inicio', 'começo', 'data de início']); 
  const iFim = getIdx(['fim', 'término', 'termino', 'conclusão', 'data final']);
  const iPrecoPago = getIdx(['preço pago', 'preco pago', 'valor pago']); 
  const iPrecoSemDesc = getIdx(['preço sem desconto', 'preco sem desconto', 'valor original', 'cheio']); 
  const iLink = getIdx(['link', 'url', 'página web']);

  const safeGet = (row, idx) => idx >= 0 && row[idx] ? row[idx].trim() : '';

  const parsed = [];
  for(let i=1; i<rows.length; i++) {
    const row = rows[i];
    if(!row || row.length < 3 || !safeGet(row, iNome)) continue;
    
    let supVal = safeGet(row, iSuporte);
    let isFisico = supVal.toLowerCase().includes('físico') || supVal.toLowerCase().includes('fisico') || supVal === 'F';
    
    let anoFim = '';
    const rawFim = safeGet(row, iFim);
    if (rawFim) { const parts = rawFim.split('/'); if (parts.length === 3) anoFim = parts[2].split(' ')[0]; }
    
    const cleanMoney = (val) => val ? val.replace(/R\$\s?/gi, '').trim() : '';

    parsed.push({
      id: generateId(parsed), 
      nome: safeGet(row, iNome) || 'Desconhecido',
      console: safeGet(row, iConsole) || 'Outro',
      genero: safeGet(row, iGenero) || 'Outro',
      tempoHoras: parseTimeStr(safeGet(row, iTempo)),
      nota: parseFloat((safeGet(row, iNota) || '0').replace(',', '.')) || 0,
      suporteStr: supVal,
      suporte: isFisico ? 'Físico' : 'Digital',
      dificuldade: safeGet(row, iDif) || '--',
      condicao: safeGet(row, iCond) || '--',
      observacao: safeGet(row, iObs) || '',
      inicio: safeGet(row, iInicio) || '--',
      fim: rawFim || '--',
      anoFim: anoFim,
      precoPago: cleanMoney(safeGet(row, iPrecoPago)),
      precoSemDesc: cleanMoney(safeGet(row, iPrecoSemDesc)),
      link: safeGet(row, iLink) || ''
    });
  }
  return parsed;
};

// ==========================================
// ÍCONES NATIVOS
// ==========================================
const Icon = ({ path, className = "w-6 h-6", onClick, fill = "none" }) => (
  <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" className={className}>{path}</svg>
);

const Search = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const Library = (p) => <Icon {...p} path={<><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>} />;
const PlusSquare = (p) => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3"/><path d="M8 12h8"/><path d="M12 8v8"/></>} />;
const BarChart2 = (p) => <Icon {...p} path={<><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></>} />;
const Settings = (p) => <Icon {...p} path={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>} />;
const Camera = (p) => <Icon {...p} path={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />;
const Sun = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>} />;
const Moon = (p) => <Icon {...p} path={<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>} />;
const Download = (p) => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />;
const Upload = (p) => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>} />;
const ExternalLink = (p) => <Icon {...p} path={<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>} />;
const Star = ({ className = '', onClick }) => <Icon onClick={onClick} className={className} fill={className.includes('fill') ? 'currentColor' : 'none'} path={<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>} />;
const ChevronLeft = (p) => <Icon {...p} path={<path d="m15 18-6-6 6-6"/>} />;
const ChevronRight = (p) => <Icon {...p} path={<path d="m9 18 6-6-6-6"/>} />;
const Check = (p) => <Icon {...p} path={<path d="M20 6 9 17l-5-5"/>} />;
const ScanLine = (p) => <Icon {...p} path={<><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></>} />;
const Clock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
const Flame = (p) => <Icon {...p} path={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>} />;
const Ghost = (p) => <Icon {...p} path={<><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></>} />;
const Trophy = (p) => <Icon {...p} path={<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>} />;
const LibraryBig = (p) => <Icon {...p} path={<><rect width="8" height="18" x="3" y="3"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></>} />;
const AlertTriangle = (p) => <Icon {...p} path={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} />;
const Sparkles = (p) => <Icon {...p} path={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;
const FilterIcon = (p) => <Icon {...p} path={<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>} />;
const Calendar = (p) => <Icon {...p} path={<><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></>} />;
const Smartphone = (p) => <Icon {...p} path={<><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>} />;
const GamepadIcon = (p) => <Icon {...p} path={<><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/></>} />;
const DiscIcon = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></>} />;
const MonitorPlay = (p) => <Icon {...p} path={<><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></>} />;
const XIcon = (p) => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const Zap = (p) => <Icon {...p} path={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />;
const ListIcon = (p) => <Icon {...p} path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} />;

// ==========================================
// PWA ENGINE (Injeção Dinâmica do App)
// ==========================================
const usePWA = (iconUrl) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const manifest = {
      name: "Memorabilia", short_name: "Memorabilia", description: "Sua coleção na palma da mão.",
      start_url: ".", display: "standalone", background_color: "#ffffff", theme_color: "#000000",
      icons: [ { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" } ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement('link'); manifestLink.rel = 'manifest'; document.head.appendChild(manifestLink); }
    manifestLink.href = manifestUrl;

    if ('serviceWorker' in navigator) {
      const swCode = `self.addEventListener('fetch', (e) => {});`;
      const swBlob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(swBlob); navigator.serviceWorker.register(swUrl).catch(() => {});
    }

    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
// ==========================================
const getMondrianColor = (index, darkMode) => {
  const colorsLight = ['bg-rose-500', 'bg-sky-500', 'bg-yellow-400', 'bg-white'];
  const colorsDark = ['bg-rose-700', 'bg-sky-700', 'bg-yellow-600', 'bg-gray-800'];
  return darkMode ? colorsDark[index % colorsDark.length] : colorsLight[index % colorsLight.length];
};
const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);
const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bgClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'red') bgClass = darkMode ? 'bg-rose-800 text-white' : 'bg-rose-500 text-black';
  if (variant === 'blue') bgClass = darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black';
  if (variant === 'yellow') bgClass = darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black';
  if (variant === 'black') bgClass = darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white';
  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${disabled ? 'opacity-50 shadow-none translate-y-1 translate-x-1' : 'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bgClass} ${className}`}>
      {icon && icon} {children}
    </button>
  );
};

const MReadOnlyBox = ({ label, value, multiline, darkMode, emphasize=false }) => (
  <div className="flex flex-col mb-3 w-full overflow-hidden">
    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>{label}</label>
    <div className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans ${emph
