const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
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

// 🚨 Notification URGENTE pour un STOCK TROUVÉ
async function envoyerNotificationNtfy(nomSite, url) {
    if (!NTFY_TOPIC) {
        console.log(`[!] Notification ignorée : NTFY_TOPIC non défini.`);
        return;
    }

    try {
        await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, 
            `🚨 ALERTE STOCK 🚨\nLe Coffret Dresseur d'Élite est EN STOCK sur ${nomSite} !\nLien : ${url}`,
            {
                headers: {
                    'Title': 'Pokémon 30ème - En Stock !',
                    'Priority': 'urgent',
                    'Tags': 'rotating_light,pokemon'
                }
            }
        );
        console.log(`[+] Notification Ntfy (Alerte Stock) envoyée pour ${nomSite}`);
    } catch (error) {
        console.error(`[-] Erreur lors de l'envoi Ntfy pour ${nomSite}:`, error.message);
    }
}

// 💓 Notification HEARTBEAT / RECAPITULATIF (UNIQUEMENT À 8H ET 18H)
async function envoyerHeartbeatNtfy(etatStocks) {
    if (!NTFY_TOPIC) return;

    const now = new Date();
    // Récupération de l'heure en France (Europe/Paris)
    const heureFR = parseInt(new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: 'numeric',
        hour12: false
    }).format(now), 10);

    // On ne déclenche qu'à 8h et 18h
    if (heureFR !== 8 && heureFR !== 18) {
        return;
    }

    // Clé unique de créneau (ex: "2026-09-25-8h") pour ne pas réémettre si le script tourne toutes les 10-15 min
    const dateDuJour = now.toISOString().slice(0, 10);
    const slotCle = `${dateDuJour}-${heureFR}h`;

    let stats = {};
    if (fs.existsSync(TIMING_FILE)) {
        try { stats = JSON.parse(fs.readFileSync(TIMING_FILE, 'utf8')); } catch (e) {}
    }

    if (stats.dernierHeartbeatSlot === slotCle) {
        console.log(`[i] Heartbeat pour le créneau ${slotCle} déjà envoyé. Ignoré.`);
        return;
    }

    // Construction du message de synthèse
    let message = "🤖 BILAN DES STOCKS (8h / 18h)\n\n";
    for (const site of SITES) {
        const enStock = etatStocks[site.nom];
        const statusStr = enStock ? "🟢 EN STOCK" : "🔴 Rupture";
        message += `${site.nom} : ${statusStr}\n`;
    }
    message += "\n✅ Scraper opérationnel.";

    try {
        await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, message, {
            headers: {
                'Title': `💓 Heartbeat (${heureFR}h00)`,
                'Priority': 'low',
                'Tags': 'robot,bar_chart'
            }
        });
        console.log(`[+] Notification Ntfy (Heartbeat ${heureFR}h) envoyée.`);

        // Sauvegarde du créneau pour éviter les doublons
        stats.dernierHeartbeatSlot = slotCle;
        fs.writeFileSync(TIMING_FILE, JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error(`[-] Erreur lors de l'envoi du Heartbeat Ntfy:`, error.message);
    }
}

// Enregistrement des changements DOM et Timings
function enregistrerTimingEtDom(site, responseHeaders, html) {
    let stats = {};
    if (fs.existsSync(TIMING_FILE)) {
        try { 
            stats = JSON.parse(fs.readFileSync(TIMING_FILE, 'utf8')); 
        } catch (e) { 
            stats = {}; 
        }
    }

    const maintenant = new Date().toISOString();
    const $ = cheerio.load(html);
    let conteneurHtml = "";

    if (site.nom === "KING JOUET") {
        conteneurHtml = $('.product-list').html();
        if (!conteneurHtml) conteneurHtml = $('main').html();
        if (!conteneurHtml) conteneurHtml = html;
    } else if (site.nom === "E.LECLERC") {
        conteneurHtml = $('script[type="application/ld+json"]').html();
        if (!conteneurHtml) conteneurHtml = $('main').html();
        if (!conteneurHtml) conteneurHtml = html;
    } else if (site.nom === "JOUECLUB") {
        conteneurHtml = $('.c-product-detail').html();
        if (!conteneurHtml) conteneurHtml = $('main').html();
        if (!conteneurHtml) conteneurHtml = html;
    } else if (site.nom === "SMYTHS TOYS") {
        conteneurHtml = $('#addToCartForm').html();
        if (!conteneurHtml) conteneurHtml = $('.product-add-to-cart').html();
        if (!conteneurHtml) conteneurHtml = $('#product-details').html();
        if (!conteneurHtml) conteneurHtml = html;
    } else {
        conteneurHtml = $('main').html();
        if (!conteneurHtml) conteneurHtml = html;
    }

    const currentHash = getHash(conteneurHtml);
    
    let serverDate = null;
    if (responseHeaders) {
        if (responseHeaders['date']) {
            serverDate = responseHeaders['date'];
        } else if (responseHeaders['last-modified']) {
            serverDate = responseHeaders['last-modified'];
        }
    }

    if (!stats[site.nom]) {
        stats[site.nom] = {
            dernierHash: currentHash,
            derniereVerif: maintenant,
            historiqueMisesAJour: []
        };
    } else {
        if (stats[site.nom].dernierHash) {
            if (stats[site.nom].dernierHash !== currentHash) {
                console.log(`📌 [MAJ DOM DÉTECTÉE] ${site.nom} à ${maintenant}`);
                stats[site.nom].historiqueMisesAJour.push({
                    timestampLocal: maintenant,
                    timestampServeur: serverDate,
                    type: "CHANGEMENT_DOM"
                });
                stats[site.nom].dernierHash = currentHash;
            }
        }
        stats[site.nom].derniereVerif = maintenant;
    }

    if (stats[site.nom].historiqueMisesAJour && stats[site.nom].historiqueMisesAJour.length > 50) {
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
            
            let isDisabled = btn.prop('disabled');
            let hasClass = btn.hasClass('cursor-not-allowed');
            
            if (isDisabled) return false;
            if (hasClass) return false;
            return true;
        }
    },
    {
        nom: "JOUECLUB",
        url: "https://www.joueclub.fr/pokemon/pokemon-30eme-anniversaire-coffret-dresseur-d-elite-0196214144835.html",
        useProxy: false,
        verifier: (html) => {
            const enStockSchema = html.includes('schema.org/InStock');
            
            let boutonActif = false;
            if (html.includes('c-product-add-to-cart')) {
                if (!html.includes('Indisponible')) {
                    boutonActif = true;
                }
            }
            
            if (enStockSchema) return true;
            if (boutonActif) return true;
            return false;
        }
    },
    {
        nom: "E.LECLERC",
        url: "https://www.e.leclerc/fp/pokemon-me03-coffret-dresseur-elite-0196214136380",
        useProxy: true,
        verifier: (html) => {
            const content = html.toLowerCase();
            if (content.includes('vendu et expédié par')) {
                if (!content.includes('e.leclerc')) {
                    return false;
                }
            }

            const $ = cheerio.load(html);
            const jsonLdContent = $('script[type="application/ld+json"]').html();

            if (jsonLdContent) {
                try {
                    const data = JSON.parse(jsonLdContent);
                    let offers = data.offers;
                    
                    if (!offers) {
                        if (data.mainEntity) {
                            if (data.mainEntity.offers) {
                                offers = data.mainEntity.offers;
                            }
                        }
                    }
                    if (!offers) offers = [];
                    
                    let offersList = [];
                    if (Array.isArray(offers)) {
                        offersList = offers;
                    } else {
                        offersList = [offers];
                    }
                    
                    return offersList.some(o => {
                        let estVendeurOfficiel = false;
                        if (!o.seller) {
                            estVendeurOfficiel = true;
                        } else if (o.seller.name) {
                            if (o.seller.name.toLowerCase().includes('leclerc')) {
                                estVendeurOfficiel = true;
                            }
                        }
                        
                        let enStock = false;
                        if (o.availability === 'https://schema.org/InStock') {
                            enStock = true;
                        } else if (o.availability === 'InStock') {
                            enStock = true;
                        }
                        
                        if (estVendeurOfficiel) {
                            if (enStock) {
                                return true;
                            }
                        }
                        return false;
                    });
                } catch (e) {}
            }

            let contientTermeCoffret = content.includes('dresseur');
            if (!contientTermeCoffret) contientTermeCoffret = content.includes('etb');
            if (!contientTermeCoffret) return false;
            
            let estIndisponible = content.includes('indisponible');
            if (!estIndisponible) estIndisponible = content.includes('épuisé');
            
            let contientAjout = content.includes('ajouter au panier');
            if (!contientAjout) contientAjout = content.includes('schema.org/instock');
            
            let contientRetrait = content.includes('retrait en magasin');
            if (!contientRetrait) contientRetrait = content.includes('vendu par e.leclerc');
            
            let aBoutonAchatOfficiel = false;
            if (contientAjout) {
                if (contientRetrait) {
                    aBoutonAchatOfficiel = true;
                }
            }
            
            if (estIndisponible) return false;
            if (aBoutonAchatOfficiel) return true;
            return false;
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
        try { 
            etatStocks = JSON.parse(fs.readFileSync(ETAT_STOCK_FILE, 'utf8')); 
        } catch (e) { 
            etatStocks = {}; 
        }
    }

    for (const site of SITES) {
        console.log(`\n⏳ Vérification en cours pour : ${site.nom}`);
        let success = false;

        for (let tentative = 1; tentative <= 2; tentative++) {
            if (success) break;

            try {
                let baseParams = "";
                if (site.url.includes('?')) {
                    baseParams = "&_t=" + Date.now();
                } else {
                    baseParams = "?_t=" + Date.now();
                }
                
                let targetUrl = site.url + baseParams;
                
                let headers = {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
                };

                let requestOptions = { method: 'GET', timeout: 60000 };

                if (site.useProxy) {
                    if (SCRAPER_API_KEY) {
                        let extraParams = "&country_code=fr";
                        
                        if (site.nom === "KING JOUET") {
                            if (tentative === 1) {
                                extraParams += "&premium=true";
                            } else {
                                extraParams += "&premium=true&device_type=desktop";
                            }
                        } else if (site.nom === "E.LECLERC") {
                            extraParams += "&premium=true&keep_headers=true";
                            requestOptions.headers = headers;
                        }
                        
                        targetUrl = "http://api.scraperapi.com?api_key=" + SCRAPER_API_KEY + "&url=" + encodeURIComponent(site.url) + extraParams + "&_t=" + Date.now();
                    }
                } else {
                    requestOptions.headers = headers;
                }

                requestOptions.url = targetUrl;
                
                const response = await axios(requestOptions);
                
                let html = "";
                if (typeof response.data === 'string') {
                    html = response.data;
                } else {
                    html = JSON.stringify(response.data);
                }
                
                enregistrerTimingEtDom(site, response.headers, html);

                const estEnStock = site.verifier(html);
                
                let resultatText = '🔴 RUPTURE';
                if (estEnStock) {
                    resultatText = '🟢 EN STOCK';
                }
                console.log(`[${site.nom}] Résultat : ${resultatText}`);

                // Envoi de la notification si le produit est en stock (sans filtre anti-spam)
                if (estEnStock) {
                    await envoyerNotificationNtfy(site.nom, site.url);
                }

                // Sauvegarde de l'état pour les rapports Heartbeat
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
    
    // Tentative d'envoi du rapport Heartbeat (filtré à 8h et 18h)
    await envoyerHeartbeatNtfy(etatStocks);
    
    console.log("\n✅ Vérification terminée.");
}

// Lancement
verifierTousLesStocks();
