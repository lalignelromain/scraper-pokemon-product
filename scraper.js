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
    } else if (site.nom === "CULTURA") {
        texteCible = $('.add-to-cart').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.cart-button').text();
    } else if (site.nom === "CARREFOUR") {
        texteCible = $('.add-to-cart-button').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.pl-button').text();
    } else if (site.nom === "AUCHAN") {
        texteCible = $('.product-action__button').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.btn--primary').text();
    } else if (site.nom === "MICROMANIA") {
        texteCible = $('.add-to-cart').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.product-actions').text();
    } else if (site.nom === "FNAC") {
        texteCible = $('.f-buyBox-button').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.add-to-cart').text();
    } else if (site.nom === "KAIRYU") {
        texteCible = $('.product-form__submit').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.add-to-cart').text();
    } else if (site.nom === "ULTRAJEUX") {
        texteCible = $('.btn-panier').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.add-to-cart').text();
    } else if (site.nom === "DESTOCKTCG") {
        texteCible = $('.product-form__submit').text();
        let estVide = false;
        if (!texteCible) estVide = true;
        else if (texteCible.trim() === "") estVide = true;
        if (estVide) texteCible = $('.add-to-cart').text();
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

// Configuration des sites (Ordonnés du plus rapide au plus lourd)
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
        nom: "MICROMANIA",
        url: "https://www.micromania.fr/recherche?q=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            if (content.includes("aucun résultat")) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "FNAC",
        url: "https://www.fnac.com/SearchResult/ResultList.aspx?Search=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            if (content.includes("aucun résultat")) return false;

            let venduParFnac = false;
            if (content.includes("vendu par fnac")) venduParFnac = true;
            else if (content.includes("vendu et expédié par fnac")) venduParFnac = true;
            
            if (!venduParFnac) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "KAIRYU",
        url: "https://kairyu.fr/search?q=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            
            let pageVide = false;
            if (content.includes("aucun résultat")) pageVide = true;
            else if (content.includes("0 résultat")) pageVide = true;
            
            if (pageVide) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "DESTOCKTCG",
        url: "https://www.destocktcg.fr/search?type=product&q=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            
            let pageVide = false;
            if (content.includes("aucun résultat")) pageVide = true;
            else if (content.includes("0 résultat")) pageVide = true;
            
            if (pageVide) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "ULTRAJEUX",
        url: "https://www.ultrajeux.com/search.php?search=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            
            let pageVide = false;
            if (content.includes("aucun résultat")) pageVide = true;
            else if (content.includes("0 article")) pageVide = true;
            
            if (pageVide) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "KING JOUET",
        url: "https://www.king-jouet.com/jeux-jouets/coffrets-dresseur-pokemon/page1.htm",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const texteGlobal = $('body').text().toLowerCase();
            
            let pageVide = false;
            if (texteGlobal.includes("aucun résultat")) pageVide = true;
            else if (texteGlobal.includes("aucun resultat")) pageVide = true;
            
            if (pageVide) return false;
            
            let texteProduits = $('.product-list').text().toLowerCase();
            let zoneProduitVide = false;
            if (!texteProduits) zoneProduitVide = true;
            else if (texteProduits.trim() === "") zoneProduitVide = true;
            
            if (zoneProduitVide) {
                texteProduits = $('main').text().toLowerCase();
            }
            
            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => texteProduits.includes(kw));
        }
    },
    {
        nom: "CULTURA",
        url: "https://www.cultura.com/search.html?q=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            
            let pageVide = false;
            if (content.includes("aucun résultat")) pageVide = true;
            else if (content.includes("0 résultat")) pageVide = true;
            
            if (pageVide) return false;

            let venduParCultura = true;
            if (content.includes("vendu par")) {
                if (!content.includes("cultura")) {
                    venduParCultura = false;
                }
            }
            if (!venduParCultura) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "E.LECLERC",
        url: "https://www.e.leclerc/fp/pokemon-me03-coffret-dresseur-elite-0196214136380",
        verifier: (html) => {
            const content = html.toLowerCase();
            if (content.includes('vendu et expédié par')) {
                if (!content.includes('e.leclerc')) return false;
            }

            const $ = cheerio.load(html);
            const jsonLdContent = $('script[type="application/ld+json"]').html();

            if (jsonLdContent) {
                try {
                    const data = JSON.parse(jsonLdContent);
                    let offers = data.offers;
                    
                    if (!offers) {
                        if (data.mainEntity) {
                            if (data.mainEntity.offers) offers = data.mainEntity.offers;
                        }
                    }
                    if (!offers) offers = [];
                    
                    let offersList = [];
                    if (Array.isArray(offers)) offersList = offers;
                    else offersList = [offers];
                    
                    return offersList.some(o => {
                        let estVendeurOfficiel = false;
                        if (!o.seller) estVendeurOfficiel = true;
                        else if (o.seller.name) {
                            if (o.seller.name.toLowerCase().includes('leclerc')) estVendeurOfficiel = true;
                        }
                        
                        let enStock = false;
                        if (o.availability === 'https://schema.org/InStock') enStock = true;
                        else if (o.availability === 'InStock') enStock = true;
                        
                        if (estVendeurOfficiel) {
                            if (enStock) return true;
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
                if (contientRetrait) aBoutonAchatOfficiel = true;
            }
            
            if (estIndisponible) return false;
            if (aBoutonAchatOfficiel) return true;
            return false;
        }
    },
    {
        nom: "AUCHAN",
        url: "https://www.auchan.fr/recherche?text=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            
            let pageVide = false;
            if (content.includes("aucun résultat")) pageVide = true;
            else if (content.includes("0 résultat")) pageVide = true;
            
            if (pageVide) return false;

            let venduParAuchan = true;
            if (content.includes("vendu par")) {
                if (!content.includes("auchan")) {
                    venduParAuchan = false;
                }
            }
            if (!venduParAuchan) return false;

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => content.includes(kw));
        }
    },
    {
        nom: "CARREFOUR",
        url: "https://www.carrefour.fr/s?q=coffret+dresseur+elite+pokemon+30+ans",
        verifier: (html) => {
            const content = html.toLowerCase();
            
            let pageVide = false;
            if (content.includes("aucun résultat")) pageVide = true;
            else if (content.includes("désolé")) pageVide = true;
            else if (content.includes("ne donne aucun résultat")) pageVide = true;
            
            if (pageVide) return false;

            let venduParCarrefour = true;
            if (content.includes("vendu par")) {
                if (!content.includes("carrefour")) {
                    venduParCarrefour = false;
                }
            }
            if (!venduParCarrefour) return false;

            const $ = cheerio.load(html);
            let targetText = $('.product-card-title').text().toLowerCase();
            
            let isTargetEmpty = false;
            if (!targetText) isTargetEmpty = true;
            else if (targetText.trim() === "") isTargetEmpty = true;
            
            if (isTargetEmpty) targetText = $('.main-title').text().toLowerCase();
            
            isTargetEmpty = false;
            if (!targetText) isTargetEmpty = true;
            else if (targetText.trim() === "") isTargetEmpty = true;
            
            if (isTargetEmpty) targetText = content; 

            const keywords = ["célébration", "30 ans", "anniversaire", "celebrations"];
            return keywords.some(kw => targetText.includes(kw));
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
                
                await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                
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
