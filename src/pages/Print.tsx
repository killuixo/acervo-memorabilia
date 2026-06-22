import React, { useState, useEffect, useMemo } from 'react';

// Ícones minimalistas (SVGs puros com traços rígidos)
const PrinterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

interface CatalogItemType {
  ID?: string;
  'Localização'?: string;
  'Título'?: string;
  'Autor/Desenvolvedor'?: string;
  'Status'?: string;
  'Nota'?: string;
  'Código Arquivístico'?: string;
  'Código de Barras'?: string;
  'Tipo'?: string;
  'Ano'?: string;
  'Editora/Gravadora'?: string;
  'Páginas/Tempo'?: string;
  'Descrição'?: string;
  'Anotações'?: string;
  'URL da Capa'?: string;
  [key: string]: any;
}

function parseCSV(str: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let col = '';
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    let nextChar = str[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        col += '"';
        i++; 
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(col);
      col = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      row.push(col);
      result.push(row);
      row = [];
      col = '';
    } else {
      col += char;
    }
  }
  if (col !== '' || row.length > 0) {
    row.push(col);
    result.push(row);
  }
  return result;
}

function getInitial(text: string): string {
  if (!text) return '#';
  const clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().charAt(0).toUpperCase();
  if (!/^[A-Z]$/.test(clean)) return '#';
  return clean;
}

function getSortKey(item: CatalogItemType): string {
  let author = (item['Autor/Desenvolvedor'] || '').trim();
  let title = (item['Título'] || '').trim();
  const authorLower = author.toLowerCase();
  
  if (!author || authorLower === 'various' || authorLower === 'vários' || authorLower === 'various artists') {
      return title;
  }
  return author;
}

function getMondrianPattern(id?: string | number) {
  const colors = ['#ff0055', '#00ccff', '#ffcc00', '#ffffff', '#ffffff'];
  let hash = 0;
  const safeId = id ? String(id) : 'default';
  for (let i = 0; i < safeId.length; i++) {
    hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const rand = () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };

  const splitX = 25 + Math.floor(rand() * 50);
  const splitY = 25 + Math.floor(rand() * 50);

  const itemColors: string[] = [];
  for (let i = 0; i < 4; i++) {
    itemColors.push(colors[Math.floor(rand() * colors.length)]);
  }

  return { splitX, splitY, itemColors };
}

const CoverImage = ({ src, id }: { src?: string; id?: string | number }) => {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  const { splitX, splitY, itemColors } = useMemo(() => getMondrianPattern(id), [id]);

  if (hasError) {
    return (
      <div 
        className="w-full aspect-square border-[2px] border-[#111] grid bg-[#111] gap-[2px] overflow-hidden"
        style={{ 
          gridTemplateColumns: `${splitX}fr ${100 - splitX}fr`,
          gridTemplateRows: `${splitY}fr ${100 - splitY}fr`
        }}
      >
        <div style={{ backgroundColor: itemColors[0] }}></div>
        <div style={{ backgroundColor: itemColors[1] }}></div>
        <div style={{ backgroundColor: itemColors[2] }}></div>
        <div style={{ backgroundColor: itemColors[3] }}></div>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt="Capa" 
      onError={() => setHasError(true)}
      className="w-full aspect-square object-cover border-[2px] border-[#111] bg-white"
    />
  );
};

const RatingStars = ({ nota }: { nota?: string }) => {
  if (nota === undefined || nota === null || nota === '') return null;
  
  const num = parseInt(nota, 10);
  if (isNaN(num)) return null;

  if (num === 0) return <span className="text-[#111] text-[10pt] font-black mt-1">☆</span>;

  if (num >= 5) {
    return (
      <span 
        className="text-[14pt] font-black leading-none drop-shadow-[1px_1px_0_#111] mt-1" 
        style={{
          background: 'linear-gradient(45deg, #ff0055, #00ccff, #ffcc00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        }}
      >
        ★
      </span>
    );
  }

  let color = "text-[#ffcc00]"; 
  if (num === 3) color = "text-[#00ccff]"; 
  if (num === 4) color = "text-[#ff0055]"; 

  return (
    <span className={`${color} font-black text-[9pt] leading-none drop-shadow-[1px_1px_0_#111] tracking-widest mt-1`}>
      {'★'.repeat(num)}
    </span>
  );
};

const CatalogItem = ({ item }: { item: CatalogItemType }) => {
  const isCD = item['Tipo'] && String(item['Tipo']).trim().toUpperCase() === 'CD';

  return (
    <div className="flex gap-4 border-b-[3px] border-[#111] pb-3 h-[175px] overflow-hidden box-border">
      <div className="w-[90px] flex-shrink-0 flex flex-col gap-2">
        <CoverImage src={item['URL da Capa']} id={item.ID} />
        <div className="text-[5.5pt] font-mono leading-tight text-[#111] break-words uppercase flex flex-col gap-[2px]">
          <div className="border-t border-[#111] pt-[2px]">
            <span className="font-black text-[#ff0055]">ID:</span> {item.ID || '-'}
          </div>
          <div className="border-t border-[#111] pt-[2px]">
            <span className="font-black text-[#00ccff]">LOC:</span> {item['Localização'] || '-'}
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 overflow-hidden">
            <h2 className="font-black text-[10pt] uppercase leading-[1.1] truncate text-[#111]">
              {item['Título'] || 'Sem Título'}
            </h2>
            <h3 className="font-bold text-[8pt] text-[#444] truncate mt-[2px]">
              {item['Autor/Desenvolvedor'] || 'Autor Desconhecido'}
            </h3>
          </div>
          
          <div className="flex flex-col items-end flex-shrink-0">
            {!isCD && item['Status'] && (
              <span className="bg-[#111] text-white text-[6pt] font-black px-1.5 py-[2px] uppercase tracking-widest whitespace-nowrap">
                {item['Status']}
              </span>
            )}
            <RatingStars nota={item['Nota']} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 font-mono text-[6.5pt] text-[#111] border-y-[2px] border-[#111] py-1.5">
          <div className="truncate"><span className="font-black">CÓD:</span> {item['Código Arquivístico'] || '-'}</div>
          <div className="truncate"><span className="font-black">EAN:</span> {item['Código de Barras'] || '-'}</div>
          <div className="truncate flex items-center gap-1">
            <span className="font-black">TIPO:</span> 
            <span className="bg-[#ffcc00] px-1 font-bold uppercase leading-[1.1] border border-[#111]">
              {item['Tipo'] || '-'}
            </span>
          </div>
          <div className="truncate"><span className="font-black">ANO:</span> {item['Ano'] || '-'}</div>
          <div className="truncate"><span className="font-black">EDITOR:</span> {item['Editora/Gravadora'] || '-'}</div>
          <div className="truncate"><span className="font-black">VOL/TMP:</span> {item['Páginas/Tempo'] || '-'}</div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col gap-[3px] mt-1.5">
          {item['Descrição'] && (
            <p className="text-[7pt] leading-[1.3] text-[#111] line-clamp-2 text-justify">
              <span className="font-black bg-[#00ccff] text-white px-1 mr-1 text-[6pt] uppercase border border-[#111]">Desc</span>
              {item['Descrição']}
            </p>
          )}
          {item['Anotações'] && (
            <p className="text-[7pt] leading-[1.3] text-[#444] line-clamp-2 text-justify italic">
              <span className="font-black bg-[#ff0055] text-white px-1 mr-1 text-[6pt] uppercase border border-[#111] not-italic">Obs</span>
              {item['Anotações']}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const CatalogPage = ({ items, pageNum, totalPages, date, userName }: { items: CatalogItemType[]; pageNum: number; totalPages: number; date: string; userName: string }) => {
  const firstItem = items[0] || {};
  const lastItem = items[items.length - 1] || {};
  const sortKeyFirst = getSortKey(firstItem) || '?';
  const sortKeyLast = getSortKey(lastItem) || '?';
  const initialA = getInitial(sortKeyFirst);
  const initialB = getInitial(sortKeyLast);
  const dictHeader = initialA === initialB ? initialA : `${initialA} — ${initialB}`;

  return (
    <div className="page-container relative bg-white mx-auto my-8 shadow-xl print:m-0 print:shadow-none box-border flex flex-col">
      <header className="flex justify-between items-end border-b-[4px] border-[#111] pb-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-[#ff0055] border-2 border-[#111]"></div>
          <span className="text-2xl font-black uppercase tracking-[0.2em] text-[#111]">{dictHeader}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-black tracking-widest text-[#111]">MEMORABILIA</span>
          <div className="w-5 h-5 bg-[#00ccff] border-2 border-[#111]"></div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1 items-start content-start">
        {items.map((item, idx) => (
          <CatalogItem key={item.ID || `item-${idx}`} item={item} />
        ))}
      </div>

      <footer className="mt-4 border-t-[4px] border-[#111] pt-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-3 bg-[#00ccff] border-2 border-[#111]"></div>
          <span className="font-bold text-[8pt] tracking-widest text-[#111]">
            MEMORABILIA — {date}{userName ? ` — ${userName.toUpperCase()}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-[8pt] tracking-widest text-[#111]">
            p. {pageNum} / {totalPages}
          </span>
          <div className="w-4 h-4 bg-[#ffcc00] border-2 border-[#111]"></div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<CatalogItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userName, setUserName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      let csvText = event.target?.result as string;
      if (!csvText) {
        setLoading(false);
        setPrintError(true);
        setTimeout(() => setPrintError(false), 4000);
        return;
      }
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
      }
      const parsed = parseCSV(csvText);
      if (parsed.length < 2) {
        setLoading(false);
        setPrintError(true);
        setTimeout(() => setPrintError(false), 4000);
        return;
      }
      const headers = parsed[0].map(h => h ? String(h).trim() : '');
      const rows = parsed.slice(1);
      let items = rows.map(row => {
        const obj: CatalogItemType = {};
        headers.forEach((header, idx) => {
          let val = row[idx] ? String(row[idx]).trim().replace(/^"|"$/g, '') : '';
          obj[header] = val;
        });
        return obj;
      }).filter(item => item['ID'] || item['Título']);

      items.sort((a, b) => {
        const valA = getSortKey(a);
        const valB = getSortKey(b);
        const cleanA = getInitial(valA);
        const cleanB = getInitial(valB);
        const isAlphaA = cleanA !== '#';
        const isAlphaB = cleanB !== '#';
        if (!isAlphaA && isAlphaB) return -1;
        if (isAlphaA && !isAlphaB) return 1;
        return valA.localeCompare(valB, 'pt-BR');
      });

      setData(items);
      setLoading(false);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      setPrintError(true);
      setTimeout(() => setPrintError(false), 5000);
    }
  };

  // --- LÓGICA DE EXPORTAÇÃO PARA BLOGGER ---
  const handleExportHTML = () => {
    // Helper para as estrelas no HTML gerado
    const getStaticRatingHTML = (nota: string | undefined) => {
      if (!nota) return '';
      const num = parseInt(nota, 10);
      if (isNaN(num)) return '';
      if (num === 0) return `<span class="text-[#111] text-[10pt] font-black mt-1">☆</span>`;
      if (num >= 5) {
        return `<span class="text-[14pt] font-black leading-none drop-shadow-[1px_1px_0_#111] mt-1" style="background: linear-gradient(45deg, #ff0055, #00ccff, #ffcc00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;">★</span>`;
      }
      let color = "text-[#ffcc00]";
      if (num === 3) color = "text-[#00ccff]";
      if (num === 4) color = "text-[#ff0055]";
      return `<span class="${color} font-black text-[9pt] leading-none drop-shadow-[1px_1px_0_#111] tracking-widest mt-1">${'★'.repeat(num)}</span>`;
    };

    // Helper para gerar o HTML de cada item
    const generateItemHTML = (item: CatalogItemType) => {
      const isCD = item['Tipo'] && String(item['Tipo']).trim().toUpperCase() === 'CD';
      const pattern = getMondrianPattern(item.ID);
      
      const fallbackHTML = `
        <div class="w-full aspect-square border-[2px] border-[#111] grid bg-[#111] gap-[2px] overflow-hidden" style="grid-template-columns: ${pattern.splitX}fr ${100 - pattern.splitX}fr; grid-template-rows: ${pattern.splitY}fr ${100 - pattern.splitY}fr;">
          <div style="background-color: ${pattern.itemColors[0]}"></div>
          <div style="background-color: ${pattern.itemColors[1]}"></div>
          <div style="background-color: ${pattern.itemColors[2]}"></div>
          <div style="background-color: ${pattern.itemColors[3]}"></div>
        </div>
      `;

      let coverHTML = fallbackHTML;
      if (item['URL da Capa']) {
        coverHTML = `
          <img src="${item['URL da Capa']}" alt="Capa" class="w-full aspect-square object-cover border-[2px] border-[#111] bg-white" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />
          <div style="display:none;">${fallbackHTML}</div>
        `;
      }

      return `
        <div class="flex gap-4 border-b-[3px] border-[#111] pb-3 h-[175px] overflow-hidden box-border bg-white page-break-inside-avoid">
          <div class="w-[90px] flex-shrink-0 flex flex-col gap-2">
            ${coverHTML}
            <div class="text-[5.5pt] font-mono leading-tight text-[#111] break-words uppercase flex flex-col gap-[2px]">
              <div class="border-t border-[#111] pt-[2px]"><span class="font-black text-[#ff0055]">ID:</span> ${item.ID || '-'}</div>
              <div class="border-t border-[#111] pt-[2px]"><span class="font-black text-[#00ccff]">LOC:</span> ${item['Localização'] || '-'}</div>
            </div>
          </div>
          <div class="flex flex-col flex-1 overflow-hidden">
            <div class="flex justify-between items-start gap-2">
              <div class="flex-1 overflow-hidden">
                <h2 class="font-black text-[10pt] uppercase leading-[1.1] truncate text-[#111]">${item['Título'] || 'Sem Título'}</h2>
                <h3 class="font-bold text-[8pt] text-[#444] truncate mt-[2px]">${item['Autor/Desenvolvedor'] || 'Autor Desconhecido'}</h3>
              </div>
              <div class="flex flex-col items-end flex-shrink-0">
                ${!isCD && item['Status'] ? `<span class="bg-[#111] text-white text-[6pt] font-black px-1.5 py-[2px] uppercase tracking-widest whitespace-nowrap">${item['Status']}</span>` : ''}
                ${getStaticRatingHTML(item['Nota'])}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 font-mono text-[6.5pt] text-[#111] border-y-[2px] border-[#111] py-1.5">
              <div class="truncate"><span class="font-black">CÓD:</span> ${item['Código Arquivístico'] || '-'}</div>
              <div class="truncate"><span class="font-black">EAN:</span> ${item['Código de Barras'] || '-'}</div>
              <div class="truncate flex items-center gap-1"><span class="font-black">TIPO:</span> <span class="bg-[#ffcc00] px-1 font-bold uppercase leading-[1.1] border border-[#111]">${item['Tipo'] || '-'}</span></div>
              <div class="truncate"><span class="font-black">ANO:</span> ${item['Ano'] || '-'}</div>
              <div class="truncate"><span class="font-black">EDITOR:</span> ${item['Editora/Gravadora'] || '-'}</div>
              <div class="truncate"><span class="font-black">VOL/TMP:</span> ${item['Páginas/Tempo'] || '-'}</div>
            </div>
            <div class="flex-1 overflow-hidden flex flex-col gap-[3px] mt-1.5">
              ${item['Descrição'] ? `<p class="text-[7pt] leading-[1.3] text-[#111] line-clamp-2 text-justify"><span class="font-black bg-[#00ccff] text-white px-1 mr-1 text-[6pt] uppercase border border-[#111]">Desc</span>${item['Descrição']}</p>` : ''}
              ${item['Anotações'] ? `<p class="text-[7pt] leading-[1.3] text-[#444] line-clamp-2 text-justify italic"><span class="font-black bg-[#ff0055] text-white px-1 mr-1 text-[6pt] uppercase border border-[#111] not-italic">Obs</span>${item['Anotações']}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    };

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo Memorabilia${userName ? ` - ${userName}` : ''}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #f4f4f4; color: #111; margin: 0; padding: 20px; }
    .catalog-wrapper { max-width: 1000px; margin: 0 auto; background: white; border: 4px solid #111; padding: 30px; box-shadow: 10px 10px 0px 0px rgba(17,17,17,1); }
    /* Ajustes específicos para evitar quebras estranhas no Blogger */
    .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="catalog-wrapper">
    <header class="flex justify-between items-end border-b-[4px] border-[#111] pb-2 mb-8">
      <div class="flex items-center gap-3">
        <div class="w-6 h-6 bg-[#ff0055] border-2 border-[#111]"></div>
        <span class="text-3xl font-black uppercase tracking-[0.2em] text-[#111]">COLEÇÃO</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xl font-black tracking-widest text-[#111]">MEMORABILIA</span>
        <div class="w-6 h-6 bg-[#00ccff] border-2 border-[#111]"></div>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-start content-start">
      ${data.map(item => generateItemHTML(item)).join('')}
    </div>

    <footer class="mt-12 border-t-[4px] border-[#111] pt-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-12 h-4 bg-[#00ccff] border-2 border-[#111]"></div>
        <span class="font-bold text-[9pt] tracking-widest text-[#111]">
          MEMORABILIA — ${new Date().toLocaleDateString('pt-BR')}${userName ? ` — ${userName.toUpperCase()}` : ''}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-bold text-[9pt] tracking-widest text-[#111]">${data.length} ITENS</span>
        <div class="w-5 h-5 bg-[#ffcc00] border-2 border-[#111]"></div>
      </div>
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memorabilia_blogger_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const ITEMS_PER_PAGE = 10;
  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < data.length; i += ITEMS_PER_PAGE) {
      chunks.push(data.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [data]);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-[#111]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body { font-family: 'Inter', system-ui, sans-serif; }
        
        .page-container {
          width: 210mm;
          height: 297mm;
          padding: 15mm;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-container {
            margin: 0;
            padding: 15mm;
            border: none;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
          }
        }
      `}} />

      {data.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-[#111] max-w-lg w-full p-10 relative shadow-[10px_10px_0px_0px_rgba(17,17,17,1)]">
            <div className="absolute top-0 right-10 w-12 h-16 bg-[#ff0055] border-x-[4px] border-b-[4px] border-[#111]"></div>
            <div className="absolute bottom-10 left-0 w-8 h-8 bg-[#ffcc00] border-y-[4px] border-r-[4px] border-[#111]"></div>
            <div className="absolute bottom-0 right-0 w-32 h-6 bg-[#00ccff] border-t-[4px] border-l-[4px] border-[#111]"></div>

            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 relative z-10">
              Memorabilia<br/>Print
            </h1>
            <p className="font-bold text-sm text-[#444] mb-10 border-b-2 border-[#111] pb-4">
              GERADOR DE CATÁLOGO FÍSICO
            </p>

            {printError && (
              <div className="mb-4 bg-[#ff0055] text-white p-3 font-bold text-xs uppercase text-center border-2 border-[#111]">
                Erro ao processar o ficheiro. Verifique se é um CSV válido.
              </div>
            )}

            <label className="block mb-6 relative z-10 cursor-pointer group">
              <span className="sr-only">Escolha o ficheiro CSV</span>
              <div className="border-[3px] border-dashed border-[#111] p-8 text-center bg-[#f9f9f9] group-hover:bg-[#ffcc00] transition-colors">
                <span className="font-black uppercase tracking-wider text-sm">
                  {loading ? 'A PROCESSAR...' : 'CARREGAR FICHEIRO .CSV'}
                </span>
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>

            <div className="text-[10px] uppercase font-bold text-[#666] tracking-widest text-center mt-8">
              Arquitetura Minimalista • Sem Dependências
            </div>
          </div>
        </div>
      ) : (
        <div className="pb-20">
          <div className="no-print sticky top-0 bg-white border-b-[4px] border-[#111] p-4 flex flex-col sm:flex-row justify-between items-center z-50 shadow-md gap-4">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 bg-[#ff0055] border-2 border-[#111]"></div>
              <div>
                <h1 className="font-black uppercase text-xl leading-none">Memorabilia</h1>
                <p className="text-[10px] font-bold text-[#666] tracking-widest">{data.length} itens detetados</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setData([])}
                className="font-bold text-xs uppercase px-4 h-9 border-[2px] border-[#111] bg-white text-[#111] hover:bg-[#ffcc00] transition-colors"
              >
                Voltar
              </button>
              
              <button 
                onClick={() => setShowTip(!showTip)}
                className="font-black text-sm w-9 h-9 flex items-center justify-center border-[2px] border-[#111] bg-white hover:bg-[#00ccff] hover:text-white transition-colors"
                title="Dica de Impressão"
              >
                ?
              </button>
              
              <div className="w-[3px] h-6 bg-[#111] hidden sm:block mx-1"></div>

              <button 
                onClick={handlePrint}
                className="w-9 h-9 flex items-center justify-center border-[2px] border-transparent hover:border-[#111] hover:bg-[#ffcc00] text-[#111] transition-all"
                title="Imprimir PDF"
              >
                <PrinterIcon />
              </button>

              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`w-9 h-9 flex items-center justify-center border-[2px] transition-all ${showSettings ? 'border-[#111] bg-[#111] text-white' : 'border-transparent hover:border-[#111] hover:bg-[#ff0055] hover:text-white text-[#111]'}`}
                title="Ajustes e Exportação"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="no-print bg-[#f9f9f9] border-b-[3px] border-[#111] p-6 shadow-inner z-40 relative">
              <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-black text-xs uppercase text-[#111]">Sua Identificação</label>
                  <input 
                    type="text" 
                    value={userName} 
                    onChange={e => setUserName(e.target.value)} 
                    placeholder="Ex: João Silva" 
                    className="border-[2px] border-[#111] px-3 py-2 bg-white outline-none focus:bg-[#ffcc00] focus:border-[#111] transition-colors text-sm font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-black text-xs uppercase text-[#111]">Atualizar Base (CSV)</label>
                  <label className="cursor-pointer border-[2px] border-dashed border-[#111] px-3 py-2 text-center bg-white hover:bg-[#00ccff] hover:bg-opacity-20 transition-colors text-sm font-bold w-full">
                    {loading ? 'A PROCESSAR...' : 'CARREGAR NOVO .CSV'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-black text-xs uppercase text-[#111]">Partilhar na Web</label>
                  <button 
                    onClick={handleExportHTML}
                    className="cursor-pointer border-[2px] border-[#111] px-3 py-2 text-center bg-[#ffcc00] hover:bg-[#111] hover:text-white transition-colors text-sm font-bold w-full uppercase"
                  >
                    Baixar HTML (Blogger)
                  </button>
                </div>
              </div>
            </div>
          )}

          {showTip && (
            <div className="no-print max-w-4xl mx-auto mt-8 bg-[#ffcc00] border-[3px] border-[#111] p-4 font-bold text-sm text-center shadow-[4px_4px_0px_0px_rgba(17,17,17,1)]">
              DICA DE IMPRESSÃO: Ao abrir a janela de impressão, certifique-se de configurar o Papel para "A4", Margens para "Nenhuma/Zero" e Escala para "100%".
            </div>
          )}
          {printError && (
            <div className="no-print max-w-4xl mx-auto mt-8 bg-[#ff0055] text-white border-[3px] border-[#111] p-4 font-bold text-sm text-center shadow-[4px_4px_0px_0px_rgba(17,17,17,1)]">
              A impressão pode estar bloqueada no navegador. Para imprimir, exporte a app para um ambiente externo (Github/Vercel) ou use o atalho nativo Ctrl+P / Cmd+P!
            </div>
          )}

          <div className="print-area flex flex-col items-center mt-8">
            {pages.map((pageItems, index) => (
              <CatalogPage 
                key={index} 
                items={pageItems} 
                pageNum={index + 1} 
                totalPages={pages.length}
                date={currentDate}
                userName={userName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
