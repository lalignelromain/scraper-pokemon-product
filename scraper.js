try {
    require('dotenv').config();
} catch (e) {
    // Ignoré silencieusement sur GitHub Actions
}

const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

const NTFY_TOPIC = process.env.NTFY_TOPIC;
const BACKLOG_FILE = 'backlog_pokemon.json';

// Cibles avec la nouvelle logique de mots-clés stricts (Tous les mots du sous-tableau doivent être présents)
const CIBLES = {
    "ETB_30ANS": { 
        nom: "ETB 30ème Anniversaire", 
        ean: "0196214144835", 
        mots_cles_obligatoires: [ ["coffret", "dresseur", "30"], ["etb", "30"] ] 
    },
    "MINI_TIN_NUIT": { 
        nom: "Mini Tin NUIT (Mewtwo)", 
        ean: "0196214146655", 
        mots_cles_obligatoires: [ ["tin", "nuit"], ["tin", "mewtwo"] ] 
    },
    "MINI_TIN_JOUR": { 
        nom: "Mini Tin JOUR (Mew)", 
        ean: "0196214146402", 
        mots_cles_obligatoires: [ ["tin", "jour"], ["tin", "mew"] ] 
    }
};

console.log("=== VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT ===");
if (!NTFY_TOPIC) {
    console.log("⚠️  ATTENTION : NTFY_TOPIC est indéfini ! Les notifications ne partiront pas.");
} else {
    console.log(`✅ NTFY_TOPIC détecté (Canal: ***).`);
}
console.log("==================================================\n");

function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function envoyerNotificationNtfy(nomSite, url, nomProduit) {
    if (!NTFY_TOPIC) return;

    try {
        const fetchArgs = {
            method: 'POST',
            body: `🚨 ALERTE STOCK 🚨\nLe produit [ ${nomProduit} ] est EN STOCK sur ${nomSite} !\nLien : ${url}`,
            headers: {
                'Title': `Pokemon 30e : ${nomProduit} !`,
                'Priority': 'urgent',
                'Tags': 'rotating_light,pokemon'
            }
        };
        const response = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, fetchArgs);
        
        if (!response.ok) {
            console.error(`[-] Ntfy a refusé l'alerte pour ${nomSite}. Statut : ${response.status}`);
        } else {
            console.log(`[+] Notification Ntfy envoyée pour ${nomSite} - ${nomProduit}`);
        }
    } catch (error) {
        console.error(`[-] Erreur réseau lors de l'envoi Ntfy pour ${nomSite}:`, error.message);
    }
}

async function envoyerHeartbeatNtfy(etatStocks) {
    if (!NTFY_TOPIC) return;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const heureFR = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minutesFR = parseInt(parts.find(p => p.type === 'minute').value, 10);

    const heuresAutorisees = [8, 12, 18, 20, 22];
    let isScheduledReportHour = false;
    
    if (heuresAutorisees.includes(heureFR)) {
        if (minutesFR < 5) {
            isScheduledReportHour = true;
        }
    }

    if (!isScheduledReportHour) return;

    let message = `🤖 BILAN DES STOCKS (${heureFR}h00)\n\n`;
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
                'Title': `Heartbeat (${heureFR}h00)`,
                'Priority': 'low',
                'Tags': 'robot,bar_chart'
            }
        };
        const response = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, fetchArgs);
        
        if (!response.ok) {
            console.error(`[-] Ntfy a refusé le Heartbeat. Statut : ${response.status}`);
        } else {
            console.log(`[+] Notification Ntfy (Heartbeat ${heureFR}h) envoyée.`);
        }
    } catch (error) {
        console.error(`[-] Erreur réseau Heartbeat Ntfy:`, error.message);
    }
}

// Configuration des sites (Sans UltraJeux)
const SITES = [
    {
        nom: "SMYTHS TOYS",
        url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const btn = $('#addToCartForm button[type="submit"], .js-add-to-cart-button');
            
            if (!btn.length) return false;
            if (btn.prop('disabled')) return false;
            if (btn.hasClass('cursor-not-allowed')) return false;
            
            return true;
        }
    },
    {
        nom: "JOUECLUB",
        url: "https://www.joueclub.fr/pokemon/pokemon-30eme-anniversaire-coffret-dresseur-d-elite-0196214144835.html",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const boutonActif = $('.c-product-add-to-cart, .product-actions').length > 0;
            const textePage = $('body').text().toLowerCase();
            
            if (textePage.includes('indisponible')) return false;
            if (textePage.includes('épuisé')) return false;
            
            if (boutonActif) return true;
            if (html.includes('schema.org/InStock')) return true;
            
            return false;
        }
    },
    {
        nom: "MICROMANIA",
        url: "https://www.micromania.fr/recherche?q=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const boutonAchat = $('.add-to-cart, .product-actions');
            if (boutonAchat.length === 0) return false;
            return true;
        }
    },
    {
        nom: "FNAC",
        url: "https://www.fnac.com/SearchResult/ResultList.aspx?Search=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.ResultList-items, .articleList').text().toLowerCase();
            
            if (!zoneProduits) return false;
            if (!zoneProduits.includes("vendu par fnac") && !zoneProduits.includes("vendu et expédié par fnac")) return false;
            
            const boutonAchat = $('.f-buyBox-button, .add-to-cart');
            if (boutonAchat.length === 0) return false;
            return true;
        }
    },
    {
        nom: "KAIRYU",
        url: "https://kairyu.fr/search?q=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-grid, .grid, .product-list').text().toLowerCase();
            
            if (!zoneProduits) return false;
            if (["aucun résultat", "0 résultat", "en réassort", "épuisé", "sold out", "rupture"].some(kw => zoneProduits.includes(kw))) {
                return false;
            }
            return true;
        }
    },
    {
        nom: "DESTOCKTCG",
        url: "https://www.destocktcg.fr/search?type=product&q=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-grid, .grid').text().toLowerCase();
            
            if (!zoneProduits) return false;
            if (["aucun résultat", "0 résultat", "temporairement indisponible", "épuisé", "rupture", "sold out", "prévenez-moi", "en réassort"].some(kw => zoneProduits.includes(kw))) {
                return false;
            }
            return true;
        }
    },
    {
        nom: "KING JOUET",
        url: "https://www.king-jouet.com/jeux-jouets/coffrets-dresseur-pokemon/page1.htm",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const boutonAchat = $('.buy-box, .add-to-cart');
            if (boutonAchat.length === 0) return false;
            return true;
        }
    },
    {
        nom: "CULTURA",
        url: "https://www.cultura.com/search.html?q=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.search-result-items, .product-grid').text().toLowerCase();
            
            if (!zoneProduits) return false;
            if (zoneProduits.includes("vendu par") && !zoneProduits.includes("cultura")) return false;
            
            const boutonAchat = $('.add-to-cart, .cart-button');
            if (boutonAchat.length === 0) return false;
            return true;
        }
    },
    {
        nom: "E.LECLERC",
        url: "https://www.e.leclerc/fp/pokemon-me03-coffret-dresseur-elite-0196214136380",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const content = html.toLowerCase();
            
            if (content.includes('vendu et expédié par') && !content.includes('e.leclerc')) return false;
            if (content.includes('indisponible')) return false;
            if (content.includes('épuisé')) return false;
            
            const boutonAchat = $('button[data-test="add-to-cart"], .btn-add-to-cart');
            let contientAjout = false;
            if (boutonAchat.length > 0) contientAjout = true;
            if (content.includes('schema.org/instock')) contientAjout = true;
            
            let contientRetrait = false;
            if (content.includes('retrait en magasin')) contientRetrait = true;
            if (content.includes('vendu par e.leclerc')) contientRetrait = true;
            
            return contientAjout && contientRetrait;
        }
    },
    {
        nom: "AUCHAN",
        url: "https://www.auchan.fr/recherche?text=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.search-results, .list__container').text().toLowerCase();
            
            if (!zoneProduits) return false;
            if (zoneProduits.includes("vendu par") && !zoneProduits.includes("auchan")) return false;

            const boutonAchat = $('.product-action__button, .btn--primary');
            if (boutonAchat.length === 0) return false;
            return true;
        }
    },
    {
        nom: "CARREFOUR",
        url: "https://www.carrefour.fr/s?q=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-grid, .search-results').text().toLowerCase();
            
            if (!zoneProduits) return false;
            if (zoneProduits.includes("vendu par") && !zoneProduits.includes("carrefour")) return false;

            const boutonAchat = $('.add-to-cart-button, .pl-button');
            if (boutonAchat.length === 0) return false;
            return true;
        }
    }
];

async function verifierTousLesStocks() {
    let etatStocks = {}; 
    let backlog = {};
    let unChangementBacklog = false;

    if (fs.existsSync(BACKLOG_FILE)) {
        try { backlog = JSON.parse(fs.readFileSync(BACKLOG_FILE, 'utf8')); } 
        catch (e) { backlog = {}; }
    }

    const maintenant = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

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

        if (!backlog[site.nom]) {
            backlog[site.nom] = { historique: [], etatActuel: {} };
        }

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
                const htmlLower = html.toLowerCase();
                await context.close();

                // === LE BOUCLIER ANTI-BOT ===
                const motsAntiBot = ["cloudflare", "access denied", "prouver que vous êtes humain", "verify you are human", "checking your browser"];
                let botDetecte = false;
                for (const mot of motsAntiBot) {
                    if (htmlLower.includes(mot)) {
                        botDetecte = true;
                        break;
                    }
                }

                if (botDetecte) {
                    console.log(`[!] Anti-bot ou blocage détecté sur ${site.nom}. Ignore pour ce tour.`);
                    success = true; // On simule un succès pour ne pas retenter inutilement et se faire bannir
                    continue; // On passe au site suivant
                }
                
                // === DÉTECTION INTELLIGENTE DES PRODUITS ===
                let produitsPresentsSurLaPage = [];
                for (const [cleProduit, criteres] of Object.entries(CIBLES)) {
                    let detecte = false;
                    let methode = "";

                    if (html.includes(criteres.ean)) {
                        detecte = true;
                        methode = "EAN";
                    } else {
                        for (const groupeMots of criteres.mots_cles_obligatoires) {
                            let groupeValide = true;
                            for (const mot of groupeMots) {
                                if (!htmlLower.includes(mot)) {
                                    groupeValide = false;
                                    break;
                                }
                            }
                            if (groupeValide) {
                                detecte = true;
                                methode = "Mots-clés stricts";
                                break;
                            }
                        }
                    }

                    if (detecte) {
                        produitsPresentsSurLaPage.push(criteres.nom);
                    }

                    const dernierEtat = backlog[site.nom].etatActuel[cleProduit] !== undefined ? backlog[site.nom].etatActuel[cleProduit] : false;

                    if (detecte !== dernierEtat) {
                        unChangementBacklog = true;
                        backlog[site.nom].etatActuel[cleProduit] = detecte;
                        
                        const evenement = {
                            date: maintenant,
                            produit: cleProduit,
                            statut: detecte ? "APPARITION" : "DISPARITION",
                            methode: detecte ? methode : "N/A"
                        };
                        
                        backlog[site.nom].historique.push(evenement);
                        console.log(`📝 [BACKLOG] NOUVEL ÉVÉNEMENT : ${site.nom} - ${cleProduit} -> ${evenement.statut}`);
                    }
                }

                // === VÉRIFICATION DU BOUTON ACHAT ===
                const estEnStock = site.verifier(html);
                
                let resultatText = '🔴 RUPTURE';
                if (estEnStock) {
                    resultatText = '🟢 EN STOCK (Bouton actif)';
                }
                console.log(`[${site.nom}] Résultat Global : ${resultatText}`);

                // === ALERTE SÉCURISÉE ===
                // On n'alerte que si le bouton achat est actif ET qu'on a formellement reconnu le produit
                if (estEnStock) {
                    if (produitsPresentsSurLaPage.length > 0) {
                        for (const prod of produitsPresentsSurLaPage) {
                            await envoyerNotificationNtfy(site.nom, site.url, prod);
                        }
                    } else {
                        console.log(`[!] Fausse alerte évitée sur ${site.nom} : Bouton achat présent mais aucun produit cible reconnu.`);
                    }
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

    if (unChangementBacklog) {
        fs.writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2));
        console.log("💾 Fichier backlog_pokemon.json mis à jour localement.");
    }

    await envoyerHeartbeatNtfy(etatStocks);
    console.log("\n✅ Vérification terminée.");
}

verifierTousLesStocks();
