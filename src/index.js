/**
 * @fileoverview Main orchestrator with Scoped Extraction and State persistence.
 */
const fs = require('fs');
const cheerio = require('cheerio');
const logger = require('./utils/logger');
const { CAMPAIGNS, ANTI_BOT_KEYWORDS } = require('./config/constants');
const { MERCHANTS } = require('./sites');
const browserService = require('./services/browser');
const notifierService = require('./services/notifier');

const STATE_FILE = './stock_state.json';

const checkAllInventory = async () => {
    let previousState = {};
    if (fs.existsSync(STATE_FILE)) {
        previousState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    let currentState = {}; 

    logger.system(`Starting Playwright Stealth engine...`);
    const browser = await browserService.launchBrowser();
    if (!browser) return;

    for (const merchant of MERCHANTS) {
        // Pour les cartes à l'unité, on cible uniquement la campagne correspondante
        const campaignData = CAMPAIGNS["CARTES_A_L_UNITE"];
        if (!campaignData.allowed_merchant_types.includes(merchant.type)) continue;

        logger.system(`=== Store: ${merchant.name} ===`);

        for (const [productKey, targetObj] of Object.entries(campaignData.products)) {
            const stateKey = `${merchant.name}_${productKey}`;
            const wasInStock = previousState[stateKey] || false;
            let isInStockNow = false;
            
            const targetUrl = merchant.getSearchUrl(targetObj.search_query);
            let success = false;

            for (let attempt = 1; attempt <= 2; attempt++) {
                if (success) break;

                try {
                    const html = await browserService.fetchPageHtml(browser, targetUrl);
                    if (!html) {
                        logger.warn(`Skipping empty HTML for ${merchant.name}`);
                        success = true;
                        continue;
                    }

                    const $ = cheerio.load(html);
                    const visibleText = $('body').text().toLowerCase();

                    // === ANTI-BOT SHIELD ===
                    if (ANTI_BOT_KEYWORDS.some(kw => visibleText.includes(kw))) {
                        logger.warn(`Anti-bot block on ${merchant.name}. Retaining memory state.`);
                        currentState[stateKey] = wasInStock; // On maintient l'état
                        success = true; 
                        continue;
                    }

                    // === SCOPED EXTRACTION (Lecture par conteneur) ===
                    const productBlocks = $(merchant.productBlockSelector).toArray();
                    
                    for (const block of productBlocks) {
                        const blockText = $(block).text().toLowerCase();
                        
                        // 1. Validation Nom
                        const hasName = targetObj.validation.must_include_one_name.some(name => blockText.includes(name));
                        if (!hasName) continue; // On passe au bloc suivant

                        // 2. Validation Numéro
                        const hasNumber = targetObj.validation.must_include_one_number.some(num => blockText.includes(num));
                        if (!hasNumber) continue;

                        // 3. Validation Marqueur (Optionnel)
                        if (targetObj.validation.must_include_one_marker) {
                            const hasMarker = targetObj.validation.must_include_one_marker.some(marker => blockText.includes(marker));
                            if (!hasMarker) continue;
                        }

                        // 4. Blacklist Globale & Spécifique
                        const hasBlacklistedWord = targetObj.validation.must_not_include.some(badWord => blockText.includes(badWord));
                        if (hasBlacklistedWord) continue;

                        // 5. Arrivé ici, la carte est EXACTEMENT la bonne. On vérifie son stock.
                        if (merchant.verifyStock($, block)) {
                            isInStockNow = true;
                            break; // Le produit est trouvé et en stock, inutile de vérifier les autres blocs
                        }
                    }

                    // === MACHINE A ETATS ET NOTIFICATIONS ===
                    currentState[stateKey] = isInStockNow; 

                    if (isInStockNow && !wasInStock) {
                        logger.info(`[ALERTE] 🟢 ${targetObj.display_name} en STOCK chez ${merchant.name}`);
                        await notifierService.sendStockAlert(merchant.name, targetUrl, targetObj.display_name, targetObj.topic, "IN_STOCK");
                    } 
                    else if (!isInStockNow && wasInStock) {
                        logger.info(`[ALERTE] 🔴 ${targetObj.display_name} en RUPTURE chez ${merchant.name}`);
                        await notifierService.sendStockAlert(merchant.name, targetUrl, targetObj.display_name, targetObj.topic, "OUT_OF_STOCK");
                    }
                    
                    success = true;

                } catch (error) {
                    logger.error(`Error on ${merchant.name} [${productKey}]: ${error.message}`);
                    if (attempt === 2) currentState[stateKey] = wasInStock; // Sécurité au bout du 2e essai
                }
            }
        }
    }

    await browser.close();
    fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2));
    logger.success("Verification cycle complete. State memory saved.\n");
};

checkAllInventory();
