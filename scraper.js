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
    url: "https://www.king-jouet.com/jeux-jouets/coffrets-dresseur-pokemon/page1.htm",
    useProxy: true,
    verifier: (html) => {
      const content = html.toLowerCase();
      
      // 1. Si la catégorie est totalement vide de produits
      if (content.includes("aucun résultat n'a été trouvé")) {
        return false;
      }

      // 2. Mots-clés cibles à détecter dans la page de catégorie
      const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
      
      // Doit contenir au moins un mot-clé ET ne pas présenter de message d'erreur d'absence
      const contientMotCleCible = keywords.some(kw => content.includes(kw));

      return contientMotCleCible;
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

    let response = null;
    let succesRequete = false;
    const maxTentatives = site.useProxy ? 2 : 1;

    for (let tentative = 1; tentative <= maxTentatives; tentative++) {
      try {
        let targetUrl = site.url;

        if (site.useProxy && SCRAPER_API_KEY) {
          targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(site.url)}&render=true&country_code=fr&_t=${Date.now()}`;
        }

        response = await fetch(targetUrl, {
          headers: site.useProxy && SCRAPER_API_KEY ? {} : {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/'
          }
        });

        if (response.ok) {
          succesRequete = true;
          break;
        } else if (response.status === 403 && tentative < maxTentatives) {
          console.log(`[403 Bloqué] ${site.nom} - Tentative ${tentative}/${maxTentatives}, nouvelle tentative avec une autre IP...`);
          await sleep(4000);
        } else {
          break;
        }
      } catch (e) {
        if (tentative === maxTentatives) {
          throw e;
        }
        console.log(`[Erreur Réseau] ${site.nom} - Tentative ${tentative}/${maxTentatives} : ${e.message}, nouveau test...`);
        await sleep(3000);
      }
    }

    try {
      if (!succesRequete || !response.ok) {
        erreursRunCount++;
        const statusErr = response ? `Erreur HTTP ${response.status}` : 'Erreur réseau';
        console.log(`[${statusErr}] ${site.nom}`);
        await envoyerAlerteErreur(site.nom, statusErr);
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
