   const axios = require('axios');
   const cheerio = require('cheerio');

   const API_TOKEN = process.env.PETROS_API_TOKEN;
   const EDGE_URL = 'https://gfeqhiqqmbyadskyvnqo.supabase.co/functions/v1/precodahora-scraper-receiver';

   const cidades = [
     { nome: 'Eunápolis', lat: -15.7942, lng: -39.6087 },
     { nome: 'Itabela', lat: -15.1667, lng: -39.2833 },
     { nome: 'Feira de Santana', lat: -12.2667, lng: -39.2667 },
     { nome: 'Salvador', lat: -12.9714, lng: -38.5124 }
   ];

   const combustiveis = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel S10', 'Diesel S500'];

   async function scrapePrecoDaHora() {
     console.log('[Scraper] ========== INICIANDO SCRAPE ==========');
     const precos = [];
     for (const cidade of cidades) {
       const urlC = cidade.nome.toLowerCase().replace(/ /g, '-');
       try {
         const { data } = await axios.get(`https://precodahora.com.br/ba/${urlC}`, { timeout: 10000 });
         const $ = cheerio.load(data);
         for (const combustivel of combustiveis) {
           const sel = `[data-combustivel="${combustivel.toLowerCase().replace(/ /g, '-')}"] .preco, .preco-${combustivel.toLowerCase().replace(/ /g, '-')} , [title*="${combustivel}"] .preco`;
           const el = $(sel);
           if (el.length) {
             let precoText = el.first().text().trim().replace('R$', '').replace(/[^\d.,]/g, '');
             precoText = precoText.replace(',', '.');
             const preco = parseFloat(precoText);
             if (!isNaN(preco) && preco > 0 && preco &lt; 20) {
               precos.push({ cidade: cidade.nome, combustivel, preco, source_date: new Date().toISOString(), source: 'precodahora-scraper' });
             }
           }
         }
         console.log(`[Scraper] ${cidade.nome}: ${precos.filter(p => p.cidade === cidade.nome).length} preços`);
       } catch (e) {
         console.log(`[Scraper] Erro ${cidade.nome}:`, e.message);
       }
     }
     console.log(`[Scraper] Total scraped ${precos.length} preços`);
     if (precos.length > 0) {
       const res = await axios.post(EDGE_URL, { precos }, {
         headers: { 'X-API-Key': API_TOKEN, 'Content-Type': 'application/json' },
         timeout: 10000
       });
       console.log('[Scraper] ✅ Dados enviados! Status:', res.status);
     } else {
       console.log('[Scraper] ❌ Nenhum preço scraped');
     }
   }

   scrapePrecoDaHora().catch(console.error);
