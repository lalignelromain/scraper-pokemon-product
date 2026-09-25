require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const TIMING_FILE = 'timing_stats.json';
const ETAT_STOCK_FILE = 'etat_stocks.json';

// Utilitaires
function getHash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function envoyerNotificationDiscord(nomSite, url) {
    if (!WEBHOOK_URL) {
        console.log(`[!] Notification ignorée : WEBHOOK_URL non défini.`);
        return;
    }
    try {
        await axios.post(WEBHOOK_URL, {
            content: `🚨 **ALERTE STOCK** 🚨\nLe Coffret Dresseur d'Élite 30ème Anniversaire est peut-être EN STOCK sur **${nomSite}** !\nLien : ${url}`
        });
        console.log(`[+] Notification Discord envoyée pour ${nomSite}`);
    } catch (error) {
        console.error(`[-] Erreur lors de l'envoi Discord pour ${nomSite}:`, error.message);
    }
}

// Enregistrement des changements DOM et Timings
function enregistrerTimingEtDom(site, responseHeaders, html) {
    let stats = {};
    if (fs.existsSync(TIMING_FILE)) {
        try { stats = JSON.parse(fs.readFileSync(TIMING_FILE, 'utf8')); } catch (e) { stats = {}; }
    }

    const maintenant = new Date().toISOString();
    const $ = cheerio.load(html);
    let conteneurHtml = "";

    // Ciblage spécifique pour éviter les faux positifs liés aux tokens dynamiques
    if (site.nom === "KING JOUET") {
        conteneurHtml = $('.product-list').html() \vert{}\vert{}$('main').html() || html;
    } else if (site.nom === "E.LECLERC") {
        conteneurHtml = $('script[type="application/ld+json"]').html() \vert{}\vert{} $('main').html() || html;
    } else if (site.nom === "JOUECLUB") {
        conteneurHtml = $('.c-product-detail').html() \vert{}\vert{}$('main').html() || html;
    } else if (site.nom === "SMYTHS TOYS") {
        conteneurHtml = $('#addToCartForm').html() || $('.product-add-to-cart').html() \vert{}\vert{}$('#product-details').html() || html;
    } else {
        conteneurHtml = $('main').html() || html;
    }

    const currentHash = getHash(conteneurHtml);
    const serverDate = (responseHeaders && (responseHeaders['date'] || responseHeaders['last-modified'])) || null;

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

    // Limiter l'historique pour ne pas saturer le fichier JSON
    if (stats[site.nom].historiqueMisesAJour.length > 50) {
        stats[site.nom].historiqueMisesAJour = stats[site.nom].historiqueMisesAJour.slice(-50);
    }

    fs.writeFileSync(TIMING_FILE, JSON.stringify(stats, null, 2));
}

// Configuration des sites
const SITES = [
    {
        nom: "SMYTHS TOYS",
        url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
        useProxy: false,
        verifier: (html) => {
            const $ = cheerio.load(html);
            const btn = $('#addToCartForm button[type="submit"], .js-add-to-cart-button');
            if (!btn.length) return false;
            return !btn.prop('disabled') && !btn.hasClass('cursor-not-allowed');
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
            if (content.includes('vendu et expédié par') && !content.includes('e.leclerc')) return false;

            const $ = cheerio.load(html);
            // Extraction propre du contenu textuel du script JSON-LD
            const jsonLdContent = $('script[type="application/ld+json"]').html();

            if (jsonLdContent) {
                try {
                    const data = JSON.parse(jsonLdContent);
                    const offers = data.offers || (data.mainEntity && data.mainEntity.offers) || [];
                    const offersList = Array.isArray(offers) ? offers : [offers];
                    return offersList.some(o => {
                        const estVendeurOfficiel = !o.seller || o.seller.name?.toLowerCase().includes('leclerc');
                        const enStock = o.availability === 'https://schema.org/InStock' || o.availability === 'InStock';
                        return estVendeurOfficiel && enStock;
                    });
                } catch (e) {
                    // Fallback passif si le parsing échoue
                }
            }

            const contientTermeCoffret = content.includes('dresseur') || content.includes('etb');
            if (!contientTermeCoffret) return false;
            const estIndisponible = content.includes('indisponible') || content.includes('épuisé');
            const aBoutonAchatOfficiel = 
                (content.includes('ajouter au panier') || content.includes('schema.org/instock')) &&
                (content.includes('retrait en magasin') || content.includes('vendu par e.leclerc'));
            return !estIndisponible && aBoutonAchatOfficiel;
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

// Logique principale
async function verifierTousLesStocks() {
    let etatStocks = {};
    if (fs.existsSync(ETAT_STOCK_FILE)) {
        try { etatStocks = JSON.parse(fs.readFileSync(ETAT_STOCK_FILE, 'utf8')); } catch (e) { etatStocks = {}; }
    }

    for (const site of SITES) {
        console.log(`\n⏳ Vérification en cours pour : ${site.nom}`);
        let success = false;

        for (let tentative = 1; tentative <= 2; tentative++) {
            if (success) break;

            try {
                let targetUrl = `${site.url}${site.url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                
                // Définition par défaut des entêtes
                let headers = {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
                };

                let requestOptions = { 
                    method: 'GET', 
                    timeout: 30000 
                };

                if (site.useProxy && SCRAPER_API_KEY) {
                    let extraParams = "&country_code=fr";
                    
                    if (site.nom === "KING JOUET") {
                        if (tentative === 1) {
                            // Rendu JS : On délègue totalement l'empreinte TLS/Headers à ScraperAPI
                            extraParams += "&premium=true&render=true&wait_for_selector=.product-list";
                        } else {
                            // Fallback statique avec nos entêtes
                            extraParams += "&premium=true&keep_headers=true";
                            requestOptions.headers = headers;
                        }
                    } else if (site.nom === "E.LECLERC") {
                        extraParams += "&premium=true&keep_headers=true";
                        requestOptions.headers = headers;
                    }
                    
                    targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(site.url)}${extraParams}&_t=${Date.now()}`;
                } else {
                    // Connexion directe
                    requestOptions.headers = headers;
                }

                requestOptions.url = targetUrl;
                
                const response = await axios(requestOptions);
                const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                
                enregistrerTimingEtDom(site, response.headers, html);

                const estEnStock = site.verifier(html);
                console.log(`[${site.nom}] Résultat : ${estEnStock ? '🟢 EN STOCK' : '🔴 RUPTURE'}`);

                const etaitEnStock = etatStocks[site.nom] === true;
                if (estEnStock && !etaitEnStock) {
                    await envoyerNotificationDiscord(site.nom, site.url);
                }

                etatStocks[site.nom] = estEnStock;
                success = true;

            } catch (error) {
                console.error(`[-] Erreur pour ${site.nom} (Tentative ${tentative}/2) : ${error.message}`);
                if (tentative === 2) {
                    console.error(`[!] Impossible de vérifier ${site.nom} après 2 tentatives.`);
                }
            }
        }
    }

    fs.writeFileSync(ETAT_STOCK_FILE, JSON.stringify(etatStocks, null, 2));
    console.log("\n✅ Vérification terminée.");
}

// Lancement
verifierTousLesStocks();
