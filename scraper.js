const axios = require('axios');
const puppeteer = require('puppeteer');

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
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const precos = [];
  for (const cidade of cidades) {
    const urlC = cidade.nome.toLowerCase().replace(/ /g, '-');
    await page.goto(`https://precodahora.com.br/ba/${urlC}`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    for (const combustivel of combustiveis) {
      try {
        const preco = await page.evaluate((comb, urlC) => {
          const selectors = [
            `[data-combustivel="${comb.toLowerCase().replace(/ /g, '-')}"] .preco`,
            `.preco-${comb.toLowerCase().replace(/ /g, '-')}`,
            `[title="${comb}"] .preco`
          ];
          for (let sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return parseFloat(el.textContent.replace('R$', '').replace(/[^\d.]/g, '').replace(',', '.'));
          }
          return null;
        }, combustivel, urlC);
        if (preco && preco > 0) {
          precos.push({ cidade: cidade.nome, combustivel, preco, source_date: new Date().toISOString(), source: 'precodahora-scraper' });
        }
      } catch (e) {
        console.log(`[Scraper] Erro ${combustivel} ${cidade.nome}:`, e.message);
      }
    }
  }
  await browser.close();

  console.log(`[Scraper] Scraped ${precos.length} preços`);
  if (precos.length > 0) {
    const res = await axios.post(EDGE_URL, { precos }, {
      headers: { 'X-API-Key': API_TOKEN, 'Content-Type': 'application/json' }
    });
    console.log('[Scraper] ✅ Dados enviados! Status:', res.status);
  } else {
    console.log('[Scraper] ❌ Nenhum preço scraped - verifique site');
  }
}

scrapePrecoDaHora().catch(console.error);
