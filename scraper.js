const fs = require('fs');
const crypto = require('crypto');
const cheerio = require('cheerio');

const CANAL_NTFY = "stock-jouets-romain";
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || ""; 
const LOG_FILE = 'logs_erreurs.json';
const TIMING_FILE = 'stats_horaires.json';

const SITES = [
  {
    nom: "SMYTHS TOYS",
    url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
    useProxy: false,
    verifier: (html) => html.includes('add-to-cart') && !html.includes('cursor-not-allowed')
  },
  {
    nom: "JOUECLUB",
    url: "https://www.joueclub.fr/pokemon/pokemon-30eme-anniversaire-coffret-dresseur-d-elite-0196214144835.html",
    useProxy: false,
    verifier: (html) => {
      const enStockSchema = html.includes('schema.org/InStock');
      const boutonActif = html.includes('c-product-add-to-cart') && !html.includes('Indisponible');
      return enStockSchema || boutonActif;
    }
  },
  {
    nom: "E.LECLERC",
    url: "https://www.e.leclerc/fp/pokemon-me03-coffret-dresseur-elite-0196214136380",
    useProxy: true,
    verifier: (html) => {
      const content = html.toLowerCase();
      if (content.includes('vendu et expédié par') && !content.includes('e.leclerc')) return false;
      try {
        const data = JSON.parse(html);
        const offers = data.offers || (data.mainEntity && data.mainEntity.offers) || [];
        const offersList = Array.isArray(offers) ? offers : [offers];
        return offersList.some(o => {
          const estVendeurOfficiel = !o.seller || o.seller.name?.toLowerCase().includes('leclerc');
          const enStock = o.availability === 'https://schema.org/InStock' || o.availability === 'InStock';
          return estVendeurOfficiel && enStock;
        });
      } catch (e) {
        const contientTermeCoffret = content.includes('dresseur') || content.includes('etb');
        if (!contientTermeCoffret) return false;
        const estIndisponible = content.includes('indisponible') || content.includes('épuisé');
        const aBoutonAchatOfficiel = 
          (content.includes('ajouter au panier') || content.includes('schema.org/instock')) &&
          (content.includes('retrait en magasin') || content.includes('vendu par e.leclerc'));
        return !estIndisponible && aBoutonAchatOfficiel;
      }
    }
  },
  {
    nom: "KING JOUET",
    url: "https://www.king-jouet.com/jeux-jouets/coffrets-dresseur-pokemon/page1.htm",
    useProxy: true,
    verifier: (html) => {
      const content = html.toLowerCase();
      if (content.includes("aucun résultat n'a été trouvé")) return false;
      const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
      return keywords.some(kw => content.includes(kw));
    }
  }
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHash(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function enregistrerTimingEtDom(site, responseHeaders, html) {
  let stats = {};
  if (fs.existsSync(TIMING_FILE)) {
    try { stats = JSON.parse(fs.readFileSync(TIMING_FILE, 'utf8')); } catch (e) { stats = {}; }
  }

  const maintenant = new Date().toISOString();
  const $ = cheerio.load(html);
  
  let conteneurHtml = "";
  if (site.nom === "KING JOUET") conteneurHtml = $('.product-list').html() \vert{}\vert{}$('main').html() || html;
  else if (site.nom === "E.LECLERC") conteneurHtml = $('script[type="application/ld+json"]').html() \vert{}\vert{} $('main').html() || html;
  else if (site.nom === "JOUECLUB") conteneurHtml = $('.c-product-detail').html() \vert{}\vert{}$('main').html() || html;
  else conteneurHtml = $('.product-detail').html() \vert{}\vert{}$('main').html() || html;

  const currentHash = getHash(conteneurHtml);
  const serverDate = responseHeaders.get('date') || responseHeaders.get('last-modified') || null;

  if (!stats[site.nom]) {
    stats[site.nom] = {
      dernierHash: currentHash,
      derniereVerif: maintenant,
      historiqueMisesAJour: []
    };
  } else {
    if (stats[site.nom].dernierHash && stats[site.nom].dernierHash !== currentHash) {
      console.log(`📌 [MAJ DOM DÉTECTÉE] ${site.nom} à ${maintenant}`);
      stats[site.nom].historiqueMisesAJour.push({
        timestampLocal: maintenant,
        timestampServeur: serverDate,
        type: "CHANGEMENT_DOM"
      });
      stats[site.nom].dernierHash = currentHash;
    }
    stats[site.nom].derniereVerif = maintenant;
  }

  if (stats[site.nom].historiqueMisesAJour.length > 50) {
    stats[site.nom].historiqueMisesAJour = stats[site.nom].historiqueMisesAJour.slice(-50);
  }

  fs.writeFileSync(TIMING_FILE, JSON.stringify(stats, null, 2));
}

function enregistrerErreur(site, statusHTTP, typeErreur, tentative) {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) { logs = []; }
  }
  const ilYADeuxDixQuatreHeures = Date.now() - (24 * 60 * 60 * 1000);
  logs = logs.filter(log => new Date(log.timestamp).getTime() > ilYADeuxDixQuatreHeures);

  logs.push({
    timestamp: new Date().toISOString(),
    site: site.nom,
    url: site.url,
    statusHTTP: statusHTTP || null,
    typeErreur: typeErreur,
    proxyUtilise: site.useProxy,
    tentative: tentative
  });

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

async function envoyerHeartbeat(nbSites, nbErreurs) {
  const maintenant = new Date();
  const heureParis = parseInt(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }), 10);
  const minutesParis = parseInt(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', minute: '2-digit' }), 10);

  if ((heureParis === 9 || heureParis === 18) && minutesParis < 5) {
    try {
      await fetch("https://ntfy.sh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: CANAL_NTFY,
          title: `🟢 Heartbeat : Scraper Opérationnel (${heureParis}h00)`,
          message: `Rapport de santé quotidien.\n• Sites surveillés : ${nbSites}\n• Erreurs lors du run : ${nbErreurs}`,
          priority: 1,
          tags: ["green_heart", "robot"]
        })
      });
      console.log(`Notification Heartbeat de ${heureParis}h envoyée.`);
    } catch (err) {
      console.error("Erreur envoi heartbeat:", err);
    }
  }
}

async function envoyerAlerteStock(nomSite, url) {
  try {
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: CANAL_NTFY,
        title: `📦 PRODUIT EN STOCK SUR ${nomSite} !`,
        message: `⚠️ Le produit est disponible sur ${nomSite} ! Cliquez pour ouvrir la page.`,
        click: url,
        priority: 4,
        tags: ["tada", "shopping"]
      })
    });
    console.log(`Notification STOCK envoyée pour ${nomSite}`);
  } catch (err) {
    console.error("Erreur envoi ntfy stock:", err);
  }
}

async function envoyerAlerteErreur(nomSite, detailErreur) {
  try {
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: CANAL_NTFY,
        title: `🛠️ Erreur technique : ${nomSite}`,
        message: `Impossible de vérifier le stock sur ${nomSite}.\nDétail : ${detailErreur}`,
        priority: 2,
        tags: ["warning", "wrench"]
      })
    });
    console.log(`Notification ERREUR envoyée pour ${nomSite}`);
  } catch (err) {
    console.error("Erreur envoi ntfy erreur:", err);
  }
}

async function verifierTousLesStocks() {
  let erreursRunCount = 0;

  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[i];
    if (i > 0) await sleep(Math.floor(Math.random() * 3000) + 2000);

    let response = null;
    let succesRequete = false;
    const maxTentatives = site.useProxy ? 2 : 1;

    for (let tentative = 1; tentative <= maxTentatives; tentative++) {
      try {
        let targetUrl = site.url;

        if (site.useProxy && SCRAPER_API_KEY) {
          let extraParams = "&country_code=fr&keep_headers=true";
          
          if (site.nom === "KING JOUET") {
            if (tentative === 1) {
              extraParams += "&premium=true&render=true&wait_for_selector=.product-list";
            } else {
              extraParams += "&premium=true";
            }
          } else if (site.nom === "E.LECLERC") {
            extraParams += "&premium=true";
          }
          
          targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(site.url)}${extraParams}&_t=${Date.now()}`;
        }

        response = await fetch(targetUrl, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/'
          }
        });

        if (response.ok) {
          succesRequete = true;
          break;
        } else {
          enregistrerErreur(site, response.status, 'HTTP_ERROR', tentative);
          if ((response.status === 403 || response.status === 500) && tentative < maxTentatives) {
            console.log(`[HTTP ${response.status}] ${site.nom} - Tentative ${tentative}/${maxTentatives}, nouvelle tentative...`);
            await sleep(4000);
          } else {
            break;
          }
        }
      } catch (e) {
        enregistrerErreur(site, null, e.message, tentative);
        if (tentative === maxTentatives) throw e;
        console.log(`[Erreur Réseau] ${site.nom} - Tentative ${tentative}/${maxTentatives} : ${e.message}, nouveau test...`);
        await sleep(3000);
      }
    }

    try {
      if (!succesRequete || !response.ok) {
        const statusCode = response ? response.status : 0;
        const statusErr = response ? `Erreur HTTP ${statusCode}` : 'Erreur réseau';

        if (statusCode === 500 || statusCode === 503) {
          console.log(`[${statusErr}] ${site.nom} (Ignorée, alerte ntfy masquée)`);
        } else {
          erreursRunCount++;
          console.log(`[${statusErr}] ${site.nom}`);
          await envoyerAlerteErreur(site.nom, statusErr);
        }
        continue;
      }

      const html = await response.text();

      enregistrerTimingEtDom(site, response.headers, html);

      if (site.verifier(html)) {
        console.log(`[STOCK DISPO] ${site.nom}`);
        await envoyerAlerteStock(site.nom, site.url);
      } else {
        console.log(`[Rupture] ${site.nom}`);
      }
    } catch (e) {
      erreursRunCount++;
      console.log(`[Erreur] ${site.nom} : ${e.message}`);
      await envoyerAlerteErreur(site.nom, e.message);
    }
  }

  await envoyerHeartbeat(SITES.length, erreursRunCount);
}

(async () => {
  await verifierTousLesStocks();
})();
