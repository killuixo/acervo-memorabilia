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
    <div className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans ${emphasize ? 'text-lg text-rose-500 font-black tracking-widest text-center' : 'text-sm font-bold'} ${multiline ? 'min-h-[80px] whitespace-pre-wrap' : 'truncate'}`}>
      {value || '--'}
    </div>
  </div>
);
const MInput = ({ label, value, onChange, onBlur, type = "text", placeholder = "", multiline = false, darkMode, readOnly=false }) => (
  <div className="flex flex-col mb-3 w-full">
    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>{label}</label>
    {multiline ? (
      <textarea readOnly={readOnly} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly ? '' : 'focus:bg-yellow-100 dark:focus:bg-yellow-900'} transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input readOnly={readOnly} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly ? '' : 'focus:bg-sky-100 dark:focus:bg-sky-900'} transition-colors`} />
    )}
  </div>
);
const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm z-[200]">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>{title}</h3>
        <p className="text-sm font-bold opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="red" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

const MondrianHBar = ({ label, value, max, index, darkMode, valueFormatter = (v)=>v }) => (
  <div className="flex items-center gap-2 w-full mb-2">
    <div className="w-16 text-[9px] font-black uppercase tracking-widest truncate" title={label}>{label}</div>
    <div className={`flex-1 h-5 border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-gray-800 border-gray-500 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-gray-200 border-black'} flex relative overflow-hidden`}>
      <div className={`h-full transition-all duration-1000 ${getMondrianColor(index, darkMode)}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      <span className={`absolute inset-0 flex items-center ml-2 text-[10px] font-black ${darkMode ? 'text-white' : 'text-black'} drop-shadow-md`}>{valueFormatter(value)}</span>
    </div>
  </div>
);

// ==========================================
// ABAS DA APLICAÇÃO
// ==========================================

const LibraryTab = ({ items, setItems, darkMode, settings, onShowToast, activeCategories }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeSubtype, setActiveSubtype] = useState('Todos');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const itemsPerPage = 8;
  
  const filteredItems = useMemo(() => {
    let result = items.map((item, index) => ({ ...item, _originalIndex: index }));
    
    result = result.filter(item => {
      const titleSearch = (item.title || '').toLowerCase();
      const authorSearch = (item.author_developer || '').toLowerCase();
      const query = search.toLowerCase();
      const matchesSearch = titleSearch.includes(query) || authorSearch.includes(query);
      
      let matchesCategory = true;
      if (activeCategory !== 'Todos') {
        if (activeSubtype === 'Todos') matchesCategory = (activeCategories[activeCategory] || []).includes(item.type || '');
        else matchesCategory = (item.type || '') === activeSubtype;
      }
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === 'id') {
         return sortOrder === 'asc' ? a._originalIndex - b._originalIndex : b._originalIndex - a._originalIndex;
      }
      
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';

      if (['year', 'rating', 'pages_or_time'].includes(sortBy)) {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, search, activeCategory, activeSubtype, sortBy, sortOrder, activeCategories]);

  const paginatedItems = filteredItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  const handleSelect = (item) => { setSelectedItem(item); setEditedItem({ ...item }); };
  const updateRatingList = (id, newRating) => { 
    setItems(items.map(item => item.id === id ? { ...item, rating: newRating } : item));
    playChipBeep('save'); onShowToast('success'); 
  };

  const saveModifications = () => {
    setItems(items.map(i => i.id === editedItem.id ? editedItem : i));
    setSelectedItem(editedItem); playChipBeep('save'); onShowToast('success');
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null); setSelectedItem(null); setEditedItem(null);
      playChipBeep('success'); onShowToast('success');
    }
  };

  const fetchWikiInfo = async () => {
    const apiKey = settings?.geminiApiKey || ""; 
    if (!apiKey) { setWikiError("Chave de API ausente (Vá em Ajustes)."); playChipBeep('error'); onShowToast('error'); return; }
    setLoadingWiki(true); setWikiError('');
    try {
      const payload = {
        contents: [{ role: "user", parts: [{ text: `Aja como um historiador, crítico e arquivista especialista. Escreva um parágrafo fascinante e direto (máximo 4 linhas) com curiosidades ou contexto sobre a obra "${editedItem.title || ''}" (Autor/Estúdio: "${editedItem.author_developer || ''}"). Retorne apenas o texto sem formatação extra.` }] }],
        generationConfig: { responseMimeType: "text/plain" }
      };
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) { setEditedItem({...editedItem, wiki_info: aiText}); playChipBeep('success'); onShowToast('success'); }
    } catch (e) { setWikiError(`Erro: ${e.message}`); playChipBeep('error'); onShowToast('error'); } finally { setLoadingWiki(false); }
  };

  if (selectedItem && editedItem) {
    const isBookOrGame = [...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(editedItem.type);
    const linkInfo = getExternalLinkInfo(editedItem.type, editedItem.title);

    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title || 'este item'}" da coleção?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-gray-100 text-black'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[4px] font-black uppercase text-[10px] tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'bg-sky-800 border-sky-500 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'bg-sky-400 border-black text-black'}`}>Salvar</button>
        </MContainer>
        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          <div className="flex gap-4">
            <MContainer darkMode={darkMode} className="w-32 h-44 flex-shrink-0 flex items-center justify-center overflow-hidden" colorClass={`border-[4px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {editedItem.cover_url ? <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" /> : <LibraryBig className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[3px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-500 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>
          
          <a href={linkInfo.url} target="_blank" rel="noopener noreferrer" className={`w-full p-3 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none ${darkMode ? 'bg-gray-800 border-gray-500 text-sky-400' : 'bg-sky-100 border-black text-sky-800'}`}>
            <ExternalLink className="w-4 h-4" /> Buscar "{editedItem.title}" na Web
          </a>

          <div className="grid grid-cols-3 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label={(activeCategories['Livros']||[]).includes(editedItem.type || '') ? 'Págs' : 'Horas/Min'} value={editedItem.pages_or_time || ''} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label="Editora" value={editedItem.publisher || ''} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MInput label="URL da Capa" value={editedItem.cover_url || ''} onChange={e => setEditedItem({...editedItem, cover_url: e.target.value})} darkMode={darkMode} />
            <MInput label="Localização" value={editedItem.location || ''} onChange={e => setEditedItem({...editedItem, location: e.target.value})} darkMode={darkMode} />
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            {isBookOrGame && (
              <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[3px] pb-1 ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${editedItem.status === opt ? (darkMode ? 'bg-sky-700 border-sky-500 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-sky-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-600 text-gray-400 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-white border-black text-black')}`}>{opt}</button>
                  ))}
                </div>
              </MContainer>
            )}
            <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[3px] pb-1 ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Sua Avaliação</label>
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} onClick={() => setEditedItem({...editedItem, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= (editedItem.rating || 0) ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />
                 ))}
              </div>
            </MContainer>
          </div>
          <MInput label="Sinopse / Descrição" multiline value={editedItem.description || ''} onChange={e => setEditedItem({...editedItem, description: e.target.value})} darkMode={darkMode} />
          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-yellow-900/30 text-white' : 'bg-yellow-100 text-black'}>
            <MInput label="Fichamento e Anotações" multiline value={editedItem.notes || ''} onChange={e => setEditedItem({...editedItem, notes: e.target.value})} darkMode={darkMode} />
          </MContainer>
          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-purple-900/20 text-white' : 'bg-purple-200 text-black'}>
            <div className={`flex justify-between items-center mb-3 border-b-[4px] pb-1 ${darkMode ? 'border-purple-800' : 'border-black'}`}>
               <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-4 h-4" /> Enciclopédia (Modo IA)</span>
            </div>
            {editedItem.wiki_info ? (
              <div>
                <p className="text-xs font-bold leading-relaxed opacity-90 whitespace-pre-wrap text-justify mb-3 italic">"{editedItem.wiki_info}"</p>
                <button onClick={fetchWikiInfo} className="text-[9px] font-black uppercase tracking-widest underline opacity-70 hover:opacity-100 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gerar Nova Pesquisa</button>
              </div>
            ) : (
             <div className="text-center py-2">
                {loadingWiki ? (
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-6 h-6 animate-pulse mb-2 text-purple-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse opacity-70">Consultando oráculo digital...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {wikiError && <span className="text-[9px] font-bold text-rose-500 block break-words whitespace-pre-wrap">{wikiError}</span>}
                    <MButton onClick={fetchWikiInfo} darkMode={darkMode} variant="black" className="w-full text-[10px] bg-purple-600 border-black dark:bg-purple-700 text-white">✨ Pesquisar sobre a Obra</MButton>
                  </div>
                )}
              </div>
            )}
          </MContainer>
          <MButton darkMode={darkMode} onClick={() => setItemToDelete(editedItem.id)} variant="red" className="w-full mt-4">Remover da Coleção</MButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MContainer darkMode={darkMode} className="p-3 mb-4 flex flex-col gap-3 sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="flex gap-2 w-full items-center">
          <div className="relative flex-1">
            <Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-black'}`} />
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className={`w-full p-2 pl-8 border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-xs font-bold outline-none`} />
          </div>
          
          <div className="flex gap-1 items-center flex-shrink-0">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`w-[85px] p-2 border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-[8px] font-black uppercase tracking-widest outline-none`}>
              <option value="id">Adição</option>
              <option value="title">Título</option>
              <option value="author_developer">Autor</option>
              <option value="year">Ano</option>
              <option value="rating">Nota</option>
              <option value="pages_or_time">Tamanho</option>
            </select>
            <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className={`w-8 h-[34px] flex items-center justify-center border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Todos', ...Object.keys(activeCategories || {})].map(cat => <button key={cat} onClick={() => { setActiveCategory(cat); setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase tracking-wider font-black border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${activeCategory === cat ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-400 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{cat}</button>)}
        </div>
        {activeCategory !== 'Todos' && activeCategories[activeCategory] && activeCategories[activeCategory].length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => { setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase tracking-wider font-black border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${activeSubtype === 'Todos' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>Todos</button>
            {activeCategories[activeCategory].map(type => <button key={type} onClick={() => { setActiveSubtype(type); setPage(0); }} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase tracking-wider font-black border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${activeSubtype === type ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{type}</button>)}
          </div>
        )}
      </MContainer>
      <div className="flex-1 overflow-y-auto pb-20 px-1">
        {paginatedItems.length === 0 ? (
          <div className="text-center p-10 opacity-50 text-sm font-sans font-black uppercase tracking-widest">Nenhum item encontrado.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row h-32 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleSelect(item)}>
                <MContainer darkMode={darkMode} className="w-5 border-r-0 rounded-l-sm" colorClass={getMondrianColor(idx, darkMode)} />
                <MContainer darkMode={darkMode} className="flex-1 flex p-2 rounded-r-sm" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 truncate">{item.type || '--'} • {item.year || '--'}</div>
                      <div className="text-sm font-black leading-tight break-words line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title || 'S/ Título'}</div>
                      <div className="text-[11px] font-bold opacity-80 truncate uppercase tracking-wide mt-1">{item.author_developer || '--'}</div>
                    </div>
                    <div className="flex justify-between items-end mt-auto">
                      {[...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(item.type) ? (
                        <div className={`text-[8px] px-2 py-1 border-[3px] ${darkMode ? 'border-gray-500 bg-sky-900 text-sky-300' : 'border-black bg-yellow-400 text-black'} font-black uppercase tracking-widest`}>{item.status || '--'}</div>
                      ) : <div></div>}
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                         {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => updateRatingList(item.id, star)} className={`w-[18px] h-[18px] cursor-pointer ${star <= (item.rating || 0) ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
                      </div>
                    </div>
                 </div>
                </MContainer>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 mb-4">
            <MButton darkMode={darkMode} onClick={() => setPage(Math.max(0, page - 1))} className="w-12 h-10" disabled={page === 0}><ChevronLeft className="w-5 h-5" /></MButton>
            <div className="font-sans text-[10px] font-black uppercase tracking-widest">Pág {page + 1} / {totalPages}</div>
            <MButton darkMode={darkMode} onClick={() => setPage(Math.min(totalPages - 1, page + 1))} className="w-12 h-10" disabled={page === totalPages - 1}><ChevronRight className="w-5 h-5" /></MButton>
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
  const updateStatus = (state, message) => setScanBox({ state, message });
  const changeMode = (newMode) => { setAddMode(newMode); if (newMode !== 'manual') { updateStatus('idle', ''); resetGlobalAi(); } };
  
  useEffect(() => {
    if (scannedAIData) {
       setFormData(prev => ({ 
        ...prev, title: scannedAIData.title || '', author_developer: scannedAIData.author_developer || '', year: scannedAIData.year?.toString() || '', publisher: scannedAIData.publisher || '', description: scannedAIData.description || '', pages_or_time: scannedAIData.pages_or_time || prev.pages_or_time, type: allTypes.includes(scannedAIData.type) ? scannedAIData.type : 'Livro'
      }));
      setScannedAIData(null); 
    }
  }, [scannedAIData, setScannedAIData, allTypes]);
  
  const displayBoxState = globalAiState !== 'idle' ? globalAiState : scanBox.state;
  const displayBoxMessage = globalAiState !== 'idle' ? globalAiMessage : scanBox.message;
  
  useEffect(() => {
    let isMounted = true;
    let scannerInstance = null;
    if (addMode === 'barcode' && isHtml5QrcodeLoaded) {
      if (window.Html5Qrcode) {
        scannerInstance = new window.Html5Qrcode("reader-barcode");
        scannerRef.current = scannerInstance;
        scannerInstance.start(
          { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            if (scannerRef.current && scannerRef.current.getState() === 2) {
               scannerRef.current.stop().then(() => {
                  if (isMounted) { setAddMode('manual'); setFormData(prev => ({ ...prev, barcode: decodedText })); fetchMultiDatabase(decodedText); setTimeout(() => { isProcessingScan.current = false; }, 2000); }
               }).catch(e => console.error("Erro ao pausar scanner:", e));
            }
          }, (errorMessage) => { }
        ).catch((err) => { if (isMounted) { updateStatus('error', 'Erro ao acessar a Câmera.'); setAddMode('manual'); } });
      }
    }
    return () => {
      isMounted = false;
      if (scannerInstance) {
         try { const state = scannerInstance.getState(); if (state === 2 || state === 1) { scannerInstance.stop().then(() => scannerInstance.clear()).catch(() => {}); } else { scannerInstance.clear(); } } catch(e) {}
         scannerRef.current = null;
      }
    };
  }, [addMode, isHtml5QrcodeLoaded]);

  const fetchMultiDatabase = async (barcode) => {
    const cleanCode = barcode.replace(/[-\s]/g, "");
    updateStatus('loading', 'Buscando nos bancos de dados...');
    try {
      let foundItem = { barcode: cleanCode, title: '', author_developer: '', publisher: '', year: '', pages_or_time: '', type: 'Livro', cover_url: '', description: '' };
      let found = false;

      if (!found && cleanCode.length >= 10 && cleanCode.length <= 13) {
        try {
          const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`);
          const upcData = await upcRes.json();
          if (upcData.items && upcData.items.length > 0) {
            const item = upcData.items[0];
            foundItem = { ...foundItem, title: item.title || "", publisher: item.brand || item.publisher || "", cover_url: item.images?.length > 0 ? item.images[0] : "", };
            const cat = (item.category || "").toLowerCase(); const tit = (item.title || "").toLowerCase();
            if (cat.includes('music') || tit.includes(' cd') || tit.includes('album')) foundItem.type = 'CD';
            else if (cat.includes('video game') || cat.includes('nintendo') || cat.includes('playstation') || cat.includes('xbox')) foundItem.type = 'PS4';
            else if (cat.includes('dvd') || cat.includes('movie') || tit.includes('dvd')) foundItem.type = 'DVD';
            found = true;
          }
        } catch(e) {}
      }

      if (!found && (!cleanCode.startsWith("978") && !cleanCode.startsWith("979"))) {
        try {
          const mbRes = await fetch(`https://musicbrainz.org/ws/2/release/?query=barcode:${cleanCode}&fmt=json`);
          const mbData = await mbRes.json();
          if (mbData.releases && mbData.releases.length > 0) {
            const release = mbData.releases[0];
            foundItem = { ...foundItem, title: release.title || "", author_developer: release["artist-credit"] ? release["artist-credit"].map(a => a.name).join(", ") : "", publisher: release.label ? release.label : (release["label-info"]?.length > 0 && release["label-info"][0].label ? release["label-info"][0].label.name : ""), year: release.date ? release.date.substring(0, 4) : "", type: 'CD', cover_url: `https://coverartarchive.org/release/${release.id}/front` };
            found = true;
          }
        } catch(e) { }
      }

      if (!found) {
        try {
          const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`);
          const gbData = await gbRes.json();
          if (gbData.items && gbData.items.length > 0) {
            const info = gbData.items[0].volumeInfo;
            foundItem = { ...foundItem, title: info.title || "", author_developer: info.authors ? info.authors.join(", ") : "", publisher: info.publisher || "", year: info.publishedDate ? info.publishedDate.substring(0, 4) : "", pages_or_time: info.pageCount?.toString() || "", cover_url: info.imageLinks?.thumbnail?.replace("http://", "https://") || "", description: info.description || "", type: 'Livro' };
            const pub = (info.publisher || "").toLowerCase(); if (pub.includes('jbc') || pub.includes('conrad') || pub.includes('panini')) foundItem.type = 'Quadrinho';
            found = true;
          }
        } catch(e) { }
      }

      if (!found) {
        try {
          const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&jscmd=data&format=json`);
          const olData = await olRes.json();
          if (olData[`ISBN:${cleanCode}`]) {
            const info = olData[`ISBN:${cleanCode}`];
            foundItem = { ...foundItem, title: info.title || '', author_developer: info.authors?.map(a => a.name).join(', ') || '', year: info.publish_date ? info.publish_date.substring(0, 4) : '', publisher: info.publishers?.map(p => p.name).join(', ') || '', pages_or_time: info.number_of_pages?.toString() || '', description: info.subtitle || '', cover_url: `https://covers.openlibrary.org/b/isbn/${cleanCode}-L.jpg`, type: 'Livro' };
            found = true;
          }
        } catch(e) { }
      }

      if (found) { playChipBeep('success'); updateStatus('success', 'Encontrado!'); setFormData(prev => ({ ...prev, ...foundItem })); } 
      else { playChipBeep('error'); updateStatus('error', 'Não encontrado em banco online. Preencha manualmente.'); }
    } catch (e) { playChipBeep('error'); updateStatus('error', 'Não encontrado. Preencha manualmente.'); }
  };

  const [showErrorModal, setShowErrorModal] = useState(false);
  const handleSave = () => {
    if (!formData.title) { playChipBeep('error'); setShowErrorModal(true); return; }
    
    const classCode = activeClassCodes[formData.type] || '000';
    const prefix = settings?.archivePrefix ? settings.archivePrefix.trim().toUpperCase() : 'MBU';
    
    let maxSeq = 0;
    items.forEach(item => {
      if(item.archive_code) { 
        const parts = item.archive_code.split('-'); 
        if (parts.length >= 3 && parts[1] === classCode) { 
           const seqNum = parseInt(parts[2], 10); 
           if(!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum; 
        } 
      }
    });
    
    const sequence = String(maxSeq + 1).padStart(4, '0');
    
    const newItem = { ...formData, id: generateId(items), archive_code: `${prefix}-${classCode}-${sequence}` };
    
    setItems([...items, newItem]); 
    
    if (settings?.googleSheetsUrl) {
      fetch(settings.googleSheetsUrl, { 
        method: 'POST', 
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify(newItem) 
      }).catch(err => console.error("Erro ao enviar Google Sheets:", err));
    }
    
    playChipBeep('save'); onShowToast('success');
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    updateStatus('idle', ''); resetGlobalAi(); setActiveTab('library');
  };

  const isBookOrGame = [...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(formData.type);
  
  return (
    <div className="flex flex-col h-full pb-20">
      <MModal isOpen={showErrorModal} title="Atenção" message="O Título é obrigatório para salvar." onConfirm={() => setShowErrorModal(false)} onCancel={() => setShowErrorModal(false)} darkMode={darkMode} confirmText="OK" cancelText="Fechar" />
      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode === 'manual' ? 'blue' : 'white'} onClick={() => changeMode('manual')} className="flex-1 py-2 text-[10px]"><PlusSquare className="w-4 h-4" /> Manual</MButton>
        <MButton darkMode={darkMode} variant={addMode === 'barcode' ? 'yellow' : 'white'} onClick={() => changeMode('barcode')} className="flex-1 py-2 text-[10px]"><ScanLine className="w-4 h-4" /> Barcode</MButton>
        <MButton darkMode={darkMode} variant="red" onClick={triggerGlobalAI} className="flex-1 py-2 text-[10px]"><Camera className="w-4 h-4" /> Auto IA</MButton>
      </div>
      {displayBoxState !== 'idle' && (
        <div className={`p-4 mb-4 flex items-start gap-3 border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest transition-colors duration-300 ${displayBoxState === 'loading' ? (darkMode ? 'bg-yellow-700 border-yellow-500 text-white' : 'bg-yellow-400 border-black text-black') : displayBoxState === 'success' ? (darkMode ? 'bg-sky-800 border-sky-500 text-white' : 'bg-sky-400 border-black text-black') : (darkMode ? 'bg-rose-800 border-rose-500 text-white' : 'bg-rose-400 border-black text-black')}`}>
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
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-[4px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none flex flex-col items-center justify-center z-20">
            <span className="text-white text-[10px] uppercase font-black tracking-widest bg-black px-3 py-1 mt-24">Alinhe o Código</span>
          </div>
        </MContainer>
      )}
      {addMode === 'manual' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Formato Específico</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-sm outline-none font-black`}>
                {Object.entries(activeCategories || {}).map(([cat, subs]) => (<optgroup label={`--- ${cat.toUpperCase()} ---`} key={cat}>{(Array.isArray(subs) ? subs : []).map(sub => <option key={sub} value={sub}>{sub}</option>)}</optgroup>))}
              </select>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2 w-full">
              <div className="col-span-3"><MInput darkMode={darkMode} label="Título *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="col-span-1"><MInput darkMode={darkMode} label="Ano" type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} /></div>
            </div>
            <MInput darkMode={darkMode} label="Autor / Desenvolvedor" value={formData.author_developer} onChange={e => setFormData({...formData, author_developer: e.target.value})} />
            <div className="grid grid-cols-4 gap-2 mb-2 w-full">
              <div className="col-span-3"><MInput darkMode={darkMode} label="Editora / Gravadora" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} /></div>
              <div className="col-span-1"><MInput darkMode={darkMode} label="Págs/Tempo" type="number" value={formData.pages_or_time} onChange={e => setFormData({...formData, pages_or_time: e.target.value})} /></div>
            </div>
            <MInput darkMode={darkMode} label="URL da Capa (Opcional)" value={formData.cover_url} onChange={e => setFormData({...formData, cover_url: e.target.value})} />
            <MInput darkMode={darkMode} label="Localização" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            <MInput darkMode={darkMode} label="Descrição" multiline value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <MInput darkMode={darkMode} label="Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            {isBookOrGame && (
              <div className="mb-4">
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${formData.status === opt ? (darkMode ? 'bg-sky-700 border-sky-500 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-sky-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-600 text-gray-400 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-white border-black text-black')}`}>{opt}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Avaliação (Nota)</label>
              <div className={`flex gap-2 p-3 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] justify-center ${darkMode ? 'border-gray-500 bg-gray-800 shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white'}`}>
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setFormData({...formData, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= formData.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
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
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterRating, setFilterRating] = useState('Todas');
  const dashItems = useMemo(() => {
    return items.filter(item => {
      let mCat = true, mStatus = true, mRating = true;
      if (filterCat !== 'Todas') { const catTypes = activeCategories[filterCat] || []; mCat = catTypes.includes(item.type); }
      if (filterStatus !== 'Todos') mStatus = item.status === filterStatus;
      if (filterRating !== 'Todas') mRating = item.rating === parseInt(filterRating);
      return mCat && mStatus && mRating;
    });
  }, [items, filterCat, filterStatus, filterRating, activeCategories]);
  const totalDash = dashItems.length;
  const byType = dashItems.reduce((acc, i) => { acc[i.type || 'Outro'] = (acc[i.type || 'Outro'] || 0) + 1; return acc; }, {});
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxType = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;
  const byAuthor = dashItems.reduce((acc, i) => { if (i.author_developer) { acc[i.author_developer] = (acc[i.author_developer] || 0) + 1; } return acc; }, {});
  const sortedAuthors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxAuthor = sortedAuthors.length > 0 ? sortedAuthors[0][1] : 1;
  const byDecade = dashItems.reduce((acc, i) => {
    const year = parseInt(i.year);
    if (!isNaN(year) && year > 1800) { const decade = Math.floor(year / 10) * 10; acc[decade] = (acc[decade] || 0) + 1; }
    return acc;
  }, {});
  const decadesKeys = Object.keys(byDecade).sort();
  const maxDecade = decadesKeys.length > 0 ? Math.max(...Object.values(byDecade)) : 1;
  const stats = useMemo(() => {
    if (totalDash === 0) return {};
    const validYears = dashItems.filter(i => i.year && !isNaN(parseInt(i.year)));
    const reliquia = validYears.length > 0 ? validYears.reduce((a, b) => parseInt(a.year) < parseInt(b.year) ? a : b) : null;
    const validLengths = dashItems.filter(i => i.pages_or_time && !isNaN(parseInt(i.pages_or_time)));
    const epico = validLengths.length > 0 ? validLengths.reduce((a, b) => parseInt(a.pages_or_time) > parseInt(b.pages_or_time) ? a : b) : null;
    const vergonha = dashItems.filter(i => i.status === 'Não Iniciado').length;
    return { reliquia, epico, vergonha };
  }, [dashItems, totalDash]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4 scrollbar-hide">
      <MContainer darkMode={darkMode} className="p-3 sticky top-0 z-20 flex flex-col gap-2" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-b-[3px] pb-1 mb-1 border-current">
          <FilterIcon className="w-4 h-4" /> Filtros Interativos
        </div>
        <div className="flex gap-2">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
            <option value="Todas">Tudo</option>
            {Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
            <option value="Todos">Status</option>
            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
            <option value="Todas">Notas</option>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Estrelas</option>)}
          </select>
        </div>
      </MContainer>

      <div className="grid grid-cols-2 gap-3">
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black'}>
          <LibraryBig className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-20`} />
          <div className="text-5xl font-black z-10">{totalDash}</div>
          <div className="text-[9px] font-black uppercase tracking-widest mt-1 z-10 text-center">Itens no Filtro</div>
        </MContainer>
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}>
          <Ghost className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-20`} />
          <div className="text-5xl font-black z-10">{stats.vergonha || 0}</div>
          <div className="text-[9px] font-black uppercase tracking-widest mt-1 z-10 text-center">Intocados / Backlog</div>
        </MContainer>
      </div>

      {totalDash === 0 && <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest opacity-50">Nenhum dado para este filtro.</div>}

      {totalDash > 0 && (
        <>
          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
             <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Formatos Populares</div>
            <div className="flex flex-col">
              {sortedTypes.map(([type, count], index) => <MondrianHBar key={type} label={type} value={count} max={maxType} index={index} darkMode={darkMode} />)}
            </div>
          </MContainer>

          <div className="grid grid-cols-2 gap-3">
             {stats.reliquia && (
              <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between min-h-[100px]" colorClass={darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black'}>
                <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">A Relíquia</div><Clock className="w-5 h-5 opacity-50" /></div>
                <div><div className="text-xs font-black leading-tight break-words line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stats.reliquia.title}</div><div className="text-[9px] font-bold mt-1">Ano {stats.reliquia.year}</div></div>
              </MContainer>
            )}
             {stats.epico && (
              <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between min-h-[100px]" colorClass={darkMode ? 'bg-rose-800 text-white' : 'bg-rose-500 text-black'}>
                <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">O Épico</div><Flame className="w-5 h-5 opacity-50" /></div>
                <div>
                   <div className="text-xs font-black leading-tight break-words line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stats.epico.title}</div>
                   <div className="text-[9px] font-bold mt-1">{stats.epico.pages_or_time} {((activeCategories['Livros']||[]).includes(stats.epico.type)) ? 'Págs' : 'Horas'}</div>
                </div>
              </MContainer>
            )}
          </div>

          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Top 5 Autores / Estúdios</div>
            <div className="flex flex-col">
              {sortedAuthors.map(([author, count], index) => <MondrianHBar key={author} label={author} value={count} max={maxAuthor} index={index + 1} darkMode={darkMode} />)}
            </div>
          </MContainer>

          {decadesKeys.length > 0 && (
            <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
              <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 flex justify-between ${darkMode ? 'border-gray-500' : 'border-black'}`}><span>Linha do Tempo</span><Calendar className="w-4 h-4" /></div>
              <div className="flex items-end gap-2 h-32 pt-4 border-b-[3px] border-current overflow-x-auto scrollbar-hide">
                {decadesKeys.map((decadeStr, idx) => {
                  const count = byDecade[decadeStr]; const heightPerc = (count / maxDecade) * 100;
                  return (
                    <div key={decadeStr} className="flex flex-col items-center flex-1 min-w-[30px] group">
                      <div className="text-[10px] font-black mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                      <div className={`w-full border-[3px] border-b-0 shadow-[-2px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-1000 ${getMondrianColor(idx + 2, darkMode)} ${darkMode ? 'border-gray-500' : 'border-black'}`} style={{ height: `${heightPerc}%` }}></div>
                   </div>
                  );
                })}
              </div>
              <div className="flex justify-between gap-2 mt-2 px-1 overflow-x-auto scrollbar-hide">
                {decadesKeys.map(decadeStr => <div key={`label-${decadeStr}`} className="flex-1 min-w-[30px] text-center text-[8px] font-black uppercase tracking-widest">{decadeStr}s</div>)}
              </div>
            </MContainer>
          )}
       </>
      )}
    </div>
  );
};

// ==========================================
// COMPONENTE DASHBOARD DE JOGOS ZERADOS
// ==========================================
const CompletedGamesTab = ({ completedGames, setCompletedGames, settings, darkMode, onShowToast }) => {
  const [filterConsole, setFilterConsole] = useState('Todos');
  const [filterGenre, setFilterGenre] = useState('Todos');
  const [filterSupport, setFilterSupport] = useState('Todos');
  const [page, setPage] = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);
  const itemsPerPage = 20;

  const handleManualImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = processCompletedGamesCSV(evt.target.result);
      if (parsed.length > 0) {
        setCompletedGames(parsed); playChipBeep('success'); onShowToast('success');
      } else {
        playChipBeep('error'); onShowToast('error');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const filteredGames = useMemo(() => {
    return completedGames.filter(g => {
      let mConsole = true, mGenre = true, mSup = true;
      if(filterConsole !== 'Todos') mConsole = g.console === filterConsole;
      if(filterGenre !== 'Todos') mGenre = g.genero === filterGenre;
      if(filterSupport !== 'Todos') mSup = g.suporte === filterSupport;
      return mConsole && mGenre && mSup;
    });
  }, [completedGames, filterConsole, filterGenre, filterSupport]);
  
  const paginatedGames = filteredGames.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage) || 1;
  const uniqueConsoles = [...new Set(completedGames.map(g => g.console))].sort();
  const uniqueGenres = [...new Set(completedGames.map(g => g.genero))].sort();

  const totalJogos = filteredGames.length;
  const totalHoras = filteredGames.reduce((acc, g) => acc + g.tempoHoras, 0).toFixed(1);
  const notasValidas = filteredGames.filter(g => g.nota > 0);
  const mediaNota = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b.nota, 0) / notasValidas.length).toFixed(1) : 0;
  const fisicosCount = filteredGames.filter(g => g.suporte === 'Físico').length;
  const fisicoPerc = totalJogos > 0 ? ((fisicosCount / totalJogos) * 100).toFixed(0) : 0;

  const byConsole = filteredGames.reduce((acc, g) => { acc[g.console] = (acc[g.console] || 0) + 1; return acc; }, {});
  const topConsoles = Object.entries(byConsole).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxConsole = topConsoles.length > 0 ? topConsoles[0][1] : 1;
  const byGenre = filteredGames.reduce((acc, g) => { acc[g.genero] = (acc[g.genero] || 0) + 1; return acc; }, {});
  const topGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxGenre = topGenres.length > 0 ? topGenres[0][1] : 1;
  const byYear = filteredGames.reduce((acc, g) => {
    if (g.anoFim) { acc[g.anoFim] = (acc[g.anoFim] || 0) + 1; }
    return acc;
  }, {});
  const yearsKeys = Object.keys(byYear).sort();
  const maxYear = yearsKeys.length > 0 ? Math.max(...Object.values(byYear)) : 1;
  
  if (completedGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <GamepadIcon className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-black uppercase tracking-widest mb-2">Sem Dados</h2>
        <p className="text-[10px] font-bold mb-6 opacity-70">Acesse a aba Ajustes para fazer o upload do .CSV atualizado da sua lista de jogos zerados.</p>
        <label className={`cursor-pointer w-full py-4 text-center border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase tracking-widest active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'bg-sky-800 border-gray-500 text-white shadow-[4px_4px_0px_rgba(100,100,100,0.5)]' : 'bg-sky-400 border-black text-black'}`}>
          📤 Fazer Upload do CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleManualImport} />
        </label>
      </div>
    );
  }

  // --- MODO DETALHE ---
  if (selectedGame) {
    const linkInfo = getExternalLinkInfo('PS4', selectedGame.nome, selectedGame.link);
    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedGame(null)} className={`p-2 border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-gray-100 text-black'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Registro de Conclusão</div>
          </div>
        </MContainer>
        
        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          <div className="flex gap-4">
            <MContainer darkMode={darkMode} className="w-32 h-44 flex-shrink-0 flex flex-col items-center justify-center overflow-hidden" colorClass={`border-[4px] ${darkMode ? 'bg-sky-900' : 'bg-sky-200'}`}>
               <GamepadIcon className={`w-12 h-12 mb-2 ${darkMode ? 'text-white opacity-40' : 'text-black opacity-30'}`} />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60 px-2 text-center">{selectedGame.console}</span>
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[3px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-sky-500 text-sky-300 bg-sky-900' : 'border-black text-black bg-sky-300'}`}>FINALIZADO</div>
              <MReadOnlyBox label="Nome do Jogo" value={selectedGame.nome} darkMode={darkMode} />
              <MReadOnlyBox label="Gênero" value={selectedGame.genero} darkMode={darkMode} />
            </div>
          </div>

          <a href={linkInfo.url} target="_blank" rel="noopener noreferrer" className={`w-full p-3 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none ${darkMode ? 'bg-gray-800 border-gray-500 text-sky-400' : 'bg-sky-100 border-black text-sky-800'}`}>
            <ExternalLink className="w-4 h-4" /> {linkInfo.isExact ? "Acessar Link Salvo na Planilha" : `Buscar "${selectedGame.nome}" na Web`}
          </a>

          <div className="grid grid-cols-2 gap-2">
            <MReadOnlyBox label="Sua Nota Final" value={`★ ${selectedGame.nota} / 10`} darkMode={darkMode} emphasize={true} />
            <MReadOnlyBox label="Tempo de Jogo" value={`${selectedGame.tempoHoras.toFixed(1)}h`} darkMode={darkMode} emphasize={true} />
            <MReadOnlyBox label="Dificuldade Jogado" value={selectedGame.dificuldade} darkMode={darkMode} />
            <MReadOnlyBox label="Mídia (Suporte)" value={selectedGame.suporteStr || selectedGame.suporte} darkMode={darkMode} />
            <MReadOnlyBox label="Data de Início" value={selectedGame.inicio} darkMode={darkMode} />
            <MReadOnlyBox label="Data de Término" value={selectedGame.fim} darkMode={darkMode} />
          </div>

          {(selectedGame.precoPago || selectedGame.precoSemDesc) && (
            <MContainer darkMode={darkMode} className="p-3 grid grid-cols-2 gap-2" colorClass={darkMode ? 'bg-rose-900/40 text-white' : 'bg-rose-100 text-black'}>
                <MReadOnlyBox label="Preço Pago" value={selectedGame.precoPago ? `R$ ${selectedGame.precoPago}` : '--'} darkMode={darkMode} />
               <MReadOnlyBox label="Preço Sem Desconto" value={selectedGame.precoSemDesc ? `R$ ${selectedGame.precoSemDesc}` : '--'} darkMode={darkMode} />
            </MContainer>
          )}

          <MReadOnlyBox label="Condição de Conclusão (Objetivo)" value={selectedGame.condicao} multiline darkMode={darkMode} />
          <MReadOnlyBox label="Observações Pessoais" value={selectedGame.observacao} multiline darkMode={darkMode} />
        </div>
      </div>
    );
  }

  // --- MODO DASHBOARD / LISTA ---
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4 scrollbar-hide">
      <MContainer darkMode={darkMode} className="p-3 sticky top-0 z-20 flex flex-col gap-2" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-b-[3px] pb-1 mb-1 border-current">
          <div className="flex items-center gap-2"><FilterIcon className="w-4 h-4" /> Filtros de Zerados</div>
        </div>
        <div className="flex gap-2">
          <select value={filterConsole} onChange={e => { setFilterConsole(e.target.value); setPage(0); }} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
            <option value="Todos">Consoles</option>
            {uniqueConsoles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterGenre} onChange={e => { setFilterGenre(e.target.value); setPage(0); }} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
            <option value="Todos">Gêneros</option>
            {uniqueGenres.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSupport} onChange={e => { setFilterSupport(e.target.value); setPage(0); }} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'}`}>
            <option value="Todos">Mídia</option>
            <option value="Físico">Física</option>
            <option value="Digital/Outro">Digital</option>
          </select>
        </div>
      </MContainer>

      {/* BLOCO DE ESTATÍSTICAS */}
      <div className="grid grid-cols-2 gap-3">
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black'}>
          <GamepadIcon className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-20`} />
          <div className="text-5xl font-black z-10">{totalJogos}</div>
          <div className="text-[9px] font-black uppercase tracking-widest mt-1 z-10 text-center">Jogos Finalizados</div>
        </MContainer>
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode ? 'bg-rose-800 text-white' : 'bg-rose-500 text-black'}>
          <Clock className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-20`} />
          <div className="text-3xl font-black z-10">{totalHoras}h</div>
          <div className="text-[9px] font-black uppercase tracking-widest mt-1 z-10 text-center">Total de Horas</div>
        </MContainer>
        <MContainer darkMode={darkMode} className="p-3 flex flex-col items-center justify-center h-20" colorClass={darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black'}>
          <div className="text-2xl font-black z-10">★ {mediaNota}</div>
          <div className="text-[8px] font-black uppercase tracking-widest mt-1 z-10 text-center">Média Geral / 10</div>
        </MContainer>
        <MContainer darkMode={darkMode} className="p-3 flex flex-col items-center justify-center h-20 relative overflow-hidden" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-black text-white'}>
          <DiscIcon className={`absolute -right-2 -bottom-2 w-12 h-12 opacity-20`} />
          <div className="text-2xl font-black z-10">{fisicoPerc}%</div>
          <div className="text-[8px] font-black uppercase tracking-widest mt-1 z-10 text-center">Mídia Física</div>
        </MContainer>
      </div>

      {/* BLOCO DE GRÁFICOS */}
      <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Consoles Dominantes</div>
        <div className="flex flex-col">
          {topConsoles.map(([cons, count], index) => <MondrianHBar key={cons} label={cons} value={count} max={maxConsole} index={index} darkMode={darkMode} />)}
          {topConsoles.length === 0 && <span className="opacity-50 text-xs">Sem dados.</span>}
        </div>
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Gêneros Favoritos</div>
        <div className="flex flex-col">
          {topGenres.map(([gen, count], index) => <MondrianHBar key={gen} label={gen} value={count} max={maxGenre} index={index + 2} darkMode={darkMode} />)}
          {topGenres.length === 0 && <span className="opacity-50 text-xs">Sem dados.</span>}
        </div>
      </MContainer>

      {yearsKeys.length > 0 && (
        <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 flex justify-between ${darkMode ? 'border-gray-500' : 'border-black'}`}><span>Linha do Tempo (Conclusão)</span><Calendar className="w-4 h-4" /></div>
          <div className="flex items-end gap-2 h-32 pt-4 border-b-[3px] border-current overflow-x-auto scrollbar-hide">
            {yearsKeys.map((yearStr, idx) => {
              const count = byYear[yearStr];
              const heightPerc = (count / maxYear) * 100;
              return (
                <div key={yearStr} className="flex flex-col items-center flex-1 min-w-[30px] group">
                  <div className="text-[10px] font-black mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                  <div className={`w-full border-[3px] border-b-0 shadow-[-2px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-1000 ${getMondrianColor(idx + 1, darkMode)} ${darkMode ? 'border-gray-500' : 'border-black'}`} style={{ height: `${heightPerc}%` }}></div>
                 </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 mt-2 px-1 overflow-x-auto scrollbar-hide">
            {yearsKeys.map(yearStr => <div key={`label-${yearStr}`} className="flex-1 min-w-[30px] text-center text-[8px] font-black uppercase tracking-widest">{yearStr}</div>)}
          </div>
        </MContainer>
      )}

      {/* BLOCO DA LISTA PAGINADA */}
      <div className={`text-[10px] font-black uppercase tracking-widest border-b-[4px] pb-2 mt-4 ${darkMode ? 'border-gray-500' : 'border-black'}`}>
        Lista Completa ({paginatedGames.length} de {filteredGames.length})
      </div>
      <div className="flex flex-col gap-3">
        {paginatedGames.map((g) => (
          <div key={g.id} onClick={() => setSelectedGame(g)} className={`cursor-pointer p-2 border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'bg-gray-800 border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-white border-black'} flex justify-between`}>
             <div className="flex flex-col flex-1 overflow-hidden pr-2">
                <div className="text-sm font-black truncate">{g.nome}</div>
                <div className="text-[9px] font-bold uppercase opacity-70 truncate">{g.console} • {g.genero}</div>
                <div className="text-[8px] font-black mt-1 uppercase text-sky-600 dark:text-sky-400">{g.suporte} ({g.suporteStr})</div>
             </div>
             <div className="flex flex-col items-end justify-center min-w-[50px] border-l-[3px] border-current pl-2">
                <div className="text-[12px] font-black leading-none">★ {g.nota}/10</div>
                <div className="text-[8px] font-bold mt-1 opacity-70">{g.tempoHoras.toFixed(1)}h</div>
             </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 mb-4">
          <MButton darkMode={darkMode} onClick={() => setPage(Math.max(0, page - 1))} className="w-12 h-10" disabled={page === 0}><ChevronLeft className="w-5 h-5" /></MButton>
          <div className="font-sans text-[10px] font-black uppercase tracking-widest">Página {page + 1} / {totalPages}</div>
          <MButton darkMode={darkMode} onClick={() => setPage(Math.min(totalPages - 1, page + 1))} className="w-12 h-10" disabled={page === totalPages - 1}><ChevronRight className="w-5 h-5" /></MButton>
        </div>
      )}
    </div>
  );
};

const SettingsTab = ({ items, setItems, settings, setSettings, darkMode, setDarkMode, onShowToast, pwa, completedGames, setCompletedGames, activeCategories, activeClassCodes }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importData, setImportData] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [newSubclass, setNewSubclass] = useState({ parent: 'Livros', name: '', code: '' });
  
  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['ID', 'Código Arquivístico', 'Tipo', 'Título', 'Autor/Desenvolvedor', 'Ano', 'Editora/Gravadora', 'Status', 'Nota', 'Páginas/Tempo', 'Código de Barras', 'Descrição', 'URL da Capa', 'Localização', 'Anotações', 'Wiki'];
    const escape = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
    const rows = items.map(i => [escape(i.id), escape(i.archive_code), escape(i.type), escape(i.title), escape(i.author_developer), escape(i.year), escape(i.publisher), escape(i.status), i.rating || 0, escape(i.pages_or_time), escape(i.barcode), escape(i.description), escape(i.cover_url), escape(i.location), escape(i.notes), escape(i.wiki_info)]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Memorabilia_Export_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const validRows = parseCSVText(text);
      if (validRows.length < 2) return;

      const headers = validRows[0].map(h => h.trim());
      const newItems = [];
      for (let i = 1; i < validRows.length; i++) {
        const currentRow = validRows[i];
        if (currentRow.length === 1 && !currentRow[0].trim()) continue;
        const item = {};
        headers.forEach((h, idx) => {
          let key = h;
          if (h === 'ID') key = 'id';
          if (h === 'Código Arquivístico') key = 'archive_code';
          if (h === 'Tipo') key = 'type';
          if (h === 'Título') key = 'title';
          if (h === 'Autor/Desenvolvedor') key = 'author_developer';
          if (h === 'Ano' || h === 'Data' || h === 'Ano Lançamento') key = 'year';
          if (h === 'Editora/Gravadora') key = 'publisher';
          if (h === 'Status') key = 'status';
          if (h === 'Nota') key = 'rating';
          if (h === 'Páginas/Tempo' || h === 'Métrica' || h === 'Páginas') key = 'pages_or_time';
          if (h === 'Código de Barras' || h === 'ISBN/Código') key = 'barcode';
          if (h === 'Descrição') key = 'description';
          if (h === 'URL da Capa') key = 'cover_url';
          if (h === 'Localização') key = 'location';
          if (h === 'Anotações') key = 'notes';
          if (h === 'Wiki') key = 'wiki_info';

          item[key] = currentRow[idx] ? currentRow[idx].trim() : '';
        });
        
        // Passa o newItems para que o gerador de ID atualize a sequência durante uma importação em massa
        if (item.id) { 
            item.rating = parseInt(item.rating) || 0; 
            newItems.push(item); 
        } else if (item.title) { 
            item.id = generateId(newItems); 
            item.rating = parseInt(item.rating) || 0; 
            newItems.push(item); 
        }
      }
      if (newItems.length > 0) setImportData(newItems);
      }; 
    reader.readAsText(file); 
    e.target.value = null;
  };

  const handleImportCompletedCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = processCompletedGamesCSV(evt.target.result);
      if (parsed.length > 0) {
        setCompletedGames(parsed); playChipBeep('success'); onShowToast('success');
      } else {
        playChipBeep('error'); onShowToast('error');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleSaveSettings = () => { playChipBeep('save'); onShowToast('success'); };
  
  const handleAddSubclass = () => {
    if (!newSubclass.name || !newSubclass.code) { playChipBeep('error'); onShowToast('error'); return; }
    
    const updatedCats = { ...activeCategories };
    if (!updatedCats[newSubclass.parent]) {
      updatedCats[newSubclass.parent] = [];
    }
    if (!updatedCats[newSubclass.parent].includes(newSubclass.name.trim())) {
      updatedCats[newSubclass.parent] = [...updatedCats[newSubclass.parent], newSubclass.name.trim()];
    }
    
    setSettings({
      ...settings,
      userCategories: updatedCats,
      userClassCodes: { ...activeClassCodes, [newSubclass.name.trim()]: newSubclass.code.trim() }
    });
    setNewSubclass({ parent: 'Livros', name: '', code: '' });
    playChipBeep('save'); onShowToast('success');
  };
  
  const handleUpdateCode = (type, newCode) => {
    setSettings({
      ...settings,
      userClassCodes: { ...activeClassCodes, [type]: newCode }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative">
      <MModal isOpen={showResetConfirm} title="Aviso Crítico" message="Deseja realmente apagar TODOS os itens da sua biblioteca principal? Esta ação não tem volta." onConfirm={() => { setItems([]); setShowResetConfirm(false); playChipBeep('success'); onShowToast('success'); }} onCancel={() => setShowResetConfirm(false)} darkMode={darkMode} confirmText="Apagar Tudo" />
      <MModal isOpen={!!importData} title="Importar CSV Principal" message={`Foram encontrados ${importData ? importData.length : 0} itens. Substituir a coleção atual?`} onConfirm={() => { if (importData) { setItems(importData); setImportData(null); playChipBeep('success'); onShowToast('success'); } }} onCancel={() => setImportData(null)} darkMode={darkMode} confirmText="Substituir Coleção" />

      {pwa.isInstallable && !pwa.isInstalled && (
        <MContainer darkMode={darkMode} className="p-4 mb-4 flex flex-col items-center justify-center text-center animate-pulse border-sky-500 bg-sky-100 dark:bg-sky-900" colorClass="border-sky-500">
          <Smartphone className="w-8 h-8 mb-2 text-sky-600 dark:text-sky-400" />
          <h3 className="font-black uppercase tracking-widest text-sky-700 dark:text-sky-300 text-lg mb-1">Instalar App</h3>
          <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-3 px-2">Adicione o Memorabilia à tela inicial para abri-lo como aplicativo nativo.</p>
          <MButton darkMode={darkMode} onClick={pwa.promptInstall} variant="blue" className="w-full py-4 text-sm font-black text-black">
            📲 Instalar Agora
          </MButton>
        </MContainer>
      )}

      {/* BLOCO: APARÊNCIA E VELOCIDADE - ACCORDION */}
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <button onClick={() => setOpenSection(openSection === 'aparencia' ? null : 'aparencia')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'aparencia' ? (darkMode ? 'border-b-[4px] border-gray-500' : 'border-b-[4px] border-black') : ''}`}>
          <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Aparência & Interface</span>
          <span className="text-lg font-mono">{openSection === 'aparencia' ? '−' : '+'}</span>
        </button>
        {openSection === 'aparencia' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">Tema Visual</span>
              <button onClick={() => { setDarkMode(!darkMode); playChipBeep('save'); onShowToast('success'); }} className={`px-4 py-2 border-[4px] font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-gray-200 text-black'}`}>
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
              </button>
            </div>
            
            <div className="border-t-[4px] border-current pt-3 opacity-90 flex flex-col gap-5">
               <div>
                   <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Velocidade do Painel LED</div>
                   <div className="flex flex-col gap-2 w-full mt-2">
                     <input
                       type="range"
                       min="10"
                       max="150"
                       step="1"
                       value={160 - (Number(settings?.marqueeSpeed) || 35)}
                       onChange={(e) => {
                         const newSpeed = 160 - parseInt(e.target.value);
                         setSettings({...settings, marqueeSpeed: newSpeed});
                       }}
                       onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }}
                       onTouchEnd={() => { playChipBeep('save'); onShowToast('success'); }}
                       className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                       style={{ accentColor: '#38bdf8' }}
                     />
                     <div className="flex justify-between text-[8px] font-black uppercase opacity-60">
                       <span>Lento</span>
                       <span>Rápido</span>
                     </div>
                   </div>
               </div>

               <div>
                   <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Sun className="w-4 h-4"/> Brilho do Letreiro LED</div>
                   <div className="flex flex-col gap-2 w-full mt-2">
                     <input
                       type="range"
                       min="0"
                       max="100"
                       step="5"
                       value={Number(settings?.marqueeBrightness) ?? 50}
                       onChange={(e) => {
                         setSettings({...settings, marqueeBrightness: parseInt(e.target.value)});
                       }}
                       onMouseUp={() => { playChipBeep('save'); onShowToast('success'); }}
                       onTouchEnd={() => { playChipBeep('save'); onShowToast('success'); }}
                       className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                       style={{ accentColor: '#facc15' }}
                     />
                     <div className="flex justify-between text-[8px] font-black uppercase opacity-60">
                       <span>Opaco</span>
                       <span>Neon Intenso</span>
                     </div>
                   </div>
               </div>
            </div>
          </div>
        )}
      </MContainer>

      {/* BLOCO: GESTÃO DE CLASSES ARQUIVOLOGIA - ACCORDION */}
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <button onClick={() => setOpenSection(openSection === 'arquivologia' ? null : 'arquivologia')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'arquivologia' ? (darkMode ? 'border-b-[4px] border-gray-500' : 'border-b-[4px] border-black') : ''}`}>
          <span className="flex items-center gap-2"><ListIcon className="w-4 h-4" /> Gestão de Classes</span>
          <span className="text-lg font-mono">{openSection === 'arquivologia' ? '−' : '+'}</span>
        </button>
        {openSection === 'arquivologia' && (
          <div className="p-4 flex flex-col gap-4">
            <MInput 
              darkMode={darkMode} 
              label="Prefixo do Acervo (Suas Iniciais)" 
              value={settings?.archivePrefix || ''} 
              onChange={e => setSettings({...settings, archivePrefix: e.target.value.toUpperCase()})} 
              onBlur={() => { playChipBeep('save'); onShowToast('success'); }}
              placeholder="Ex: MBU" 
            />
            
            <div className={`p-3 border-[4px] ${darkMode ? 'border-gray-500 bg-gray-800' : 'border-black bg-gray-100'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 border-b-[2px] border-current pb-1">Adicionar Nova Subclasse</h4>
              <div className="flex flex-col gap-2">
                <select value={newSubclass.parent} onChange={e => setNewSubclass({...newSubclass, parent: e.target.value})} className={`w-full p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-black bg-white text-black'}`}>
                  {Object.keys(activeCategories || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nome (Ex: Master System)" value={newSubclass.name} onChange={e => setNewSubclass({...newSubclass, name: e.target.value})} className={`flex-1 p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                  <input type="text" placeholder="Código (Ex: 470)" value={newSubclass.code} onChange={e => setNewSubclass({...newSubclass, code: e.target.value})} className={`w-24 p-2 border-[3px] font-sans text-xs font-bold outline-none ${darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} />
                </div>
                <MButton darkMode={darkMode} onClick={handleAddSubclass} variant="blue" className="py-2 text-[10px]">Adicionar Subclasse</MButton>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-3">Tabela de Códigos (CDD)</h4>
              {Object.entries(activeCategories || {}).map(([cat, subs]) => (
                <div key={cat} className="mb-3">
                  <div className={`text-[9px] font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block mb-1`}>{cat}</div>
                  <div className="flex flex-col gap-1 pl-2">
                    {(Array.isArray(subs) ? subs : []).map(sub => (
                      <div key={sub} className="flex items-center justify-between text-xs font-bold">
                        <span className="opacity-80">{sub}</span>
                        <input 
                          type="text" 
                          value={activeClassCodes?.[sub] || ''} 
                          onChange={e => handleUpdateCode(sub, e.target.value)} 
                          onBlur={() => { playChipBeep('save'); onShowToast('success'); }}
                          className={`w-16 p-1 border-[2px] text-center font-mono text-[10px] outline-none ${darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-black bg-white text-black'}`} 
                        />
                      </div>
                    ))}
                  </div>
               </div>
              ))}
            </div>

          </div>
        )}
      </MContainer>

      {/* INTEGRAÇÕES - ACCORDION */}
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <button onClick={() => setOpenSection(openSection === 'integracoes' ? null : 'integracoes')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'integracoes' ? (darkMode ? 'border-b-[4px] border-gray-500' : 'border-b-[4px] border-black') : ''}`}>
          <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Integrações (Opcional)</span>
          <span className="text-lg font-mono">{openSection === 'integracoes' ? '−' : '+'}</span>
        </button>
        {openSection === 'integracoes' && (
          <div className="p-4 flex flex-col gap-3">
            <MInput darkMode={darkMode} label="Google Gemini API Key (Scan IA)" type="password" value={settings?.geminiApiKey || ''} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} placeholder="Para scanner visual..." />
            <MInput darkMode={darkMode} label="Google Sheets Webhook URL (Salvar Novos)" value={settings?.googleSheetsUrl || ''} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} placeholder="https://script.google.com/..." />
            <MButton darkMode={darkMode} onClick={handleSaveSettings} variant="black" className="w-full mt-2 text-[10px]"><Check className="w-4 h-4" /> Salvar Configurações</MButton>
          </div>
        )}
      </MContainer>

      {/* SINCRONIZAR - ACCORDION */}
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-sky-900/40 text-white' : 'bg-sky-100 text-black'}>
        <button onClick={() => setOpenSection(openSection === 'sincronizar' ? null : 'sincronizar')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'sincronizar' ? (darkMode ? 'border-b-[4px] border-gray-500' : 'border-b-[4px] border-black') : ''}`}>
          <span className="flex items-center gap-2"><GamepadIcon className="w-4 h-4" /> Sincronizar Jogos Zerados</span>
          <span className="text-lg font-mono">{openSection === 'sincronizar' ? '−' : '+'}</span>
        </button>
        {openSection === 'sincronizar' && (
          <div className="p-4 flex flex-col gap-3">
            <p className="text-[10px] opacity-80 font-bold leading-relaxed text-justify">Faça o upload manual do seu .CSV atualizado de jogos finalizados para alimentar a aba "Zerados".</p>
            <label className={`w-full flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-black uppercase tracking-widest border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'border-sky-500 shadow-[4px_4px_0px_rgba(100,100,100,0.5)] bg-sky-800 text-white' : 'border-black bg-sky-400 text-black'} `}>
              <Upload className="w-4 h-4 flex-shrink-0" /> Importar CSV de Jogos
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCompletedCSV} />
            </label>
          </div>
        )}
      </MContainer>

      {/* BACKUP - ACCORDION */}
      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black'}>
        <button onClick={() => setOpenSection(openSection === 'backup' ? null : 'backup')} className={`w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${openSection === 'backup' ? (darkMode ? 'border-b-[4px] border-gray-500' : 'border-b-[4px] border-black') : ''}`}>
          <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Backup Local (.CSV Principal)</span>
          <span className="text-lg font-mono">{openSection === 'backup' ? '−' : '+'}</span>
        </button>
        {openSection === 'backup' && (
          <div className="p-4 flex gap-2">
            <button onClick={handleExportCSV} className={`flex-1 flex items-center justify-center gap-2 p-3 text-[10px] font-black uppercase tracking-widest border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)] bg-gray-800 text-white' : 'border-black bg-white text-black'}`}><Download className="w-4 h-4 flex-shrink-0" /> Exportar</button>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-black uppercase tracking-widest border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)] bg-gray-800 text-white' : 'border-black bg-white text-black'} `}><Upload className="w-4 h-4 flex-shrink-0" /> Importar<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} /></label>
          </div>
        )}
      </MContainer>

      <div className="mt-8 mb-4 text-center">
        <button onClick={() => setShowResetConfirm(true)} className={`px-4 py-2 border-[3px] text-[8px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all ${darkMode ? 'border-rose-500 text-rose-500' : 'border-rose-600 text-rose-600'}`}>
           ⚠️ Resetar Coleção Principal
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
  const [completedGames, setCompletedGames] = useState([]);
  const [settings, setSettings] = useState({ geminiApiKey: '', googleSheetsUrl: '', webhookUrl: '', marqueeSpeed: 35, marqueeBrightness: 50, archivePrefix: 'MBU' });
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Feedback Global Dinâmico
  const [toast, setToast] = useState({ visible: false, type: 'success' });
  const [isHtml5QrcodeLoaded, setIsHtml5QrcodeLoaded] = useState(false);
  
  // Chaves para forçar reset ao clicar nos botões do menu
  const [libraryResetKey, setLibraryResetKey] = useState(0);
  const [completedResetKey, setCompletedResetKey] = useState(0);

  const pwa = usePWA(LINK_DO_ICONE_NO_GITHUB);
  const globalFileInputRef = useRef(null);

  const [aiBoxState, setAiBoxState] = useState('idle');
  const [aiBoxMessage, setAiBoxMessage] = useState('');
  const [scannedAIData, setScannedAIData] = useState(null);
  
  // Derivação Dinâmica da Arquivologia ULTRA SEGURA
  const activeCategories = (settings?.userCategories && typeof settings.userCategories === 'object' && !Array.isArray(settings.userCategories)) ? settings.userCategories : DEFAULT_CATEGORIES;
  const activeClassCodes = (settings?.userClassCodes && typeof settings.userClassCodes === 'object' && !Array.isArray(settings.userClassCodes)) ? settings.userClassCodes : DEFAULT_CLASS_CODES;
  const allTypes = Object.values(activeCategories).flat();

  const triggerGlobalAI = () => { setActiveTab('add'); setAddMode('manual'); if (globalFileInputRef.current) globalFileInputRef.current.click(); };
  const handleGlobalFileChange = (e) => { const file = e.target.files[0]; if (file) { setActiveTab('add'); setAddMode('manual'); processGlobalAIFile(file); } e.target.value = null; };

  const processGlobalAIFile = async (file) => {
    const apiKey = settings?.geminiApiKey || "";
    if (!apiKey) { setAiBoxState('error'); setAiBoxMessage('Chave API ausente. Adicione-a na aba Ajustes.'); return; }
    setAiBoxState('loading');
    setAiBoxMessage('Processando e analisando imagem...');
    try {
      const base64DataUrl = await resizeImageForAPI(file); const base64Data = base64DataUrl.split(',')[1];
      const payload = { contents: [{ parts: [{ text: `Extraia dados desta imagem (capa de CD, vinil, livro ou ficha catalográfica). Retorne EXATAMENTE um objeto JSON válido. Use o seguinte formato exato sem quebras extras ou marcações markdown (exemplo): {"type": "Livro", "title": "O Nome", "author_developer": "Autor", "year": "2000", "publisher": "Editora", "pages_or_time": "300", "description": "Resumo"}. As opções permitidas em "type" são: ${allTypes.join(', ')}. Caso não saiba, use "Livro". Se algo não for encontrado, use "".` }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }], generationConfig: { responseMimeType: "application/json" } };
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { const errData = await response.json(); throw new Error(`Erro API: ${errData.error?.message || response.statusText}`); }
      const result = await response.json(); if (result.error) throw new Error(result.error.message);
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error("A IA retornou uma resposta vazia.");
      let cleanedText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = cleanedText.indexOf('{');
      const end = cleanedText.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanedText = cleanedText.substring(start, end + 1);
      const parsedData = JSON.parse(cleanedText);
      setAiBoxState('success'); setAiBoxMessage('Informações extraídas com IA!'); playChipBeep('success'); setScannedAIData(parsedData); showToast('success');
    } catch (error) { console.error("Erro IA:", error); setAiBoxState('error'); setAiBoxMessage(`Falha na IA: ${error.message}`); playChipBeep('error'); showToast('error'); }
  };

  useEffect(() => {
    if (window.Html5Qrcode) { setIsHtml5QrcodeLoaded(true); return; }
    const scriptId = 'html5-qrcode-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script'); script.id = scriptId; script.src = "https://unpkg.com/html5-qrcode/html5-qrcode.min.js"; script.async = true;
      script.onload = () => setIsHtml5QrcodeLoaded(true); document.head.appendChild(script);
    }
  }, []);
  
  const showToast = (type = 'success') => {
    setToast({ visible: true, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };
  
  // Carregamento Inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem('memorabilia_theme'); if (savedTheme === 'dark') setDarkMode(true);
    const savedItems = localStorage.getItem('memorabilia_items'); if (savedItems) setItems(JSON.parse(savedItems)); else setItems([]);
    const savedSettings = localStorage.getItem('memorabilia_settings'); if (savedSettings) setSettings(JSON.parse(savedSettings) || {});
    const savedCompleted = localStorage.getItem('memorabilia_completed'); if (savedCompleted) setCompletedGames(JSON.parse(savedCompleted));
    setIsLoaded(true);
  }, []);
  
  // Salvamento Automático
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_items', JSON.stringify(items)); }, [items, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_settings', JSON.stringify(settings)); }, [settings, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light'); }, [darkMode, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_completed', JSON.stringify(completedGames)); }, [completedGames, isLoaded]);
  
  // ==========================================
  // ESTATÍSTICAS DO CABEÇALHO E SUGESTÃO
  // ==========================================
  const hasSuggested = useRef(false);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    if (isLoaded && items.length > 0 && !hasSuggested.current) {
      const musicItems = items.filter(i => (activeCategories['Discos'] || []).includes(i.type));
      if (musicItems.length > 0) setSuggestion(musicItems[Math.floor(Math.random() * musicItems.length)]);
      hasSuggested.current = true;
    }
  }, [isLoaded, items, activeCategories]);
  
  // Coleção Stats
  const totalItens = items.length;
  const livros = items.filter(i => (activeCategories['Livros'] || []).includes(i.type));
  const totalPagesCount = livros.reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const readPages = livros.filter(i => i.status === 'Concluído').reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const readPercentage = totalPagesCount > 0 ? ((readPages / totalPagesCount) * 100).toFixed(1) : 0;
  const ratedItems = items.filter(i => i.rating > 0);
  const avgRating = ratedItems.length > 0 ? (ratedItems.reduce((acc, i) => acc + i.rating, 0) / ratedItems.length).toFixed(1) : 0;

  // Jogos Zerados Stats
  const totalJogos = completedGames.length;
  const tempos = completedGames.map(g => g.tempoHoras).filter(t => t > 0);
  const avgTime = tempos.length > 0 ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : 0;
  const maxTime = tempos.length > 0 ? Math.max(...tempos).toFixed(1) : 0;
  const notasJ = completedGames.filter(g => g.nota > 0);
  const mediaNotaJ = notasJ.length > 0 ? (notasJ.reduce((a, b) => a + b.nota, 0) / notasJ.length).toFixed(1) : 0;
  
  let totalGasto = 0;
  completedGames.forEach(g => { if(g.precoPago) { let p = parseFloat(String(g.precoPago).replace(/\./g, '').replace(',', '.')); if(!isNaN(p)) totalGasto+=p; } });
  
  // Configurações e Animação do Painel LED Infinito
  const speed = settings?.marqueeSpeed || 35;
  const glow = (settings?.marqueeBrightness ?? 50) / 10;
  const textShadowStyle = { textShadow: glow > 0 ? `0 0 ${glow}px currentColor, 0 0 ${glow * 1.5}px currentColor` : 'none' };
  const ledItemStyle = "font-led text-[9px] sm:text-[10px] uppercase tracking-normal";

  const PacmanSeparator = () => (
    <div className="flex items-center gap-2 mx-6 opacity-90 pb-0.5">
       <svg viewBox="0 0 100 100" className="w-3.5 h-3.5 flex-shrink-0" style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow}px #facc15)` : 'none' }}>
         <path fill="#facc15">
           <animate attributeName="d" values="M50 50 L93.3 25 A 50 50 0 1 0 93.3 75 Z; M50 50 L99.9 48 A 50 50 0 1 0 99.9 52 Z; M50 50 L93.3 25 A 50 50 0 1 0 93.3 75 Z" dur="0.4s" repeatCount="indefinite" />
         </path>
       </svg>
       <div className="w-1 h-1 bg-yellow-200 rounded-full shadow-[0_0_2px_currentColor]" />
       <div className="w-1 h-1 bg-yellow-200 rounded-full shadow-[0_0_2px_currentColor]" />
       <div className="w-1 h-1 bg-yellow-200 rounded-full shadow-[0_0_2px_currentColor]" />
    </div>
  );
  
  const MarqueeContent = () => (
    <div className="flex items-center py-1" style={textShadowStyle}>
      <span className={`text-sky-400 ${ledItemStyle}`}>FINALIZADOS: {totalJogos}</span> <PacmanSeparator />
      <span className={`text-rose-400 ${ledItemStyle}`}>TEMPO MEDIO: {avgTime}H</span> <PacmanSeparator />
      <span className={`text-rose-400 ${ledItemStyle}`}>MAIOR TEMPO: {maxTime}H</span> <PacmanSeparator />
      <span className={`text-yellow-400 ${ledItemStyle}`}>NOTA MEDIA: {mediaNotaJ}/10</span> <PacmanSeparator />
      <span className={`text-sky-400 ${ledItemStyle}`}>GASTO TOTAL: R$ {totalGasto.toFixed(2).replace('.',',')}</span> <PacmanSeparator />
    </div>
  );
  
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleAddPressStart = () => { initAudio(); isLongPress.current = false; pressTimer.current = setTimeout(() => { isLongPress.current = true; triggerGlobalAI(); }, 500); };
  const handleAddPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleAddClick = () => { initAudio(); if (!isLongPress.current) { setAddMode('barcode'); setActiveTab('add'); } };

  const libPressTimer = useRef(null); const isLibLongPress = useRef(false);
  const handleLibPressStart = () => { initAudio(); isLibLongPress.current = false; libPressTimer.current = setTimeout(() => { isLibLongPress.current = true; setLibraryResetKey(k => k + 1); setActiveTab('library'); }, 500); };
  const handleLibPressEnd = () => { if (libPressTimer.current) clearTimeout(libPressTimer.current); };
  const handleLibClick = () => { initAudio(); if (!isLibLongPress.current) { setActiveTab('library'); } };

  const handleCompClick = () => { initAudio(); setCompletedResetKey(k => k + 1); setActiveTab('completed'); };
  
  if (!isLoaded) return null; 

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .font-led { font-family: 'Press Start 2P', monospace; }
        .led-board { background-color: #0b0b0b; background-image: radial-gradient(circle, #000 1.5px, transparent 1.5px); background-size: 3px 3px; box-shadow: inset 0 0 15px #000; }
        @keyframes marqueeLinear { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
      `}</style>

      <div className={`max-w-md mx-auto h-screen relative flex flex-col shadow-2xl overflow-hidden ${darkMode ? 'border-x-[4px] border-gray-600 bg-gray-900' : 'border-x-[4px] border-black bg-white'}`}>

        <header className={`flex-none p-3 border-b-[4px] z-20 flex flex-col gap-2 ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-black bg-white'}`}>
          <div className="flex justify-between items-start">
            <div className="flex flex-col flex-1 pr-2">
              <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Memorabilia</h1>
              {suggestion && (
                <a href={`https://open.spotify.com/search/${encodeURIComponent(suggestion.title + ' ' + (suggestion.author_developer || ''))}`} target="_blank" rel="noopener noreferrer" className={`mt-2 p-1 px-1.5 text-[8px] font-black uppercase tracking-widest border-[2px] inline-flex items-center gap-1 w-max shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer ${darkMode ? 'bg-green-900 border-green-500 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-green-400 border-black text-black'}`}>
                  <Sparkles className="w-3 h-3 flex-shrink-0" /> <span className="truncate max-w-[200px]">Ouvir Hoje: {suggestion.title}</span>
                </a>
              )}
            </div>
            
            <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center transition-all duration-300 relative">
              {toast.visible ? (
                toast.type === 'error' 
                  ? <XIcon className="text-rose-500 w-10 h-10 drop-shadow-md animate-in zoom-in duration-200" /> 
                  : <Check className="text-sky-500 w-10 h-10 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-in zoom-in duration-200" />
              ) : (
                <img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-full h-full object-contain animate-in zoom-in duration-200" />
              )}
            </div>
          </div>

          <div className="flex gap-2 h-20">
             <div className={`flex-1 flex flex-col p-1.5 border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[8px] font-black uppercase tracking-widest leading-tight ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-gray-100 text-black'}`}>
              <div className="border-b-[2px] border-current pb-0.5 mb-1 opacity-70 flex justify-between">
                <span>Coleção Física</span><span>{totalItens} UN</span>
              </div>
              <div className="flex justify-between"><span>Págs Add:</span><span>{totalPagesCount}</span></div>
              <div className="flex justify-between"><span>Págs Lidas:</span><span>{readPages} ({readPercentage}%)</span></div>
              <div className="flex justify-between text-sky-600 dark:text-sky-400 mt-auto"><span>Média:</span><span>★ {avgRating}</span></div>
            </div>

            <div className={`flex-1 flex flex-col border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[8px] font-black uppercase tracking-widest overflow-hidden relative ${darkMode ? 'border-gray-500 bg-black text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-black text-white'}`}>
               <div className="p-1.5 border-b-[2px] border-gray-800 pb-0.5 mb-0.5 opacity-80 flex justify-between z-10 bg-black">
                  <span>Jogos Zerados</span><span className="animate-pulse text-rose-500">REC</span>
               </div>
               
               <div className="flex-1 flex items-center overflow-hidden w-full relative led-board">
                  <div className="absolute whitespace-nowrap flex items-center" style={{ animation: `marqueeLinear ${speed}s linear infinite`, width: 'max-content' }}>
                    <MarqueeContent /> 
                    <MarqueeContent />
                  </div>
                </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-3 relative z-0">
          <input type="file" accept="image/*" capture="environment" ref={globalFileInputRef} onChange={handleGlobalFileChange} className="hidden" />
          
          {activeTab === 'library' && <LibraryTab key={libraryResetKey} items={items} setItems={setItems} darkMode={darkMode} settings={settings} onShowToast={showToast} activeCategories={activeCategories} />}
          {activeTab === 'add' && <AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} onShowToast={showToast} triggerGlobalAI={triggerGlobalAI} globalAiState={aiBoxState} globalAiMessage={aiBoxMessage} resetGlobalAi={() => { setAiBoxState('idle'); setAiBoxMessage(''); }} scannedAIData={scannedAIData} setScannedAIData={setScannedAIData} isHtml5QrcodeLoaded={isHtml5QrcodeLoaded} activeCategories={activeCategories} activeClassCodes={activeClassCodes} allTypes={allTypes} />}
          {activeTab === 'dashboard' && <DashboardTab items={items} darkMode={darkMode} activeCategories={activeCategories} />}
          {activeTab === 'completed' && <CompletedGamesTab key={completedResetKey} completedGames={completedGames} setCompletedGames={setCompletedGames} settings={settings} darkMode={darkMode} onShowToast={showToast} />}
          {activeTab === 'settings' && <SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} onShowToast={showToast} pwa={pwa} completedGames={completedGames} setCompletedGames={setCompletedGames} activeCategories={activeCategories} activeClassCodes={activeClassCodes} />}
        </main>

        <nav className={`flex-none flex border-t-[4px] z-20 h-16 relative ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-black bg-white'}`}>
          <button onTouchStart={handleLibPressStart} onTouchEnd={handleLibPressEnd} onMouseDown={handleLibPressStart} onMouseUp={handleLibPressEnd} onMouseLeave={handleLibPressEnd} onClick={handleLibClick} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400') : ''}`}><Library className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Coleção</span></button>
          <button onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd} onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd} onClick={handleAddClick} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400') : ''}`}><PlusSquare className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Adicionar</span></button>
          <button onClick={() => { initAudio(); setActiveTab('dashboard'); }} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-400') : ''}`}><BarChart2 className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Geral</span></button>
          <button onClick={handleCompClick} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'completed' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400') : ''}`}><MonitorPlay className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Zerados</span></button>
          <button onClick={() => { initAudio(); setActiveTab('settings'); }} className={`flex-1 flex flex-col items-center justify-center transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200') : ''}`}><Settings className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Ajustes</span></button>
        </nav>

      </div>
    </div>
  );
}
