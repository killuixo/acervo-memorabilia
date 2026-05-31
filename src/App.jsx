import React, { useState, useEffect, useRef, useMemo } from 'react';

// ==========================================
// 1. ÍCONES NATIVOS (Zero Dependências)
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

// ==========================================
// 2. DADOS E PLANO DE CLASSIFICAÇÃO
// ==========================================
const CATEGORIES = {
  'Livros': ['Livro', 'Quadrinho', 'Revista'],
  'Discos': ['CD', 'Vinil', 'Fita Cassete'],
  'Vídeo': ['VHS', 'DVD'],
  'Games': ['Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4']
};
const ALL_TYPES = Object.values(CATEGORIES).flat();

const CLASS_CODES = {
  'Livro': '562.1', 'Quadrinho': '562.2', 'Revista': '562.3', 'CD': '515.1', 'Vinil': '515.2', 'Fita Cassete': '515.3',
  'VHS': '544.1', 'DVD': '544.2', 'Mega Drive': '520', 'SNES': '520', 'Wii': '520', 'PS1': '520', 'PS2': '520', 'PS4': '520'
};

const STATUS_OPTIONS = ['Não Iniciado', 'Na Fila', 'Em Andamento', 'Concluído'];

const getMondrianColor = (index, darkMode) => {
  // Paleta Estrita Mondrian: Branco, Preto, Rosa (Vermelho), Azul Claro, Amarelo.
  const colorsLight = ['bg-rose-400', 'bg-sky-400', 'bg-yellow-400', 'bg-white'];
  const colorsDark = ['bg-rose-800', 'bg-sky-800', 'bg-yellow-600', 'bg-gray-800'];
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
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(1046.50, now);
      gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      oscillator.start(now); oscillator.stop(now + 0.15);
    } else if (type === 'error') {
      oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(300, now); oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscillator.start(now); oscillator.stop(now + 0.2);
    } else if (type === 'save') {
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(523.25, now); oscillator.frequency.setValueAtTime(783.99, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now); oscillator.stop(now + 0.25);
    }
  } catch (e) {}
};

// ==========================================
// 4. HELPERS DE IMAGEM (RESIZER PARA API)
// ==========================================
// Reduz o tamanho da imagem antes de enviar à API do Google, evita lentidão e erros de payload.
const resizeImageForAPI = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const MAX_DIMENSION = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Retorna Base64 compactado
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// ==========================================
// 5. COMPONENTES UI MONDRIAN
// ==========================================
const MContainer = ({ children, className = '', colorClass = '', darkMode }) => (
  <div className={`border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${colorClass} ${className} transition-colors duration-300`}>{children}</div>
);

const MButton = ({ onClick, children, className = '', variant = 'primary', icon, darkMode, disabled = false }) => {
  let bgClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black';
  if (variant === 'red') bgClass = darkMode ? 'bg-rose-800 text-white' : 'bg-rose-400 text-black';
  if (variant === 'blue') bgClass = darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black';
  if (variant === 'yellow') bgClass = darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black';
  if (variant === 'black') bgClass = darkMode ? 'bg-gray-200 text-black' : 'bg-black text-white';

  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 p-3 font-sans text-xs font-black uppercase tracking-widest border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${disabled ? 'opacity-50 shadow-none translate-y-1 translate-x-1' : 'active:shadow-none active:translate-y-1 active:translate-x-1'} transition-all ${bgClass} ${className}`}>
      {icon && icon} {children}
    </button>
  );
};

const MInput = ({ label, value, onChange, type = "text", placeholder = "", multiline = false, darkMode }) => (
  <div className="flex flex-col mb-3 w-full">
    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>{label}</label>
    {multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-sm font-bold outline-none focus:bg-yellow-100 dark:focus:bg-yellow-900 transition-colors min-h-[80px] resize-none`} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-2 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-sm font-bold outline-none focus:bg-sky-100 dark:focus:bg-sky-900 transition-colors`} />
    )}
  </div>
);

const MModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Cancelar", darkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
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
      const titleSearch = (item.title || '').toLowerCase();
      const authorSearch = (item.author_developer || '').toLowerCase();
      const query = search.toLowerCase();
      const matchesSearch = titleSearch.includes(query) || authorSearch.includes(query);
      
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
    const apiKey = settings.geminiApiKey || ""; // Utiliza a chave salva, se houver
    if (!apiKey) {
      setWikiError("Chave de API ausente (Vá em Ajustes).");
      playChipBeep('error');
      return;
    }
    setLoadingWiki(true);
    setWikiError('');
    try {
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: `Aja como um historiador, crítico e arquivista especialista. Escreva um parágrafo fascinante e direto (máximo 4 linhas) com curiosidades ou contexto sobre a obra "${editedItem.title || ''}" (Autor/Estúdio: "${editedItem.author_developer || ''}"). Retorne apenas o texto sem formatação extra.` }]
        }],
        generationConfig: { responseMimeType: "text/plain" }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
      setWikiError(`Erro: ${e.message}`);
      playChipBeep('error');
    } finally {
      setLoadingWiki(false);
    }
  };

  if (selectedItem && editedItem) {
    const isBookOrGame = ['Livro', 'Quadrinho', 'Revista', 'Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4'].includes(editedItem.type);

    return (
      <div className="flex flex-col h-full pb-20 relative">
        <MModal isOpen={!!itemToDelete} title="Excluir Item" message={`Apagar "${editedItem.title || 'este item'}" da coleção?`} onConfirm={confirmDelete} onCancel={() => setItemToDelete(null)} darkMode={darkMode} confirmText="Apagar" />
        
        <MContainer darkMode={darkMode} className="p-3 mb-4 flex items-center justify-between sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className={`p-2 border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-gray-100 text-black'} active:translate-y-1 active:translate-x-1 active:shadow-none transition-all`}><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-black uppercase tracking-widest text-[10px] truncate">Detalhes</div>
          </div>
          <button onClick={saveModifications} className={`px-4 py-2 border-[4px] font-black uppercase text-[10px] tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode ? 'bg-emerald-800 border-emerald-500 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'bg-emerald-400 border-black text-black'}`}>Salvar</button>
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

          <div className="grid grid-cols-3 gap-2">
            <MInput label="Ano" value={editedItem.year || ''} onChange={e => setEditedItem({...editedItem, year: e.target.value})} type="number" darkMode={darkMode} />
            <MInput label={['Livro', 'Quadrinho', 'Revista'].includes(editedItem.type || '') ? 'Págs' : 'Horas/Min'} value={editedItem.pages_or_time || ''} onChange={e => setEditedItem({...editedItem, pages_or_time: e.target.value})} type="number" darkMode={darkMode} />
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
                    <button key={opt} onClick={() => setEditedItem({...editedItem, status: opt})} className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${editedItem.status === opt ? (darkMode ? 'bg-emerald-700 border-emerald-500 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-emerald-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-600 text-gray-400 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-white border-black text-black')}`}>
                      {opt}
                    </button>
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
                    {wikiError && <span className="text-[9px] font-bold text-red-600 block break-words whitespace-pre-wrap">{wikiError}</span>}
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
      <MContainer darkMode={darkMode} className="p-3 mb-4 flex flex-col gap-3 sticky top-0 z-10" colorClass={darkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className="relative">
          <Search className={`absolute left-3 top-3 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-black'}`} />
          <input type="text" placeholder="Buscar Título ou Autor..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className={`w-full p-2 pl-9 border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${darkMode ? 'border-gray-500 bg-gray-800 text-white shadow-[3px_3px_0px_rgba(100,100,100,0.5)]' : 'border-black bg-white text-black'} font-sans text-sm font-bold outline-none`} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Todos', ...Object.keys(CATEGORIES)].map(cat => <button key={cat} onClick={() => { setActiveCategory(cat); setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase tracking-wider font-black border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${activeCategory === cat ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-400 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{cat}</button>)}
        </div>
        {activeCategory !== 'Todos' && CATEGORIES[activeCategory]?.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => { setActiveSubtype('Todos'); setPage(0); }} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase tracking-wider font-black border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${activeSubtype === 'Todos' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>Todos</button>
            {CATEGORIES[activeCategory].map(type => <button key={type} onClick={() => { setActiveSubtype(type); setPage(0); }} className={`whitespace-nowrap px-3 py-1.5 text-[10px] uppercase tracking-wider font-black border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${darkMode ? 'border-gray-600 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'border-black'} ${activeSubtype === type ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black') : (darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black')}`}>{type}</button>)}
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
                      <div className="text-sm font-black leading-tight truncate">{item.title || 'S/ Título'}</div>
                      <div className="text-[11px] font-bold opacity-80 truncate uppercase tracking-wide mt-1">{item.author_developer || '--'}</div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className={`text-[8px] px-2 py-1 border-[3px] ${darkMode ? 'border-gray-500 bg-gray-900 text-gray-300' : 'border-black bg-yellow-400 text-black'} font-black uppercase tracking-widest`}>{item.status || '--'}</div>
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} onClick={() => updateRatingList(item.id, star)} className={`w-5 h-5 cursor-pointer ${star <= (item.rating || 0) ? (darkMode ? 'fill-yellow-500 text-yellow-500' : 'fill-black text-black') : (darkMode ? 'text-gray-600' : 'text-gray-300')}`} />)}
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

const AddTab = ({ items, setItems, settings, darkMode, addMode, setAddMode, setActiveTab, onShowToast, triggerGlobalAI, globalAiState, globalAiMessage, resetGlobalAi, scannedAIData, setScannedAIData, isHtml5QrcodeLoaded }) => {
  const [scanBox, setScanBox] = useState({ state: 'idle', message: '' }); 
  const scannerRef = useRef(null);
  const isProcessingScan = useRef(false);

  const [formData, setFormData] = useState({
    type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: ''
  });

  const updateStatus = (state, message) => setScanBox({ state, message });

  const changeMode = (newMode) => {
    setAddMode(newMode);
    if (newMode !== 'manual') { updateStatus('idle', ''); resetGlobalAi(); }
  };

  // Se receber dados do arquivo da IA principal, preenche no formulário.
  useEffect(() => {
    if (scannedAIData) {
       setFormData(prev => ({ 
        ...prev, title: scannedAIData.title || '', author_developer: scannedAIData.author_developer || '', year: scannedAIData.year?.toString() || '', publisher: scannedAIData.publisher || '', description: scannedAIData.description || '', pages_or_time: scannedAIData.pages_or_time || prev.pages_or_time, type: ALL_TYPES.includes(scannedAIData.type) ? scannedAIData.type : 'Livro'
      }));
      setScannedAIData(null); // Consome os dados
    }
  }, [scannedAIData, setScannedAIData]);

  const displayBoxState = globalAiState !== 'idle' ? globalAiState : scanBox.state;
  const displayBoxMessage = globalAiState !== 'idle' ? globalAiMessage : scanBox.message;

  // Lógica segura do Scanner de Código de Barras
  useEffect(() => {
    let isMounted = true;
    let scannerInstance = null;

    if (addMode === 'barcode' && isHtml5QrcodeLoaded) {
      if (window.Html5Qrcode) {
        scannerInstance = new window.Html5Qrcode("reader-barcode");
        scannerRef.current = scannerInstance;

        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        scannerInstance.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isProcessingScan.current) return;
            isProcessingScan.current = true;
            
            // Sucesso na leitura, paramos o scanner
            if (scannerRef.current && scannerRef.current.getState() === 2) {
               scannerRef.current.stop().then(() => {
                  if (isMounted) {
                    setAddMode('manual');
                    setFormData(prev => ({ ...prev, barcode: decodedText }));
                    fetchMultiDatabase(decodedText);
                    setTimeout(() => { isProcessingScan.current = false; }, 2000);
                  }
               }).catch(e => console.error("Erro ao pausar scanner:", e));
            }
          },
          (errorMessage) => {
            // Ignorar erros de leitura de frame vazio.
          }
        ).catch((err) => {
          if (isMounted) {
             updateStatus('error', 'Erro ao acessar a Câmera. Verifique as permissões.');
             setAddMode('manual');
          }
        });
      }
    }

    return () => {
      isMounted = false;
      if (scannerInstance) {
         try {
           const state = scannerInstance.getState();
           if (state === 2 || state === 1) { // SCANNING (2) or STARTING (1)
             scannerInstance.stop().then(() => scannerInstance.clear()).catch(() => {});
           } else {
             scannerInstance.clear();
           }
         } catch(e) {}
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

      // API 1: UPC (Bom para Discos e Games)
      if (!found && cleanCode.length >= 10 && cleanCode.length <= 13) {
        try {
          const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`); const upcData = await upcRes.json();
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

      // API 2: MusicBrainz (Áudio)
      if (!found && (!cleanCode.startsWith("978") && !cleanCode.startsWith("979"))) {
        try {
          const mbRes = await fetch(`https://musicbrainz.org/ws/2/release/?query=barcode:${cleanCode}&fmt=json`); const mbData = await mbRes.json();
          if (mbData.releases && mbData.releases.length > 0) {
            const release = mbData.releases[0];
            foundItem = { ...foundItem, title: release.title || "", author_developer: release["artist-credit"] ? release["artist-credit"].map(a => a.name).join(", ") : "", publisher: release.label ? release.label : (release["label-info"]?.length > 0 && release["label-info"][0].label ? release["label-info"][0].label.name : ""), year: release.date ? release.date.substring(0, 4) : "", type: 'CD', cover_url: `https://coverartarchive.org/release/${release.id}/front` };
            found = true;
          }
        } catch(e) { }
      }

      // API 3: Google Books (Livros e Quadrinhos)
      if (!found) {
        try {
          const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`); const gbData = await gbRes.json();
          if (gbData.items && gbData.items.length > 0) {
            const info = gbData.items[0].volumeInfo;
            foundItem = { ...foundItem, title: info.title || "", author_developer: info.authors ? info.authors.join(", ") : "", publisher: info.publisher || "", year: info.publishedDate ? info.publishedDate.substring(0, 4) : "", pages_or_time: info.pageCount?.toString() || "", cover_url: info.imageLinks?.thumbnail?.replace("http://", "https://") || "", description: info.description || "", type: 'Livro' };
            const pub = (info.publisher || "").toLowerCase(); if (pub.includes('jbc') || pub.includes('conrad') || pub.includes('panini')) foundItem.type = 'Quadrinho';
            found = true;
          }
        } catch(e) { }
      }

      // API 4: OpenLibrary (Livros Alternativa)
      if (!found) {
        try {
          const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&jscmd=data&format=json`); const olData = await olRes.json();
          if (olData[`ISBN:${cleanCode}`]) {
            const info = olData[`ISBN:${cleanCode}`];
            foundItem = { ...foundItem, title: info.title || '', author_developer: info.authors?.map(a => a.name).join(', ') || '', year: info.publish_date ? info.publish_date.substring(0, 4) : '', publisher: info.publishers?.map(p => p.name).join(', ') || '', pages_or_time: info.number_of_pages?.toString() || '', description: info.subtitle || '', cover_url: `https://covers.openlibrary.org/b/isbn/${cleanCode}-L.jpg`, type: 'Livro' };
            found = true;
          }
        } catch(e) { }
      }

      if (found) {
        playChipBeep('success'); updateStatus('success', 'Encontrado!'); setFormData(prev => ({ ...prev, ...foundItem }));
      } else {
        playChipBeep('error'); updateStatus('error', 'Não encontrado em banco online. Preencha manualmente.');
      }
    } catch (e) { 
      playChipBeep('error'); updateStatus('error', 'Não encontrado. Preencha manualmente.'); 
    }
  };

  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleSave = () => {
    if (!formData.title) { playChipBeep('error'); setShowErrorModal(true); return; }
    
    const classCode = CLASS_CODES[formData.type] || '000';
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
    const generatedCode = `LUI-${classCode}-${sequence}`;

    const newItem = { ...formData, id: Date.now().toString(), archive_code: generatedCode };
    setItems([newItem, ...items]); 
    
    if (settings.googleSheetsUrl) {
      fetch(settings.googleSheetsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) }).catch(() => {});
    }

    playChipBeep('save'); 
    onShowToast(); 
    setFormData({ type: 'Livro', title: '', author_developer: '', year: '', publisher: '', status: 'Não Iniciado', pages_or_time: '', barcode: '', description: '', cover_url: '', rating: 0, location: '', notes: '', wiki_info: '' });
    updateStatus('idle', ''); resetGlobalAi();
    setActiveTab('library');
  };

  const isBookOrGame = ['Livro', 'Quadrinho', 'Revista', 'Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4'].includes(formData.type);

  return (
    <div className="flex flex-col h-full pb-20">
      <MModal isOpen={showErrorModal} title="Atenção" message="O Título é obrigatório para salvar na biblioteca." onConfirm={() => setShowErrorModal(false)} onCancel={() => setShowErrorModal(false)} darkMode={darkMode} confirmText="OK" cancelText="Fechar" />

      <div className="flex gap-2 mb-4">
        <MButton darkMode={darkMode} variant={addMode === 'manual' ? 'blue' : 'white'} onClick={() => changeMode('manual')} className="flex-1 py-2 text-[10px]"><PlusSquare className="w-4 h-4" /> Manual</MButton>
        <MButton darkMode={darkMode} variant={addMode === 'barcode' ? 'yellow' : 'white'} onClick={() => changeMode('barcode')} className="flex-1 py-2 text-[10px]"><ScanLine className="w-4 h-4" /> Barcode</MButton>
        <MButton darkMode={darkMode} variant="red" onClick={triggerGlobalAI} className="flex-1 py-2 text-[10px]"><Camera className="w-4 h-4" /> Auto IA</MButton>
      </div>

      {displayBoxState !== 'idle' && (
        <div className={`p-4 mb-4 flex items-start gap-3 border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest transition-colors duration-300 ${displayBoxState === 'loading' ? (darkMode ? 'bg-yellow-700 border-yellow-500 text-white' : 'bg-yellow-400 border-black text-black') : displayBoxState === 'success' ? (darkMode ? 'bg-emerald-800 border-emerald-500 text-white' : 'bg-emerald-400 border-black text-black') : (darkMode ? 'bg-rose-800 border-rose-500 text-white' : 'bg-rose-400 border-black text-black')}`}>
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
              <div className="col-span-1"><MInput darkMode={darkMode} label="Págs/Tempo" type="number" value={formData.pages_or_time} onChange={e => setFormData({...formData, pages_or_time: e.target.value})} /></div>
            </div>
            <MInput darkMode={darkMode} label="URL da Capa (Opcional)" value={formData.cover_url} onChange={e => setFormData({...formData, cover_url: e.target.value})} />
            <MInput darkMode={darkMode} label="Localização Física" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Estante Sala..." />
            <MInput darkMode={darkMode} label="Descrição / Sinopse" multiline value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <MInput darkMode={darkMode} label="Fichamento e Anotações" multiline value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Suas impressões..." />

            {isBookOrGame && (
              <div className="mb-4">
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-900'}`}>Status Atual</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setFormData({...formData, status: opt})} className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-wider border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${formData.status === opt ? (darkMode ? 'bg-emerald-700 border-emerald-500 text-white shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-emerald-400 border-black text-black') : (darkMode ? 'bg-gray-900 border-gray-600 text-gray-400 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-white border-black text-black')}`}>{opt}</button>
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

const DashboardTab = ({ items, darkMode }) => {
  const totalItems = items.length;
  const byCategory = Object.keys(CATEGORIES).reduce((acc, cat) => {
    acc[cat] = items.filter(i => CATEGORIES[cat].includes(i.type || '')).length;
    return acc;
  }, {});

  const getFunStats = () => {
    if (totalItems === 0) return {};
    const validYears = items.filter(i => i.year && !isNaN(parseInt(i.year)));
    const reliquia = validYears.length > 0 ? validYears.reduce((a, b) => parseInt(a.year) < parseInt(b.year) ? a : b) : null;
    const validLengths = items.filter(i => i.pages_or_time && !isNaN(parseInt(i.pages_or_time)));
    const epico = validLengths.length > 0 ? validLengths.reduce((a, b) => parseInt(a.pages_or_time) > parseInt(b.pages_or_time) ? a : b) : null;
    const vergonha = items.filter(i => i.status === 'Não Iniciado' && ['Livro', 'Quadrinho', 'Revista', 'Mega Drive', 'SNES', 'Wii', 'PS1', 'PS2', 'PS4'].includes(i.type)).length;
    const authors = items.map(i => i.author_developer).filter(Boolean);
    const favorite = authors.length > 0 ? authors.sort((a,b) => authors.filter(v => v===a).length - authors.filter(v => v===b).length).pop() : null;
    return { reliquia, epico, vergonha, favorite };
  };
  const stats = getFunStats();

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 space-y-4">
      <div className="flex gap-4">
        <MContainer darkMode={darkMode} className="flex-1 flex flex-col items-center justify-center py-6 relative overflow-hidden" colorClass={darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400 text-black'}>
          <LibraryBig className={`absolute -left-4 -bottom-4 w-32 h-32 ${darkMode ? 'text-white opacity-10' : 'text-black opacity-10'}`} />
          <div className="text-6xl font-black z-10">{totalItems}</div>
          <div className="text-[10px] font-black uppercase tracking-widest mt-1 z-10">Total na Coleção</div>
        </MContainer>
      </div>

      <MContainer darkMode={darkMode} className="p-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Distribuição Geral</div>
        <div className="space-y-3">
          {Object.entries(byCategory).filter(([_, count]) => count > 0).map(([cat, count]) => {
            const percentage = Math.round((count / totalItems) * 100) || 0;
            return (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-16 text-[10px] font-black uppercase tracking-wider">{cat}</div>
                <div className={`flex-1 h-4 border-[3px] flex shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-gray-800 border-gray-500 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-gray-200 border-black'}`}>
                  <div className={`h-full ${darkMode ? 'bg-gray-400' : 'bg-black'} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                </div>
                <div className="w-8 text-[10px] font-black text-right">{count} un.</div>
              </div>
            );
          })}
        </div>
      </MContainer>

      {totalItems > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {stats.reliquia && (
            <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400 text-black'}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">A Relíquia<br/>(Mais Antigo)</div><Clock className="w-5 h-5 opacity-50" /></div>
              <div><div className="text-sm font-black truncate">{stats.reliquia.title}</div><div className="text-[10px] font-bold">Lançado em {stats.reliquia.year}</div></div>
            </MContainer>
          )}
          {stats.epico && (
            <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-rose-800 text-white' : 'bg-rose-400 text-black'}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">O Épico<br/>(Mais Longo)</div><Flame className="w-5 h-5 opacity-50" /></div>
              <div><div className="text-sm font-black truncate">{stats.epico.title}</div><div className="text-[10px] font-bold">{stats.epico.pages_or_time} {['Livro', 'Quadrinho', 'Revista'].includes(stats.epico.type) ? 'Páginas' : 'Horas'}</div></div>
            </MContainer>
          )}
          <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}>
            <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-black uppercase tracking-widest leading-tight">Intocados<br/>(Sem Iniciar)</div><Ghost className="w-5 h-5 opacity-50" /></div>
            <div className="flex items-end gap-1"><div className="text-4xl font-black leading-none">{stats.vergonha}</div></div>
          </MContainer>
          {stats.favorite && (
            <MContainer darkMode={darkMode} className="p-3 flex flex-col justify-between" colorClass={darkMode ? 'bg-emerald-800 text-white' : 'bg-emerald-400 text-black'}>
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
      const rows = text.split('\n').map(row => {
        const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        return matches ? matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"')) : [];
      }).filter(r => r.length > 1);

      if (rows.length < 2) return;
      const headers = rows[0].map(h => h.trim().replace(/\r$/, ''));
      const newItems = [];

      for(let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 1 && !row[0].trim()) continue; 
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

           item[key] = row[idx] ? row[idx].replace(/\r$/, '') : ''; 
        });

        if (item.id) {
          item.rating = parseInt(item.rating) || 0;
          newItems.push(item);
        } else if (item.title) {
          item.id = Date.now().toString() + i;
          item.rating = parseInt(item.rating) || 0;
          newItems.push(item);
        }
      }
      if(newItems.length > 0) setImportData(newItems);
    }; 
    reader.readAsText(file); 
    e.target.value = null;
  };

  const handleSaveSettings = () => { playChipBeep('save'); onShowToast(); };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 pr-1 relative">
      <MModal isOpen={showResetConfirm} title="Aviso Crítico" message="Deseja realmente apagar TODOS os itens da sua biblioteca? Esta ação não tem volta." onConfirm={() => { setItems([]); setShowResetConfirm(false); }} onCancel={() => setShowResetConfirm(false)} darkMode={darkMode} confirmText="Apagar Tudo" />
      <MModal isOpen={!!importData} title="Importar CSV" message={`Foram encontrados ${importData ? importData.length : 0} itens no arquivo. Substituir a coleção atual por eles?`} onConfirm={() => { if (importData) { setItems(importData); setImportData(null); } }} onCancel={() => setImportData(null)} darkMode={darkMode} confirmText="Substituir Coleção" />

      <MContainer darkMode={darkMode} className="p-4 mb-4 flex justify-between items-center" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className="text-xs font-black uppercase tracking-widest">Aparência</div>
        <MButton darkMode={darkMode} onClick={() => setDarkMode(!darkMode)} variant="black" className="px-4 py-2">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {darkMode ? 'Modo Claro' : 'Modo Escuro'}
        </MButton>
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4 mb-4" colorClass={darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 flex items-center gap-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}><Library className="w-4 h-4" /> Integrações</div>
        <MInput darkMode={darkMode} label="Google Gemini API Key (Scan IA)" type="password" value={settings.geminiApiKey} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} placeholder="AI Key para identificação via câmera..." />
        <MInput darkMode={darkMode} label="Google Sheets Webhook URL" value={settings.googleSheetsUrl} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} placeholder="https://script.google.com/..." />
        <MButton darkMode={darkMode} onClick={handleSaveSettings} variant="black" className="w-full mt-4"><Check className="w-4 h-4" /> Salvar Chaves</MButton>
        {settings.googleSheetsUrl && <a href={settings.googleSheetsUrl} target="_blank" rel="noopener noreferrer" className="block mt-2"><MButton darkMode={darkMode} variant="blue" className="w-full text-[10px]"><ExternalLink className="w-4 h-4" /> Abrir Planilha Online</MButton></a>}
      </MContainer>

      <MContainer darkMode={darkMode} className="p-4 mb-4" colorClass={darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-400 text-black'}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 border-b-[4px] pb-2 ${darkMode ? 'border-gray-500' : 'border-black'}`}>Backup Local (.CSV)</div>
        <div className="flex gap-2">
          <MButton darkMode={darkMode} onClick={handleExportCSV} variant="white" className={`flex-1 text-[10px] ${darkMode?'text-white bg-gray-800 border-gray-600':'text-black'}`}><Download className="w-4 h-4" /> Exportar</MButton>
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 font-sans text-[10px] font-black uppercase tracking-widest border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${darkMode?'border-gray-600 shadow-[4px_4px_0px_rgba(100,100,100,0.5)] bg-gray-800 text-white':'border-black bg-white text-black'} `}><Upload className="w-4 h-4" /> Importar<input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} /></label>
        </div>
      </MContainer>
      <MButton darkMode={darkMode} onClick={() => setShowResetConfirm(true)} variant="red" className="w-full">Resetar Coleção</MButton>
    </div>
  );
};

// ==========================================
// 7. COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [addMode, setAddMode] = useState('barcode');
  const [darkMode, setDarkMode] = useState(false);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ geminiApiKey: '', googleSheetsUrl: '', webhookUrl: '' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalToast, setGlobalToast] = useState(false); 
  const [isHtml5QrcodeLoaded, setIsHtml5QrcodeLoaded] = useState(false);

  const globalFileInputRef = useRef(null);

  const [aiBoxState, setAiBoxState] = useState('idle'); 
  const [aiBoxMessage, setAiBoxMessage] = useState('');
  const [scannedAIData, setScannedAIData] = useState(null);

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

  // ==============================================================
  // A MÁGICA DA IA (Gemini API com Compressão de Imagem)
  // ==============================================================
  const processGlobalAIFile = async (file) => {
    const apiKey = settings.geminiApiKey || "";
    if (!apiKey) { setAiBoxState('error'); setAiBoxMessage('Chave API ausente. Adicione-a na aba Ajustes.'); return; }
    
    setAiBoxState('loading'); setAiBoxMessage('Processando e analisando imagem...');
    
    try {
      // 1. Redimensiona a foto tirada pela Câmera para não estourar o limite de payload e acelerar o envio.
      const base64DataUrl = await resizeImageForAPI(file);
      const base64Data = base64DataUrl.split(',')[1];
      
      // 2. Envia para o Gemini
      const payload = {
        contents: [{
          parts: [
            { text: `Extraia dados desta imagem (capa de CD, vinil, livro ou ficha catalográfica).
- Se for MÚSICA (CD/Vinil): Extraia a banda (author_developer), álbum (title), gravadora (publisher) e ano (busque o símbolo ℗ ou ©).
- Se for LIVRO/HQ: Extraia título, autor, editora, ano e páginas (ex: procure por "p.").
- Se for JOGO (PS4/PS1/etc): Extraia título e estúdio/desenvolvedor.
Retorne EXATAMENTE um objeto JSON válido. Use o seguinte formato exato sem quebras extras ou marcações markdown (exemplo): {"type": "Livro", "title": "O Nome", "author_developer": "Autor", "year": "2000", "publisher": "Editora", "pages_or_time": "300", "description": "Resumo"}. As opções permitidas em "type" são: Livro, Quadrinho, Revista, CD, Vinil, Fita Cassete, VHS, DVD, Mega Drive, SNES, Wii, PS1, PS2, PS4. Caso não saiba, use "Livro". Se algo não for encontrado, use "".` },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" } // Força a IA a retornar JSON puro!
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(`Erro API: ${errData.error?.message || response.statusText}`);
      }
      
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error("A IA retornou uma resposta vazia.");
      
      // Limpeza de segurança (caso o modelo ignore o responseMimeType em versões antigas)
      let cleanedText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = cleanedText.indexOf('{');
      const end = cleanedText.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanedText = cleanedText.substring(start, end + 1);

      const parsedData = JSON.parse(cleanedText);
      
      setAiBoxState('success');
      setAiBoxMessage('Informações extraídas com IA!');
      playChipBeep('success');
      
      // Passa os dados de forma segura para o Tab
      setScannedAIData(parsedData);

    } catch (error) { 
      console.error("Erro IA:", error);
      setAiBoxState('error'); 
      setAiBoxMessage(`Falha na IA: ${error.message}`); 
      playChipBeep('error');
    }
  };

  // Carrega o Script do Scanner de Forma Segura
  useEffect(() => {
    if (window.Html5Qrcode) {
       setIsHtml5QrcodeLoaded(true);
       return;
    }
    const scriptId = 'html5-qrcode-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script'); 
      script.id = scriptId; 
      script.src = "https://unpkg.com/html5-qrcode/html5-qrcode.min.js"; 
      script.async = true;
      script.onload = () => setIsHtml5QrcodeLoaded(true);
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (globalToast) { const timer = setTimeout(() => setGlobalToast(false), 2000); return () => clearTimeout(timer); }
  }, [globalToast]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('memorabilia_theme'); if (savedTheme === 'dark') setDarkMode(true);
    const savedItems = localStorage.getItem('memorabilia_items'); if (savedItems) setItems(JSON.parse(savedItems)); else setItems([]);
    const savedSettings = localStorage.getItem('memorabilia_settings'); if (savedSettings) setSettings(JSON.parse(savedSettings));
    setIsLoaded(true);
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_items', JSON.stringify(items)); }, [items, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_settings', JSON.stringify(settings)); }, [settings, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('memorabilia_theme', darkMode ? 'dark' : 'light'); }, [darkMode, isLoaded]);

  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleAddPressStart = () => {
    initAudio(); isLongPress.current = false;
    pressTimer.current = setTimeout(() => { isLongPress.current = true; triggerGlobalAI(); }, 500); 
  };
  const handleAddPressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const handleAddClick = () => {
    initAudio(); 
    if (!isLongPress.current) { setAddMode('barcode'); setActiveTab('add'); }
  };

  const totalItems = items.length;
  const validRatings = items.filter(i => i.rating > 0);
  const avgRating = validRatings.length > 0 ? (validRatings.reduce((acc, i) => acc + i.rating, 0) / validRatings.length) : 0;
  const totalPages = items.filter(i => ['Livro', 'Quadrinho', 'Revista'].includes(i.type)).reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);
  const totalHours = items.filter(i => !['Livro', 'Quadrinho', 'Revista'].includes(i.type)).reduce((acc, i) => acc + (parseInt(i.pages_or_time) || 0), 0);

  if (!isLoaded) return null; 

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-black'} font-sans antialiased transition-colors duration-300 select-none`}>
      <div className={`max-w-md mx-auto h-screen relative flex flex-col shadow-2xl overflow-hidden ${darkMode ? 'border-x-[4px] border-gray-600 bg-gray-900' : 'border-x-[4px] border-black bg-white'}`}>
        
        {globalToast && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className={`w-14 h-14 border-[4px] border-black bg-emerald-400 text-black flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,1)]`}><Check className="w-10 h-10" /></div>
          </div>
        )}

        <header className={`flex-none p-3 border-b-[4px] z-20 flex justify-between items-center ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-black bg-white'}`}>
          <div className="flex flex-col flex-1 pr-2">
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Memorabilia</h1>
            <div className={`flex gap-2 text-[9px] font-black tracking-widest mt-1.5 uppercase ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              <span>{totalItems} <span className="opacity-60">UN</span></span><span>★ {avgRating.toFixed(1)}</span>
              <span>{totalPages} <span className="opacity-60">PÁG</span></span><span>{totalHours} <span className="opacity-60">H</span></span>
            </div>
          </div>
          <div className={`w-8 h-8 flex-shrink-0 border-[4px] shadow-[2px_2px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-rose-800 border-gray-500 shadow-[2px_2px_0px_rgba(100,100,100,0.5)]' : 'bg-rose-500 border-black'}`}></div>
        </header>

        <main className="flex-1 overflow-hidden p-3 relative z-0">
          <input type="file" accept="image/*" capture="environment" ref={globalFileInputRef} onChange={handleGlobalFileChange} className="hidden" />
          
          {activeTab === 'library' && <LibraryTab items={items} setItems={setItems} darkMode={darkMode} settings={settings} onShowToast={() => setGlobalToast(true)} />}
          
          {activeTab === 'add' && <AddTab items={items} setItems={setItems} settings={settings} darkMode={darkMode} addMode={addMode} setAddMode={setAddMode} setActiveTab={setActiveTab} onShowToast={() => setGlobalToast(true)} triggerGlobalAI={triggerGlobalAI} globalAiState={aiBoxState} globalAiMessage={aiBoxMessage} resetGlobalAi={() => { setAiBoxState('idle'); setAiBoxMessage(''); }} scannedAIData={scannedAIData} setScannedAIData={setScannedAIData} isHtml5QrcodeLoaded={isHtml5QrcodeLoaded} />}
          
          {activeTab === 'dashboard' && <DashboardTab items={items} darkMode={darkMode} />}
          {activeTab === 'settings' && <SettingsTab items={items} setItems={setItems} settings={settings} setSettings={setSettings} darkMode={darkMode} setDarkMode={setDarkMode} onShowToast={() => setGlobalToast(true)} />}
        </main>

        <nav className={`flex-none flex border-t-[4px] z-20 h-16 relative ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-black bg-white'}`}>
          <button onClick={() => { initAudio(); setActiveTab('library'); }} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'library' ? (darkMode ? 'bg-sky-800 text-white' : 'bg-sky-400') : ''}`}><Library className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase tracking-widest">Biblioteca</span></button>
          <button onTouchStart={handleAddPressStart} onTouchEnd={handleAddPressEnd} onMouseDown={handleAddPressStart} onMouseUp={handleAddPressEnd} onMouseLeave={handleAddPressEnd} onClick={handleAddClick} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'add' ? (darkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-400') : ''}`}><PlusSquare className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase tracking-widest">Adicionar</span></button>
          <button onClick={() => { initAudio(); setActiveTab('dashboard'); }} className={`flex-1 flex flex-col items-center justify-center border-r-[4px] transition-colors ${darkMode ? 'border-gray-600 text-gray-300' : 'border-black text-black'} ${activeTab === 'dashboard' ? (darkMode ? 'bg-rose-800 text-white' : 'bg-rose-400') : ''}`}><BarChart2 className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase tracking-widest">Visão</span></button>
          <button onClick={() => { initAudio(); setActiveTab('settings'); }} className={`flex-1 flex flex-col items-center justify-center transition-colors ${darkMode ? 'text-gray-300' : 'text-black'} ${activeTab === 'settings' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200') : ''}`}><Settings className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase tracking-widest">Ajustes</span></button>
        </nav>

      </div>
    </div>
  );
}
