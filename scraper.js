try {
    require('dotenv').config();
} catch (e) {
    // Ignoré silencieusement sur GitHub Actions
}

const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

// Configuration
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const BACKLOG_FILE = 'backlog_pokemon.json';

// Cibles de surveillance enrichies pour dissocier les alertes Ntfy
const CIBLES = {
    "ETB_30ANS": { nom: "ETB 30ème Anniversaire", ean: "0196214144835", keywords: ["coffret dresseur d'élite", "etb 30"] },
    "MINI_TIN_NUIT": { nom: "Mini Tin NUIT (Mewtwo)", ean: "0196214146655", keywords: ["nuit mewtwo", "mini tin nuit"] },
    "MINI_TIN_JOUR": { nom: "Mini Tin JOUR (Mew)", ean: "0196214146402", keywords: ["jour mew", "mini tin jour"] }
};

// --- DIAGNOSTIC D'ENVIRONNEMENT ---
console.log("=== VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT ===");
if (!NTFY_TOPIC) {
    console.log("⚠️  ATTENTION : NTFY_TOPIC est indéfini ! Les notifications ne partiront pas.");
} else {
    console.log(`✅ NTFY_TOPIC détecté (Canal: ***).`);
}
console.log("==================================================\n");

// Utilitaires
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 🚨 Notification URGENTE (Spécifique par produit)
async function envoyerNotificationNtfy(nomSite, url, nomProduit) {
    if (!NTFY_TOPIC) {
        console.log(`[!] Notification ignorée : NTFY_TOPIC non défini.`);
        return;
    }

    try {
        const fetchArgs = {
            method: 'POST',
            body: `🚨 ALERTE STOCK 🚨\nLe produit [ ${nomProduit} ] est EN STOCK sur ${nomSite} !\nLien : ${url}`,
            headers: {
                'Title': `Pokémon 30e : ${nomProduit} !`,
                'Priority': 'urgent',
                'Tags': 'rotating_light,pokemon'
            }
        };
        await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, fetchArgs);
        console.log(`[+] Notification Ntfy envoyée pour ${nomSite} - ${nomProduit}`);
    } catch (error) {
        console.error(`[-] Erreur lors de l'envoi Ntfy pour ${nomSite}:`, error.message);
    }
}

// 💓 Notification HEARTBEAT optimisée pour GitHub Actions
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

    // Déclenchement uniquement dans les 5 premières minutes des heures clés
    const isScheduledReportHour = [8, 12, 18, 22].includes(heureFR) && minutesFR < 15;

    if (!isScheduledReportHour) {
        return;
    }

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
                'Title': `💓 Heartbeat (${heureFR}h00)`,
                'Priority': 'low',
                'Tags': 'robot,bar_chart'
            }
        };
        await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, fetchArgs);
        console.log(`[+] Notification Ntfy (Heartbeat ${heureFR}h) envoyée.`);
    } catch (error) {
        console.error(`[-] Erreur Heartbeat Ntfy:`, error.message);
    }
}

// Configuration des sites AVEC LES SÉLECTEURS CHEERIO STRICTS
const SITES = [
    {
        nom: "SMYTHS TOYS",
        url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const btn = $('#addToCartForm button[type="submit"], .js-add-to-cart-button');
            if (!btn.length || btn.prop('disabled') || btn.hasClass('cursor-not-allowed')) return false;
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
            
            if (textePage.includes('indisponible') || textePage.includes('épuisé')) return false;
            return boutonActif || html.includes('schema.org/InStock');
        }
    },
    {
        nom: "MICROMANIA",
        url: "https://www.micromania.fr/recherche?q=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.search-results, .product-grid').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat")) return false;
            
            const boutonAchat = $('.add-to-cart, .product-actions');
            if (boutonAchat.length === 0) return false;

            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "FNAC",
        url: "https://www.fnac.com/SearchResult/ResultList.aspx?Search=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.ResultList-items, .articleList').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat")) return false;
            if (!zoneProduits.includes("vendu par fnac") && !zoneProduits.includes("vendu et expédié par fnac")) return false;
            
            const boutonAchat = $('.f-buyBox-button, .add-to-cart');
            if (boutonAchat.length === 0) return false;

            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "KAIRYU",
        url: "https://kairyu.fr/search?q=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-grid, .grid, .product-list').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("0 résultat")) return false;
            if (zoneProduits.includes("en réassort") || zoneProduits.includes("épuisé") || zoneProduits.includes("sold out") || zoneProduits.includes("rupture")) return false;
            
            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "DESTOCKTCG",
        url: "https://www.destocktcg.fr/search?type=product&q=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-grid, .grid').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("0 résultat")) return false;
            if (["temporairement indisponible", "épuisé", "rupture", "sold out", "prévenez-moi", "en réassort"].some(kw => zoneProduits.includes(kw))) return false;
            
            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "ULTRAJEUX",
        url: "https://www.ultrajeux.com/search.php?search=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.contenu, .products-list').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("0 article")) return false;
            if (["indisponible", "épuisé", "rupture", "en réassort"].some(kw => zoneProduits.includes(kw))) return false;
            
            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "KING JOUET",
        url: "https://www.king-jouet.com/jeux-jouets/coffrets-dresseur-pokemon/page1.htm",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-list, .product-grid').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("aucun resultat")) return false;
            
            const boutonAchat = $('.buy-box, .add-to-cart');
            if (boutonAchat.length === 0) return false;

            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "CULTURA",
        url: "https://www.cultura.com/search.html?q=pokemon+30",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.search-result-items, .product-grid').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("0 résultat")) return false;
            if (zoneProduits.includes("vendu par") && !zoneProduits.includes("cultura")) return false;
            
            const boutonAchat = $('.add-to-cart, .cart-button');
            if (boutonAchat.length === 0) return false;

            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "E.LECLERC",
        url: "https://www.e.leclerc/fp/pokemon-me03-coffret-dresseur-elite-0196214136380",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const content = html.toLowerCase();
            
            if (content.includes('vendu et expédié par') && !content.includes('e.leclerc')) return false;
            if (content.includes('indisponible') || content.includes('épuisé')) return false;
            
            const boutonAchat = $('button[data-test="add-to-cart"], .btn-add-to-cart');
            let contientAjout = boutonAchat.length > 0 || content.includes('schema.org/instock');
            let contientRetrait = content.includes('retrait en magasin') || content.includes('vendu par e.leclerc');
            
            return contientAjout && contientRetrait;
        }
    },
    {
        nom: "AUCHAN",
        url: "https://www.auchan.fr/recherche?text=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.search-results, .list__container').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("0 résultat")) return false;
            if (zoneProduits.includes("vendu par") && !zoneProduits.includes("auchan")) return false;

            const boutonAchat = $('.product-action__button, .btn--primary');
            if (boutonAchat.length === 0) return false;

            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    },
    {
        nom: "CARREFOUR",
        url: "https://www.carrefour.fr/s?q=pokemon+30+ans",
        verifier: (html) => {
            const $ = cheerio.load(html);
            const zoneProduits = $('.product-grid, .search-results').text().toLowerCase();
            if (!zoneProduits || zoneProduits.includes("aucun résultat") || zoneProduits.includes("désolé") || zoneProduits.includes("ne donne aucun résultat")) return false;
            if (zoneProduits.includes("vendu par") && !zoneProduits.includes("carrefour")) return false;

            const boutonAchat = $('.add-to-cart-button, .pl-button');
            if (boutonAchat.length === 0) return false;

            return ["célébration", "30 ans", "anniversaire", "celebrations"].some(kw => zoneProduits.includes(kw));
        }
    }
];

// Logique principale
async function verifierTousLesStocks() {
    let etatStocks = {}; 
    let backlog = {};
    let unChangementBacklog = false;

    // Chargement du backlog existant
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
                
                // === ÉTAPE 1 : SCRUTATION DU BACKLOG (EAN & Mots-Clés) ===
                let produitsPresentsSurLaPage = [];
                for (const [cleProduit, criteres] of Object.entries(CIBLES)) {
                    let detecte = false;
                    let methode = "";

                    if (html.includes(criteres.ean)) {
                        detecte = true;
                        methode = "EAN";
                    } else if (criteres.keywords.some(kw => htmlLower.includes(kw))) {
                        detecte = true;
                        methode = "Mots-clés";
                    }

                    if (detecte) {
                        produitsPresentsSurLaPage.push(criteres.nom);
                    }

                    const dernierEtat = backlog[site.nom].etatActuel[cleProduit] || false;

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

                // === ÉTAPE 2 : VÉRIFICATION TRADITIONNELLE DU STOCK ===
                const estEnStock = site.verifier(html);
                
                let resultatText = '🔴 RUPTURE';
                if (estEnStock) {
                    resultatText = '🟢 EN STOCK';
                }
                console.log(`[${site.nom}] Résultat Global : ${resultatText}`);

                if (estEnStock) {
                    // Envoi d'alertes Ntfy distinctes selon les produits détectés
                    if (produitsPresentsSurLaPage.length > 0) {
                        for (const prod of produitsPresentsSurLaPage) {
                            await envoyerNotificationNtfy(site.nom, site.url, prod);
                        }
                    } else {
                        // Cas de secours si le vérificateur valide mais que les EANs stricts n'ont pas matché
                        await envoyerNotificationNtfy(site.nom, site.url, "Produit 30ème Anniversaire générique");
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

    // === ÉTAPE 3 : SAUVEGARDE DU BACKLOG SEULEMENT SI MODIFICATION ===
    if (unChangementBacklog) {
        fs.writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2));
        console.log("💾 Fichier backlog_pokemon.json mis à jour localement.");
    }

    await envoyerHeartbeatNtfy(etatStocks);
    console.log("\n✅ Vérification terminée.");
}

verifierTousLesStocks();
