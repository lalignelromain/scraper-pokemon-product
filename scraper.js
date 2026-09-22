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

async function envoyerAlerte(nomSite, url) {
  const titreClean = `PRODUIT EN STOCK SUR ${nomSite} !`;
  const message = `⚠️ Le produit est disponible sur ${nomSite} ! Cliquez pour ouvrir la page.`;

  try {
    await fetch(`https://ntfy.sh/${CANAL_NTFY}`, {
      method: "POST",
      headers: {
        "Title": titreClean,
        "Priority": "high",
        "Tags": "warning,shopping",
        "Click": url
      },
      body: message
    });
    console.log(`Notification envoyée pour ${nomSite}`);
  } catch (err) {
    console.error("Erreur envoi ntfy:", err);
  }
}

async function verifierTousLesStocks() {
  for (const site of SITES) {
    try {
      const response = await fetch(site.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.log(`[Erreur HTTP ${response.status}] Impossible d'accéder à ${site.nom}`);
        continue;
      }

      const html = await response.text();
      if (site.verifier(html)) {
        console.log(`[STOCK DISPO] ${site.nom}`);
        await envoyerAlerte(site.nom, site.url);
      } else {
        console.log(`[Rupture] ${site.nom}`);
      }
    } catch (e) {
      console.log(`[Erreur] Impossible de vérifier ${site.nom} : ${e.message}`);
    }
  }
}

verifierTousLesStocks();
