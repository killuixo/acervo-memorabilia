# MEMORABILIA

Organizador de coleção em suportes físicos

Livro, Quadrinho, CD, Vinil, Cassete, Games (Mega Drive, SNES, Wii, PS1, PS2 e PS4)

Escrito com Gemini - Canvas.

Sistema Progressive Web App desenvolvido em React para catalogação, gestão e análise métrica de acervos físicos. 

O design implementa uma interface utilitarista inspirada no Neoplasticismo de Mondrian.

## Funcionalidades

*   **Catalogação Multiformato:** Gestão de itens em 14 categorias de suporte (Livro, Quadrinho, Revista, CD, Vinil, Fita Cassete, VHS, DVD, Mega Drive, SNES, Wii, PS1, PS2, PS4).
*   **Identificação Automatizada:** Leitor de código de barras integrado (Html5Qrcode) com requisições cross-origin para bases de dados abertas (UPCItemDB, MusicBrainz, Google Books, OpenLibrary).
*   **Motor de IA Integrado (Gemini 2.5 Flash):**
    *   Extração de metadados via OCR a partir de imagens de capas ou fichas catalográficas.
    *   Geração de resumos e contexto enciclopédico sobre as obras.
*   **Dashboard e Métricas:** Geração de gráficos de barra, linha do tempo por décadas e análise de backlog.
*   **Integração de Jogos Zerados:** Sincronização em tempo real via CSV para exibir painel de LED (Marquee) com estatísticas de tempo de jogo, custos e avaliação.
*   **Fallback de Busca Web:** Redirecionamento dinâmico automatizado (Skoob, Discogs, GameFAQs) baseado na taxonomia do item.
*   **Operação Offline-First:** Backup primário via `localStorage` com suporte a importação/exportação de arrays JSON em formato `.csv`.

## Stack Tecnológico

*   React.js
*   Tailwind CSS (Estilização estrutural e responsiva)
*   Html5Qrcode (Scanner de códigos de barra via câmera do dispositivo)
*   Web Audio API (Feedback sonoro / Chip Beeps)
*   Service Workers / Manifest (Estrutura PWA)

## Parâmetros de Integração (Configurados via UI do App)

O sistema não exige variáveis de ambiente estáticas no .env. As chaves de integração são salvas no localStorage do cliente através da aba "Ajustes":

Google Gemini API Key: Necessária para processamento de imagens e consultas enciclopédicas.

Google Sheets Webhook URL (POST): Para envio de novos registros para uma planilha na nuvem via Google Apps Script.

Google Sheets CSV URL (GET): Link de publicação na web de uma planilha estruturada para o painel de "Jogos Zerados".

Estrutura Requerida para o CSV de "Jogos Zerados"
O parser do sistema suporta busca difusa, mas recomenda-se o seguinte esquema de cabeçalhos no Google Sheets:
Nome | Console | Gênero | Tempo | Nota | Suporte | Dificuldade | Condição | Observação | Início | Fim | Preço pago | Preço sem desconto | Link
