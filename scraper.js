const CANAL_NTFY = "stock-jouets-romain"; // Ton canal ntfy

const SITES = [
  {
    nom: "SMYTHS TOYS",
    url: "https://www.smythstoys.com/fr/fr-fr/votre-produit", // <-- Ton URL exacte
    verifier: (html) => {
      return html.includes('add-to-cart') && !html.includes('cursor-not-allowed');
    }
  },
  {
    nom: "KING JOUET",
    url: "https://www.king-jouet.com/votre-produit", // <-- Ton URL exacte
    verifier: (html) => {
      return !html.includes("Zut") && !html.includes("Epuisé");
    }
  },
  {
    nom: "JOUÉCLUB",
    url: "https://www.joueclub.fr/votre-produit", // <-- Ton URL exacte
    verifier: (html) => {
      return !html.includes("Indisponible");
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

      if (!response.ok) continue;

      const html = await response.text();
      if (site.verifier(html)) {
        console.log(`[STOCK DISPO] ${site.nom}`);
        await envoyerAlerte(site.nom, site.url);
      } else {
        console.log(`[Rupture] ${site.nom}`);
      }
    } catch (e) {
      console.error(`Erreur lors de la vérification de ${site.nom}:`, e.message);
    }
  }
}

verifierTousLesStocks();
