import React, { useState, useEffect, useRef } from 'react';

// --- CORES DO TEMA (MONDRIAN SUAVE) ---
const theme = {
  red: '#F0657D',    // Vermelho levemente rosado
  blue: '#60A5FA',   // Azul mais claro
  yellow: '#FCD34D', // Amarelo suave
};

// --- ÍCONES SVG LEVES ---
const Icons = {
  Scan: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM18 14.25v2.25M18 20.25v-2.25M15.75 18h4.5" /></svg>,
  Camera: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>,
  Book: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  Robot: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10V5H7v14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 10h.01M14 10h.01M12 14v-2" /></svg>,
  Moon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>,
  Sun: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>,
  Settings: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Star: ({ filled, className = "w-4 h-4" }) => (
    <svg className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.114.48-.393.847-.822.592l-4.73-2.825a.562.562 0 00-.586 0L6.982 20.5c-.43.255-.936-.112-.822-.592l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 00-.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
};

// --- EFEITO SONORO "CHIP" (8-BIT) ---
const playChipBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("Áudio não suportado");
  }
};

// --- COMPONENTE DE CAPA ---
const BookCover = ({ coverUrl, title, authors, className = "w-full h-48", type }) => {
  const [hasError, setHasError] = useState(false);

  if (coverUrl && !hasError) {
    return (
      <img 
        src={coverUrl} 
        alt={`Capa de ${title}`} 
        className={`${className} object-cover rounded-md border`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`${className} rounded-md border flex flex-col items-center justify-center p-2 text-center overflow-hidden`} style={{ backgroundColor: theme.blue, color: 'white' }}>
      <span className="text-[9px] font-medium leading-tight line-clamp-3 mb-1">{title || 'S/ TÍTULO'}</span>
      <span className="text-[7px] opacity-80 truncate w-full">{authors}</span>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  // CARREGAR DADOS DO LOCALSTORAGE DO TELEMÓVEL
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('meu_catalogo_livros');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('meu_catalogo_tema');
    return saved === 'dark';
  });

  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem('meu_catalogo_gemini_key') || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de Interface
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [viewState, setViewState] = useState('list'); 
  const [currentItem, setCurrentItem] = useState(null); 
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const scannerRef = useRef(null);

  // SALVAR ALTERAÇÕES NO TELEMÓVEL AUTOMATICAMENTE
  useEffect(() => {
    localStorage.setItem('meu_catalogo_livros', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('meu_catalogo_tema', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Carregar biblioteca de Scanner
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // --- CLASSES DE ESTILO (LIGHT/DARK MODE ECONOMICO) ---
  const ui = {
    bg: isDarkMode ? 'bg-[#000000]' : 'bg-[#FAFAFA]', 
    card: isDarkMode ? 'bg-[#121212] border-[#262626]' : 'bg-white border-slate-200',
    header: isDarkMode ? 'bg-[#0A0A0A] border-[#262626]' : 'bg-white border-slate-200',
    textMain: isDarkMode ? 'text-slate-300' : 'text-slate-800',
    textMuted: isDarkMode ? 'text-slate-500' : 'text-slate-500',
    input: isDarkMode ? 'bg-[#1A1A1A] border-[#333333] text-slate-200 focus:border-[#60A5FA]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#60A5FA]',
    divider: isDarkMode ? 'border-[#262626]' : 'border-slate-100'
  };

  // --- ESCANEAMENTO DE CÓDIGO DE BARRAS ---
  const startBarcodeScanner = () => {
    if (!window.Html5Qrcode) return setError("Leitor a carregar, aguarde um segundo.");
    setViewState('scanner');
    setError(null);
    
    setTimeout(async () => {
      try {
        const scanner = new window.Html5Qrcode("barcode-scanner-view");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 120 } },
          (decodedText) => {
            playChipBeep();
            stopScanner();
            fetchBookByISBN(decodedText);
          },
          () => {} 
        );
      } catch (err) {
        setError("Erro ao aceder à câmara.");
        setViewState('list');
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (e) {}
      scannerRef.current = null;
    }
    setViewState('list');
  };

  // --- BUSCA DE METADADOS (API GOOGLE BOOKS / OPEN LIBRARY) ---
  const fetchBookByISBN = async (isbn) => {
    const cleanIsbn = isbn.replace(/[-\s]/g, "");
    setIsLoading(true);
    
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      const data = await res.json();
      
      let foundItem = {
        isbn: cleanIsbn, title: '', authors: '', publisher: '', publishedDate: '',
        pageCount: '', type: 'Livro', status: 'Quero Ler', rating: 0, notes: '', coverUrl: ''
      };

      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        foundItem = {
          ...foundItem,
          title: info.title || "",
          authors: info.authors ? info.authors.join(", ") : "",
          publisher: info.publisher || "",
          publishedDate: info.publishedDate ? info.publishedDate.substring(0, 4) : "",
          pageCount: info.pageCount || "",
          coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
        };
        
        const publisherLower = (info.publisher || "").toLowerCase();
        if (publisherLower.includes('jbc') || publisherLower.includes('conrad') || publisherLower.includes('panini') || publisherLower.includes('l&pm') || publisherLower.includes('quadrinhos')) {
          foundItem.type = 'Quadrinho/Mangá';
        }
      } else {
        const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
        const olData = await olRes.json();
        const bookKey = `ISBN:${cleanIsbn}`;
        if (olData[bookKey]) {
          const info = olData[bookKey];
          foundItem = {
            ...foundItem,
            title: info.title || "",
            authors: info.authors ? info.authors.map(a => a.name).join(", ") : "",
            publisher: info.publishers ? info.publishers.map(p => p.name).join(", ") : "",
            publishedDate: info.publish_date ? info.publish_date.slice(-4) : "",
            pageCount: info.number_of_pages || "",
            coverUrl: info.cover?.medium || ""
          };
        } else {
          setError(`ISBN ${cleanIsbn} não encontrado. Preencha os dados manualmente.`);
        }
      }
      
      setCurrentItem(foundItem);
      setViewState('form');
    } catch (err) {
      setError("Erro de rede ao buscar informações.");
      setCurrentItem({ isbn: cleanIsbn, title: '', authors: '', publisher: '', publishedDate: '', pageCount: '', type: 'Livro', status: 'Quero Ler', rating: 0, notes: '' });
      setViewState('form');
    } finally {
      setIsLoading(false);
    }
  };

  // --- LEITURA DE FICHA CATALOGRÁFICA COM IA ---
  const handleFichaAI = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!geminiKey) {
      setError("Por favor, configure a sua Chave API do Gemini nas Configurações (roda dentada no topo) primeiro.");
      return;
    }

    setIsProcessingAI(true);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        
        const promptText = `Extraia os dados bibliográficos desta imagem de ficha catalográfica. Retorne APENAS um objeto JSON válido com as seguintes chaves exatas (se não achar a informação, deixe a string vazia): "title" (título principal da obra), "authors" (autores separados por vírgula), "publisher" (editora), "publishedDate" (ano de publicação), "pageCount" (número de páginas - apenas dígitos), "isbn" (código ISBN contendo apenas números e traços). Não use formatação markdown no retorno.`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: file.type, data: base64Data } }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!response.ok) throw new Error("Chave API inválida ou falha na comunicação com a IA.");
        const result = await response.json();
        
        let textResult = result?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const data = JSON.parse(textResult);
        playChipBeep(); 
        
        setCurrentItem(prev => ({
          ...prev,
          title: data.title || prev?.title || "",
          authors: data.authors || prev?.authors || "",
          publisher: data.publisher || prev?.publisher || "",
          publishedDate: data.publishedDate || prev?.publishedDate || "",
          pageCount: data.pageCount || prev?.pageCount || "",
          isbn: data.isbn || prev?.isbn || ""
        }));

      } catch (err) {
        console.error(err);
        setError("Erro na leitura da ficha. Verifique se a sua chave API está correta nas Configurações.");
      } finally {
        setIsProcessingAI(false);
        e.target.value = null;
      }
    };
  };

  // --- SALVAR E DELETAR (LOCALSTORAGE) ---
  const saveItem = () => {
    if (!currentItem.title || !currentItem.authors) {
      setError("Título e Autores são obrigatórios.");
      return;
    }
    
    const isNew = !currentItem.id;
    const payload = { ...currentItem, addedAt: currentItem.addedAt || new Date().toISOString() };
    
    if (isNew) {
      payload.id = `item_${Date.now()}`;
      setItems(prev => [payload, ...prev]);
    } else {
      setItems(prev => prev.map(i => i.id === currentItem.id ? payload : i));
    }
    
    setViewState('list');
    setCurrentItem(null);
    setError(null);
  };

  const deleteItem = (id) => {
    if(!window.confirm("Deseja realmente excluir este item do catálogo?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    setViewState('list');
  };

  // --- EXPORTAR E IMPORTAR CSV ---
  const exportCSV = () => {
    if (items.length === 0) return setError("Catálogo vazio.");
    const headers = ["ISBN", "Título", "Autores", "Editora", "Ano", "Páginas", "Tipo", "Status", "Nota", "Anotações", "Cadastrado Em"];
    const escape = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
    const rows = items.map(i => [
      escape(i.isbn), escape(i.title), escape(i.authors), escape(i.publisher), escape(i.publishedDate), 
      escape(i.pageCount), escape(i.type), escape(i.status), i.rating || "", escape(i.notes), 
      i.addedAt ? new Date(i.addedAt).toLocaleDateString('pt-BR') : ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `Catalogo_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const rows = text.split('\n').map(row => {
        const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        return matches ? matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"')) : [];
      }).filter(r => r.length > 1);
      
      const newItems = [];
      for(let i = 1; i < rows.length; i++) {
        const val = rows[i];
        if(!val[1]) continue;
        newItems.push({
          id: `import_${Date.now()}_${i}`,
          isbn: val[0] || "", title: val[1] || "", authors: val[2] || "", publisher: val[3] || "",
          publishedDate: val[4] || "", pageCount: val[5] || "", type: val[6] || "Livro",
          status: val[7] || "Quero Ler", rating: parseInt(val[8]) || 0, notes: val[9] || "",
          addedAt: new Date().toISOString()
        });
      }
      setItems(prev => [...newItems, ...prev]);
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const saveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('meu_catalogo_gemini_key', geminiKey);
    setShowSettings(false);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || item.authors?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- CÁLCULO DE ESTATÍSTICAS ---
  const totalPagesAdded = items.reduce((acc, item) => acc + (parseInt(item.pageCount) || 0), 0);
  const totalPagesRead = items.reduce((acc, item) => item.status === 'Lido' ? acc + (parseInt(item.pageCount) || 0) : acc, 0);
  const ratedItems = items.filter(item => item.rating > 0);
  const avgRating = ratedItems.length > 0 ? (ratedItems.reduce((acc, item) => acc + item.rating, 0) / ratedItems.length).toFixed(1) : '-';

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-200 ${ui.bg} ${ui.textMain}`}>
      
      {/* --- HEADER --- */}
      <header className={`sticky top-0 z-30 border-b px-4 py-3 shadow-sm flex items-center justify-between transition-colors duration-200 ${ui.header}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 overflow-hidden">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setViewState('list')}>
            <div className="w-6 h-6 rounded-sm flex items-center justify-center text-white" style={{ backgroundColor: theme.red }}>
              <Icons.Book />
            </div>
            <h1 className={`text-sm font-semibold tracking-tight whitespace-nowrap ${ui.textMain}`}>Meu Catálogo</h1>
          </div>
          
          <div className={`flex items-center gap-3 text-[9px] sm:text-[10px] sm:border-l sm:pl-4 ${ui.divider} ${ui.textMuted} overflow-x-auto scrollbar-hide`}>
            <div className="flex items-center gap-1 whitespace-nowrap"><span className={`font-bold ${ui.textMain}`}>{items.length}</span> obras</div>
            <div className="flex items-center gap-1 whitespace-nowrap"><span className={`font-bold ${ui.textMain}`}>{totalPagesAdded}</span> págs</div>
            <div className="flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-emerald-500">{totalPagesRead}</span> lidas</div>
            <div className="flex items-center gap-0.5 whitespace-nowrap" style={{ color: theme.yellow }}>
              <Icons.Star filled={true} className="w-3 h-3" />
              <span className={`font-bold ${ui.textMain}`}>{avgRating}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 sm:gap-4 items-center shrink-0 pl-2">
          <button onClick={() => setShowSettings(true)} className={`p-1.5 rounded-full hover:bg-slate-500/10 transition-colors ${ui.textMuted}`} title="Configurações">
            <Icons.Settings />
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-1.5 rounded-full hover:bg-slate-500/10 transition-colors ${ui.textMuted}`} title="Alternar Modo Escuro">
            {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
          </button>
        </div>
      </header>

      {/* --- ERRO --- */}
      {error && (
        <div className="m-4 p-3 rounded-md text-xs bg-red-950/20 text-red-500 border border-red-500/30 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold p-1">✕</button>
        </div>
      )}

      {/* --- MODAL CONFIGURAÇÕES --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm border rounded-xl p-5 shadow-lg ${ui.card}`}>
            <h2 className={`font-semibold text-sm mb-3 ${ui.textMain}`}>Configurações</h2>
            <form onSubmit={saveSettings}>
              <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Chave API do Google Gemini (Gratuita)</label>
              <input 
                type="text" 
                value={geminiKey} 
                onChange={e => setGeminiKey(e.target.value)} 
                placeholder="AIzaSy..."
                className={`w-full p-2 border rounded outline-none text-xs mb-2 ${ui.input}`} 
              />
              <p className={`text-[9px] mb-4 ${ui.textMuted}`}>
                Necessária para que a Leitura de Fichas com IA funcione. Crie uma gratuitamente em <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 underline">aistudio.google.com</a>. Fica guardada apenas no seu telemóvel.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSettings(false)} className={`flex-1 py-2 rounded text-xs font-medium border ${isDarkMode ? 'border-[#333] text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded text-xs font-medium text-white" style={{backgroundColor: theme.blue}}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-3xl mx-auto p-4">
        
        {/* VIEW: LISTA */}
        {viewState === 'list' && (
          <div className="space-y-4 text-sm animate-in fade-in">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-2.5 ${ui.textMuted}`}><Icons.Search /></span>
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 border rounded-lg text-xs outline-none transition-all ${ui.input}`}
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`w-28 border rounded-lg text-[10px] px-2 outline-none ${ui.input}`}>
                <option value="Todos">Todos</option>
                <option value="Quero Ler">Quero Ler</option>
                <option value="Lendo">Lendo</option>
                <option value="Lido">Lido</option>
              </select>
            </div>

            {filteredItems.length === 0 ? (
              <div className={`text-center py-12 px-4 ${ui.textMuted}`}>
                <p className="text-xs mb-2">Seu acervo está vazio ou não encontrado.</p>
                <p className="text-[11px] opacity-70">Use os botões abaixo para escanear ou adicionar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => { setCurrentItem(item); setViewState('details'); }}
                    className={`border rounded-lg p-2.5 cursor-pointer transition-all flex flex-col h-full relative ${ui.card} hover:border-[${theme.blue}]`}
                  >
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      {item.type === 'Quadrinho/Mangá' && <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: theme.yellow }} title="Quadrinho/Mangá"></span>}
                    </div>
                    
                    <BookCover coverUrl={item.coverUrl} title={item.title} authors={item.authors} className={`w-full aspect-[2/3] mb-2 ${ui.divider}`} />
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className={`text-xs font-semibold leading-snug line-clamp-2 ${ui.textMain}`}>{item.title}</h3>
                        <p className={`text-[10px] line-clamp-1 mt-0.5 ${ui.textMuted}`}>{item.authors}</p>
                      </div>
                      <div className={`mt-2 pt-2 border-t flex justify-between items-center text-[10px] ${ui.divider}`}>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.status === 'Lido' ? 'bg-green-500/10 text-green-600' : item.status === 'Lendo' ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-500'}`}>
                          {item.status}
                        </span>
                        {item.rating > 0 && (
                          <div className="flex gap-0.5" style={{ color: theme.yellow }}>
                            <Icons.Star filled={true} className="w-2.5 h-2.5" />
                            <span className="font-medium text-[9px]">{item.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: FORMULÁRIO (MANUAL & EDIÇÃO) */}
        {viewState === 'form' && currentItem && (
          <div className={`border rounded-xl p-4 shadow-sm animate-in slide-in-from-bottom-2 text-xs ${ui.card}`}>
            <div className={`flex justify-between items-center mb-4 pb-2 border-b ${ui.divider}`}>
              <h2 className={`font-semibold text-sm ${ui.textMain}`}>{currentItem.id ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setViewState('list')} className={`${ui.textMuted} hover:opacity-80 font-medium`}>Cancelar</button>
            </div>

            <div className="mb-5">
              <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed cursor-pointer transition-colors" 
                     style={{ borderColor: theme.blue, backgroundColor: isDarkMode ? '#1e3a5f' : '#EFF6FF', color: isDarkMode ? '#60A5FA' : theme.blue }}>
                {isProcessingAI ? (
                  <span className="text-[11px] font-medium animate-pulse">Lendo ficha catalográfica, aguarde...</span>
                ) : (
                  <>
                    <Icons.Camera />
                    <span className="text-[11px] font-medium">Fotografar Ficha (Preenchimento IA)</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFichaAI} className="hidden" />
                  </>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Título *</label>
                  <input type="text" value={currentItem.title} onChange={e => setCurrentItem({...currentItem, title: e.target.value})} className={`w-full p-2 border rounded outline-none ${ui.input}`} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Autor(es) *</label>
                  <input type="text" value={currentItem.authors} onChange={e => setCurrentItem({...currentItem, authors: e.target.value})} className={`w-full p-2 border rounded outline-none ${ui.input}`} />
                </div>
                <div className="col-span-1">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>ISBN</label>
                  <input type="text" value={currentItem.isbn} onChange={e => setCurrentItem({...currentItem, isbn: e.target.value})} className={`w-full p-2 border rounded outline-none font-mono text-[10px] ${ui.input}`} />
                </div>
                <div className="col-span-1">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Tipo de Obra</label>
                  <select value={currentItem.type} onChange={e => setCurrentItem({...currentItem, type: e.target.value})} className={`w-full p-2 border rounded outline-none ${ui.input}`}>
                    <option value="Livro">Livro</option>
                    <option value="Quadrinho/Mangá">Quadrinho/Mangá</option>
                    <option value="Revista">Revista</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Editora</label>
                  <input type="text" value={currentItem.publisher} onChange={e => setCurrentItem({...currentItem, publisher: e.target.value})} className={`w-full p-2 border rounded outline-none ${ui.input}`} placeholder="Ex: L&PM, JBC..." />
                </div>
                <div className="col-span-1">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Ano</label>
                  <input type="number" value={currentItem.publishedDate} onChange={e => setCurrentItem({...currentItem, publishedDate: e.target.value})} className={`w-full p-2 border rounded outline-none ${ui.input}`} />
                </div>
                <div className="col-span-1">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Páginas</label>
                  <input type="number" value={currentItem.pageCount} onChange={e => setCurrentItem({...currentItem, pageCount: e.target.value})} className={`w-full p-2 border rounded outline-none ${ui.input}`} />
                </div>
                
                <div className={`col-span-2 mt-1 pt-3 border-t ${ui.divider}`}>
                  <label className={`block text-[10px] mb-1.5 ${ui.textMuted}`}>Status de Leitura</label>
                  <div className="flex gap-2">
                    {["Quero Ler", "Lendo", "Lido"].map(status => (
                      <button key={status} onClick={() => setCurrentItem({...currentItem, status})} className={`flex-1 py-1.5 rounded border text-[10px] font-medium transition-colors ${currentItem.status === status ? 'bg-slate-800 text-white border-slate-800' : `${isDarkMode ? 'bg-[#1A1A1A] border-[#333333] text-slate-300' : 'bg-white text-slate-600 border-slate-200'}`}`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className={`block text-[10px] mb-1.5 ${ui.textMuted}`}>Avaliação</label>
                  <div className="flex gap-1.5 items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setCurrentItem({...currentItem, rating: star === currentItem.rating ? 0 : star})} className="transition-transform active:scale-90 p-1 -m-1" style={{ color: currentItem.rating >= star ? theme.yellow : (isDarkMode ? '#333333' : '#E2E8F0') }}>
                        <Icons.Star filled={currentItem.rating >= star} className="w-6 h-6" />
                      </button>
                    ))}
                    {currentItem.rating > 0 && <span className={`text-[9px] ml-2 opacity-60 ${ui.textMuted}`}>({currentItem.rating}/5)</span>}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <label className={`block text-[10px] mb-1 ${ui.textMuted}`}>Anotações</label>
                  <textarea value={currentItem.notes} onChange={e => setCurrentItem({...currentItem, notes: e.target.value})} className={`w-full p-2 border rounded outline-none h-20 resize-none text-[11px] ${ui.input}`} />
                </div>
              </div>
              
              <div className="pt-4 mt-2">
                <button onClick={saveItem} className="w-full py-2.5 rounded text-white font-medium text-xs transition-opacity" style={{ backgroundColor: theme.red }}>
                  Salvar no Catálogo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: DETALHES DO LIVRO */}
        {viewState === 'details' && currentItem && (
          <div className={`border rounded-xl p-5 shadow-sm animate-in slide-in-from-right-2 text-xs ${ui.card}`}>
            <div className="flex justify-between items-start mb-4">
              <button onClick={() => setViewState('list')} className={`${ui.textMuted} hover:opacity-80`}>← Voltar</button>
              <div className="flex gap-3">
                <button onClick={() => setViewState('form')} className={`${ui.textMuted} hover:text-blue-500 font-medium`}>Editar</button>
                <button onClick={() => deleteItem(currentItem.id)} className="text-red-400 hover:text-red-500 font-medium">Excluir</button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <BookCover coverUrl={currentItem.coverUrl} title={currentItem.title} authors={currentItem.authors} className={`w-full h-36 ${ui.divider}`} />
              </div>
              <div className="flex-1">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{currentItem.type}</span>
                <h2 className={`text-base font-semibold mt-1 leading-tight ${ui.textMain}`}>{currentItem.title}</h2>
                <p className={`mt-1 ${ui.textMuted}`}>{currentItem.authors}</p>
                <div className={`mt-2 text-[10px] space-y-0.5 ${ui.textMuted}`}>
                  <p>Editora: <span className={ui.textMain}>{currentItem.publisher || '--'}</span></p>
                  <p>Ano: <span className={ui.textMain}>{currentItem.publishedDate || '--'}</span> | Págs: <span className={ui.textMain}>{currentItem.pageCount || '--'}</span></p>
                  <p>ISBN: <span className={`font-mono ${ui.textMain}`}>{currentItem.isbn || '--'}</span></p>
                </div>
              </div>
            </div>

            <div className={`mt-5 pt-4 border-t grid grid-cols-2 gap-4 ${ui.divider}`}>
               <div>
                 <p className={`text-[10px] mb-0.5 ${ui.textMuted}`}>Status</p>
                 <p className={`font-medium ${ui.textMain}`}>{currentItem.status}</p>
               </div>
               <div>
                 <p className={`text-[10px] mb-0.5 ${ui.textMuted}`}>Avaliação</p>
                 <div className="flex gap-0.5 mt-0.5">
                   {[1, 2, 3, 4, 5].map(star => (
                     <Icons.Star key={star} filled={currentItem.rating >= star} className="w-4 h-4" style={{ color: currentItem.rating >= star ? theme.yellow : (isDarkMode ? '#333333' : '#E2E8F0') }} />
                   ))}
                 </div>
               </div>
            </div>

            {currentItem.notes && (
              <div className={`mt-4 p-3 rounded-md text-[11px] leading-relaxed border ${isDarkMode ? 'bg-[#1A1A1A] border-[#333333] text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                {currentItem.notes}
              </div>
            )}
          </div>
        )}

        {/* VIEW: SCANNER CAMERA */}
        {viewState === 'scanner' && (
          <div className="bg-black rounded-xl overflow-hidden animate-in zoom-in-95 h-[60vh] flex flex-col relative">
            <div className="p-3 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
              <span className="text-white text-xs font-medium tracking-wide">Escanear Código de Barras</span>
              <button onClick={stopScanner} className="text-white/80 hover:text-white text-xs px-2 py-1 bg-white/20 rounded">Cancelar</button>
            </div>
            <div id="barcode-scanner-view" className="flex-1 w-full bg-black"></div>
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
          </div>
        )}

      </main>

      {/* --- BOTÃO DE EXPORTAÇÃO/IMPORTAÇÃO DISCRETO NO RODAPÉ --- */}
      {viewState === 'list' && (
        <div className="fixed bottom-3 left-0 right-0 text-center pointer-events-none z-10 flex justify-center gap-4">
          <label className={`text-[9px] cursor-pointer pointer-events-auto transition-colors ${isDarkMode ? 'text-[#333333] hover:text-[#555555]' : 'text-slate-300 hover:text-slate-500'}`}>
            importar backup .csv
            <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
          </label>
          <span className={`text-[9px] cursor-pointer pointer-events-auto transition-colors ${isDarkMode ? 'text-[#333333] hover:text-[#555555]' : 'text-slate-300 hover:text-slate-500'}`} onClick={exportCSV}>
            exportar backup .csv
          </span>
        </div>
      )}

      {/* --- BOTÕES FLUTUANTES PRINCIPAIS (BOTTOM RIGHT) --- */}
      {viewState === 'list' && (
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-20">
          <button 
            onClick={() => {
              setCurrentItem({ title: '', authors: '', publisher: '', publishedDate: '', pageCount: '', isbn: '', type: 'Livro', status: 'Quero Ler', rating: 0, notes: '' });
              setViewState('form');
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full shadow-sm text-white transition-transform active:scale-95"
            style={{ backgroundColor: theme.blue }}
            title="Adicionar Manualmente"
          >
            <Icons.Plus />
          </button>
          
          <button 
            onClick={startBarcodeScanner}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-full shadow-md text-white transition-transform active:scale-95"
            style={{ backgroundColor: theme.red }}
          >
            <Icons.Scan />
            <span className="text-xs font-medium tracking-wide">Escanear</span>
          </button>
        </div>
      )}

    </div>
  );
}