try {
    require('dotenv').config();
} catch (e) {
    // Ignoré silencieusement sur GitHub Actions
}

const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const TIMING_FILE = 'timing_stats.json';
const ETAT_STOCK_FILE = 'etat_stocks.json';

// --- DIAGNOSTIC D'ENVIRONNEMENT ---
console.log("=== VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT ===");
if (!NTFY_TOPIC) {
    console.log("⚠️  ATTENTION : NTFY_TOPIC est indéfini ! Les notifications ne partiront pas.");
} else {
    console.log(`✅ NTFY_TOPIC détecté (Canal: ***).`);
}
console.log("==================================================\n");

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

// 🚨 Notification URGENTE
async function envoyerNotificationNtfy(nomSite, url) {
    if (!NTFY_TOPIC) {
        console.log(`[!] Notification ignorée : NTFY_TOPIC non défini.`);
        return;
    }

    try {
        const fetchArgs = {
            method: 'POST',
            body: `🚨 ALERTE STOCK 🚨\nLe Coffret Dresseur d'Élite est EN STOCK sur ${nomSite} !\nLien : ${url}`,
            headers: {
                'Title': 'Pokémon 30ème - En Stock !',
                'Priority': 'urgent',
                'Tags': 'rotating_light,pokemon'
            }
        };
        await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, fetchArgs);
        console.log(`[+] Notification Ntfy envoyée pour ${nomSite}`);
    } catch (error) {
        console.error(`[-] Erreur lors de l'envoi Ntfy pour ${nomSite}:`, error.message);
    }
}

// 💓 Notification HEARTBEAT (8h / 18h)
async function envoyerHeartbeatNtfy(etatStocks) {
    if (!NTFY_TOPIC) return;

    const now = new Date();
    const heureFR = parseInt(new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: 'numeric',
        hour12: false
    }).format(now), 10);

    if (heureFR !== 8 && heureFR !== 18) {
        return;
    }

    const dateDuJour = now.toISOString().slice(0, 10);
    const slotCle = `${dateDuJour}-${heureFR}h`;

    let stats = {};
    if (fs.existsSync(TIMING_FILE)) {
        try { stats = JSON.parse(fs.readFileSync(TIMING_FILE, 'utf8')); } catch (e) {}
    }

    if (stats.dernierHeartbeatSlot === slotCle) {
        return;
    }

    let message = "🤖 BILAN DES STOCKS (8h / 18h)\n\n";
    for (const site of SITES) {
        const enStock = etatStocks[site.nom];
        const statusStr = enStock ? "🟢 EN STOCK" : "🔴 Rupture";
        message += `${site.nom} : ${statusStr}\n`;
    }
    message += "\n✅ Scraper Playwright opérationnel.";

    try {
        const fetchArgs = {
            method: 'POST',
            body: message,
            headers: {
                'Title': `💓 Heartbeat (${heureFR}h00)`,
                'Priority': 'low',
                'Tags': 'robot,bar_chart'
            }
        };
        await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, fetchArgs);
        console.log(`[+] Notification Ntfy (Heartbeat ${heureFR}h) envoyée.`);

        stats.dernierHeartbeatSlot = slotCle;
        fs.writeFileSync(TIMING_FILE, JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error(`[-] Erreur Heartbeat Ntfy:`, error.message);
    }
}

// Enregistrement ultra-ciblé du DOM (Boutons d'achat uniquement)
function enregistrerTimingEtDom(site, html) {
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
    
    let texteCible = "";

    if (site.nom === "KING JOUET") {
        texteCible = $('.buy-box').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.add-to-cart').text();
    } else if (site.nom === "E.LECLERC") {
        texteCible = $('button[data-test="add-to-cart"]').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.btn-add-to-cart').text();
    } else if (site.nom === "JOUECLUB") {
        texteCible = $('.c-product-add-to-cart').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.product-actions').text();
    } else if (site.nom === "SMYTHS TOYS") {
        texteCible = $('#addToCartForm button[type="submit"]').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.js-add-to-cart-button').text();
    } 

    let fallbackVide = false;
    if (!texteCible) fallbackVide = true;
    else if (texteCible.trim() === "") fallbackVide = true;

    if (fallbackVide) {
        texteCible = $('title').text();
    }

    const cleanedText = texteCible.replace(/\s+/g, ' ').trim();
    const currentHash = getHash(cleanedText);
    
    if (!stats[site.nom]) {
        stats[site.nom] = {
            dernierHash: currentHash,
            derniereVerif: maintenant,
            historiqueMisesAJour: []
        };
    } else {
        if (stats[site.nom].dernierHash) {
            if (stats[site.nom].dernierHash !== currentHash) {
                console.log(`📌 [MAJ BOUTON DÉTECTÉE] ${site.nom} à ${maintenant}`);
                stats[site.nom].historiqueMisesAJour.push({
                    timestampLocal: maintenant,
                    type: "CHANGEMENT_BOUTON"
                });
                stats[site.nom].dernierHash = currentHash;
            }
        }
        stats[site.nom].derniereVerif = maintenant;
    }

    if (stats[site.nom].historiqueMisesAJour) {
        if (stats[site.nom].historiqueMisesAJour.length > 50) {
            stats[site.nom].historiqueMisesAJour = stats[site.nom].historiqueMisesAJour.slice(-50);
        }
    }

    fs.writeFileSync(TIMING_FILE, JSON.stringify(stats, null, 2));
}

// Configuration des sites
const SITES = [
    {
        nom: "SMYTHS TOYS",
        url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
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

    console.log("🚀 Démarrage du navigateur Playwright...");
    let browser = null;
    try {
        browser = await chromium.launch({ headless: true });
    } catch (e) {
        console.error("[-] Impossible de lancer Playwright :", e.message);
        return;
    }

    for (const site of SITES) {
        console.log(`\n⏳ Vérification en cours pour : ${site.nom}`);
        let success = false;

        for (let tentative = 1; tentative <= 2; tentative++) {
            if (success) break;

            try {
                const context = await browser.newContext({
                    userAgent: getRandomUserAgent(),
                    locale: 'fr-FR',
                    viewport: { width: 1280, height: 720 }
                });

                const page = await context.newPage();
                
                // Navigation avec un délai étendu pour laisser le JavaScript s'exécuter
                await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                
                // Temporisation humaine aléatoire (entre 2s et 5s) pour rassurer les protections
                const randomDelay = Math.floor(Math.random() * 3000) + 2000;
                await page.waitForTimeout(randomDelay);

                const html = await page.content();
                await context.close();
                
                enregistrerTimingEtDom(site, html);

                const estEnStock = site.verifier(html);
                
                let resultatText = '🔴 RUPTURE';
                if (estEnStock) {
                    resultatText = '🟢 EN STOCK';
                }
                console.log(`[${site.nom}] Résultat : ${resultatText}`);

                if (estEnStock) {
                    await envoyerNotificationNtfy(site.nom, site.url);
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

    await browser.close();

    fs.writeFileSync(ETAT_STOCK_FILE, JSON.stringify(etatStocks, null, 2));
    await envoyerHeartbeatNtfy(etatStocks);
    console.log("\n✅ Vérification terminée.");
}

verifierTousLesStocks();
