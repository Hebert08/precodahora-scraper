
const axios = require('axios');

const API_TOKEN = process.env.PETROS_API_TOKEN;
const EDGE_URL = 'https://gfeqhiqqmbyadskyvnqo.supabase.co/functions/v1/precodahora-scraper-receiver';

const combustiveis = [
  'gasolina aditivada',
  'etanol',
  'diesel s10',
  'diesel s500'
];


// Coordenadas aproximadas do centro de Eunápolis e Itabela
const cidades = [
  {
    nome: 'Eunápolis',
    latitude: -16.3719674,
    longitude: -39.5824893
  },
  {
    nome: 'Itabela',
    latitude: -16.5732,
    longitude: -39.5596
  }
];

async function scrapePrecoDaHora() {
  console.log('[Scraper] ========== INICIANDO SCRAPE ==========');
  const precos = [];
  for (const cidade of cidades) {
    for (const combustivel of combustiveis) {
      try {
        const payload = {
          termo: combustivel,
          latitude: cidade.latitude,
          longitude: cidade.longitude,
          raio: 15,
          pagina: 1,
          ordenar: 'preco.asc',
          horas: 72
        };
        const { data } = await axios.post(
          'https://precodahora.ba.gov.br/produtos/',
          new URLSearchParams(payload),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'x-requested-with': 'XMLHttpRequest'
            },
            timeout: 10000
          }
        );
        if (data && Array.isArray(data.resultado)) {
          for (const item of data.resultado) {
            const prod = item.produto;
            const estab = item.estabelecimento;
            precos.push({
              cidade: cidade.nome,
              combustivel: prod.descricao,
              preco: prod.precoUnitario,
              posto: estab.nomeEstabelecimento,
              endereco: `${estab.endLogradouro}, ${estab.endNumero} - ${estab.bairro}`,
              data: prod.data,
              source: 'precodahora.ba.gov.br'
            });
          }
          console.log(`[Scraper] ${cidade.nome} - ${combustivel}: ${data.resultado.length} preços`);
        } else {
          console.log(`[Scraper] ${cidade.nome} - ${combustivel}: Nenhum resultado encontrado.`);
        }
      } catch (e) {
        console.log(`[Scraper] Erro ${cidade.nome} - ${combustivel}:`, e.message);
      }
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