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
    nom: "JOUECLUB",
    url: "https://www.joueclub.fr/pokemon/pokemon-30eme-anniversaire-coffret-dresseur-d-elite-0196214144835.html",
    verifier: (html) => {
      const enStockSchema = html.includes('schema.org/InStock');
      const boutonActif = html.includes('c-product-add-to-cart') && !html.includes('Indisponible');
      return enStockSchema || boutonActif;
    }
  },
  {
    nom: "LA GRANDE RÉCRÉ",
    url: "https://www.lagranderecre.fr/jeux-de-societe/cartes-a-collectionner.html",
    verifier: (html) => {
      const content = html.toLowerCase();
      
      // 1. Détection des mots-clés du produit dans le listing
      const contient30 = content.includes('30');
      const contientTermeCoffret = content.includes('dresseur') || content.includes('etb');
      const produitTrouve = contient30 && contientTermeCoffret;

      if (!produitTrouve) {
        return false;
      }

      // 2. Vérification de la disponibilité
      const estIndisponible = 
        content.includes('victime de son succès') || 
        content.includes('épuisé en ligne') || 
        content.includes('indisponible');

      // 3. Fallback d'état pour rendu dynamique (React/Vue/SSR/State JSON)
      const aBoutonAchat = 
        content.includes('add-to-cart') || 
        content.includes('ajouter au panier') || 
        content.includes('"instock":true');

      return !estIndisponible && aBoutonAchat;
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

// Log de santé automatique (Exécuté à 09h00 et 18h00 heure de Paris)
async function envoyerHeartbeat(nbSites, nbErreurs) {
  const maintenant = new Date();
  
  // Conversion explicite sur le fuseau horaire français
  const heureParis = parseInt(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }), 10);
  const minutesParis = parseInt(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', minute: '2-digit' }), 10);

  // Se déclenche sur le premier passage de la tranche (entre :00 et :05)
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
  let erreursRunCount = 0;

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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.google.com/',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
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

  // Contrôle du Heartbeat (envoyé si on est à 9h00 ou 18h00 heure française)
  await envoyerHeartbeat(SITES.length, erreursRunCount);
}

verifierTousLesStocks();
