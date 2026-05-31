```react
import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// 1. ÍCONES NATIVOS (Zero Dependências)
// ==========================================
const Icon = ({ path, className = "w-6 h-6", onClick, fill = "none" }) => (
  <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{path}</svg>
);

const Search = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const Library = (p) => <Icon {...p} path={<><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>} />;
const PlusSquare = (p) => <Icon {...p} path={<><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></>} />;
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
const X = (p) => <Icon {...p} path={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
const Check = (p) => <Icon {...p} path={<path d="M20 6 9 17l-5-5"/>} />;
const ScanLine = (p) => <Icon {...p} path={<><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></>} />;
const Clock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
const Flame = (p) => <Icon {...p} path={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>} />;
const Ghost = (p) => <Icon {...p} path={<><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></>} />;
const Trophy = (p) => <Icon {...p} path={<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>} />;
const LibraryBig = (p) => <Icon {...p} path={<><rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></>} />;
const AlertTriangle = (p) => <Icon {...p} path={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} />;
const Sparkles = (p) => <Icon {...p} path={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;

// ==========================================
// 2. DADOS E PLANO DE CLASSIFICAÇÃO
// ==========================================
const CATEGORIES = {
  'Livros': ['Livro', 'Quadrinho'],
  'Discos': ['CD', 'Vinil', 'Fita Cassete'],
  'Vídeo': ['VHS', 'DVD'],
  'Games': ['Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4']
};
const ALL_TYPES = Object.values(CATEGORIES).flat();

const CLASS_CODES = {
  'Livro': '562.1', 'Quadrinho': '562.2', 'CD': '515.1', 'Vinil': '515.2', 'Fita Cassete': '515.3',
  'VHS': '544.1', 'DVD': '544.2', 'Mega Drive': '520', 'SNES': '520', 'Wii': '520', 'PS1': '520', 'PS2': '520', 'PS4': '520'
};

const INITIAL_ITEMS = [
  { id: '1', archive_code: 'LUI-562.1-0001', type: 'Livro', title: 'Neuromancer', author_developer: 'William Gibson', year: '1984', publisher: 'Aleph', status: 'Concluído', rating: 5, pages_or_time: '320', cover_url: 'https://books.google.com/books/content?id=pMytzQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', description: 'O romance de estreia de William Gibson e o primeiro a ganhar os três principais prêmios de ficção científica.', location: 'Estante Principal', notes: '', wiki_info: '' }
];

const STATUS_OPTIONS = ['Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'];

const getMondrianColor = (index, darkMode) => {
  const colorsLight = ['bg-rose-300', 'bg-sky-300', 'bg-yellow-400', 'bg-white'];
  const colorsDark = ['bg-rose-800', 'bg-sky-800', 'bg-yellow-600', 'bg-gray-900'];
  return darkMode ? colorsDark[index % colorsDark.length] : colorsLight[index % colorsLight.length];
};

// ==========================================
// 3. SISTEMA DE ÁUDIO (CHIPTUNE 8-BIT)
// ==========================================
let globalAudioCtx = null;
const initAudio = () => {
  try {
    if (!globalAudioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) globalAudioCtx = new AudioContext(); }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
  } catch (e) { }
};

const playChipBeep = (type) => {
  try {
    if (!globalAudioCtx) initAudio();
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(globalAudioCtx.destination);
    const now = globalAudioCtx.currentTime;

    if (type === 'success') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(1046.50, now);
      gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      oscillator.start(now); oscillator.stop(now + 0.15);
    } else if (type === 'error') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(300, now); oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscillator.start(now); oscillator.stop(now + 0.2);
    } else if (type === 'save') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(523.25, now); oscillator.frequency.setValueAtTime(783.99, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now); oscillator.stop(now + 0.25);
    }
  } catch (e) {}
};

// ==========================================
// 4. PARSER DE CSV ROBUSTO (Ignora vírgulas dentro do texto)
// ==========================================
function parseCSV(str) {
  const arr = [];
  let quote = false;
  let row = 0, col = 0, c = 0;
  for (; c < str.length; c++) {
    let cc = str[c], nc = str[c+1];
    arr[row] = arr[row] || [];
    arr[row][col] = arr[row][col] || '';
    if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) { ++col; continue; }
    if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
    if (cc === '\n' && !quote) { ++row; col = 0; continue; }
    if (cc === '\r' && !quote) { ++row; col = 0; continue; }
    arr[row][col] += cc;
  }
  return arr;
}

// ==========================================
// 5. COMPONENTES UI MONDRIAN
// ==========================================
const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bgClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'red') bgClass = darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black';
  if (variant === 'blue') bgClass = darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black';
  if (variant === 'yellow') bgClass = darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black';
  if (variant === 'black') bgClass = darkMode ? 'bg-gray-300 text-black' : 'bg-black text-white';

  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-bold uppercase tracking-wider border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${disabled ? 'opacity-50' : 'active:scale-95'} transition-transform ${bgClass} ${className}`}>
      {icon && icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, type = "text", placeholder = "", multiline = false, darkMode }) => (
  <div className="flex flex-col mb-3 w-full">
    <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
    {multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-yellow-100 dark:focus:bg-yellow-900 transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-sky-100 dark:focus:bg-sky-900 transition-colors`} />
    )}
  </div>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-[8px_8px_0px_rgba(0,0,0,1)]" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-4 pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>{title}</h3>
        <p className="text-sm font-medium opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="red" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

// ==========================================
// 6. ABAS DA APLICAÇÃO
// ==========================================

const LibraryTab = ({ items, setItems, darkMode, settings, onShowToast }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeSubtype, setActiveSubtype] = useState('Todos');
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const itemsPerPage = 8;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = ((item.title || '').toLowerCase().includes(search.toLowerCase()) || (item.author_developer || '').toLowerCase().includes(search.toLowerCase()));
      let matchesCategory = true;
      if (activeCategory !== 'Todos') {
        if (activeSubtype === 'Todos') matchesCategory = CATEGORIES[activeCategory]?.includes(item.type || '');
        else matchesCategory = (item.type || '') === activeSubtype;
      }
      return matchesSearch && matchesCategory;
    }).sort((a, b) => (b.id || '').localeCompare(a.id || '')); 
  }, [items, search, activeCategory, activeSubtype]);

  const paginatedItems = filteredItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  const handleSelect = (item) => {
    setSelectedItem(item);
    setEditedItem({ ...item }); 
  };

  const updateRatingList = (id, newRating) => {
    setItems(items.map(item => item.id === id ? { ...item, rating: newRating } : item));
  };

  const saveModifications = () => {
    setItems(items.map(i => i.id === editedItem.id ? editedItem : i));
    setSelectedItem(editedItem);
    playChipBeep('save');
    onShowToast();
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
      setSelectedItem(null);
      setEditedItem(null);
    }
  };

  const fetchWikiInfo = async () => {
    if (!settings.geminiApiKey) {
      setWikiError("Para ativar a pesquisa IA, configure sua Chave de API na aba Ajustes.");
      playChipBeep('error');
      return;
    }
    setLoadingWiki(true);
    setWikiError('');
    try {
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: `Aja como um historiador, crítico e arquivista especialista. Escreva um parágrafo fascinante e direto (máximo 4 linhas) com curiosidades ou contexto sobre a obra "${editedItem.title || ''}" (Autor/Estúdio: "${editedItem.author_developer || ''}"). Retorne apenas o texto.` }]
        }],
        generationConfig: { responseMimeType: "text/plain" }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        setEditedItem({...editedItem, wiki_info: aiText});
        playChipBeep('success');
      }
    } catch (e) {
      setWikiError("A Inteligência Artificial falhou ao buscar as informações desta vez.");
      playChipBeep('error');
    } finally {
      setLoadingWiki(false);
    }
  };

  if (selectedItem && editedItem) {
    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title || 'este item'}" da coleção?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        
        {/* CABEÇALHO DA EDIÇÃO DE FICHA */}
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10 shadow-sm" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-gray-100 text-black'} active:scale-95 transition-transform`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes da Mídia</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[3px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform ${darkMode ? 'bg-emerald-800 border-emerald-500 text-white' : 'bg-emerald-400 border-black text-black'}`}>Salvar</button>
        </MContainer>

        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          <div className="flex gap-4">
            <MContainer darkMode={darkMode} className="w-32 h-44 flex-shrink-0 flex items-center justify-center overflow-hidden" colorClass={`border-[4px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {editedItem.cover_url ? <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" /> : <LibraryBig className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[2px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-500 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label={['Livro', 'Quadrinho'].includes(editedItem.type || '') ? 'Págs' : 'Horas'} value={editedItem.pages_or_time || ''} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label="Editora" value={editedItem.publisher || ''} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} />
          </div>

          <div className="grid grid-cols-2 gap-2">
          // ==========================================
const CATEGORIES = {
  'Livros': ['Livro', 'Quadrinho'],
  'Discos': ['CD', 'Vinil', 'Fita Cassete'],
  'Vídeo': ['VHS', 'DVD'],
  'Games': ['Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4']
};
const ALL_TYPES = Object.values(CATEGORIES).flat();

const CLASS_CODES = {
  'Livro': '562.1', 'Quadrinho': '562.2', 'CD': '515.1', 'Vinil': '515.2', 'Fita Cassete': '515.3',
  'VHS': '544.1', 'DVD': '544.2', 'Mega Drive': '520', 'SNES': '520', 'Wii': '520', 'PS1': '520', 'PS2': '520', 'PS4': '520'
};

const INITIAL_ITEMS = [
  { id: '1', archive_code: 'LUI-562.1-0001', type: 'Livro', title: 'Neuromancer', author_developer: 'William Gibson', year: '1984', publisher: 'Aleph', status: 'Concluído', rating: 5, pages_or_time: '320', cover_url: 'https://books.google.com/books/content?id=pMytzQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', description: 'O romance de estreia de William Gibson e o primeiro a ganhar os três principais prêmios de ficção científica.', location: '', notes: '', wiki_info: '' }
];

const STATUS_OPTIONS = ['Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'];

const getMondrianColor = (index, darkMode) => {
  const colorsLight = ['bg-rose-300', 'bg-sky-300', 'bg-yellow-400', 'bg-white'];
  const colorsDark = ['bg-rose-800', 'bg-sky-800', 'bg-yellow-600', 'bg-gray-900'];
  return darkMode ? colorsDark[index % colorsDark.length] : colorsLight[index % colorsLight.length];
};

// ==========================================
// 3. SISTEMA DE ÁUDIO
// ==========================================
let globalAudioCtx = null;
const initAudio = () => {
  try {
    if (!globalAudioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) globalAudioCtx = new AudioContext(); }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
  } catch (e) { }
};

const playChipBeep = (type) => {
  try {
    if (!globalAudioCtx) initAudio();
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(globalAudioCtx.destination);
    const now = globalAudioCtx.currentTime;

    if (type === 'success') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(1046.50, now);
      gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      oscillator.start(now); oscillator.stop(now + 0.15);
    } else if (type === 'error') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(300, now); oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscillator.start(now); oscillator.stop(now + 0.2);
    } else if (type === 'save') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(523.25, now); oscillator.frequency.setValueAtTime(783.99, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now); oscillator.stop(now + 0.25);
    }
  } catch (e) {}
};

// ==========================================
// 4. COMPONENTES UI MONDRIAN
// ==========================================
const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bgClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'red') bgClass = darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black';
  if (variant === 'blue') bgClass = darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black';
  if (variant === 'yellow') bgClass = darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black';
  if (variant === 'black') bgClass = darkMode ? 'bg-gray-300 text-black' : 'bg-black text-white';

  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-bold uppercase tracking-wider border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${disabled ? 'opacity-50' : 'active:scale-95'} transition-transform ${bgClass} ${className}`}>
      {icon && icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, type = "text", placeholder = "", multiline = false, darkMode }) => (
  <div className="flex flex-col mb-3 w-full">
    <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
    {multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-yellow-100 dark:focus:bg-yellow-900 transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-sky-100 dark:focus:bg-sky-900 transition-colors`} />
    )}
  </div>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-[8px_8px_0px_rgba(0,0,0,1)]" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-4 pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>{title}</h3>
        <p className="text-sm font-medium opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="red" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

// ==========================================
// 5. ABAS DA APLICAÇÃO
// ==========================================

const LibraryTab = ({ items, setItems, darkMode, settings, onShowToast }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeSubtype, setActiveSubtype] = useState('Todos');
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const itemsPerPage = 8;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = ((item.title || '').toLowerCase().includes(search.toLowerCase()) || (item.author_developer || '').toLowerCase().includes(search.toLowerCase()));
      let matchesCategory = true;
      if (activeCategory !== 'Todos') {
        if (activeSubtype === 'Todos') matchesCategory = CATEGORIES[activeCategory]?.includes(item.type || '');
        else matchesCategory = (item.type || '') === activeSubtype;
      }
      return matchesSearch && matchesCategory;
    }).sort((a, b) => (b.id || '').localeCompare(a.id || '')); 
  }, [items, search, activeCategory, activeSubtype]);

  const paginatedItems = filteredItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  const handleSelect = (item) => {
    setSelectedItem(item);
    setEditedItem({ ...item }); // Safe copy
  };

  const updateRatingList = (id, newRating) => {
    setItems(items.map(item => item.id === id ? { ...item, rating: newRating } : item));
  };

  const saveModifications = () => {
    setItems(items.map(i => i.id === editedItem.id ? editedItem : i));
    setSelectedItem(editedItem);
    playChipBeep('save');
    onShowToast();
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
      setSelectedItem(null);
      setEditedItem(null);
    }
  };

  const fetchWikiInfo = async () => {
    if (!settings.geminiApiKey) {
      setWikiError("Para ativar a pesquisa IA, configure sua Chave de API na aba Ajustes.");
      playChipBeep('error');
      return;
    }
    setLoadingWiki(true);
    setWikiError('');
    try {
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: `Aja como um historiador, crítico e arquivista especialista. Escreva um parágrafo fascinante e direto (máximo 4 linhas) com curiosidades ou contexto sobre a obra "${editedItem.title || ''}" (Autor/Estúdio: "${editedItem.author_developer || ''}"). Retorne apenas o texto.` }]
        }],
        generationConfig: { responseMimeType: "text/plain" }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        setEditedItem({...editedItem, wiki_info: aiText});
        playChipBeep('success');
      }
    } catch (e) {
      setWikiError("A Inteligência Artificial falhou ao buscar as informações desta vez.");
      playChipBeep('error');
    } finally {
      setLoadingWiki(false);
    }
  };

  if (selectedItem && editedItem) {
    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title || 'este item'}" da coleção?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        
        {/* CABEÇALHO DA EDIÇÃO DE FICHA */}
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10 shadow-sm" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-gray-100 text-black'} active:scale-95 transition-transform`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[3px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform ${darkMode ? 'bg-emerald-800 border-emerald-500 text-white' : 'bg-emerald-400 border-black text-black'}`}>Salvar</button>
        </MContainer>

        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          
          <div className="flex gap-4">
            <MContainer darkMode={darkMode} className="w-32 h-44 flex-shrink-0 flex items-center justify-center overflow-hidden" colorClass={`border-[4px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {editedItem.cover_url ? <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" /> : <LibraryBig className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[2px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-500 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title || ''} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer || ''} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label={['Livro', 'Quadrinho'].includes(editedItem.type || '') ? 'Págs' : 'Horas'} value={editedItem.pages_or_time || ''} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label="Editora" value={editedItem.publisher || ''} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MInput label="URL da Capa" value={editedItem.cover_url || ''} onChange={e => setEditedItem({...editedItem, cover_url: e.target.value})} darkMode={darkMode} />
            <MInput label="Localização" value={editedItem.location || ''} onChange={e => setEditedItem({...editedItem, location: e.target.value})} darkMode={darkMode} />
          </div>

          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
            <div className="mb-3">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[2px] pb-1 ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Status Atual</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} cla// 2. DADOS E PLANO DE CLASSIFICAÇÃO
// ==========================================
const CATEGORIES = {
  'Livros': ['Livro', 'Quadrinho'],
  'Discos': ['CD', 'Vinil', 'Fita Cassete'],
  'Vídeo': ['VHS', 'DVD'],
  'Games': ['Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4']
};
const ALL_TYPES = Object.values(CATEGORIES).flat();

const CLASS_CODES = {
  'Livro': '562.1', 'Quadrinho': '562.2', 'CD': '515.1', 'Vinil': '515.2', 'Fita Cassete': '515.3',
  'VHS': '544.1', 'DVD': '544.2', 'Mega Drive': '520', 'SNES': '520', 'Wii': '520', 'PS1': '520', 'PS2': '520', 'PS4': '520'
};

const INITIAL_ITEMS = [
  { id: '1', archive_code: 'LUI-562.1-0001', type: 'Livro', title: 'Neuromancer', author_developer: 'William Gibson', year: '1984', publisher: 'Aleph', status: 'Concluído', rating: 5, pages_or_time: '320', cover_url: 'https://books.google.com/books/content?id=pMytzQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', description: 'O romance de estreia de William Gibson e o primeiro a ganhar os três principais prêmios de ficção científica.', location: '', notes: '', wiki_info: '' }
];

const STATUS_OPTIONS = ['Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'];

const getMondrianColor = (index, darkMode) => {
  const colorsLight = ['bg-rose-300', 'bg-sky-300', 'bg-yellow-400', 'bg-white'];
  const colorsDark = ['bg-rose-800', 'bg-sky-800', 'bg-yellow-600', 'bg-gray-900'];
  return darkMode ? colorsDark[index % colorsDark.length] : colorsLight[index % colorsLight.length];
};

// ==========================================
// 3. SISTEMA DE ÁUDIO (CHIPTUNE 8-BIT)
// ==========================================
let globalAudioCtx = null;

const initAudio = () => {
  try {
    if (!globalAudioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
  } catch (e) { console.error(e); }
};

const playChipBeep = (type) => {
  try {
    if (!globalAudioCtx) initAudio();
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(globalAudioCtx.destination);
    const now = globalAudioCtx.currentTime;

    if (type === 'success') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(1046.50, now);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else if (type === 'error') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } else if (type === 'save') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(523.25, now);
      oscillator.frequency.setValueAtTime(783.99, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
    }
  } catch (e) {}
};

// ==========================================
// 4. COMPONENTES UI MONDRIAN
// ==========================================
const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bgClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'red') bgClass = darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black';
  if (variant === 'blue') bgClass = darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black';
  if (variant === 'yellow') bgClass = darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black';
  if (variant === 'black') bgClass = darkMode ? 'bg-gray-300 text-black' : 'bg-black text-white';

  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-bold uppercase tracking-wider border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${disabled ? 'opacity-50' : 'active:scale-95'} transition-transform ${bgClass} ${className}`}>
      {icon && icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, type = "text", placeholder = "", multiline = false, darkMode }) => (
  <div className="flex flex-col mb-3 w-full">
    <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
    {multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-yellow-100 dark:focus:bg-yellow-900 transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-sky-100 dark:focus:bg-sky-900 transition-colors`} />
    )}
  </div>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <MContainer darkMode={darkMode} className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-[8px_8px_0px_rgba(0,0,0,1)]" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <h3 className={`font-black uppercase tracking-widest text-lg leading-tight border-b-4 pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>{title}</h3>
        <p className="text-sm font-medium opacity-90">{message}</p>
        <div className="flex gap-2 mt-4">
          <MButton darkMode={darkMode} variant="white" onClick={onCancel} className="flex-1">{cancelText}</MButton>
          <MButton darkMode={darkMode} variant="red" onClick={onConfirm} className="flex-1">{confirmText}</MButton>
        </div>
      </MContainer>
    </div>
  );
};

// ==========================================
// 5. ABAS DA APLICAÇÃO
// ==========================================

const LibraryTab = ({ items, setItems, darkMode, settings, onShowToast }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedItem, setEditedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeSubtype, setActiveSubtype] = useState('Todos');
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const itemsPerPage = 8;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = (item.title?.toLowerCase().includes(search.toLowerCase()) || item.author_developer?.toLowerCase().includes(search.toLowerCase()));
      let matchesCategory = true;
      if (activeCategory !== 'Todos') {
        if (activeSubtype === 'Todos') matchesCategory = CATEGORIES[activeCategory]?.includes(item.type);
        else matchesCategory = item.type === activeSubtype;
      }
      return matchesSearch && matchesCategory;
    }).sort((a, b) => b.id.localeCompare(a.id)); 
  }, [items, search, activeCategory, activeSubtype]);

  const paginatedItems = filteredItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setEditedItem(item);
  };

  const updateRatingList = (id, newRating) => {
    setItems(items.map(item => item.id === id ? { ...item, rating: newRating } : item));
  };

  const saveModifications = () => {
    setItems(items.map(i => i.id === editedItem.id ? editedItem : i));
    setSelectedItem(editedItem);
    playChipBeep('save');
    onShowToast();
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
      setSelectedItem(null);
      setEditedItem(null);
    }
  };

  const fetchWikiInfo = async () => {
    if (!settings.geminiApiKey) {
      setWikiError("Para ativar a pesquisa IA, configure sua Chave de API na aba Ajustes.");
      playChipBeep('error');
      return;
    }
    setLoadingWiki(true);
    setWikiError('');
    try {
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: `Aja como um historiador, crítico e arquivista especialista. Escreva um parágrafo fascinante e direto (máximo 4 linhas) com curiosidades ou contexto sobre a obra "${editedItem.title}" (Autor/Estúdio: "${editedItem.author_developer}"). Retorne apenas o texto.` }]
        }],
        generationConfig: { responseMimeType: "text/plain" }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        setEditedItem({...editedItem, wiki_info: aiText});
        playChipBeep('success');
      }
    } catch (e) {
      setWikiError("A Inteligência Artificial falhou ao buscar as informações desta vez.");
      playChipBeep('error');
    } finally {
      setLoadingWiki(false);
    }
  };

  if (selectedItem && editedItem) {
    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${selectedItem.title}" da coleção?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        
        {/* CABEÇALHO DA EDIÇÃO DE FICHA */}
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10 shadow-sm" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-gray-100 text-black'} active:scale-95 transition-transform`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[3px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform ${darkMode ? 'bg-emerald-800 border-gray-500 text-white' : 'bg-emerald-400 border-black text-black'}`}>Salvar</button>
        </MContainer>

        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          
          <div className="flex gap-4">
            <MContainer darkMode={darkMode} className="w-32 h-44 flex-shrink-0 flex items-center justify-center overflow-hidden" colorClass={`border-[4px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {editedItem.cover_url ? <img src={editedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" /> : <LibraryBig className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />}
            </MContainer>
            <div className="flex flex-col flex-1 justify-between py-1">
              {editedItem.archive_code && <div className={`text-[9px] font-mono font-black uppercase tracking-widest border-[2px] w-max px-1.5 py-0.5 mb-2 ${darkMode ? 'border-gray-500 text-gray-300 bg-gray-800' : 'border-black text-black bg-gray-100'}`}>{editedItem.archive_code}</div>}
              <MInput label="Título" value={editedItem.title} onChange={e => setEditedItem({...editedItem, title: e.target.value})} darkMode={darkMode} />
              <MInput label="Autor/Artista" value={editedItem.author_developer} onChange={e => setEditedItem({...editedItem, author_developer: e.target.value})} darkMode={darkMode} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MInput label="Ano" value={editedItem.year} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label="Págs/Tempo" value={editedItem.pages_or_time} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label="Editora" value={editedItem.publisher} onChange={e => setEditedItem({...editedItem, publisher: e.target.value})} darkMode={darkMode} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MInput label="URL da Capa" value={editedItem.cover_url} onChange={e => setEditedItem({...editedItem, cover_url: e.target.value})} darkMode={darkMode} />
            <MInput label="Localização" value={editedItem.location} onChange={e => setEditedItem({...editedItem, location: e.target.value})} darkMode={darkMode} />
          </div>

          {/* ÁREA DE STATUS E AVALIAÇÃO INTUITIVAS */}
          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}>
            <div className="mb-3">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[2px] pb-1 ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Status Atual</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[2px] active:scale-95 transition-transform ${editedItem.status === opt ? (darkMode ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-emerald-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-600 text-gray-400' : 'bg-white border-gray-300 text-gray-500')}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block border-b-[2px] pb-1 ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-700'}`}>Sua Avaliação</label>
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} onClick={() => setEditedItem({...editedItem, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= editedItem.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-yellow-400 text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />
                ))}
              </div>
            </div>
          </MContainer>

          <MInput label="Sinopse / Descrição" multiline value={editedItem.description} onChange={e => setEditedItem({...editedItem, description: e.target.value})} darkMode={darkMode} />
          
          <MContainer darkMode={darkMode} className="p-3" colorClass={darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100/50'}>
            <MInput label="Fichamento e Anotações" multiline value={editedItem.notes} onChange={e => setEditedItem({...editedItem, notes: e.target.value})} darkMode={darkMode} />
          </MContainer>

          {/* MODO IA: WIKIPEDIA / ENCICLOPÉDIA DA OBRA */}
          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-purple-900/20 text-white' : 'bg-purple-100 text-black'}>
            <div className={`flex justify-between items-center mb-3 border-b-[3px] pb-1 ${darkMode ? 'border-purple-800' : 'border-purple-300'}`}>
               <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3" /> Enciclopédia (Modo IA)</span>
            </div>
            
            {editedItem.wiki_info ? (
              <div>
                <p className="text-xs font-medium leading-relaxed opacity-90 whitespace-pre-wrap text-justify mb-3 italic">"{editedItem.wiki_info}"</p>
                <button onClick={fetchWikiInfo} className="text-[9px] font-bold uppercase underline opacity-70 hover:opacity-100 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gerar Nova Pesquisa</button>
              </div>
            ) : (
              <div className="text-center py-2">
                {loadingWiki ? (
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-6 h-6 animate-pulse mb-2 text-purple-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse opacity-70">Consultando oráculo digital...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {wikiError && <span className="text-[9px] font-bold text-red-500 block">{wikiError}</span>}
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

  // --- MODO LISTA NORMAL ---
  return (
    <div className="flex flex-col h-full">
      <MContainer darkMode={darkMode} className="p-3 mb-4 flex flex-col gap-3 sticky top-0 z-10 shadow-md" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="relative">
          <Search className={`absolute left-3 top-3 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input type="text" placeholder="Buscar Título ou Autor..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className={`w-full p-2 pl-9 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none`} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Todos', ...Object.keys(CATEGORIES)].map(cat => <button key={cat} onClick={() => { setActiveCategory(cat); setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1 text-[10px] uppercase tracking-wider font-bold border-[2px] ${darkMode ? 'border-gray-500' : 'border-black'} ${activeCategory === cat ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{cat}</button>)}
        </div>
        {activeCategory !== 'Todos' && CATEGORIES[activeCategory]?.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => { setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1 text-[10px] uppercase tracking-wider font-bold border-[2px] ${darkMode ? 'border-gray-500' : 'border-black'} ${activeSubtype === 'Todos' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>Todos</button>
            {CATEGORIES[activeCategory].map(type => <button key={type} onClick={() => { setActiveSubtype(type); setPage(0); }} className={`whitespace-nowrap px-3 py-1 text-[10px] uppercase tracking-wider font-bold border-[2px] ${darkMode ? 'border-gray-500' : 'border-black'} ${activeSubtype === type ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{type}</button>)}
          </div>
        )}
      </MContainer>

      <div className="flex-1 overflow-y-auto pb-20 px-1">
        {paginatedItems.length === 0 ? (
          <div className="text-center p-10 opacity-50 text-sm font-sans font-bold uppercase tracking-widest">Nenhum item encontrado.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row h-32 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleSelect(item)}>
                <MContainer darkMode={darkMode} className="w-4 border-r-0" colorClass={getMondrianColor(idx, darkMode)} />
                <MContainer darkMode={darkMode} className="flex-1 flex p-2" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1 truncate">{item.type} • {item.year}</div>
                      <div className="text-sm font-black leading-tight truncate">{item.title}</div>
                      <div className="text-[11px] font-bold opacity-80 truncate uppercase tracking-wide mt-1">{item.author_developer}</div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className={`text-[8px] px-2 py-1 border-[2px] ${darkMode ? 'border-gray-500 bg-gray-900 text-gray-300' : 'border-black bg-yellow-100 text-black'} font-black uppercase tracking-widest`}>{item.status}</div>
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => updateRatingList(item.id, star)} className={`w-4 h-4 cursor-pointer ${star <= item.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
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

const AddTab = ({ items, setItems, settings, darkMode, addMode, setAddMode, setActiveTab, onShowToast, pendingAIFile, clearPendingAIFile, triggerGlobalAI }) => {
  const [scanStatus, setScanStatus] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const scannerRef = useRef(null);
  const isProcessingScan = useRef(false);

  const [formData, setFormData] = useState({
    type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: ''
  });

  const changeMode = (newMode) => {
    setAddMode(newMode);
    if (newMode !== 'manual') setScanStatus(null); 
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().then(() => { scannerRef.current?.clear(); }).catch(() => {});
      } catch(e) {}
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (addMode === 'barcode') {
      const startScanner = () => {
        if (!window.Html5Qrcode || scannerRef.current || !isMounted) return;
        scannerRef.current = new window.Html5Qrcode("reader-barcode");
        scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            stopScanner(); 
            if (isMounted) {
              setAddMode('manual');
              setFormData(prev => ({ ...prev, barcode: decodedText }));
              fetchMultiDatabase(decodedText);
              setTimeout(() => { isProcessingScan.current = false; }, 2000);
            }
          },
          () => {} 
        ).catch(() => {
          if (isMounted) {
            setScanStatus({ type: 'error', message: 'Câmera inacessível para o leitor de código de barras.' });
            setAddMode('manual');
          }
        });
      };

      if (window.Html5Qrcode) {
        startScanner();
      } else {
        setTimeout(startScanner, 500); 
      }
    } else {
      stopScanner();
    }

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [addMode]);

  const fetchMultiDatabase = async (barcode) => {
    setScanStatus({ type: 'info', message: 'Buscando em bancos de dados...' });
    
    try {
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}`);
      const gbData = await gbRes.json();
      if (gbData.items && gbData.items.length > 0) {
        const info = gbData.items[0].volumeInfo;
        handleScanSuccess({
          type: 'Livro', title: info.title || '', author_developer: info.authors ? info.authors.join(', ') : '', year: info.publishedDate ? info.publishedDate.substring(0, 4) : '', publisher: info.publisher || '', pages_or_time: info.pageCount ? info.pageCount.toString() : '', description: info.description || '', cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:') || ''
        });
        return; 
      }

      const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&jscmd=data&format=json`);
      const olData = await olRes.json();
      if (olData[`ISBN:${barcode}`]) {
        const info = olData[`ISBN:${barcode}`];
        handleScanSuccess({
          type: 'Livro', title: info.title || '', author_developer: info.authors?.map(a => a.name).join(', ') || '', year: info.publish_date ? info.publish_date.substring(0, 4) : '', publisher: info.publishers?.map(p => p.name).join(', ') || '', pages_or_time: info.number_of_pages?.toString() || '', description: info.subtitle || '', cover_url: `https://covers.openlibrary.org/b/isbn/${barcode}-L.jpg`
        });
        return; 
      }

      const mbRes = await fetch(`https://musicbrainz.org/ws/2/release/?query=barcode:${barcode}&fmt=json`, { headers: { 'Accept': 'application/json', 'User-Agent': 'MemorabiliaApp/1.0.0' } });
      const mbData = await mbRes.json();
      if (mbData.releases && mbData.releases.length > 0) {
        const info = mbData.releases[0];
        const formatString = info.media?.[0]?.format?.toLowerCase() || '';
        let matchedType = 'CD';
        if (formatString.includes('vinyl')) matchedType = 'Vinil';
        else if (formatString.includes('cassette')) matchedType = 'Fita Cassete';
        handleScanSuccess({
          type: matchedType, title: info.title || '', author_developer: info['artist-credit']?.[0]?.name || '', year: info.date ? info.date.substring(0, 4) : '', publisher: info['label-info']?.[0]?.label?.name || '', pages_or_time: '', description: '', cover_url: `https://coverartarchive.org/release/${info.id}/front`
        });
        return; 
      }
      handleScanError();
    } catch (e) { handleScanError(); }
  };

  const handleScanSuccess = (mappedData) => {
    playChipBeep('success'); 
    setScanStatus({ type: 'success', message: 'Encontrado! Verifique os dados abaixo.' });
    setFormData(prev => ({ ...prev, ...mappedData }));
  };

  const handleScanError = () => {
    playChipBeep('error'); 
    setScanStatus({ type: 'error', message: 'Não encontrado. Preencha manualmente ou use a IA.' });
  };

  // ==========================================
  // LÓGICA DE PROCESSAMENTO DA IA EXTRAÍDA
  // ==========================================
  const processAIFile = async (file) => {
    setAddMode('manual'); // MUDA PARA A TELA DO FORMULÁRIO IMEDIATAMENTE
    
    if (!settings.geminiApiKey) {
      setScanStatus({ type: 'error', message: 'Chave API do Gemini ausente (Ajustes).' });
      return;
    }

    setLoadingAi(true);
    setScanStatus({ type: 'info', message: 'Lendo imagem... Extraindo informações da ficha.' });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        
        const payload = {
          contents: [{
            role: "user",
            parts: [
              { text: `Você é um arquivista especialista. Leia ATENTAMENTE TODO O TEXTO visível, incluindo letras minúsculas de fichas catalográficas.
Procure especificamente pelo Autor (ex: Espinosa), Título, Ano, Editora e Número de páginas. 
Responda ESTRITAMENTE com um objeto JSON válido (não envie blocos markdown, apenas o JSON puro):
{
  "type": "Escolha UM entre: ${ALL_TYPES.join(', ')}",
  "title": "Título identificado",
  "author_developer": "Autor principal, artista ou estúdio",
  "year": "Ano (4 dígitos)",
  "publisher": "Editora/Gravadora",
  "pages_or_time": "Apenas os números de páginas (se livro/quadrinho) ou horas estimadas (se jogo)",
  "description": "Sinopse de 2 linhas baseada no item."
}` },
              { inlineData: { mimeType: file.type || "image/jpeg", data: base64Data } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${settings.geminiApiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
           throw new Error(data.error.message);
        }

        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (aiText) {
          const cleanedText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsedData = JSON.parse(cleanedText);
          
          setFormData(prev => ({
            ...prev, title: parsedData.title || '', author_developer: parsedData.author_developer || '', year: parsedData.year?.toString() || '', publisher: parsedData.publisher || '', description: parsedData.description || '', pages_or_time: parsedData.pages_or_time || prev.pages_or_time, type: ALL_TYPES.includes(parsedData.type) ? parsedData.type : 'Livro'
          }));
          playChipBeep('success');
          setScanStatus({ type: 'success', message: 'Encontrado! Inteligência Artificial completou os dados.' });
        } else {
           throw new Error("Resposta da IA veio vazia.");
        }
      } catch (error) {
        console.error(error);
        playChipBeep('error');
        setScanStatus({ type: 'error', message: 'Não encontrado. A IA não conseguiu ler a imagem.' });
      } finally {
        setLoadingAi(false);
      }
    };
  };

  // Observa arquivos enviados remotamente pelo componente pai
  useEffect(() => {
    if (pendingAIFile) {
      processAIFile(pendingAIFile);
      clearPendingAIFile();
    }
  }, [pendingAIFile]);

  const handleFichaAI = (e) => {
    const file = e.target.files[0];
    if (file) processAIFile(file);
    e.target.value = null; 
  };

  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleSave = () => {
    if (!formData.title) {
      playChipBeep('error');
      setShowErrorModal(true);
      return;
    }
    
    const classCode = CLASS_CODES[formData.type] || '000';
    let maxSeq = 0;
    items.forEach(item => {
      if(item.archive_code) {
        const seqStr = item.archive_code.split('-').pop();
        const seqNum = parseInt(seqStr, 10);
        if(!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
      }
    });
    const sequence = String(maxSeq + 1).padStart(4, '0');
    const generatedCode = `LUI-${classCode}-${sequence}`;

    const newItem = { ...formData, id: Date.now().toString(), archive_code: generatedCode };
    setItems([newItem, ...items]); 
    
    if (settings.googleSheetsUrl) {
      fetch(settings.googleSheetsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) }).catch(() => {});
    }

    playChipBeep('save'); 
    onShowToast(); 
    
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    setScanStatus(null);
    setActiveTab('library');
  };

  return (
    <div className="flex flex-col h-full pb-20">
      <MModal isOpen={showErrorModal} title="Atenção" message="O Título é obrigatório para salvar na biblioteca." onConfirm={() => setShowErrorModal(false)} onCancel={() => setShowErrorModal(false)} darkMode={darkMode} confirmText="OK" cancelText="Fechar" />

      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode === 'manual' ? 'blue' : 'white'} onClick={() => changeMode('manual')} className="flex-1 py-2 text-[10px]">
          <PlusSquare className="w-4 h-4" /> Manual
        </MButton>
        <MButton darkMode={darkMode} variant={addMode === 'barcode' ? 'yellow' : 'white'} onClick={() => changeMode('barcode')} className="flex-1 py-2 text-[10px]">
          <ScanLine className="w-4 h-4" /> Barcode
        </MButton>
        <MButton darkMode={darkMode} variant={addMode === 'camera_ai' ? 'red' : 'white'} onClick={triggerGlobalAI} className="flex-1 py-2 text-[10px]">
          <Camera className="w-4 h-4" /> Auto IA
        </MButton>
      </div>

      {addMode === 'barcode' && (
        <MContainer darkMode={darkMode} className="flex-1 mb-4 flex flex-col relative overflow-hidden bg-black items-center justify-center">
          <div id="reader-barcode" className="w-full h-full object-cover"></div>
          <div className="absolute inset-0 border-[10px] border-black/30 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none flex flex-col items-center justify-center">
            <span className="text-white text-[10px] uppercase font-bold tracking-widest bg-black/80 px-3 py-1 mt-24">Aponte o Código</span>
          </div>
        </MContainer>
      )}

      {addMode === 'camera_ai' && (
        <MContainer darkMode={darkMode} className="flex-1 mb-4 p-6 flex flex-col items-center justify-center text-center" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
           <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] border-[3px] border-black text-white">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="font-black uppercase tracking-widest text-sm mb-2">Captura em Alta Resolução</h3>
              <p className="text-[10px] opacity-70 mb-8 max-w-[250px]">Toque no botão abaixo para abrir a câmera original do seu celular. Tire uma foto nítida e bem iluminada da capa ou da ficha catalográfica.</p>
              
              {/* BOTÃO MÁGICO NATIVO */}
              <label className="flex items-center justify-center gap-2 px-6 py-4 font-sans text-xs font-bold uppercase tracking-wider border-[3px] border-black bg-rose-400 text-black active:scale-95 transition-transform cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-rose-500">
                <Camera className="w-5 h-5" />
                Tirar Nova Foto
                <input type="file" accept="image/*" capture="environment" onChange={handleFichaAI} className="hidden" />
              </label>
           </div>
        </MContainer>
      )}

      {addMode === 'manual' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
          {scanStatus && (
            <div className={`p-4 mb-4 flex items-center gap-3 border-[3px] font-black text-[10px] uppercase tracking-widest ${
              darkMode 
                ? scanStatus.type === 'success' ? 'bg-emerald-800 border-gray-500 text-white' : scanStatus.type === 'error' ? 'bg-rose-800 border-gray-500 text-white' : 'bg-yellow-700 border-gray-500 text-white'
                : scanStatus.type === 'success' ? 'bg-emerald-400 border-black text-black' : scanStatus.type === 'error' ? 'bg-rose-400 border-black text-black' : 'bg-yellow-400 border-black text-black'
            }`}>
              {scanStatus.type === 'error' && <AlertTriangle className="w-6 h-6 flex-shrink-0" />}
              {scanStatus.type === 'success' && <Check className="w-6 h-6 flex-shrink-0" />}
              {scanStatus.type === 'info' && <Loader className="w-6 h-6 flex-shrink-0 animate-spin" />}
              <span className="leading-tight">{scanStatus.message}</span>
            </div>
          )}

          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Formato Específico</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none font-bold`}>
                {Object.entries(CATEGORIES).map(([cat, subs]) => (<optgroup label={`--- ${cat.toUpperCase()} ---`} key={cat}>{subs.map(sub => <option key={sub} value={sub}>{sub}</option>)}</optgroup>))}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2 w-full">
              <div className="col-span-3"><MInput darkMode={darkMode} label="Título *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="col-span-1"><MInput darkMode={darkMode} label="Ano" type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} /></div>
            </div>

            <MInput darkMode={darkMode} label="Autor / Desenvolvedor / Artista" value={formData.author_developer} onChange={e => setFormData({...formData, author_developer: e.target.value})} />
            
            <div className="grid grid-cols-4 gap-2 mb-2 w-full">
              <div className="col-span-3"><MInput darkMode={darkMode} label="Editora / Gravadora" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} /></div>
              <div className="col-span-1"><MInput darkMode={darkMode} label="Págs / Tempo" type="number" value={formData.pages_or_time} onChange={e => setFormData({...formData, pages_or_time: e.target.value})} /></div>
            </div>

            <MInput darkMode={darkMode} label="URL da Capa (Opcional)" value={formData.cover_url} onChange={e => setFormData({...formData, cover_url: e.target.value})} />
            <MInput darkMode={darkMode} label="Localização Física" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Estante Sala..." />
            <MInput darkMode={darkMode} label="Descrição / Sinopse" multiline value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <MInput darkMode={darkMode} label="Fichamento e Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Suas impressões..." />

            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Status Atual</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[2px] active:scale-95 transition-transform ${formData.status === opt ? (darkMode ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-emerald-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-600 text-gray-400' : 'bg-white border-gray-300 text-gray-500')}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Avaliação (Nota)</label>
              <div className={`flex gap-2 p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800' : 'border-black bg-white'}`}>
                {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => setFormData({...formData, rating: star})} className={`w-8 h-8 cursor-pointer active:scale-90 transition-transform ${star <= formData.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
              </div>
            </div>

            <MButton darkMode={darkMode} onClick={handleSave} variant="black" className="mt-2 py-4 text-sm"><Check className="w-5 h-5 mr-2" /> Salvar Item</MButton>
          </MContainer>
        </div>
      )}
    </div>
  );
};

const DashboardTab = ({ items, darkMode }) => {
  const totalItems = items.length;
  const byCategory = Object.keys(CATEGORIES).reduce((acc, cat) => {
    acc[cat] = items.filter(i => CATEGORIES[cat].includes(i.type)).length;
    return acc;
  }, {});

  const getFunStats = () => {
    if (totalItems === 0) return {};
    const validYears = items.filter(i => i.year && !isNaN(parseInt(i.year)));
    const reliquia = validYears.length > 0 ? validYears.reduce((a, b) => parseInt(a.year) < parseInt(b.year) ? a : b) : null;
    const validLengths = items.filter(i => i.pages_or_time && !isNaN(parseInt(i.pages_or_time)));
    const epico = validLengths.length > 0 ? validLengths.reduce((a, b) => parseInt(a.pages_or_time) > parseInt(b.pages_or_time) ? a : b) : null;
    const vergonha = items.filter(i => i.status === 'Não Iniciado').length;
    const authors = items.map(i => i.author_developer).filter(Boolean);
    const favorite = authors.length > 0 ? authors.sort((a,b) => authors.filter(v => v===a).length - authors.filter(v => v===b).length).pop() : null;
    return { reliquia, epico, vergonha, favorite };
  };

  const stats = getFunStats();

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4">
      <div className="flex gap-4">
        <MContainer darkMode={darkMode} className="flex-1 flex flex-col items-center justify-center py-6 relative overflow-hidden" colorClass={darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black'}>
          <LibraryBig className={`absolute -left-4 -bottom-4 w-24 h-24 ${darkMode ? 'text-white opacity-10' : 'text-black opacity-10'}`} />
          <div className="text-5xl font-black z-10">{totalItems}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest mt-1 z-10">Total na Coleção</div>
        </MContainer>
      </div>

      <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[3px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Distribuição Geral</div>
        <div className="space-y-3">
          {Object.entries(byCategory).filter(([_, count]) => count > 0).map(([cat, count]) => {
            const percentage = Math.round((count / totalItems) * 100) || 0;
            return (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-16 text-[10px] font-bold uppercase tracking-wider">{cat}</div>
                <div className={`flex-1 h-3 border-[2px] flex ${darkMode ? 'bg-gray-800 border-gray-500' : 'bg-gray-200 border-black'}`}>
                  <div className={`h-full ${darkMode ? 'bg-gray-600' : 'bg-black'} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                </div>
                <div className="w-8 text-[10px] font-bold text-right">{count} un.</div>
              </div>
            );
          })}
        </div>
      </MContainer>

      {totalItems > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.reliquia && (
            <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black'}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">A Relíquia<br/>(Mais Antigo)</div><Clock className="w-5 h-5 opacity-50" /></div>
              <div><div className="text-sm font-black truncate">{stats.reliquia.title}</div><div className="text-[10px] font-bold">Lançado em {stats.reliquia.year}</div></div>
            </MContainer>
          )}
          {stats.epico && (
            <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black'}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">O Épico<br/>(Mais Longo)</div><Flame className="w-5 h-5 opacity-50" /></div>
              <div><div className="text-sm font-black truncate">{stats.epico.title}</div><div className="text-[10px] font-bold">{stats.epico.pages_or_time} {['Livro', 'Quadrinho'].includes(stats.epico.type) ? 'Páginas' : 'Horas'}</div></div>
            </MContainer>
          )}
          <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}>
            <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">Pilha da<br/>Vergonha</div><Ghost className="w-5 h-5 opacity-50" /></div>
            <div className="flex items-end gap-1"><div className="text-3xl font-black leading-none">{stats.vergonha}</div><div className="text-[9px] font-bold uppercase tracking-widest pb-1">Intocados</div></div>
          </MContainer>
          {stats.favorite && (
            <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-emerald-800 text-white' : 'bg-emerald-300 text-black'}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">Mestre de<br/>Obras</div><Trophy className="w-5 h-5 opacity-50" /></div>
              <div><div className="text-xs font-black truncate uppercase">{stats.favorite}</div><div className="text-[9px] font-bold opacity-80 mt-1">Autor / Estúdio</div></div>
            </MContainer>
          )}
        </div>
      )}
    </div>
  );
};

const SettingsTab = ({ items, setItems, settings, setSettings, darkMode, setDarkMode, onShowToast }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importData, setImportData] = useState(null);

  const handleExportCSV = () => {
    const headers = ['id', 'archive_code', 'type', 'title', 'author_developer', 'year', 'publisher', 'status', 'rating', 'pages_or_time', 'barcode', 'description', 'cover_url', 'location', 'notes', 'wiki_info'];
    const csvContent = [headers.join(','), ...items.map(item => headers.map(h => `"${(item[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `memorabilia_export_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const newItems = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
        const item = {};
        headers.forEach((h, idx) => { item[h] = values[idx] || ''; });
        if(item.id) newItems.push(item);
      }
      if(newItems.length > 0) setImportData(newItems);
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleSaveSettings = () => {
    playChipBeep('save');
    onShowToast();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative">
      <MModal isOpen={showResetConfirm} title="Aviso Crítico" message="Deseja realmente apagar TODOS os itens da sua biblioteca? Esta ação não tem volta." onConfirm={() => { setItems([]); setShowResetConfirm(false); }} onCancel={() => setShowResetConfirm(false)} darkMode={darkMode} confirmText="Apagar Tudo" />
      <MModal isOpen={!!importData} title="Importar CSV" message={`Foram encontrados ${importData ? importData.length : 0} itens no arquivo. Deseja substituir a coleção atual por eles?`} onConfirm={() => { if (importData) { setItems(importData); setImportData(null); } }} onCancel={() => setImportData(null)} darkMode={darkMode} confirmText="Substituir Coleção" />

      <MContainer darkMode={darkMode} className="p-4 mb-4 flex justify-between items-center" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className="text-xs font-bold uppercase tracking-widest">Aparência</div>
        <MButton darkMode={darkMode} onClick={() => setDarkMode(!darkMode)} variant="black" className="px-4 py-2">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {darkMode ? 'Modo Claro' : 'Modo Escuro'}
        </MButton>
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4 mb-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[3px] pb-2 flex items-center gap-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}><Library className="w-4 h-4" /> Integrações</div>
        <MInput darkMode={darkMode} label="Google Gemini API Key (Scan IA)" type="password" value={settings.geminiApiKey} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} />
        <MInput darkMode={darkMode} label="Google Sheets Webhook URL" value={settings.googleSheetsUrl} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} />
        
        <MButton darkMode={darkMode} onClick={handleSaveSettings} variant="black" className="w-full mt-4">
          <Check className="w-4 h-4" /> Salvar Chaves e Links
        </MButton>

        {settings.googleSheetsUrl && <a href={settings.googleSheetsUrl} target="_blank" rel="noopener noreferrer" className="block mt-2"><MButton darkMode={darkMode} variant="blue" className="w-full text-[10px]"><ExternalLink className="w-4 h-4" /> Abrir Planilha Online</MButton></a>}
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4 mb-4" colorClass={darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[3px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Backup Local (.CSV)</div>
        <div className="flex gap-2">
          <MButton darkMode={darkMode} onClick={handleExportCSV} variant="white" className={`flex-1 text-[10px] ${darkMode?'text-white bg-gray-800 border-gray-500':'text-black'}`}><Download className="w-4 h-4" /> Exportar</MButton>
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-bold uppercase tracking-wider border-[3px] cursor-pointer active:scale-95 transition-transform ${darkMode?'border-gray-500 bg-gray-800 text-white':'border-black bg-white text-black'} `}><Upload className="w-4 h-4" /> Importar<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} /></label>
        </div>
      </MContainer>

      <MButton darkMode={darkMode} onClick={() => setShowResetConfirm(true)} variant="red" className="w-full">Resetar / Apagar Tudo</MButton>
    </div>
  );
};

// ==========================================
// 6. COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [addMode, setAddMode] = useState('barcode');
  const [darkMode, setDarkMode] = useState(false);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ geminiApiKey: '', googleSheetsUrl: '', webhookUrl: '' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalToast, setGlobalToast] = useState(false); 

  const globalFileInputRef = useRef(null);
  const [pendingAIFile, setPendingAIFile] = useState(null);

  const triggerGlobalAI = () => {
    setAddMode('camera_ai');
    setActiveTab('add');
    if (globalFileInputRef.current) {
      globalFileInputRef.current.click();
    }
  };

  const handleGlobalFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingAIFile(file);
      setAddMode('camera_ai');
      setActiveTab('add');
    }
    e.target.value = null;
  };

  useEffect(() => {
    if (!document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script');
      script.id = 'html5-qrcode-script';
      script.src = "https://unpkg.com/html5-qrcode";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => setGlobalToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('memorabilia_theme');
    if (savedTheme === 'dark') setDarkMode(true);
    const savedItems = localStorage.getItem('memorabilia_items');
    if (savedItems) setItems(JSON.parse(savedItems));
    else setItems(INITIAL_ITEMS);
    const savedSettings = localStorage.getItem('memorabilia_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    setIsLoaded(true);
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_items', JSON.stringify(items)); }, [items, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_settings', JSON.stringify(settings)); }, [settings, isLoaded]);
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light');
    }
  }, [darkMode, isLoaded]);

  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleAddPressStart = () => {
    initAudio(); 
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      triggerGlobalAI(); 
    }, 500); 
  };

  const handleAddPressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleAddClick = () => {
    initAudio(); 
    if (!isLongPress.current) {
      setAddMode('barcode'); 
      setActiveTab('add');
    }
  };

  const totalItems = items.length;
  const validRatings = items.filter(i => i.rating > 0);
  const avgRating = validRatings.length > 0 ? (validRatings.reduce((acc, i) => acc + i.rating, 0) / validRatings.length) : 0;
  const totalPages = items.filter(i => ['Livro', 'Quadrinho'].includes(i.type)).reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const totalHours = items.filter(i => !['Livro', 'Quadrinho'].includes(i.type)).reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);

  if (!isLoaded) return null; 

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#121212] text-[#E0E0E0]' : 'bg-white text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <div className={`max-w-md mx-auto h-screen relative flex flex-col border-x-[4px] shadow-2xl overflow-hidden ${darkMode ? 'border-gray-500 bg-[#1a1a1a]' : 'border-black bg-gray-50'}`}>
        
        {globalToast && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className={`w-12 h-12 border-[3px] border-black bg-emerald-400 text-black flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,1)]`}>
              <Check className="w-8 h-8" />
            </div>
          </div>
        )}

        <header className={`flex-none p-3 border-b-[4px] z-20 flex justify-between items-center ${darkMode ? 'border-gray-500 bg-gray-900' : 'border-black bg-white'}`}>
          <div className="flex flex-col flex-1 pr-2">
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              Memorabilia
            </h1>
            <div className={`flex gap-2 text-[9px] font-bold tracking-widest mt-1.5 uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <span>{totalItems} <span className="opacity-60">UN</span></span>
              <span>★ {avgRating.toFixed(1)}</span>
              <span>{totalPages} <span className="opacity-60">PÁG</span></span>
              <span>{totalHours} <span className="opacity-60">H</span></span>
            </div>
          </div>
          <div className={`w-6 h-6 flex-shrink-0 border-[3px] ${darkMode ? 'bg-rose-800 border-gray-500' : 'bg-rose-500 border-black'}`}></div>
        </header>

        <main className="flex-1 overflow-hidden p-3 relative z-0">
          <input type="file" accept="image/*" capture="environment" ref={globalFileInputRef} onChange={handleGlobalFileChange} className="hidden" />
          
          {activeTab === 'library' && <LibraryTab items={items} setItems={setItems} darkMode={darkMode} settings={settings} onShowToast={() => setGlobalToast(true)} />}
          {activeTab === 'add' && <AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} onShowToast={() => setGlobalToast(true)} pendingAIFile={pendingAIFile} clearPendingAIFile={() => setPendingAIFile(null)} triggerGlobalAI={triggerGlobalAI} />}
          {activeTab === 'dashboard' && <DashboardTab items={items} darkMode={darkMode} />}
          {activeTab === 'settings' && <SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} onShowToast={() => setGlobalToast(true)} />}
        </main>

        <nav className={`flex-none flex border-t-[4px] z-20 h-16 relative ${darkMode ? 'border-gray-500 bg-gray-900' : 'border-black bg-white'}`}>
          <button onClick={() => { initAudio(); setActiveTab('library'); }} className={`flex-1 flex flex-col items-center justify-center border-r-[3px] transition-colors ${darkMode ? 'border-gray-500 text-gray-300' : 'border-black text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300') : ''}`}>
            <Library className="w-5 h-5 mb-1" />
            <span className="text-[8px] font-bold uppercase">Biblioteca</span>
          </button>
          
          <button 
            onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd}
            onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd}
            onClick={handleAddClick}
            className={`flex-1 flex flex-col items-center justify-center border-r-[3px] transition-colors ${darkMode ? 'border-gray-500 text-gray-300' : 'border-black text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400') : ''}`}
          >
            <PlusSquare className="w-5 h-5 mb-1" />
            <span className="text-[8px] font-bold uppercase">Adicionar</span>
          </button>
          
          <button onClick={() => { initAudio(); setActiveTab('dashboard'); }} className={`flex-1 flex flex-col items-center justify-center border-r-[3px] transition-colors ${darkMode ? 'border-gray-500 text-gray-300' : 'border-black text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300') : ''}`}>
            <BarChart2 className="w-5 h-5 mb-1" />
            <span className="text-[8px] font-bold uppercase">Dashboard</span>
          </button>
          
          <button onClick={() => { initAudio(); setActiveTab('settings'); }} className={`flex-1 flex flex-col items-center justify-center transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200') : ''}`}>
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-[8px] font-bold uppercase">Ajustes</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
