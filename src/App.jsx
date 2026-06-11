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

const playLydianSuccess = () => {
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square';
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
  try {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    const vol = 0.02; 
    if (type === 'save' || type === 'success') {
      osc.type = 'square'; 
      osc.frequency.setValueAtTime(440, now); 
      osc.frequency.setValueAtTime(554.37, now + 0.05); 
      gain.gain.setValueAtTime(vol, now); 
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(150, now); 
      osc.frequency.setValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(vol, now); 
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  } catch (e) {}
};

// ==========================================
// UTILITÁRIOS GLOBAIS
// ==========================================
let globalSequenceCache = null;

const generateId = (itemsArray = []) => {
  const now = new Date();
  const base = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
  if (globalSequenceCache === null) {
     let maxSeq = 0;
     itemsArray.forEach(item => {
        const match = String(item.id || '').match(/-(\d{4})$/);
        if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
     });
     globalSequenceCache = maxSeq;
  }
  globalSequenceCache++;
  return `${base}-${String(globalSequenceCache).padStart(4, '0')}`;
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
        canvas.width = maxWidth; canvas.height = img.height * (maxWidth / img.width);
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
  const rows = []; let row = []; let inQ = false; let val = '';
  for (let i = 0; i < text.length; i++) {
    let c = text[i]; let nc = text[i + 1];
    if (c === '"' && inQ && nc === '"') { val += '"'; i++; } 
    else if (c === '"') { inQ = !inQ; } 
    else if (c === ',' && !inQ) { row.push(val); val = ''; } 
    else if ((c === '\n' || c === '\r') && !inQ) {
      if (c === '\r' && nc === '\n') i++;
      row.push(val); rows.push(row); row = []; val = '';
    } else { val += c; }
  }
  if (val || row.length) { row.push(val); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
};

const parseTimeStr = (t) => {
  if (!t) return 0;
  const s = String(t).trim();
  if (s.includes(':')) { const p = s.split(':'); return parseInt(p[0]||0) + (parseInt(p[1]||0)/60); }
  return parseFloat(s.replace(/[hH]/g, '').replace(',', '.')) || 0;
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
  const hds = rows[0].map(h => h.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());
  const getIdx = (kws) => hds.findIndex(h => kws.some(kw => h === kw || h.includes(kw)));
  
  const iNome = getIdx(['nome', 'título', 'jogo']); const iConsole = getIdx(['console', 'plataforma']); 
  const iGenero = getIdx(['gênero', 'genero']); const iTempo = getIdx(['tempo', 'horas']); 
  const iNota = getIdx(['nota', 'avaliação']); const iSuporte = getIdx(['suporte', 'mídia', 'midia']);
  const iDif = getIdx(['dificuldade']); const iCond = getIdx(['condição', 'condicao', 'objetivo']); 
  const iObs = getIdx(['observação', 'observacao', 'comentário']); const iInicio = getIdx(['início', 'inicio', 'começo']); 
  const iFim = getIdx(['fim', 'término', 'termino', 'conclusão']); const iPreco = getIdx(['preço pago', 'preco pago']); 
  const iPrecoSD = getIdx(['preço sem desconto', 'preco sem desconto']); const iLink = getIdx(['link', 'url']);

  const parsed = [];
  for(let i=1; i<rows.length; i++) {
    const r = rows[i];
    if(!r || r.length < 3 || (iNome >= 0 && !r[iNome])) continue;
    let supStr = iSuporte >= 0 ? r[iSuporte]?.trim() : '';
    let isFis = supStr.toLowerCase().includes('físic') || supStr.toLowerCase().includes('fisic') || supStr === 'F';
    let anoF = ''; const rf = iFim >= 0 ? r[iFim]?.trim() : '';
    if (rf) { const m = rf.match(/\b(19|20)\d{2}\b/); if(m) anoF = m[0]; }
    const clMoney = (v) => v ? v.replace(/R\$\s?/gi, '').trim() : '';

    parsed.push({
      id: generateId(parsed), 
      nome: r[iNome]?.trim() || 'Desconhecido', console: r[iConsole]?.trim() || 'Outro',
      genero: r[iGenero]?.trim() || 'Outro', tempoHoras: parseTimeStr(r[iTempo]),
      nota: parseFloat((r[iNota] || '0').replace(',', '.')) || 0,
      suporteStr: supStr, suporte: isFis ? 'Físico' : 'Digital',
      dificuldade: r[iDif]?.trim() || '--', condicao: r[iCond]?.trim() || '--',
      observacao: r[iObs]?.trim() || '', inicio: r[iInicio]?.trim() || '--',
      fim: rf || '--', anoFim: anoF,
      precoPago: clMoney(r[iPreco]), precoSemDesc: clMoney(r[iPrecoSD]), link: r[iLink]?.trim() || ''
    });
  }
  return parsed;
};

// ==========================================
// ÍCONES NATIVOS
// ==========================================
const Icon = ({ path, className="w-6 h-6", onClick, fill="none", style }) => (
  <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" className={className} style={style}>{path}</svg>
);
const KatamariIcon = ({ className="w-6 h-6", glow=0 }) => (
  <svg viewBox="0 0 100 100" className={className} style={{ filter: glow>0?`drop-shadow(0 0 ${glow}px currentColor)`:'none' }}><g><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur="2.5s" repeatCount="indefinite" /><circle cx="50" cy="50" r="28" fill="#fbbf24" stroke="#fbbf24" strokeWidth="6" strokeDasharray="5 5" /><circle cx="50" cy="50" r="18" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="3 5" opacity="0.8"/><g stroke="#22d3ee" strokeWidth="6" strokeLinecap="round"><line x1="50" y1="4" x2="50" y2="16" /><line x1="50" y1="96" x2="50" y2="84" /><line x1="4" y1="50" x2="16" y2="50" /><line x1="96" y1="50" x2="84" y2="50" /><line x1="17" y1="17" x2="26" y2="26" /><line x1="83" y1="83" x2="74" y2="74" /><line x1="17" y1="83" x2="26" y2="74" /><line x1="83" y1="17" x2="74" y2="26" /></g><g stroke="#ec4899" strokeWidth="7" strokeLinecap="round"><line x1="50" y1="18" x2="50" y2="22" /><line x1="50" y1="82" x2="50" y2="78" /><line x1="18" y1="50" x2="22" y2="50" /><line x1="82" y1="50" x2="78" y2="50" /><line x1="28" y1="28" x2="32" y2="32" /><line x1="72" y1="72" x2="68" y2="68" /><line x1="28" y1="72" x2="32" y2="68" /><line x1="72" y1="28" x2="68" y2="32" /></g></g></svg>
);
const Search = p => <Icon {...p} path={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const Library = p => <Icon {...p} path={<><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>} />;
const PlusSquare = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3"/><path d="M8 12h8"/><path d="M12 8v8"/></>} />;
const BarChart2 = p => <Icon {...p} path={<><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></>} />;
const Settings = p => <Icon {...p} path={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>} />;
const Camera = p => <Icon {...p} path={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />;
const Sun = p => <Icon {...p} path={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>} />;
const Download = p => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />;
const ExternalLink = p => <Icon {...p} path={<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>} />;
const Star = ({ className='', onClick }) => <Icon onClick={onClick} className={className} fill={className.includes('fill')?'currentColor':'none'} path={<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>} />;
const ChevronLeft = p => <Icon {...p} path={<path d="m15 18-6-6 6-6"/>} />;
const ChevronRight = p => <Icon {...p} path={<path d="m9 18 6-6-6-6"/>} />;
const Check = p => <Icon {...p} path={<path d="M20 6 9 17l-5-5"/>} />;
const ScanLine = p => <Icon {...p} path={<><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></>} />;
const Clock = p => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
const Flame = p => <Icon {...p} path={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>} />;
const Ghost = p => <Icon {...p} path={<><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></>} />;
const LibraryBig = p => <Icon {...p} path={<><rect width="8" height="18" x="3" y="3"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></>} />;
const AlertTriangle = p => <Icon {...p} path={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} />;
const Sparkles = p => <Icon {...p} path={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;
const Calendar = p => <Icon {...p} path={<><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></>} />;
const GamepadIcon = p => <Icon {...p} path={<><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/></>} />;
const MonitorPlay = p => <Icon {...p} path={<><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></>} />;
const XIcon = p => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const Zap = p => <Icon {...p} path={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />;
const ListIcon = p => <Icon {...p} path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} />;
const Headphones = p => <Icon {...p} path={<><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></>} />;

// ==========================================
// PWA ENGINE
// ==========================================
const usePWA = (iconUrl) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    const manifest = { name: "Memorabilia", short_name: "Memorabilia", display: "standalone", start_url: ".", background_color: "#ffffff", theme_color: "#000000", icons: [{src: iconUrl, sizes: "192x192", type: "image/png"}] };
    let ml = document.querySelector('link[rel="manifest"]');
    if (!ml) { ml = document.createElement('link'); ml.rel = 'manifest'; document.head.appendChild(ml); }
    ml.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type:'application/json'}));
    const handlePrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, [iconUrl]);
  const promptInstall = async () => {
    if (!installPrompt) return; installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setIsInstalled(true); }
  };
  return { isInstallable: !!installPrompt, promptInstall, isInstalled };
};

// ==========================================
// COMPONENTES UI MONDRIAN
// ==========================================
const getMondrianColor = (index, darkMode) => {
  const cL = ['bg-pink-500', 'bg-cyan-400', 'bg-amber-400', 'bg-white'];
  const cD = ['bg-pink-800', 'bg-cyan-800', 'bg-amber-700', 'bg-gray-800'];
  return darkMode ? cD[index % cD.length] : cL[index % cL.length];
};
const getMondrianHex = (index, darkMode) => {
  const hL = ['#ec4899', '#22d3ee', '#fbbf24', '#ffffff'];
  const hD = ['#9d174d', '#155e75', '#b45309', '#1f2937'];
  return darkMode ? hD[index % hD.length] : hL[index % hL.length];
};

const MContainer = ({ children, className='', colorClass='', darkMode }) => (
  <div className={`border-[4px] ${darkMode ? 'border-gray-300 shadow-[4px_4px_0px_rgba(209,213,219,1)]' : 'border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]'} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);

const MImage = ({ src, alt, className, fallbackIcon: FallbackIcon }) => {
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [src]);
  if (!src || error) return <FallbackIcon />;
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

const MButton = ({ onClick, children, className='', variant='primary', icon, darkMode, disabled=false }) => {
  let bg = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'pink') bg = darkMode ? 'bg-pink-800 text-white' : 'bg-pink-500 text-black';
  if (variant === 'cyan') bg = darkMode ? 'bg-cyan-800 text-white' : 'bg-cyan-400 text-black';
  if (variant === 'amber') bg = darkMode ? 'bg-amber-700 text-white' : 'bg-amber-400 text-black';
  if (variant === 'black') bg = darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white';
  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[4px] ${darkMode?'border-gray-300 shadow-[4px_4px_0px_rgba(209,213,219,1)]':'border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]'} ${disabled?'opacity-50 shadow-none translate-y-1 translate-x-1':'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bg} ${className}`}>
      {icon} {children}
    </button>
  );
};

const MReadOnlyBox = ({ label, value, multiline, darkMode, emphasize=false }) => (
  <div className="flex flex-col mb-3 w-full overflow-hidden">
    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode?'text-gray-400':'text-gray-900'}`}>{label}</label>
    <div className={`w-full p-2 border-[4px] ${darkMode?'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 text-white':'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans ${emphasize?'text-lg text-pink-500 font-black text-center':'text-sm font-bold'} ${multiline?'min-h-[80px] whitespace-pre-wrap':'truncate'}`}>{value || '--'}</div>
  </div>
);

const MInput = ({ label, value, onChange, onBlur, type="text", placeholder="", multiline=false, darkMode, readOnly=false }) => (
  <div className="flex flex-col mb-3 w-full">
    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode?'text-gray-400':'text-gray-900'}`}>{label}</label>
    {multiline ? (
      <textarea readOnly={readOnly} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[4px] ${darkMode?'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 text-white':'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-amber-100 dark:focus:bg-amber-900'} transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input readOnly={readOnly} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full p-2 border-[4px] ${darkMode?'border-gray-300 shadow-[3px_3px_0px_rgba(209,213,219,1)] bg-gray-800 text-white':'border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black'} font-sans text-sm font-bold outline-none ${readOnly?'':'focus:bg-cyan-100 dark:focus:bg-cyan-900'} transition-colors`} />
    )}
  </div>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText="Sim", cancelText="Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm z-[200]">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-[4px] pb-2 ${darkMode?'border-gray-300':'border-black'}`}>{title}</h3>
        <p className="text-sm font-bold opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="pink" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

const MondrianHBar = ({ label, value, max, index, darkMode, valueFormatter=(v)=>v }) => (
  <div className="flex items-center gap-2 w-full mb-2">
    <div className="w-16 text-[9px] font-black uppercase tracking-widest truncate" title={label}>{label}</div>
    <div className={`flex-1 h-5 border-[3px] ${darkMode?'bg-gray-800 border-gray-300':'bg-gray-200 border-black'} flex relative overflow-hidden`}>
      <div className={`h-full transition-all duration-1000 ${getMondrianColor(index, darkMode)}`} style={{ width: `${max>0?(value/max)*100:0}%` }} />
      <span className={`absolute inset-0 flex items-center ml-2 text-[10px] font-black ${darkMode?'text-white':'text-black'} drop-shadow-md`}>{valueFormatter(value)}</span>
    </div>
  </div>
);

// ==========================================
// COMPONENTES DE GRÁFICOS SVG CUSTOMIZADOS
// ==========================================
const MondrianPieChart = ({ data, darkMode }) => {
  const total = (data || []).reduce((s, d) => s + (d?.value || 0), 0);
  if(!total) return <div className="p-4 opacity-50 text-[10px] font-black uppercase text-center w-full">Sem dados</div>;
  let cur = 0;
  return (
    <div className="relative w-full flex items-center justify-center gap-6 py-2">
      <svg viewBox="0 0 32 32" className="w-28 h-28 transform -rotate-90 drop-shadow-md rounded-full overflow-hidden">
        {(data || []).map((d, i) => {
          if(!d || !d.value) return null;
          const a = (d.value / total) * 360;
          const res = <circle key={i} cx="16" cy="16" r="16" fill="none" stroke={d.hexColor} strokeWidth="32" strokeDasharray={`${(a/360)*100.53} 100.53`} strokeDashoffset={-(cur/360)*100.53} />;
          cur += a; return res;
        })}
      </svg>
      <div className="flex flex-col gap-2 justify-center">
        {(data || []).map((d, i) => (d && d.value > 0) && (
          <div key={i} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest leading-none">
             <div className="w-3 h-3 border-[2px] border-black dark:border-gray-300" style={{ backgroundColor: d.hexColor }} />
             <span>{d.label} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MondrianLineAreaChart = ({ data, darkMode, isArea }) => {
   if(!data || !data.length) return <div className="p-4 opacity-50 text-[10px] font-black uppercase text-center w-full">Sem dados</div>;
   const max = data.reduce((m, d) => Math.max(m, d?.value || 0), 1);
   const pts = data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * 100},${100 - ((d?.value || 0) / max * 100)}`).join(' ');
   return (
     <div className="w-full h-32 relative flex flex-col">
       <svg viewBox="0 -10 100 120" preserveAspectRatio="none" className="w-full flex-1 overflow-visible">
         {isArea && <polygon points={`0,100 ${pts} 100,100`} fill="#22d3ee" fillOpacity={darkMode ? "0.6" : "0.3"} />}
         <polyline points={pts} fill="none" stroke={isArea ? "#ec4899" : "#fbbf24"} strokeWidth="2.5" strokeLinejoin="round" />
         {data.map((d, i) => {
           const cx = (i / Math.max(1, data.length - 1)) * 100;
           const cy = 100 - ((d?.value || 0) / max * 100);
           return (
             <g key={i} className="group cursor-pointer">
               <circle cx={cx} cy={cy} r="3" fill="#ec4899" stroke={darkMode ? "#374151" : "#fff"} strokeWidth="1" />
               <text x={cx} y={cy - 5} fontSize="6" fill={darkMode ? "#fff" : "#000"} textAnchor="middle" className="font-black opacity-0 group-hover:opacity-100 transition-opacity">{d?.value || 0}</text>
             </g>
           )
         })}
       </svg>
       <div className="flex justify-between mt-2 px-1">
         <span className="text-[8px] font-black">{data[0]?.label || ''}</span>
         {data.length > 2 && <span className="text-[8px] font-black opacity-50">{data[Math.floor(data.length/2)]?.label || ''}</span>}
         <span className="text-[8px] font-black">{data[data.length-1]?.label || ''}</span>
       </div>
     </div>
   )
};

const MondrianScatterChart = ({ data, darkMode }) => {
   if(!data || !data.length) return <div className="p-4 opacity-50 text-[10px] font-black uppercase text-center w-full">Sem dados</div>;
   const maxY = data.reduce((m, d) => Math.max(m, d?.y || 0), 100);
   return (
     <div className="relative w-full h-32">
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
         {[25,50,75].map(l => <line key={l} x1="0" x2="100" y1={l} y2={l} stroke={darkMode ? "#374151" : "#e5e7eb"} strokeWidth="1"/>)}
         <line x1="0" x2="0" y1="0" y2="100" stroke={darkMode ? "#9ca3af" : "#1f2937"} strokeWidth="1.5"/>
         <line x1="0" x2="100" y1="100" y2="100" stroke={darkMode ? "#9ca3af" : "#1f2937"} strokeWidth="1.5"/>
         {data.map((d, i) => {
           if (!d) return null;
           const cx = (((d.x||1) - 1) / 4) * 90 + 5; 
           const cy = 100 - (((d.y||0) / maxY) * 90 + 5);
           return <circle key={i} cx={cx} cy={cy} r="4" fill="#22d3ee" stroke={darkMode?"#1f2937":"#000"} strokeWidth="1.5"><title>{d.label || 'Item'}</title></circle>
         })}
       </svg>
       <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[7px] font-black opacity-60"><span>Nota 1</span><span>Nota 5</span></div>
     </div>
   )
};

const MondrianTreemap = ({ data, darkMode }) => {
  const total = (data || []).reduce((s, d) => s + (d?.value || 0), 0);
  if(!total) return <div className="p-4 opacity-50 text-[10px] font-black uppercase text-center w-full">Sem dados</div>;
  return (
    <div className="w-full h-32 flex flex-wrap content-start border-[3px] border-black dark:border-gray-300">
       {(data || []).map((d, i) => {
         if (!d || !d.value) return null;
         const perc = (d.value / total) * 100;
         if(!perc) return null;
         return (
           <div key={i} className={`flex items-center justify-center p-1 border-[1px] ${darkMode?'border-gray-300':'border-black'} ${getMondrianColor(i+1, darkMode)} overflow-hidden`} style={{ width: `${Math.max(18, perc)}%`, flexGrow: perc }}>
             <div className="flex flex-col items-center">
                <span className={`text-[8px] font-black uppercase truncate drop-shadow-md ${darkMode?'text-white':'text-black'}`}>{d.label || '--'}</span>
                <span className={`text-[10px] font-black drop-shadow-md ${darkMode?'text-white':'text-black'}`}>{d.value}</span>
             </div>
           </div>
         )
       })}
    </div>
  )
};

const MondrianGauge = ({ value, max, label, darkMode }) => {
  const v = Number(value) || 0; const m = Number(max) || 0;
  const perc = m > 0 ? Math.min(100, Math.max(0, (v / m) * 100)) : 0;
  const c = Math.PI * 40; 
  return (
     <div className="relative w-full flex flex-col items-center justify-center pt-2 pb-2 h-full">
        <svg viewBox="0 0 100 55" className="w-full max-w-[140px] drop-shadow-md overflow-visible">
           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={darkMode ? "#374151" : "#e5e7eb"} strokeWidth="14" strokeLinecap="square"/>
           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#fbbf24" strokeWidth="14" strokeDasharray={`${(perc/100)*c} ${c}`} strokeLinecap="square"/>
        </svg>
        <div className="absolute bottom-4 flex flex-col items-center">
          <div className={`text-2xl font-black ${darkMode ? 'text-amber-400' : 'text-amber-500'} drop-shadow-sm`}>{perc.toFixed(0)}%</div>
          <div className="text-[8px] font-black uppercase tracking-widest opacity-70 mt-1">{label}</div>
        </div>
     </div>
  )
};

const MondrianTimelineChart = ({ data, darkMode }) => {
  if(!data || !data.length) return <div className="p-4 opacity-50 text-[10px] font-black uppercase text-center w-full">Sem marcos</div>;
  return (
    <div className="w-full flex items-center justify-between overflow-x-auto scrollbar-hide py-8 px-4 relative">
      <div className={`absolute top-1/2 left-4 right-4 h-2 -translate-y-1/2 ${darkMode ? 'bg-gray-300' : 'bg-black'} z-0`} />
      {(data || []).map((d, i) => d && (
         <div key={i} className="relative z-10 flex flex-col items-center min-w-[70px] group flex-1">
            <div className="absolute bottom-full mb-3 text-[8px] font-black uppercase tracking-widest bg-pink-500 text-white px-2 py-1 truncate max-w-[120px] border-[3px] border-black opacity-0 group-hover:opacity-100 transition-opacity">{d?.title || 'Sem Título'}</div>
            <div className={`w-5 h-5 rounded-full border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${getMondrianColor(i, darkMode)} ${darkMode?'border-gray-300':'border-black'} hover:scale-125 transition-transform`} />
            <div className={`absolute top-full mt-3 text-[9px] font-black border-[3px] px-1.5 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode?'bg-gray-800 border-gray-300 text-white':'bg-white border-black text-black'}`}>{d?.year || ''}</div>
         </div>
      ))}
    </div>
  )
};

const syncItemToSheets = (item, url) => {
  if (url) fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(item) }).catch(e=>console.error(e));
};

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
  
  const itemsPerPage = 12; 
  
  const filteredItems = useMemo(() => {
    let result = (items || []).map((item, index) => ({ ...item, _originalIndex: index }));
    result = result.filter(item => {
      if(!item) return false;
      const q = search.toLowerCase();
      const mSearch = String(item.title||'').toLowerCase().includes(q) || String(item.author_developer||'').toLowerCase().includes(q);
      let mCat = true;
      if (activeCategory !== 'Todos') {
        if (activeSubtype === 'Todos') mCat = (activeCategories[activeCategory] || []).includes(item.type || '');
        else mCat = (item.type || '') === activeSubtype;
      }
      return mSearch && mCat;
    });
    result.sort((a, b) => {
      if (sortBy === 'id') return sortOrder === 'asc' ? a._originalIndex - b._originalIndex : b._originalIndex - a._originalIndex;
      let vA = a[sortBy] || ''; let vB = b[sortBy] || '';
      if (['year', 'rating', 'pages_or_time'].includes(sortBy)) { return sortOrder === 'asc' ? (parseFloat(vA)||0) - (parseFloat(vB)||0) : (parseFloat(vB)||0) - (parseFloat(vA)||0); }
      vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase();
      if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
      if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [items, search, activeCategory, activeSubtype, sortBy, sortOrder, activeCategories]);

  const paginatedItems = filteredItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  const handleSelect = (item) => { setSelectedItem(item); setEditedItem({ ...item }); };
  const updateRatingList = (id, newRating) => { 
    const updated = { ...items.find(i => i.id === id), rating: newRating };
    setItems(items.map(i => i.id === id ? updated : i)); playChipBeep('save'); onShowToast('success'); syncItemToSheets(updated, settings?.googleSheetsUrl);
  };
  const saveModifications = () => {
    setItems(items.map(i => i.id === editedItem.id ? editedItem : i)); setSelectedItem(editedItem); playChipBeep('save'); onShowToast('success'); syncItemToSheets(editedItem, settings?.googleSheetsUrl);
  };
  const confirmDelete = () => {
    if (itemToDelete) {
      const del = items.find(i => i.id === itemToDelete);
      setItems(items.filter(i => i.id !== itemToDelete)); setItemToDelete(null); setSelectedItem(null); setEditedItem(null); playChipBeep('save'); onShowToast('success');
      if (del && settings?.googleSheetsUrl) syncItemToSheets({ ...del, _action: 'delete', status: 'DELETADO' }, settings?.googleSheetsUrl);
    }
  };

  const fetchWikiInfo = async () => {
    const key = settings?.geminiApiKey || ""; 
    if (!key) { setWikiError("Chave API ausente."); playChipBeep('error'); onShowToast('error'); return; }
    setLoadingWiki(true); setWikiError('');
    try {
      const payload = { contents: [{ role: "user", parts: [{ text: `Escreva um parágrafo fascinante (máximo 4 linhas) sobre "${editedItem.title || ''}" ("${editedItem.author_developer || ''}"). Sem formatação extra.` }] }], generationConfig: { responseMimeType: "text/plain" } };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json(); if (data.error) throw new Error(data.error.message);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { setEditedItem({...editedItem, wiki_info: text}); playChipBeep('save'); onShowToast('success'); }
    } catch (e) { setWikiError(e.message); playChipBeep('error'); onShowToast('error'); } finally { setLoadingWiki(false); }
  };

  if (selectedItem && editedItem) {
    const isBookOrGame = [...(activeCategories['Livros'] || []), ...(activeCategories['Games'] || [])].includes(editedItem.type);
    const linkInfo = getExternalLinkInfo(editedItem.type, editedItem.title);
    return (
      <div className="flex flex-col h-full pb-20 relative max-w-4xl mx-auto w-full">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title}"?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[4px] ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-gray-100 text-black'}`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[4px] font-black uppercase text-[10px] tracking-widest ${darkMode?'bg-cyan-400 border-gray-300 text-black':'bg-cyan-400 border-black text-black'}`}>Salvar</button>
        </MContainer>
        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          <div className="flex gap-4 flex-col md:flex-row md:items-start">
            <MContainer darkMode={darkMode} className="w-32 h-44 md:w-48 md:h-64 flex-shrink-0 flex items-center justify-center overflow-hidden mx-auto md:mx-0" colorClass={`border-[4px] ${darkMode?'bg-gray-800':'bg-black'}`}>
              <MImage src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90" fallbackIcon={() => <LibraryBig className="w-10 h-10 text-white opacity-30" />} />
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase border-[3px] w-max px-1.5 py-0.5 mb-2 ${darkMode?'border-gray-300 bg-gray-800 text-gray-300':'border-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>
          <a href={linkInfo.url} target="_blank" rel="noopener noreferrer" className={`w-full p-3 border-[4px] font-black uppercase text-[10px] flex justify-center gap-2 ${darkMode?'bg-gray-800 border-gray-300 text-cyan-400':'bg-cyan-100 border-black text-cyan-800'}`}><ExternalLink className="w-4 h-4"/> Buscar na Web</a>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label={(activeCategories['Livros']||[]).includes(editedItem.type||'')?'Págs':'Horas/Min'} value={editedItem.pages_or_time||''} onChange={e=>setEditedItem({...editedItem, pages_or_time: e.target.value})} type="number" darkMode={darkMode} />
            <div className="col-span-2"><MInput label="Editora" value={editedItem.publisher || ''} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <MInput label="URL da Capa" value={editedItem.cover_url || ''} onChange={e => setEditedItem({...editedItem, cover_url: e.target.value})} darkMode={darkMode} />
            <MInput label="Localização" value={editedItem.location || ''} onChange={e => setEditedItem({...editedItem, location: e.target.value})} darkMode={darkMode} />
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            {isBookOrGame && (
              <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode?'bg-gray-800 text-white':'bg-gray-100 text-black'}>
                <label className="text-[10px] font-black uppercase mb-2 block border-b-[3px] pb-1">Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={()=>setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase border-[3px] ${editedItem.status===opt?(darkMode?'bg-cyan-800 border-gray-300 text-white':'bg-cyan-400 border-black text-black'):(darkMode?'bg-gray-900 border-gray-300 text-gray-400':'bg-white border-black text-black')}`}>{opt}</button>)}
                </div>
              </MContainer>
            )}
            <MContainer darkMode={darkMode} className="flex-1 p-3" colorClass={darkMode?'bg-gray-800 text-white':'bg-gray-100 text-black'}>
              <label className="text-[10px] font-black uppercase mb-2 block border-b-[3px] pb-1">Sua Avaliação</label>
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={()=>setEditedItem({...editedItem, rating: star})} className={`w-8 h-8 cursor-pointer ${star<=(editedItem.rating||0)?(darkMode?'fill-amber-400 text-amber-400':'fill-black text-black'):(darkMode?'text-gray-600':'text-gray-300')}`} />)}
              </div>
            </MContainer>
          </div>
          <MInput label="Descrição" multiline value={editedItem.description || ''} onChange={e => setEditedItem({...editedItem, description: e.target.value})} darkMode={darkMode} />
          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode?'bg-amber-900/30 text-white':'bg-amber-100 text-black'}><MInput label="Anotações" multiline value={editedItem.notes || ''} onChange={e => setEditedItem({...editedItem, notes: e.target.value})} darkMode={darkMode} /></MContainer>
          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode?'bg-pink-900/20 text-white':'bg-pink-100 text-black'}>
            <div className={`flex justify-between items-center mb-3 border-b-[4px] pb-1 ${darkMode?'border-gray-300':'border-black'}`}><span className="text-[10px] font-black uppercase flex items-center gap-1"><Sparkles className="w-4 h-4" /> Modo IA</span></div>
            {editedItem.wiki_info ? (
              <div><p className="text-xs font-bold leading-relaxed mb-3 italic">"{editedItem.wiki_info}"</p><button onClick={fetchWikiInfo} className="text-[9px] font-black uppercase underline flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gerar Nova Pesquisa</button></div>
            ) : (
             <div className="text-center py-2">
                {loadingWiki ? (
                  <div className="flex flex-col items-center"><Sparkles className="w-6 h-6 animate-pulse mb-2 text-pink-500" /><span className="text-[10px] font-black uppercase opacity-70">Consultando...</span></div>
                ) : (
                  <div className="flex flex-col items-center gap-2">{wikiError && <span className="text-[9px] font-bold text-pink-500">{wikiError}</span>}<MButton onClick={fetchWikiInfo} darkMode={darkMode} variant="black" className="w-full text-[10px] bg-pink-500 text-white">✨ Pesquisar sobre a Obra</MButton></div>
                )}
              </div>
            )}
          </MContainer>
          <button onClick={saveModifications} className={`w-full mt-4 py-3 border-[4px] font-black uppercase text-[12px] flex items-center justify-center gap-2 ${darkMode?'bg-cyan-400 border-gray-300 text-black':'bg-cyan-400 border-black text-black'}`}><Check className="w-5 h-5" /> Salvar Alterações</button>
          <div className="mt-8 mb-2 text-center"><button onClick={()=>setItemToDelete(editedItem.id)} className="text-[9px] font-black uppercase opacity-40 underline text-pink-500">Apagar este item</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MContainer darkMode={darkMode} className="p-3 mb-4 flex flex-col gap-3 sticky top-0 z-10" colorClass={darkMode?'bg-gray-900':'bg-white'}>
        <div className="flex gap-2 w-full items-center">
          <div className="relative flex-1"><Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${darkMode?'text-gray-400':'text-black'}`} /><input type="text" placeholder="Buscar..." value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} className={`w-full p-2 pl-8 border-[4px] font-sans text-xs font-bold outline-none ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'}`} /></div>
          <div className="flex gap-1 items-center flex-shrink-0">
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className={`w-[85px] p-2 border-[3px] text-[8px] font-black uppercase outline-none ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'}`}><option value="id">Adição</option><option value="title">Título</option><option value="author_developer">Autor</option><option value="year">Ano</option><option value="rating">Nota</option><option value="pages_or_time">Tam</option></select>
            <button onClick={()=>setSortOrder(o=>o==='asc'?'desc':'asc')} className={`w-8 h-[34px] flex items-center justify-center border-[3px] ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'}`}>{sortOrder==='asc'?'↑':'↓'}</button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Todos', ...Object.keys(activeCategories||{})].map(cat => <button key={cat} onClick={()=>{setActiveCategory(cat);setActiveSubtype('Todos');setPage(0);}} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase font-black border-[3px] ${darkMode?'border-gray-300':'border-black'} ${activeCategory===cat?(darkMode?'bg-pink-800 text-white':'bg-pink-500 text-black'):(darkMode?'bg-gray-800 text-white':'bg-white text-black')}`}>{cat}</button>)}
        </div>
        {activeCategory !== 'Todos' && activeCategories[activeCategory] && activeCategories[activeCategory].length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={()=>{setActiveSubtype('Todos');setPage(0);}} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase font-black border-[3px] ${darkMode?'border-gray-300':'border-black'} ${activeSubtype==='Todos'?(darkMode?'bg-cyan-800 text-white':'bg-cyan-400 text-black'):(darkMode?'bg-gray-800 text-white':'bg-white text-black')}`}>Todos</button>
            {activeCategories[activeCategory].map(type => <button key={type} onClick={()=>{setActiveSubtype(type);setPage(0);}} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase font-black border-[3px] ${darkMode?'border-gray-300':'border-black'} ${activeSubtype===type?(darkMode?'bg-cyan-800 text-white':'bg-cyan-400 text-black'):(darkMode?'bg-gray-800 text-white':'bg-white text-black')}`}>{type}</button>)}
          </div>
        )}
      </MContainer>
      <div className="flex-1 overflow-y-auto pb-20 px-1">
        {paginatedItems.length === 0 ? (
          <div className="text-center p-10 opacity-50 text-sm font-black uppercase">Nenhum item</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row h-32 cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg" onClick={() => handleSelect(item)}>
                <MContainer darkMode={darkMode} className="w-5 border-r-0 rounded-l-sm" colorClass={getMondrianColor(idx, darkMode)} />
                <MContainer darkMode={darkMode} className="flex-1 flex p-2 rounded-r-sm" colorClass={darkMode?'bg-gray-800 text-white':'bg-white text-black'}>
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-1 truncate">{item.type||'--'} • {item.year||'--'}</div>
                      <div className="text-sm font-black leading-tight break-words line-clamp-2">{item.title||'S/ Título'}</div>
                      <div className="text-[11px] font-bold opacity-80 truncate uppercase mt-1">{item.author_developer||'--'}</div>
                    </div>
                    <div className="flex justify-between items-end mt-auto">
                      {[...(activeCategories['Livros']||[]), ...(activeCategories['Games']||[])].includes(item.type) ? (
                        <div className={`text-[8px] px-2 py-1 border-[3px] ${darkMode?'border-gray-300 bg-cyan-900 text-cyan-300':'border-black bg-amber-400 text-black'} font-black uppercase`}>{item.status||'--'}</div>
                      ) : <div/>}
                      <div className="flex gap-0.5" onClick={e=>e.stopPropagation()}>
                         {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={()=>updateRatingList(item.id, star)} className={`w-[18px] h-[18px] cursor-pointer ${star<=(item.rating||0)?(darkMode?'fill-amber-400 text-amber-400':'fill-black text-black'):(darkMode?'text-gray-600':'text-gray-300')}`} />)}
                      </div>
                    </div>
                 </div>
                </MContainer>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 mb-4 max-w-lg mx-auto">
            <MButton darkMode={darkMode} onClick={()=>setPage(Math.max(0, page-1))} className="w-12 h-10" disabled={page===0}><ChevronLeft className="w-5 h-5"/></MButton>
            <div className="font-sans text-[10px] font-black uppercase">Pág {page+1} / {totalPages}</div>
            <MButton darkMode={darkMode} onClick={()=>setPage(Math.min(totalPages-1, page+1))} className="w-12 h-10" disabled={page===totalPages-1}><ChevronRight className="w-5 h-5"/></MButton>
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
  const updateStatus = (state, message) => setScanBox({ state, message });
  const changeMode = (m) => { setAddMode(m); if (m !== 'manual') { updateStatus('idle', ''); resetGlobalAi(); } };
  
  useEffect(() => {
    if (scannedAIData) {
       setFormData(p => ({ ...p, title: scannedAIData.title||'', author_developer: scannedAIData.author_developer||'', year: scannedAIData.year?.toString()||'', publisher: scannedAIData.publisher||'', description: scannedAIData.description||'', pages_or_time: scannedAIData.pages_or_time||p.pages_or_time, type: allTypes.includes(scannedAIData.type) ? scannedAIData.type : 'Livro' }));
       setScannedAIData(null); 
    }
  }, [scannedAIData, setScannedAIData, allTypes]);
  
  const dState = globalAiState !== 'idle' ? globalAiState : scanBox.state;
  const dMsg = globalAiState !== 'idle' ? globalAiMessage : scanBox.message;
  
  useEffect(() => {
    let isMounted = true; let scannerInstance = null;
    if (addMode === 'barcode' && isHtml5QrcodeLoaded && window.Html5Qrcode) {
      scannerInstance = new window.Html5Qrcode("reader-barcode");
      scannerRef.current = scannerInstance;
      scannerInstance.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, (text) => {
          if (isProcessingScan.current) return;
          isProcessingScan.current = true;
          if (scannerRef.current?.getState() === 2) {
             scannerRef.current.stop().then(() => {
                if(isMounted) { setAddMode('manual'); setFormData(p=>({...p, barcode: text})); fetchMultiDatabase(text); setTimeout(()=>isProcessingScan.current=false, 2000); }
             }).catch(e=>console.error(e));
          }
      }, ()=>{}).catch(e => { if(isMounted) { updateStatus('error', 'Erro ao acessar Câmera.'); setAddMode('manual'); } });
    }
    return () => { isMounted = false; if (scannerInstance) { try { if([1,2].includes(scannerInstance.getState())) scannerInstance.stop().then(()=>scannerInstance.clear()).catch(()=>{}); else scannerInstance.clear(); } catch(e){} scannerRef.current=null; } };
  }, [addMode, isHtml5QrcodeLoaded]);

  const fetchMultiDatabase = async (barcode) => {
    const clean = barcode.replace(/[-\s]/g, ""); updateStatus('loading', 'Buscando...');
    try {
      let fItem = { barcode: clean, title: '', author_developer: '', publisher: '', year: '', pages_or_time: '', type: 'Livro', cover_url: '', description: '' };
      let found = false;
      if (!found && clean.length >= 10 && clean.length <= 13) {
        try {
          const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${clean}`); const data = await res.json();
          if (data.items?.length > 0) {
            const item = data.items[0]; fItem = { ...fItem, title: item.title||"", publisher: item.brand||item.publisher||"", cover_url: item.images?.[0]||"" };
            const cat = String(item.category||"").toLowerCase(); const tit = String(item.title||"").toLowerCase();
            if (cat.includes('music') || tit.includes(' cd')) fItem.type = 'CD';
            else if (cat.includes('video game')) fItem.type = 'PS4';
            else if (cat.includes('dvd') || tit.includes('dvd')) fItem.type = 'DVD';
            found = true;
          }
        } catch(e) {}
      }
      if (!found && (!clean.startsWith("978") && !clean.startsWith("979"))) {
        try {
          const res = await fetch(`https://musicbrainz.org/ws/2/release/?query=barcode:${clean}&fmt=json`); const data = await res.json();
          if (data.releases?.length > 0) {
            const rel = data.releases[0];
            fItem = { ...fItem, title: rel.title||"", author_developer: rel["artist-credit"]?.map(a=>a.name).join(", ")||"", publisher: rel.label||"", year: rel.date?.substring(0,4)||"", type: 'CD', cover_url: rel["cover-art-archive"]?.front ? `https://coverartarchive.org/release/${rel.id}/front`:"" };
            found = true;
          }
        } catch(e) {}
      }
      if (!found && clean.length === 13 && (clean.startsWith("978") || clean.startsWith("979"))) {
        try {
          const res = await fetch(`https://brasilapi.com.br/api/isbn/v1/${clean}`);
          if (res.ok) {
            const data = await res.json();
            fItem = { ...fItem, title: data.title||"", author_developer: data.authors?.join(", ")||"", publisher: data.publisher||"", year: data.year?.toString()||"", pages_or_time: data.page_count?.toString()||"", description: data.synopsis||"", cover_url: data.cover_url||"", type: 'Livro' };
            found = true;
          }
        } catch(e) {}
      }
      if (!found && (clean.startsWith("978") || clean.startsWith("979"))) {
        try {
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`); const data = await res.json();
          if (data.items?.length > 0) {
            const info = data.items[0].volumeInfo;
            fItem = { ...fItem, title: info.title||"", author_developer: info.authors?.join(", ")||"", publisher: info.publisher||"", year: info.publishedDate?.substring(0,4)||"", pages_or_time: info.pageCount?.toString()||"", cover_url: info.imageLinks?.thumbnail?.replace("http://","https://")||"", description: info.description||"", type: 'Livro' };
            found = true;
          }
        } catch(e) {}
      }
      if (found) { playChipBeep('success'); updateStatus('success', 'Encontrado!'); setFormData(p=>({...p, ...fItem})); } 
      else { playChipBeep('error'); updateStatus('error', 'Não encontrado em banco online. Preencha manualmente.'); }
    } catch (e) { playChipBeep('error'); updateStatus('error', 'Falha.'); }
  };

  const [showErr, setShowErr] = useState(false);
  const handleSave = () => {
    if (!formData.title) { playChipBeep('error'); setShowErr(true); return; }
    const cCode = activeClassCodes[formData.type] || '000';
    const pre = settings?.archivePrefix ? settings.archivePrefix.trim().toUpperCase() : 'MBU';
    let maxS = 0; items.forEach(i => { if(i.archive_code) { const p = String(i.archive_code).split('-'); if(p.length>=3 && p[1]===cCode) maxS = Math.max(maxS, parseInt(p[2],10)||0); } });
    const nItem = { ...formData, id: generateId(items), archive_code: `${pre}-${cCode}-${String(maxS+1).padStart(4,'0')}` };
    setItems([...items, nItem]); syncItemToSheets(nItem, settings?.googleSheetsUrl); playChipBeep('save'); onShowToast('success');
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    updateStatus('idle', ''); resetGlobalAi(); setActiveTab('library');
  };

  const isBOG = [...(activeCategories['Livros']||[]), ...(activeCategories['Games']||[])].includes(formData.type);
  
  return (
    <div className="flex flex-col h-full pb-20 max-w-3xl mx-auto w-full">
      <MModal isOpen={showErr} title="Atenção" message="O Título é obrigatório." onConfirm={()=>setShowErr(false)} onCancel={()=>setShowErr(false)} darkMode={darkMode} confirmText="OK" cancelText="Fechar" />
      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode==='manual'?'cyan':'white'} onClick={()=>changeMode('manual')} className="flex-1 py-2 text-[10px]"><PlusSquare className="w-4 h-4"/> Manual</MButton>
        <MButton darkMode={darkMode} variant={addMode==='barcode'?'amber':'white'} onClick={()=>changeMode('barcode')} className="flex-1 py-2 text-[10px]"><ScanLine className="w-4 h-4"/> Barcode</MButton>
        <MButton darkMode={darkMode} variant="pink" onClick={triggerGlobalAI} className="flex-1 py-2 text-[10px]"><Camera className="w-4 h-4"/> Auto IA</MButton>
      </div>
      {dState !== 'idle' && (
        <div className={`p-4 mb-4 flex items-start gap-3 border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black text-xs uppercase ${dState==='loading'?(darkMode?'bg-amber-700 border-gray-300 text-white shadow-[4px_4px_0px_rgba(209,213,219,1)]':'bg-amber-400 border-black text-black'):dState==='success'?(darkMode?'bg-cyan-800 border-gray-300 text-white shadow-[4px_4px_0px_rgba(209,213,219,1)]':'bg-cyan-400 border-black text-black'):(darkMode?'bg-pink-800 border-gray-300 text-white shadow-[4px_4px_0px_rgba(209,213,219,1)]':'bg-pink-500 border-black text-white')}`}>
          {dState==='loading'&&<div className="w-5 h-5 border-4 border-current border-t-transparent rounded-sm animate-spin"/>}
          {dState==='success'&&<Check className="w-6 h-6" />}
          {dState==='error'&&<AlertTriangle className="w-6 h-6 mt-0.5" />}
          <span className="flex-1 whitespace-pre-wrap">{dMsg}</span>
        </div>
      )}
      {addMode === 'barcode' && (
        <MContainer darkMode={darkMode} className="flex-1 mb-4 flex flex-col relative overflow-hidden bg-black items-center justify-center min-h-[300px]">
          {!isHtml5QrcodeLoaded && <div className="text-white font-black uppercase text-xs animate-pulse">Carregando Câmera...</div>}
          <div id="reader-barcode" className="w-full h-full object-cover absolute inset-0"></div>
          <div className="absolute inset-0 border-[10px] border-black/30 pointer-events-none z-10" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-[4px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center z-20">
            <span className="text-white text-[10px] uppercase font-black bg-black px-3 py-1 mt-24">Alinhe o Código</span>
          </div>
        </MContainer>
      )}
      {addMode === 'manual' && (
        <div className="flex-1 overflow-y-auto pr-1">
          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900':'bg-white'}>
            <div className="mb-4">
              <label className={`text-[10px] font-black uppercase mb-1 block ${darkMode?'text-gray-400':'text-gray-900'}`}>Formato</label>
              <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[4px] ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'} font-sans text-sm font-black`}>
                {Object.entries(activeCategories||{}).map(([c,s])=><optgroup label={`- ${c.toUpperCase()} -`} key={c}>{(s||[]).map(sb=><option key={sb} value={sb}>{sb}</option>)}</optgroup>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div className="md:col-span-3"><MInput darkMode={darkMode} label="Título *" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} /></div>
              <div className="md:col-span-1"><MInput darkMode={darkMode} label="Ano" type="number" value={formData.year} onChange={e=>setFormData({...formData, year: e.target.value})} /></div>
            </div>
            <MInput darkMode={darkMode} label="Autor / Estúdio" value={formData.author_developer} onChange={e=>setFormData({...formData, author_developer: e.target.value})} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div className="md:col-span-3"><MInput darkMode={darkMode} label="Editora" value={formData.publisher} onChange={e=>setFormData({...formData, publisher: e.target.value})} /></div>
              <div className="md:col-span-1"><MInput darkMode={darkMode} label="Tamanho" type="number" value={formData.pages_or_time} onChange={e=>setFormData({...formData, pages_or_time: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <MInput darkMode={darkMode} label="URL Capa" value={formData.cover_url} onChange={e=>setFormData({...formData, cover_url: e.target.value})} />
              <MInput darkMode={darkMode} label="Localização" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
            </div>
            <MInput darkMode={darkMode} label="Descrição" multiline value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
            <MInput darkMode={darkMode} label="Anotações" multiline value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} />
            {isBOG && (
              <div className="mb-4">
                <label className="text-[10px] font-black uppercase mb-1 block">Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => <button key={opt} onClick={()=>setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase border-[3px] ${formData.status===opt?(darkMode?'bg-cyan-800 border-gray-300 text-white':'bg-cyan-400 border-black text-black'):(darkMode?'bg-gray-900 border-gray-300 text-gray-400':'bg-white border-black text-black')}`}>{opt}</button>)}
                </div>
              </div>
            )}
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
  
  // Reforço extremo: garantir que items é um array, garantir que cada item não é null
  const dashItems = useMemo(() => (items || []).filter(item => {
    if (!item) return false;
    let mC = true, mS = true, mR = true;
    if (filterCat !== 'Todas') mC = (activeCategories[filterCat] || []).includes(item?.type || '');
    if (filterStatus !== 'Todos') mS = (item?.status || '') === filterStatus;
    if (filterRating !== 'Todas') mR = Number(item?.rating || 0) === parseInt(filterRating);
    return mC && mS && mR;
  }), [items, filterCat, filterStatus, filterRating, activeCategories]);
  
  const tD = dashItems.length;
  
  // Fallbacks reforçados para todos os reduce
  const byType = dashItems.reduce((a, i) => { 
    if(!i) return a;
    const type = i.type || 'Outro';
    a[type] = (a[type]||0) + 1; 
    return a; 
  }, {});
  
  const sAuthors = Object.entries(dashItems.reduce((a, i) => { 
    if (i && i.author_developer) {
      const auth = String(i.author_developer).trim();
      if(auth) a[auth] = (a[auth]||0) + 1;
    }
    return a; 
  }, {})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  
  const mAuthor = sAuthors.length > 0 ? sAuthors[0][1] : 1;
  
  const byDecade = dashItems.reduce((a, i) => { 
    const y = parseInt(i?.year); 
    if(!isNaN(y) && y>1800) { 
      const d = Math.floor(y/10)*10; 
      a[d] = (a[d]||0)+1; 
    } 
    return a; 
  }, {});
  
  const decKeys = Object.keys(byDecade).sort();
  const maxDecade = decKeys.length > 0 ? Object.values(byDecade).reduce((m,v)=>Math.max(m,v),1) : 1;
  
  const stats = useMemo(() => {
    if(!tD) return {};
    const vY = dashItems.filter(i => i && i.year && !isNaN(parseInt(i.year)));
    const reliquia = vY.length ? vY.reduce((a, b) => parseInt(a?.year||0) < parseInt(b?.year||0) ? a : b) : null;
    const vL = dashItems.filter(i => i && i.pages_or_time && !isNaN(parseInt(i.pages_or_time)));
    const epico = vL.length ? vL.reduce((a, b) => parseInt(a?.pages_or_time||0) > parseInt(b?.pages_or_time||0) ? a : b) : null;
    const vergonha = dashItems.filter(i => i && i.status === 'Não Iniciado').length;
    return { reliquia, epico, vergonha };
  }, [dashItems, tD]);

  const sCounts = STATUS_OPTIONS.map((s, i) => ({ 
    label: s, 
    value: dashItems.filter(it => it && it.status === s).length, 
    hexColor: getMondrianHex(i, darkMode) 
  }));
  
  const yCounts = {};
  dashItems.forEach(i => { 
    const y = parseInt(i?.year); 
    if(!isNaN(y) && y>1900 && y<=new Date().getFullYear()+5) {
      yCounts[y] = (yCounts[y]||0)+1; 
    }
  });
  const lData = Object.keys(yCounts).sort().map(y => ({ label: y, value: yCounts[y] }));
  
  const scData = dashItems.filter(i => i && (Number(i.rating)>0) && (Number(i.pages_or_time)>0))
    .map(i => ({x: Number(i.rating), y: Number(i.pages_or_time), label: i.title || 'Item'}));
    
  const tmData = Object.entries(byType).map(([t, c]) => ({ label: t, value: c }));
  
  const tlItems = dashItems.filter(i => i && i.year && !isNaN(parseInt(i.year))).sort((a,b)=>parseInt(a.year)-parseInt(b.year));
  const tlNodes = [];
  if(tlItems.length > 0) {
    tlNodes.push(tlItems[0]);
    if(tlItems.length>4) tlNodes.push(tlItems[Math.floor(tlItems.length/4)]);
    if(tlItems.length>2) tlNodes.push(tlItems[Math.floor(tlItems.length/2)]);
    if(tlItems.length>3) tlNodes.push(tlItems[Math.floor((tlItems.length/4)*3)]);
    if(tlItems.length>1) tlNodes.push(tlItems[tlItems.length-1]);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4 max-w-5xl mx-auto w-full">
      <MContainer darkMode={darkMode} className="p-3 sticky top-0 z-20" colorClass={darkMode?'bg-gray-900':'bg-white'}>
        <div className="flex gap-2 flex-col md:flex-row">
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'}`}><option value="Todas">Tudo</option>{Object.keys(activeCategories||{}).map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'}`}><option value="Todos">Status</option>{STATUS_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}</select>
          <select value={filterRating} onChange={e=>setFilterRating(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-white text-black'}`}><option value="Todas">Notas</option>{[5,4,3,2,1].map(r=><option key={r} value={r}>{r} Estrelas</option>)}</select>
        </div>
      </MContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode?'bg-cyan-800 text-white':'bg-cyan-400 text-black'}><LibraryBig className="absolute -right-4 -bottom-4 w-20 h-20 opacity-20" /><div className="text-5xl font-black z-10">{tD}</div><div className="text-[9px] font-black uppercase mt-1 z-10">Itens no Filtro</div></MContainer>
        <MContainer darkMode={darkMode} className="p-4 flex flex-col items-center justify-center relative overflow-hidden h-28" colorClass={darkMode?'bg-gray-800 text-white':'bg-gray-200 text-black'}><Ghost className="absolute -right-4 -bottom-4 w-20 h-20 opacity-20" /><div className="text-5xl font-black z-10">{stats.vergonha||0}</div><div className="text-[9px] font-black uppercase mt-1 z-10">Backlog</div></MContainer>
        {stats.reliquia && <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between h-28" colorClass={darkMode?'bg-amber-700 text-white':'bg-amber-400 text-black'}><div className="flex justify-between mb-2"><div className="text-[9px] font-black uppercase">A Relíquia</div><Clock className="w-5 h-5 opacity-50" /></div><div><div className="text-xs font-black line-clamp-2">{stats.reliquia.title || 'S/ Título'}</div><div className="text-[9px] font-bold mt-1">Ano {stats.reliquia.year || '--'}</div></div></MContainer>}
        {stats.epico && <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between h-28" colorClass={darkMode?'bg-pink-800 text-white':'bg-pink-500 text-black'}><div className="flex justify-between mb-2"><div className="text-[9px] font-black uppercase">O Épico</div><Flame className="w-5 h-5 opacity-50" /></div><div><div className="text-xs font-black line-clamp-2">{stats.epico.title || 'S/ Título'}</div><div className="text-[9px] font-bold mt-1">{stats.epico.pages_or_time || 0} Tam</div></div></MContainer>}
      </div>

      {tD > 0 && (
        <>
          {decKeys.length > 0 && (
            <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
              <div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-4 flex justify-between"><span>Por Década</span><BarChart2 className="w-4 h-4" /></div>
              <div className="flex items-end gap-2 h-32 pt-4 border-b-[3px] overflow-x-auto">
                {decKeys.map((k, i) => (
                    <div key={k} className="flex flex-col items-center justify-end flex-1 min-w-[30px] h-full group">
                      <div className="text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">{byDecade[k]}</div>
                      <div className={`w-full border-[3px] border-b-0 ${getMondrianColor(i+2,darkMode)}`} style={{ height: `${(byDecade[k]/maxDecade)*100}%` }} />
                    </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2 px-1 overflow-x-auto">{decKeys.map(k=><div key={k} className="flex-1 min-w-[30px] text-center text-[8px] font-black">{k}s</div>)}</div>
            </MContainer>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2">Pizza</div><MondrianPieChart data={sCounts} darkMode={darkMode} /></MContainer>
             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2">Área</div><MondrianLineAreaChart data={lData} darkMode={darkMode} isArea /></MContainer>
             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2">Linhas</div><MondrianLineAreaChart data={lData} darkMode={darkMode} /></MContainer>
             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2">Dispersão</div><MondrianScatterChart data={scData} darkMode={darkMode} /></MContainer>
             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2">Treemap</div><MondrianTreemap data={tmData} darkMode={darkMode} /></MContainer>
             <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2">Gauge</div><MondrianGauge value={dashItems.filter(i=>i && i.status==='Concluído').length} max={tD} label="Concluídos" darkMode={darkMode} /></MContainer>
             <MContainer darkMode={darkMode} className="p-4 md:col-span-2 lg:col-span-3" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}><div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-4">Autores / Barras</div><div className="flex flex-col">{sAuthors.map(([a, c], i) => <MondrianHBar key={a} label={a||'--'} value={c} max={mAuthor} index={i+1} darkMode={darkMode} />)}</div></MContainer>
          </div>

          {tlNodes.length > 0 && (
            <MContainer darkMode={darkMode} className="p-4 flex flex-col mt-4" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
               <div className="text-[10px] font-black uppercase border-b-[4px] pb-2 mb-2 flex justify-between"><span>Cronograma</span><Calendar className="w-4 h-4" /></div>
               <MondrianTimelineChart data={tlNodes} darkMode={darkMode} />
            </MContainer>
          )}
        </>
      )}
    </div>
  );
};

const CompletedGamesTab = ({ completedGames, setCompletedGames, settings, darkMode, onShowToast }) => {
  const [filterConsole, setFilterConsole] = useState('Todos');
  const [filterGenre, setFilterGenre] = useState('Todos');
  const [page, setPage] = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);
  const itemsPerPage = 24;

  const handleManualImport = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = processCompletedGamesCSV(evt.target.result);
      if(parsed.length) { setCompletedGames(parsed); playChipBeep('save'); onShowToast('success'); }
      else { playChipBeep('error'); onShowToast('error'); }
    };
    reader.readAsText(file); e.target.value = null;
  };

  const fGames = useMemo(() => completedGames.filter(g => (filterConsole==='Todos'||g.console===filterConsole) && (filterGenre==='Todos'||g.genero===filterGenre)), [completedGames, filterConsole, filterGenre]);
  const pGames = fGames.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(fGames.length / itemsPerPage) || 1;

  if (!completedGames.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <GamepadIcon className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-black uppercase mb-2">Sem Dados</h2>
        <label className={`cursor-pointer px-6 py-4 text-center border-[4px] ${darkMode?'bg-cyan-800 text-white':'bg-cyan-400 text-black'} font-black uppercase mt-4`}>Upload CSV<input type="file" accept=".csv" className="hidden" onChange={handleManualImport} /></label>
      </div>
    );
  }

  if (selectedGame) {
    return (
      <div className="flex flex-col h-full pb-20 max-w-4xl mx-auto w-full">
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex justify-between sticky top-0 z-10" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
          <button onClick={() => setSelectedGame(null)} className={`p-2 border-[4px] ${darkMode?'bg-gray-800 text-white':'bg-gray-100 text-black'}`}><ChevronLeft className="w-5 h-5" /></button>
        </MContainer>
        <div className="flex-1 px-1 space-y-4">
          <MReadOnlyBox label="Nome" value={selectedGame.nome} darkMode={darkMode} emphasize />
          <div className="grid grid-cols-2 gap-2"><MReadOnlyBox label="Nota" value={selectedGame.nota} darkMode={darkMode}/><MReadOnlyBox label="Tempo" value={`${selectedGame.tempoHoras}h`} darkMode={darkMode}/></div>
          <MReadOnlyBox label="Observações" value={selectedGame.observacao} multiline darkMode={darkMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20 pr-1 space-y-4 max-w-7xl mx-auto w-full">
      <MContainer darkMode={darkMode} className="p-3 sticky top-0 z-20" colorClass={darkMode?'bg-gray-900':'bg-white'}>
        <div className="flex gap-2 flex-col sm:flex-row">
          <select value={filterConsole} onChange={e=>setFilterConsole(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase ${darkMode?'bg-gray-800 text-white':'bg-white text-black'}`}><option value="Todos">Consoles</option>{[...new Set(completedGames.map(g=>g.console))].sort().map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select value={filterGenre} onChange={e=>setFilterGenre(e.target.value)} className={`flex-1 p-1 border-[3px] text-[9px] font-black uppercase ${darkMode?'bg-gray-800 text-white':'bg-white text-black'}`}><option value="Todos">Gêneros</option>{[...new Set(completedGames.map(g=>g.genero))].sort().map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
      </MContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {pGames.map((g) => (
          <div key={g.id} onClick={() => setSelectedGame(g)} className={`cursor-pointer p-2 border-[4px] ${darkMode?'bg-gray-800 text-white border-gray-300':'bg-white text-black border-black'} transition-all hover:-translate-y-1 flex justify-between`}>
             <div className="flex flex-col flex-1 overflow-hidden pr-2">
                <div className="text-sm font-black truncate">{g.nome}</div>
                <div className="text-[9px] font-bold uppercase opacity-70 truncate">{g.console}</div>
             </div>
             <div className="flex flex-col items-end border-l-[3px] pl-2 min-w-[50px]">
                <div className="text-[12px] font-black text-amber-500">★ {g.nota}</div>
             </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 mb-4 max-w-lg mx-auto w-full">
          <MButton darkMode={darkMode} onClick={()=>setPage(Math.max(0, page-1))} className="w-12 h-10" disabled={page===0}><ChevronLeft className="w-5 h-5"/></MButton>
          <MButton darkMode={darkMode} onClick={()=>setPage(Math.min(totalPages-1, page+1))} className="w-12 h-10" disabled={page===totalPages-1}><ChevronRight className="w-5 h-5"/></MButton>
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
    if(!items.length) return;
    const rows = items.map(i => [`"${i.id}"`, `"${i.archive_code||''}"`, `"${i.type}"`, `"${i.title||''}"`, `"${i.author_developer||''}"`, `"${i.year||''}"`, `"${i.publisher||''}"`, `"${i.status||''}"`, i.rating||0, `"${i.pages_or_time||''}"`, `"${i.barcode||''}"`, `"${i.description||''}"`, `"${i.cover_url||''}"`, `"${i.location||''}"`, `"${i.notes||''}"`, `"${i.wiki_info||''}"`]);
    const csvContent = "ID,Código Arquivístico,Tipo,Título,Autor/Desenvolvedor,Ano,Editora/Gravadora,Status,Nota,Páginas/Tempo,Código de Barras,Descrição,URL da Capa,Localização,Anotações,Wiki\n" + rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Memorabilia.csv`; link.click();
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = parseCSVText(evt.target.result);
      if(rows.length < 2) return;
      const hds = rows[0].map(h=>h.trim()); const newItems = [];
      for(let i=1; i<rows.length; i++) {
        if(rows[i].length===1 && !rows[i][0].trim()) continue;
        const it = {};
        hds.forEach((h, idx) => {
          let k = h;
          if(h==='ID')k='id'; if(h==='Código Arquivístico')k='archive_code'; if(h==='Tipo')k='type'; if(h==='Título')k='title'; if(h==='Autor/Desenvolvedor')k='author_developer'; if(h==='Ano')k='year'; if(h==='Editora/Gravadora')k='publisher'; if(h==='Status')k='status'; if(h==='Nota')k='rating'; if(h==='Páginas/Tempo')k='pages_or_time'; if(h==='Código de Barras')k='barcode'; if(h==='Descrição')k='description'; if(h==='URL da Capa')k='cover_url'; if(h==='Localização')k='location'; if(h==='Anotações')k='notes'; if(h==='Wiki')k='wiki_info';
          it[k] = rows[i][idx] ? rows[i][idx].trim() : '';
        });
        if(it.id || it.title) { it.rating = parseInt(it.rating)||0; if(!it.id) it.id = generateId(newItems); newItems.push(it); }
      }
      if(newItems.length > 0) setImportData(newItems);
    }; 
    reader.readAsText(file); e.target.value = null;
  };

  const handleAddSubclass = () => {
    if(!newSubclass.name || !newSubclass.code) { playChipBeep('error'); return; }
    const updatedCats = { ...activeCategories };
    if(!updatedCats[newSubclass.parent]) updatedCats[newSubclass.parent] = [];
    if(!updatedCats[newSubclass.parent].includes(newSubclass.name.trim())) updatedCats[newSubclass.parent] = [...updatedCats[newSubclass.parent], newSubclass.name.trim()];
    setSettings({...settings, userCategories: updatedCats, userClassCodes: { ...activeClassCodes, [newSubclass.name.trim()]: newSubclass.code.trim() } });
    setNewSubclass({ parent: 'Livros', name: '', code: '' }); playChipBeep('save'); onShowToast('success');
  };

  const ts = (sec) => setOpenSection(openSection === sec ? null : sec);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 max-w-3xl mx-auto w-full">
      <MModal isOpen={showResetConfirm} title="Aviso" message="Apagar TUDO?" onConfirm={()=>{setItems([]);setShowResetConfirm(false);}} onCancel={()=>setShowResetConfirm(false)} darkMode={darkMode} />
      <MModal isOpen={!!importData} title="Importar CSV" message={`Substituir a coleção por ${importData?.length||0} itens?`} onConfirm={()=>{setItems(importData);setImportData(null);}} onCancel={()=>setImportData(null)} darkMode={darkMode} />

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
        <button onClick={()=>ts('apa')} className="w-full p-4 flex justify-between items-center text-[10px] font-black uppercase"><span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Aparência</span><span className="text-lg font-mono">{openSection==='apa'?'-':'+'}</span></button>
        {openSection === 'apa' && (
          <div className="p-4 flex flex-col gap-4">
            <MButton onClick={()=>setDarkMode(!darkMode)} darkMode={darkMode} variant="black">{darkMode?'Modo Claro':'Modo Escuro'}</MButton>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
        <button onClick={()=>ts('arq')} className="w-full p-4 flex justify-between items-center text-[10px] font-black uppercase"><span className="flex items-center gap-2"><ListIcon className="w-4 h-4" /> Classes</span><span className="text-lg font-mono">{openSection==='arq'?'-':'+'}</span></button>
        {openSection === 'arq' && (
          <div className="p-4 flex flex-col gap-4">
             <MInput darkMode={darkMode} label="Prefixo" value={settings?.archivePrefix||''} onChange={e=>setSettings({...settings, archivePrefix: e.target.value.toUpperCase()})} />
             <div className={`p-3 border-[4px] ${darkMode?'border-gray-300':'border-black'}`}>
               <select value={newSubclass.parent} onChange={e=>setNewSubclass({...newSubclass, parent: e.target.value})} className="w-full p-2 mb-2 border-[3px] font-bold text-black">{Object.keys(activeCategories||{}).map(c=><option key={c} value={c}>{c}</option>)}</select>
               <input placeholder="Nome" value={newSubclass.name} onChange={e=>setNewSubclass({...newSubclass, name: e.target.value})} className="w-full p-2 mb-2 border-[3px] text-black" />
               <input placeholder="Código" value={newSubclass.code} onChange={e=>setNewSubclass({...newSubclass, code: e.target.value})} className="w-full p-2 mb-2 border-[3px] text-black" />
               <MButton onClick={handleAddSubclass} darkMode={darkMode}>Adicionar</MButton>
             </div>
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode?'bg-gray-900 text-white':'bg-white text-black'}>
        <button onClick={()=>ts('int')} className="w-full p-4 flex justify-between items-center text-[10px] font-black uppercase"><span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Integrações</span><span className="text-lg font-mono">{openSection==='int'?'-':'+'}</span></button>
        {openSection === 'int' && (
          <div className="p-4 flex flex-col gap-3">
            <MInput darkMode={darkMode} label="Google Gemini API" type="password" value={settings?.geminiApiKey||''} onChange={e=>setSettings({...settings, geminiApiKey: e.target.value})} />
            <MInput darkMode={darkMode} label="Google Sheets Webhook URL" value={settings?.googleSheetsUrl||''} onChange={e=>setSettings({...settings, googleSheetsUrl: e.target.value})} />
          </div>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="mb-4" colorClass={darkMode?'bg-amber-700 text-white':'bg-amber-400 text-black'}>
        <button onClick={()=>ts('bkp')} className="w-full p-4 flex justify-between items-center text-[10px] font-black uppercase"><span className="flex items-center gap-2"><Download className="w-4 h-4" /> Backup CSV</span><span className="text-lg font-mono">{openSection==='bkp'?'-':'+'}</span></button>
        {openSection === 'bkp' && (
          <div className="p-4 flex gap-2">
            <MButton onClick={handleExportCSV} className="flex-1" darkMode={darkMode}>Exportar</MButton>
            <label className={`flex-1 flex items-center justify-center p-3 font-black uppercase border-[4px] cursor-pointer ${darkMode?'bg-gray-800 border-gray-300 text-white':'bg-white border-black text-black'}`}>Importar<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} /></label>
          </div>
        )}
      </MContainer>

      <div className="mt-8 mb-4 text-center">
        <button onClick={() => setShowResetConfirm(true)} className="px-4 py-2 font-black uppercase text-pink-500 opacity-60">⚠️ Resetar Coleção</button>
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
  const [settings, setSettings] = useState({ geminiApiKey: '', googleSheetsUrl: '', marqueeSpeed: 35, marqueeBrightness: 50, archivePrefix: 'MBU', lastfmUser: '', lastfmApiKey: '' });
  
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [toast, setToast] = useState({ visible: false, type: 'success' });
  const [isHtml5QrcodeLoaded, setIsHtml5QrcodeLoaded] = useState(false);
  const [libraryResetKey, setLibraryResetKey] = useState(0);
  const [completedResetKey, setCompletedResetKey] = useState(0);

  const pwa = usePWA(LINK_DO_ICONE_NO_GITHUB);
  const globalFileInputRef = useRef(null);

  const [aiBoxState, setAiBoxState] = useState('idle');
  const [aiBoxMessage, setAiBoxMessage] = useState('');
  const [scannedAIData, setScannedAIData] = useState(null);
  
  const activeCategories = (settings?.userCategories && typeof settings.userCategories === 'object' && !Array.isArray(settings.userCategories)) ? settings.userCategories : DEFAULT_CATEGORIES;
  const activeClassCodes = (settings?.userClassCodes && typeof settings.userClassCodes === 'object' && !Array.isArray(settings.userClassCodes)) ? settings.userClassCodes : DEFAULT_CLASS_CODES;
  const allTypes = Object.values(activeCategories).flat();

  const triggerGlobalAI = () => { setActiveTab('add'); setAddMode('manual'); if (globalFileInputRef.current) globalFileInputRef.current.click(); };
  const handleGlobalFileChange = (e) => { const file = e.target.files[0]; if (file) { setActiveTab('add'); setAddMode('manual'); processGlobalAIFile(file); } e.target.value = null; };

  const processGlobalAIFile = async (file) => {
    const apiKey = settings?.geminiApiKey || "";
    if (!apiKey) { setAiBoxState('error'); setAiBoxMessage('Chave API ausente.'); playChipBeep('error'); return; }
    setAiBoxState('loading'); setAiBoxMessage('Processando...');
    try {
      const bUrl = await resizeImageForAPI(file); const bData = bUrl.split(',')[1];
      const payload = { contents: [{ parts: [{ text: `Extraia JSON válido: {"type": "Livro", "title": "O Nome", "author_developer": "Autor", "year": "2000", "publisher": "Editora", "pages_or_time": "300", "description": "Resumo"}. Opções type: ${allTypes.join(', ')}.` }, { inlineData: { mimeType: "image/jpeg", data: bData } }] }], generationConfig: { responseMimeType: "application/json" } };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json(); if(data.error) throw new Error(data.error.message);
      let t = data.candidates?.[0]?.content?.parts?.[0]?.text;
      t = t.replace(/```json/gi, '').replace(/```/g, '').trim();
      setAiBoxState('success'); setAiBoxMessage('Sucesso!'); playChipBeep('save'); setScannedAIData(JSON.parse(t)); showToast('success');
    } catch (e) { setAiBoxState('error'); setAiBoxMessage(`Falha: ${e.message}`); playChipBeep('error'); showToast('error'); }
  };

  useEffect(() => {
    if (window.Html5Qrcode) { setIsHtml5QrcodeLoaded(true); return; }
    const sId = 'html5-qrcode-script';
    if (!document.getElementById(sId)) {
      const s = document.createElement('script'); s.id = sId; s.src = "https://unpkg.com/html5-qrcode/html5-qrcode.min.js"; s.async = true;
      s.onload = () => setIsHtml5QrcodeLoaded(true); document.head.appendChild(s);
    }
  }, []);
  
  const showToast = (type = 'success') => { setToast({ visible: true, type }); setTimeout(() => setToast(p => ({ ...p, visible: false })), 2000); };
  
  useEffect(() => {
    let sSettings = null;
    try {
      if(localStorage.getItem('memorabilia_theme') === 'dark') setDarkMode(true);
      const sItems = localStorage.getItem('memorabilia_items'); if(sItems) setItems(JSON.parse(sItems)||[]);
      const sSet = localStorage.getItem('memorabilia_settings'); if(sSet) { sSettings = JSON.parse(sSet); setSettings(p=>({...p, ...sSettings})); }
      const sComp = localStorage.getItem('memorabilia_completed'); if(sComp) setCompletedGames(JSON.parse(sComp)||[]);
    } catch (e) {}
    
    const fetchSheets = async () => {
      if (sSettings?.googleSheetsUrl) {
         setIsFetchingCloud(true);
         try {
            const res = await fetch(`${sSettings.googleSheetsUrl}${sSettings.googleSheetsUrl.includes('?')?'&':'?'}nocache=${Date.now()}`);
            if (res.ok) {
              const data = await res.json(); if (Array.isArray(data)) setItems(data);
              setShowSuccessSplash(true); playLydianSuccess(); 
              setTimeout(() => { setShowSuccessSplash(false); setIsFetchingCloud(false); setInitialLoadDone(true); setIsLoaded(true); }, 1500);
              return; 
            }
         } catch (e) {}
      }
      setIsFetchingCloud(false); setInitialLoadDone(true); setIsLoaded(true);
    };
    fetchSheets();
  }, []);

  const [lastFmTrack, setLastFmTrack] = useState(null);
  useEffect(() => {
    if (!settings?.lastfmUser || !settings?.lastfmApiKey || !isLoaded) return;
    const fetchLFM = async () => {
      try {
        const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${settings.lastfmUser}&api_key=${settings.lastfmApiKey}&format=json&limit=1`);
        const d = await r.json(); const t = d?.recenttracks?.track?.[0];
        if(t) setLastFmTrack({ name: t.name, artist: t.artist['#text'], nowPlaying: t['@attr']?.nowplaying === 'true' });
      } catch (e) {}
    };
    fetchLFM(); const iv = setInterval(fetchLFM, 60000); return () => clearInterval(iv);
  }, [settings?.lastfmUser, settings?.lastfmApiKey, isLoaded]);
  
  useEffect(() => { if(initialLoadDone) localStorage.setItem('memorabilia_items', JSON.stringify(items)); }, [items, initialLoadDone]);
  useEffect(() => { if(initialLoadDone) localStorage.setItem('memorabilia_settings', JSON.stringify(settings)); }, [settings, initialLoadDone]);
  useEffect(() => { if(initialLoadDone) localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light'); }, [darkMode, initialLoadDone]);
  useEffect(() => { if(initialLoadDone) localStorage.setItem('memorabilia_completed', JSON.stringify(completedGames)); }, [completedGames, initialLoadDone]);
  
  const [rotIdx, setRotIdx] = useState(0);
  const rotStats = useMemo(() => {
    if(!(items || []).length) return ["Acervo Formando"];
    const s = []; const c = (items || []).reduce((a,i)=>{
      if (i) { a[i.type] = (a[i.type]||0)+1; } 
      return a;
    },{});
    if(c['Livro']) s.push(`${c['Livro']} Livros`); if(c['CD']) s.push(`${c['CD']} CDs`); if(c['DVD']) s.push(`${c['DVD']} DVDs`);
    return s.length ? s : ["Sua Coleção"];
  }, [items]);

  const [suggestion, setSuggestion] = useState(null);
  useEffect(() => {
    if(isLoaded && items && items.length > 0 && !suggestion) {
      const m = items.filter(i => i && (activeCategories['Discos']||[]).includes(i.type));
      if(m.length) setSuggestion(m[Math.floor(Math.random()*m.length)]);
    }
  }, [isLoaded, items, activeCategories, suggestion]);

  const readP = (items || []).filter(i=> i && (activeCategories['Livros']||[]).includes(i.type) && i.status==='Concluído').reduce((a,i)=>a+(parseInt(i.pages_or_time)||0),0);
  const totP = (items || []).filter(i=> i && (activeCategories['Livros']||[]).includes(i.type)).reduce((a,i)=>a+(parseInt(i.pages_or_time)||0),0);
  const rPerc = totP > 0 ? ((readP/totP)*100).toFixed(1) : 0;
  const rtItems = (items || []).filter(i=> i && (Number(i.rating)||0)>0);
  const aRt = rtItems.length ? (rtItems.reduce((a,i)=>a+(Number(i.rating)||0),0)/rtItems.length).toFixed(1) : 0;

  const tJ = completedGames.length;
  const tmps = completedGames.map(g=>Number(g.tempoHoras)||0).filter(t=>t>0);
  const aTm = tmps.length ? (tmps.reduce((a,b)=>a+b,0)/tmps.length).toFixed(1) : 0;

  if (isFetchingCloud && !showSuccessSplash) return <div className={`min-h-screen ${darkMode?'bg-gray-900 text-white':'bg-black text-white'} flex items-center justify-center font-sans font-black`}><KatamariIcon className="w-16 h-16 animate-spin text-cyan-400" /></div>;
  if (showSuccessSplash) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans font-black"><h1 className="text-4xl text-pink-500">Memorabilia</h1></div>;

  return (
    <div className={`min-h-screen ${darkMode?'bg-gray-800 text-gray-200':'bg-gray-100 text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .font-led{font-family:'Press Start 2P', monospace;} .led-board{background-color:#0b0b0b;background-image:radial-gradient(circle, #000 1.5px, transparent 1.5px);background-size:3px 3px;box-shadow:inset 0 0 15px #000;} @keyframes marqueeLinear { 0%{transform:translateX(0%);} 100%{transform:translateX(-50%);} }`}</style>
      <div className={`w-full h-screen relative flex flex-col md:flex-row overflow-hidden ${darkMode?'bg-gray-900':'bg-white'}`}>
        <nav className={`hidden md:flex flex-col w-20 lg:w-48 flex-none border-r-[4px] z-20 ${darkMode?'border-gray-300 bg-gray-900':'border-black bg-white'}`}>
          <div className="p-4 border-b-[4px] border-current flex items-center justify-center lg:justify-start gap-2 h-20"><img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-8 h-8" /><span className="hidden lg:block text-xs font-black uppercase mt-1">Memorabilia</span></div>
          <div className="flex-1 flex flex-col pt-4">
            <button onClick={()=>setActiveTab('library')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 ${activeTab==='library'?(darkMode?'bg-cyan-800 text-white border-l-[4px] border-cyan-400':'bg-cyan-400 border-l-[4px] border-black'):'border-l-[4px] border-transparent'}`}><Library className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Coleção</span></button>
            <button onClick={()=>setActiveTab('add')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 ${activeTab==='add'?(darkMode?'bg-amber-700 text-white border-l-[4px] border-amber-400':'bg-amber-400 border-l-[4px] border-black'):'border-l-[4px] border-transparent'}`}><PlusSquare className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Adicionar</span></button>
            <button onClick={()=>setActiveTab('dashboard')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 ${activeTab==='dashboard'?(darkMode?'bg-pink-800 text-white border-l-[4px] border-pink-400':'bg-pink-500 border-l-[4px] border-black'):'border-l-[4px] border-transparent'}`}><BarChart2 className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Dashboard</span></button>
            <button onClick={()=>setActiveTab('completed')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 ${activeTab==='completed'?(darkMode?'bg-cyan-800 text-white border-l-[4px] border-cyan-400':'bg-cyan-400 border-l-[4px] border-black'):'border-l-[4px] border-transparent'}`}><MonitorPlay className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Zerados</span></button>
            <div className="mt-auto mb-4"><button onClick={()=>setActiveTab('settings')} className={`w-full flex items-center lg:justify-start justify-center gap-3 p-4 ${activeTab==='settings'?(darkMode?'bg-gray-700 text-white border-l-[4px] border-gray-400':'bg-gray-200 border-l-[4px] border-black'):'border-l-[4px] border-transparent'}`}><Settings className="w-6 h-6" /><span className="hidden lg:block text-[10px] font-black uppercase">Ajustes</span></button></div>
          </div>
        </nav>

        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <header className={`flex-none p-3 lg:p-4 border-b-[4px] z-20 flex flex-col gap-2 ${darkMode?'border-gray-300 bg-gray-900':'border-black bg-white'}`}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col flex-1 pr-2 w-full overflow-hidden">
                <h1 className="text-3xl lg:text-4xl font-black uppercase leading-none">Memorabilia</h1>
                <div className="flex flex-col md:flex-row gap-2 mt-2">
                  {lastFmTrack && <div className={`p-1 px-1.5 text-[8px] font-black uppercase border-[3px] flex items-center gap-1 w-fit ${darkMode?'bg-pink-900 border-gray-300 text-white':'bg-pink-400 border-black text-black'}`}><Headphones className="w-3 h-3"/> <span className="truncate">{lastFmTrack.artist} - {lastFmTrack.name}</span></div>}
                  {suggestion && <div className={`p-1 px-1.5 text-[8px] font-black uppercase border-[3px] flex items-center gap-1 w-fit ${darkMode?'bg-cyan-900 border-gray-300 text-white':'bg-cyan-400 border-black text-black'}`}><Sparkles className="w-3 h-3"/> <span className="truncate">Ouvir: {suggestion.title}</span></div>}
                </div>
              </div>
              <div className="w-14 h-14 flex items-center justify-center md:hidden">
                {toast.visible ? (toast.type==='error'?<XIcon className="text-pink-500 w-10 h-10"/>:<Check className="text-cyan-400 w-10 h-10"/>) : <img src={LINK_DO_ICONE_NO_GITHUB} alt="Logo" className="w-full h-full" />}
              </div>
            </div>

            <div className="flex flex-row gap-2 mt-2 w-full">
               <div className={`flex-1 flex flex-col md:flex-row gap-2 p-1.5 border-[3px] text-[8px] lg:text-[9px] font-black uppercase w-1/2 ${darkMode?'border-gray-300 bg-gray-800 text-white':'border-black bg-gray-100 text-black'}`}>
                <div className="flex-1"><div className="border-b-[2px] border-current pb-0.5 mb-1 flex justify-between"><span>Física</span><span>{(items||[]).length}</span></div><div className="flex justify-between"><span>Lidas:</span><span>{rPerc}%</span></div></div>
                <div className="flex-1 flex flex-col justify-between"><div className="flex justify-between text-amber-500 cursor-pointer" onClick={()=>setRotIdx((rotIdx+1)%rotStats.length)}><span className="truncate">{rotStats[rotIdx]}</span></div><div className="flex justify-between text-cyan-500 mt-auto pt-0.5"><span>Med:</span><span>★ {aRt}</span></div></div>
              </div>

              <div className={`flex-1 flex flex-col border-[3px] text-[8px] lg:text-[9px] font-black uppercase overflow-hidden relative w-1/2 ${darkMode?'border-gray-300 bg-black text-white':'border-black bg-black text-white'}`}>
                 <div className="p-1.5 border-b-[2px] border-gray-800 pb-0.5 mb-0.5 flex justify-between z-10 bg-black"><span>Zerados</span><span className="text-pink-500">REC</span></div>
                 <div className="flex-1 flex items-center overflow-hidden w-full relative led-board min-h-[24px]">
                    <div className="absolute whitespace-nowrap flex items-center" style={{ animation: `marqueeLinear ${settings?.marqueeSpeed||35}s linear infinite`, width: 'max-content' }}>
                      <div className="flex items-center py-1 text-cyan-400 font-led tracking-normal px-4">FINALIZADOS: {tJ} <Ghost className="w-4 h-4 inline ml-4 text-pink-500" /></div>
                      <div className="flex items-center py-1 text-cyan-400 font-led tracking-normal px-4">FINALIZADOS: {tJ} <Ghost className="w-4 h-4 inline ml-4 text-pink-500" /></div>
                    </div>
                  </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden p-3 lg:p-6 relative z-0">
            <input type="file" accept="image/*" capture="environment" ref={globalFileInputRef} onChange={handleGlobalFileChange} className="hidden" />
            {activeTab === 'library' && <LibraryTab key={libraryResetKey} items={items} setItems={setItems} darkMode={darkMode} settings={settings} onShowToast={showToast} activeCategories={activeCategories} />}
            {activeTab === 'add' && <AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} onShowToast={showToast} triggerGlobalAI={triggerGlobalAI} globalAiState={aiBoxState} globalAiMessage={aiBoxMessage} resetGlobalAi={()=>setAiBoxState('idle')} scannedAIData={scannedAIData} setScannedAIData={setScannedAIData} isHtml5QrcodeLoaded={isHtml5QrcodeLoaded} activeCategories={activeCategories} activeClassCodes={activeClassCodes} allTypes={allTypes} />}
            {activeTab === 'dashboard' && <DashboardTab items={items} darkMode={darkMode} activeCategories={activeCategories} />}
            {activeTab === 'completed' && <CompletedGamesTab key={completedResetKey} completedGames={completedGames} setCompletedGames={setCompletedGames} settings={settings} darkMode={darkMode} onShowToast={showToast} />}
            {activeTab === 'settings' && <SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} onShowToast={showToast} pwa={pwa} completedGames={completedGames} setCompletedGames={setCompletedGames} activeCategories={activeCategories} activeClassCodes={activeClassCodes} />}
          </main>

          <nav className={`flex md:hidden flex-none border-t-[4px] z-20 h-16 ${darkMode?'border-gray-300 bg-gray-900':'border-black bg-white'}`}>
            <button onClick={()=>setActiveTab('library')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode?'border-gray-300':'border-black'} ${activeTab==='library'?(darkMode?'bg-cyan-800 text-white':'bg-cyan-400 text-black'):(darkMode?'text-gray-300':'text-black')}`}><Library className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Coleção</span></button>
            <button onClick={()=>setActiveTab('add')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode?'border-gray-300':'border-black'} ${activeTab==='add'?(darkMode?'bg-amber-700 text-white':'bg-amber-400 text-black'):(darkMode?'text-gray-300':'text-black')}`}><PlusSquare className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Adicionar</span></button>
            <button onClick={()=>setActiveTab('dashboard')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode?'border-gray-300':'border-black'} ${activeTab==='dashboard'?(darkMode?'bg-pink-800 text-white':'bg-pink-500 text-black'):(darkMode?'text-gray-300':'text-black')}`}><BarChart2 className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Geral</span></button>
            <button onClick={()=>setActiveTab('completed')} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] ${darkMode?'border-gray-300':'border-black'} ${activeTab==='completed'?(darkMode?'bg-cyan-800 text-white':'bg-cyan-400 text-black'):(darkMode?'text-gray-300':'text-black')}`}><MonitorPlay className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Zerados</span></button>
            <button onClick={()=>setActiveTab('settings')} className={`flex-1 flex flex-col items-center justify-center ${activeTab==='settings'?(darkMode?'bg-gray-700 text-white':'bg-gray-200 text-black'):(darkMode?'text-gray-300':'text-black')}`}><Settings className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase">Ajustes</span></button>
          </nav>
        </div>
      </div>
    </div>
  );
}
