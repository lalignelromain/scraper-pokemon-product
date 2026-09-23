const CANAL_NTFY = "stock-jouets-romain"; // Ton canal ntfy

const SITES = [
  {
    nom: "SMYTHS TOYS",
    url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
    verifier: (html) => {
      return html.includes('add-to-cart') && !html.includes('cursor-not-allowed');
    }
  },
  {
    nom: "KING JOUET",
    url: "https://www.king-jouet.com/jeu-jouet/jeux-societes/cartes-a-collectionner/ref-1034916-pokemon-30-ans-coffret-dresseur-d-elite.htm",
    verifier: (html) => {
      return !html.includes("Zut") && !html.includes("Epuisé");
    }
  },
  {
    nom: "JOUÉCLUB",
    url: "https://www.joueclub.fr/pokemon/pokemon-30eme-anniversaire-coffret-dresseur-d-elite-0196214144835.html",
    verifier: (html) => {
      const enStockSchema = html.includes('schema.org/InStock');
      const boutonActif = html.includes('c-product-add-to-cart') && !html.includes('Indisponible');
      return enStockSchema || boutonActif;
    }
  }
];

// Liste de User-Agents récents pour varier les signatures
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Alerte Stock (Haute priorité, lien cliquable, icône cadeau/shopping)
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

// Alerte Panne / Erreur Technique (Basse priorité, pas de lien, icône outil/erreur)
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
  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[i];

    // Délai aléatoire entre 2 et 5 secondes entre chaque site (sauf le premier)
    if (i > 0) {
      const pauseMs = Math.floor(Math.random() * 3000) + 2000;
      await sleep(pauseMs);
    }

    try {
      const response = await fetch(site.url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!response.ok) {
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
      console.log(`[Erreur] ${site.nom} : ${e.message}`);
      await envoyerAlerteErreur(site.nom, e.message);
    }
  }
}

verifierTousLesStocks();
