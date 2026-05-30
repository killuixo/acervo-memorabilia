import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// 1. ÍCONES NATIVOS (Zero Dependências Externas)
// ==========================================
const Icon = ({ path, className = "w-6 h-6", onClick, fill = "none" }) => (
  <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {path}
  </svg>
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
const Info = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>} />;
const AlertTriangle = (p) => <Icon {...p} path={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} />;

// ==========================================
// 2. CONSTANTES E CONFIGURAÇÕES GERAIS
// ==========================================
const CATEGORIES = {
  'Livros': ['Livro', 'Quadrinho'],
  'Discos': ['CD', 'Vinil', 'Fita Cassete'],
  'Vídeo': ['VHS', 'DVD'],
  'Games': ['Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4']
};
const ALL_TYPES = Object.values(CATEGORIES).flat();

const INITIAL_ITEMS = [
  { id: '1', type: 'Livro', title: 'Neuromancer', author_developer: 'William Gibson', year: '1984', publisher: 'Aleph', status: 'Concluído', rating: 5, pages_or_time: '320', cover_url: 'https://books.google.com/books/content?id=pMytzQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', description: 'O romance de estreia de William Gibson e o primeiro a ganhar os três principais prêmios de ficção científica (Nebula, Hugo e Philip K. Dick).' },
  { id: '2', type: 'SNES', title: 'Chrono Trigger', author_developer: 'Square', year: '1995', publisher: 'Square', status: 'Em Andamento', rating: 5, pages_or_time: '40', cover_url: '', description: 'Um grupo de jovens viaja através do tempo para salvar o mundo de um parasita alienígena.' }
];

const STATUS_OPTIONS = ['Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'];

const getMondrianColor = (index, darkMode) => {
  const colorsLight = ['bg-rose-300', 'bg-sky-300', 'bg-yellow-400', 'bg-white'];
  const colorsDark = ['bg-rose-800', 'bg-sky-800', 'bg-yellow-600', 'bg-gray-900'];
  return darkMode ? colorsDark[index % colorsDark.length] : colorsLight[index % colorsLight.length];
};

// ==========================================
// 3. SISTEMA DE ÁUDIO 8-BIT (SUTIL E OTIMIZADO)
// ==========================================
let globalAudioCtx = null;

const initAudio = () => {
  try {
    if (!globalAudioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
  } catch (e) {
    console.error("Erro ao iniciar áudio", e);
  }
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
      oscillator.frequency.setValueAtTime(1046.50, now); // C6
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
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(783.99, now + 0.1); // G5
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
    }
  } catch (e) {
    console.error("Erro ao tocar beep", e);
  }
};

// ==========================================
// 4. COMPONENTES UI COMPARTILHADOS & MODAIS
// ==========================================
const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${colorClass} ${className} transition-colors duration-300`}>
    {children}
  </div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bgClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'red') bgClass = darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black';
  if (variant === 'blue') bgClass = darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black';
  if (variant === 'yellow') bgClass = darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black';
  if (variant === 'black') bgClass = darkMode ? 'bg-gray-300 text-black' : 'bg-black text-white';

  return (
    <button 
      disabled={disabled}
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-bold uppercase tracking-wider border-[3px] ${darkMode ? 'border-gray-500' : 'border-black'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} transition-transform ${bgClass} ${className}`}
    >
      {icon && icon}
      {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, type = "text", placeholder = "", multiline = false, darkMode }) => (
  <div className="flex flex-col mb-3">
    <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
    {multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} className={`p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-yellow-100 transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none focus:bg-sky-100 transition-colors`} />
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

const LibraryTab = ({ items, setItems, darkMode }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeSubtype, setActiveSubtype] = useState('Todos');
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

  const updateRating = (id, newRating) => {
    setItems(items.map(item => item.id === id ? { ...item, rating: newRating } : item));
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem({ ...selectedItem, rating: newRating });
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
      setSelectedItem(null);
    }
  };

  if (selectedItem) {
    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MModal 
          isOpen={!!itemToDelete} 
          title="Excluir Item" 
          message={`Tem certeza que deseja apagar "${selectedItem.title}" definitivamente da sua coleção?`} 
          onConfirm={confirmDelete} 
          onCancel={() => setItemToDelete(null)} 
          darkMode={darkMode} 
          confirmText="Apagar"
        />

        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <button onClick={() => setSelectedItem(null)} className={`p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800' : 'border-black bg-gray-100'} active:scale-95 transition-transform`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="font-black uppercase tracking-widest text-[10px] truncate flex-1">Detalhes da Mídia</div>
        </MContainer>

        <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-10">
          <div className="flex gap-4">
            <MContainer darkMode={darkMode} className="w-32 h-44 flex-shrink-0 flex items-center justify-center overflow-hidden" colorClass={`border-[4px] ${darkMode ? 'bg-gray-800' : 'bg-black'}`}>
              {selectedItem.cover_url ? (
                <img src={selectedItem.cover_url} alt="Capa" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
              ) : (
                <LibraryBig className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-white opacity-30'}`} />
              )}
            </MContainer>
            
            <div className="flex flex-col flex-1 justify-center">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1 leading-tight">{selectedItem.type} • {selectedItem.year}</div>
              <div className="text-xl font-black leading-none mb-2">{selectedItem.title}</div>
              <div className="text-xs font-bold opacity-80 uppercase tracking-wide">{selectedItem.author_developer}</div>
              <div className="text-[10px] opacity-60 mt-1 uppercase tracking-widest leading-tight">{selectedItem.publisher}</div>
              {selectedItem.location && (
                <div className="text-[10px] font-bold opacity-80 mt-2 uppercase tracking-widest flex items-center gap-1">
                  <Library className="w-3 h-3" /> Local: {selectedItem.location}
                </div>
              )}
              {selectedItem.pages_or_time && (
                <div className={`text-[10px] font-bold w-max px-2 py-1 mt-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-black text-white'}`}>
                  {selectedItem.pages_or_time} {['Livro', 'Quadrinho'].includes(selectedItem.type) ? 'Páginas' : 'Horas'}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <MContainer darkMode={darkMode} className="flex-1 p-3 flex flex-col items-center justify-center text-center" colorClass={darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black'}>
               <div className={`text-[9px] font-black uppercase tracking-widest mb-1 border-b-2 pb-1 ${darkMode ? 'border-gray-500' : 'border-black/20'}`}>Status</div>
               <div className="text-[10px] font-bold tracking-wider">{selectedItem.status}</div>
            </MContainer>
            <MContainer darkMode={darkMode} className="flex-1 p-3 flex flex-col items-center justify-center text-center" colorClass={darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black'}>
               <div className={`text-[9px] font-black uppercase tracking-widest mb-1 border-b-2 pb-1 ${darkMode ? 'border-gray-500' : 'border-black/20'}`}>Avaliação</div>
               <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} onClick={() => updateRating(selectedItem.id, star)} className={`w-4 h-4 cursor-pointer ${star <= selectedItem.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-500' : 'text-gray-500 opacity-30')}`} />
                  ))}
                </div>
            </MContainer>
          </div>

          <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-3 border-b-[3px] pb-1 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Descrição / Sinopse</div>
            <p className="text-xs font-medium leading-relaxed opacity-90 whitespace-pre-wrap text-justify">
              {selectedItem.description || "Nenhuma descrição ou sinopse disponível para este item."}
            </p>
          </MContainer>

          {selectedItem.notes && (
            <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-100 text-black'}>
              <div className={`text-[10px] font-black uppercase tracking-widest mb-3 border-b-[3px] pb-1 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Fichamento / Anotações</div>
              <p className="text-xs font-medium leading-relaxed opacity-90 whitespace-pre-wrap text-justify">
                {selectedItem.notes}
              </p>
            </MContainer>
          )}

          <MButton darkMode={darkMode} onClick={() => setItemToDelete(selectedItem.id)} variant="red" className="w-full">
             Remover da Coleção
          </MButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MContainer darkMode={darkMode} className="p-3 mb-4 flex flex-col gap-3 sticky top-0 z-10 shadow-md" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="relative">
          <Search className={`absolute left-3 top-3 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input type="text" placeholder="Buscar Título ou Autor..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className={`w-full p-2 pl-9 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none`} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Todos', ...Object.keys(CATEGORIES)].map(cat => (
            <button key={cat} onClick={() => { setActiveCategory(cat); setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1 text-[10px] uppercase tracking-wider font-bold border-[2px] ${darkMode ? 'border-gray-500' : 'border-black'} ${activeCategory === cat ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-300 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{cat}</button>
          ))}
        </div>
        {activeCategory !== 'Todos' && CATEGORIES[activeCategory]?.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => { setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1 text-[10px] uppercase tracking-wider font-bold border-[2px] ${darkMode ? 'border-gray-500' : 'border-black'} ${activeSubtype === 'Todos' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>Todos</button>
            {CATEGORIES[activeCategory].map(type => (
              <button key={type} onClick={() => { setActiveSubtype(type); setPage(0); }} className={`whitespace-nowrap px-3 py-1 text-[10px] uppercase tracking-wider font-bold border-[2px] ${darkMode ? 'border-gray-500' : 'border-black'} ${activeSubtype === type ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-300 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{type}</button>
            ))}
          </div>
        )}
      </MContainer>

      <div className="flex-1 overflow-y-auto pb-20 px-1">
        {paginatedItems.length === 0 ? (
          <div className="text-center p-10 opacity-50 text-sm font-sans font-bold uppercase tracking-widest">Nenhum item encontrado.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {paginatedItems.map((item, idx) => (
              <div key={item.id} className="flex flex-row h-32 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setSelectedItem(item)}>
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
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} onClick={() => updateRating(item.id, star)} className={`w-4 h-4 cursor-pointer ${star <= item.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />
                        ))}
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

const AddTab = ({ items, setItems, settings, darkMode, addMode, setAddMode, setActiveTab }) => {
  const [scanStatus, setScanStatus] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerRef = useRef(null);
  const isProcessingScan = useRef(false);

  const [formData, setFormData] = useState({
    type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: ''
  });

  const changeMode = (newMode) => {
    setAddMode(newMode);
    if (newMode !== 'manual') setScanStatus(null); 
  };

  const cleanupMedia = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (scannerRef.current) {
      try { scannerRef.current.stop().catch(() => {}); } catch(e) {}
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
        }
      } catch (err) {
        if (isMounted) {
          setHasCameraPermission(false);
          setScanStatus({ type: 'error', message: 'Câmera inacessível. Usando preenchimento manual.' });
          setAddMode('manual');
        }
      }
    };

    if (addMode === 'camera_ai' || addMode === 'barcode') {
      initCamera();
      
      if (addMode === 'barcode') {
        const startScanner = () => {
          if (!window.Html5Qrcode || scannerRef.current || !isMounted) return;
          
          const html5QrCode = new window.Html5Qrcode("reader-barcode");
          scannerRef.current = html5QrCode;
          
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              if (isProcessingScan.current) return;
              isProcessingScan.current = true;
              
              cleanupMedia(); 
              
              if (isMounted) {
                setAddMode('manual');
                setFormData(prev => ({ ...prev, barcode: decodedText }));
                fetchMultiDatabase(decodedText);
                setTimeout(() => { isProcessingScan.current = false; }, 2000);
              }
            },
            () => {} 
          ).catch(() => {});
        };

        if (window.Html5Qrcode) {
          startScanner();
        } else {
          if (!document.getElementById('html5-qrcode-script')) {
            const script = document.createElement('script');
            script.id = 'html5-qrcode-script';
            script.src = "https://unpkg.com/html5-qrcode";
            script.onload = startScanner;
            document.head.appendChild(script);
          } else {
            setTimeout(startScanner, 500);
          }
        }
      }
    } else {
      cleanupMedia();
    }

    return () => {
      isMounted = false;
      cleanupMedia();
    };
  }, [addMode]);

  const fetchMultiDatabase = async (barcode) => {
    setScanStatus({ type: 'info', message: 'Buscando em múltiplos bancos de dados...' });
    
    try {
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}`);
      const gbData = await gbRes.json();
      if (gbData.items && gbData.items.length > 0) {
        const info = gbData.items[0].volumeInfo;
        handleScanSuccess({
          type: 'Livro',
          title: info.title || '',
          author_developer: info.authors ? info.authors.join(', ') : '',
          year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
          publisher: info.publisher || '',
          pages_or_time: info.pageCount ? info.pageCount.toString() : '',
          description: info.description || '',
          cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:') || ''
        });
        return; 
      }

      const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&jscmd=data&format=json`);
      const olData = await olRes.json();
      if (olData[`ISBN:${barcode}`]) {
        const info = olData[`ISBN:${barcode}`];
        handleScanSuccess({
          type: 'Livro',
          title: info.title || '',
          author_developer: info.authors?.map(a => a.name).join(', ') || '',
          year: info.publish_date ? info.publish_date.substring(0, 4) : '',
          publisher: info.publishers?.map(p => p.name).join(', ') || '',
          pages_or_time: info.number_of_pages?.toString() || '',
          description: info.subtitle || '',
          cover_url: `https://covers.openlibrary.org/b/isbn/${barcode}-L.jpg`
        });
        return; 
      }

      const mbRes = await fetch(`https://musicbrainz.org/ws/2/release/?query=barcode:${barcode}&fmt=json`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'MemorabiliaApp/1.0.0' }
      });
      const mbData = await mbRes.json();
      if (mbData.releases && mbData.releases.length > 0) {
        const info = mbData.releases[0];
        const formatString = info.media?.[0]?.format?.toLowerCase() || '';
        let matchedType = 'CD';
        if (formatString.includes('vinyl')) matchedType = 'Vinil';
        else if (formatString.includes('cassette')) matchedType = 'Fita Cassete';
        
        handleScanSuccess({
          type: matchedType,
          title: info.title || '',
          author_developer: info['artist-credit']?.[0]?.name || '',
          year: info.date ? info.date.substring(0, 4) : '',
          publisher: info['label-info']?.[0]?.label?.name || '',
          pages_or_time: '',
          description: '',
          cover_url: `https://coverartarchive.org/release/${info.id}/front`
        });
        return; 
      }

      handleScanError();
    } catch (e) {
      handleScanError();
    }
  };

  const handleScanSuccess = (mappedData) => {
    playChipBeep('success'); 
    setScanStatus({ type: 'success', message: 'SUCESSO: Informações recuperadas da rede!' });
    setFormData(prev => ({ ...prev, ...mappedData }));
  };

  const handleScanError = () => {
    playChipBeep('error'); 
    setScanStatus({ type: 'error', message: 'FALHA: Item não encontrado. Preencha manualmente ou use a IA.' });
  };

  const captureAndAnalyzeAI = async () => {
    if (!settings.geminiApiKey) {
      setScanStatus({ type: 'error', message: 'Chave API do Gemini ausente (Vá na aba Ajustes).' });
      changeMode('manual');
      return;
    }

    setLoadingAi(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    
    cleanupMedia();

    try {
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: `Extraia as informações desta mídia. Responda APENAS com JSON no formato exato: 'type' (escolha UM entre: ${ALL_TYPES.join(', ')}), 'title', 'author_developer', 'year', 'publisher', 'description' (crie uma breve sinopse de 2 linhas baseada no item).` },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${settings.geminiApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (aiText) {
        const cleanedText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanedText);
        
        setFormData(prev => ({
          ...prev,
          title: parsedData.title || '',
          author_developer: parsedData.author_developer || '',
          year: parsedData.year?.toString() || '',
          publisher: parsedData.publisher || '',
          description: parsedData.description || '',
          type: ALL_TYPES.includes(parsedData.type) ? parsedData.type : 'Livro'
        }));
        playChipBeep('success');
        setScanStatus({ type: 'success', message: 'SUCESSO: Inteligência Artificial completou os dados!' });
      }
    } catch (error) {
      playChipBeep('error');
      setScanStatus({ type: 'error', message: 'FALHA: A Inteligência Artificial não conseguiu interpretar a imagem.' });
    } finally {
      setLoadingAi(false);
      setAddMode('manual');
    }
  };

  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleSave = () => {
    if (!formData.title) {
      playChipBeep('error');
      setShowErrorModal(true);
      return;
    }
    const newItem = { ...formData, id: Date.now().toString() };
    setItems([newItem, ...items]); 
    
    playChipBeep('save'); 
    
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '' });
    setScanStatus(null);
    setActiveTab('library');
  };

  return (
    <div className="flex flex-col h-full pb-20">
      
      <MModal 
        isOpen={showErrorModal} 
        title="Atenção" 
        message="O Título é obrigatório para salvar na biblioteca." 
        onConfirm={() => setShowErrorModal(false)} 
        onCancel={() => setShowErrorModal(false)} 
        darkMode={darkMode} 
        confirmText="OK"
        cancelText="Fechar"
      />

      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode === 'manual' ? 'blue' : 'white'} onClick={() => changeMode('manual')} className="flex-1 py-2 text-[10px]">
          <PlusSquare className="w-4 h-4" /> Manual
        </MButton>
        <MButton darkMode={darkMode} variant={addMode === 'barcode' ? 'yellow' : 'white'} onClick={() => changeMode('barcode')} className="flex-1 py-2 text-[10px]">
          <ScanLine className="w-4 h-4" /> Barcode
        </MButton>
        <MButton darkMode={darkMode} variant={addMode === 'camera_ai' ? 'red' : 'white'} onClick={() => changeMode('camera_ai')} className="flex-1 py-2 text-[10px]">
          <Camera className="w-4 h-4" /> Auto IA
        </MButton>
      </div>

      {(addMode === 'camera_ai' || addMode === 'barcode') && (
        <MContainer darkMode={darkMode} className="flex-1 mb-4 flex flex-col relative overflow-hidden bg-black items-center justify-center">
          {!hasCameraPermission && !loadingAi && (
            <div className="text-white text-xs font-bold uppercase p-6 text-center leading-relaxed">
              Permissão de câmera bloqueada pelo navegador. <br/><br/>
              <MButton darkMode={true} onClick={() => changeMode('manual')} variant="yellow" className="mx-auto mt-4">
                Ir para o modo Manual
              </MButton>
            </div>
          )}
          
          {loadingAi && (
            <div className="text-white font-sans text-sm animate-pulse flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-white border-t-rose-500 rounded-full animate-spin mb-4"></div>
              Processando IA...
            </div>
          )}
          
          {!loadingAi && hasCameraPermission && (
            <>
              <div id="reader-barcode" className={`w-full h-full object-cover ${addMode === 'barcode' ? 'block' : 'hidden'}`}></div>
              <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${addMode === 'camera_ai' ? 'block' : 'hidden'}`} />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 border-[10px] border-black/30 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none flex flex-col items-center justify-center">
                 {addMode === 'barcode' && <span className="text-white text-[10px] uppercase font-bold tracking-widest bg-black/80 px-3 py-1 mt-24">Aponte o Código de Barras</span>}
              </div>
              
              {addMode === 'camera_ai' && (
                <button onClick={captureAndAnalyzeAI} className="absolute bottom-6 w-16 h-16 bg-white border-[4px] border-black rounded-full active:bg-rose-300 transition-colors flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,1)] z-10">
                  <Camera className="w-6 h-6 text-black" />
                </button>
              )}
            </>
          )}
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
              {scanStatus.type === 'error' ? <AlertTriangle className="w-6 h-6 flex-shrink-0" /> : <Info className="w-6 h-6 flex-shrink-0" />}
              <span className="leading-tight">{scanStatus.message}</span>
            </div>
          )}

          <MContainer darkMode={darkMode} className="p-4 flex flex-col" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Formato Específico</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none font-bold`}>
                {Object.entries(CATEGORIES).map(([cat, subs]) => (
                  <optgroup label={`--- ${cat.toUpperCase()} ---`} key={cat}>
                    {subs.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mb-2">
              <div className="flex-1"><MInput darkMode={darkMode} label="Editora / Gravadora" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} /></div>
              <div className="w-1/3"><MInput darkMode={darkMode} label="Págs / Tempo" type="number" value={formData.pages_or_time} onChange={e => setFormData({...formData, pages_or_time: e.target.value})} /></div>
            </div>
            
            <MInput darkMode={darkMode} label="URL da Capa (Opcional)" value={formData.cover_url} onChange={e => setFormData({...formData, cover_url: e.target.value})} />
            <MInput darkMode={darkMode} label="Localização Física" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Estante Sala, Caixa 3..." />
            <MInput darkMode={darkMode} label="Descrição / Sinopse" multiline value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <MInput darkMode={darkMode} label="Fichamento e Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Suas impressões, citações, etc." />

            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Status Atual</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={`w-full p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800 text-white' : 'border-black bg-white text-black'} font-sans text-sm outline-none`}>
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Avaliação (Nota)</label>
              <div className={`flex gap-2 p-2 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-800' : 'border-black bg-white'}`}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    onClick={() => setFormData({...formData, rating: star})} 
                    className={`w-6 h-6 cursor-pointer ${star <= formData.rating ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} 
                  />
                ))}
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

const SettingsTab = ({ items, setItems, settings, setSettings, darkMode, setDarkMode }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importData, setImportData] = useState(null);

  const handleExportCSV = () => {
    const headers = ['id', 'type', 'title', 'author_developer', 'year', 'publisher', 'status', 'rating', 'pages_or_time', 'barcode', 'description', 'cover_url', 'location', 'notes'];
    const csvContent = [
      headers.join(','),
      ...items.map(item => headers.map(h => `"${(item[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `memorabilia_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
      if(newItems.length > 0) {
        setImportData(newItems);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (importData) {
      setItems(importData);
      setImportData(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative">
      <MModal 
        isOpen={showResetConfirm} 
        title="Aviso Crítico" 
        message="Deseja realmente apagar TODOS os itens da sua biblioteca? Esta ação não tem volta." 
        onConfirm={() => { setItems([]); setShowResetConfirm(false); }} 
        onCancel={() => setShowResetConfirm(false)} 
        darkMode={darkMode} 
        confirmText="Apagar Tudo"
      />
      <MModal 
        isOpen={!!importData} 
        title="Importar CSV" 
        message={`Foram encontrados ${importData ? importData.length : 0} itens no arquivo. Deseja substituir a coleção atual por eles?`} 
        onConfirm={confirmImport} 
        onCancel={() => setImportData(null)} 
        darkMode={darkMode} 
        confirmText="Substituir Coleção"
      />

      <MContainer darkMode={darkMode} className="p-4 mb-4 flex justify-between items-center" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className="text-xs font-bold uppercase tracking-widest">Aparência</div>
        <MButton darkMode={darkMode} onClick={() => setDarkMode(!darkMode)} variant="black" className="px-4 py-2">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {darkMode ? 'Modo Claro' : 'Modo Escuro'}
        </MButton>
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4 mb-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[3px] pb-2 flex items-center gap-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>
          <Library className="w-4 h-4" /> Integrações
        </div>
        <MInput darkMode={darkMode} label="Google Gemini API Key (Scan IA)" type="password" value={settings.geminiApiKey} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} />
        <MInput darkMode={darkMode} label="Google Sheets Webhook URL" value={settings.googleSheetsUrl} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} />
        {settings.googleSheetsUrl && (
          <a href={settings.googleSheetsUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
            <MButton darkMode={darkMode} variant="blue" className="w-full text-[10px]"><ExternalLink className="w-4 h-4" /> Abrir Planilha Online</MButton>
          </a>
        )}
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4 mb-4" colorClass={darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[3px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>
          Backup Local (.CSV)
        </div>
        <div className="flex gap-2">
          <MButton darkMode={darkMode} onClick={handleExportCSV} variant="white" className={`flex-1 text-[10px] ${darkMode?'text-white bg-gray-800 border-gray-500':'text-black'}`}>
            <Download className="w-4 h-4" /> Exportar
          </MButton>
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-bold uppercase tracking-wider border-[3px] cursor-pointer active:scale-95 transition-transform ${darkMode?'border-gray-500 bg-gray-800 text-white':'border-black bg-white text-black'}`}>
            <Upload className="w-4 h-4" /> Importar
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
        </div>
      </MContainer>

      <MButton darkMode={darkMode} onClick={() => setShowResetConfirm(true)} variant="red" className="w-full">
          Resetar / Apagar Tudo
      </MButton>
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
      setAddMode('manual'); 
      setActiveTab('add');
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

  // Cálculos do Cabeçalho Global (Discreto)
  const totalItems = items.length;
  const validRatings = items.filter(i => i.rating > 0);
  const avgRating = validRatings.length > 0 ? (validRatings.reduce((acc, i) => acc + i.rating, 0) / validRatings.length) : 0;
  const totalPages = items.filter(i => ['Livro', 'Quadrinho'].includes(i.type)).reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const totalHours = items.filter(i => !['Livro', 'Quadrinho'].includes(i.type)).reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);

  if (!isLoaded) return null; 

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#121212] text-[#E0E0E0]' : 'bg-white text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <div className={`max-w-md mx-auto h-screen relative flex flex-col border-x-[4px] shadow-2xl overflow-hidden ${darkMode ? 'border-gray-500 bg-[#1a1a1a]' : 'border-black bg-gray-50'}`}>
        
        {/* CABEÇALHO COM ESTATÍSTICAS REVISADAS */}
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
          {activeTab === 'library' && <LibraryTab items={items} setItems={setItems} darkMode={darkMode} />}
          {activeTab === 'add' && <AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} />}
          {activeTab === 'dashboard' && <DashboardTab items={items} darkMode={darkMode} />}
          {activeTab === 'settings' && <SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} />}
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
