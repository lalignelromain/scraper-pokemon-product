const CANAL_NTFY = "stock-jouets-romain"; // Ton canal ntfy

// Clé ScraperAPI récupérée depuis les secrets GitHub Actions
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || ""; 

const SITES = [
  {
    nom: "SMYTHS TOYS",
    url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
    useProxy: false,
    verifier: (html) => {
      return html.includes('add-to-cart') && !html.includes('cursor-not-allowed');
    }
  },
  {
    nom: "KING JOUET",
    url: "https://www.king-jouet.com/recherche?q=pokemon+30+ans+coffret+dresseur",
    useProxy: true,
    verifier: (html) => {
      const content = html.toLowerCase();
      return content.includes('30') && content.includes('dresseur') && !content.includes('aucun résultat');
    }
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

      // Filtre anti-marketplace (exclure vendeurs tiers)
      if (content.includes('vendu et expédié par') && !content.includes('e.leclerc')) {
        return false;
      }

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

async function envoyerHeartbeat(nbSites, nbErreurs) {
  const maintenant = new Date();
  const heureParis = parseInt(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }), 10);
  const minutesParis = parseInt(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', minute: '2-digit' }), 10);

  const estCrenauCible = (heureParis === 9 || heureParis === 18) && minutesParis < 5;

  if (estCrenauCible) {
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

    if (i > 0) {
      await sleep(Math.floor(Math.random() * 3000) + 2000);
    }

    try {
      let targetUrl = site.url;

      if (site.useProxy && SCRAPER_API_KEY) {
        targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(site.url)}&render=true&country_code=fr`;
      }

      const response = await fetch(targetUrl, {
        headers: site.useProxy && SCRAPER_API_KEY ? {} : {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.google.com/'
        }
      });

      if (!response.ok) {
        erreursRunCount++;
        const msgHttp = `Erreur HTTP ${response.status}`;
        console.log(`[${msgHttp}] ${site.nom}`);
        await envoyerAlerteErreur(site.nom, msgHttp);
        continue;
      }

      const html = await response.text();
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
