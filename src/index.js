/**
 * @fileoverview Main orchestrator with state persistence (No spam version).
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
    // 1. Charger la mémoire du passage précédent
    let previousState = {};
    if (fs.existsSync(STATE_FILE)) {
        previousState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    let currentState = {}; 

    logger.system(`Starting Playwright browser engine...`);
    const browser = await browserService.launchBrowser();
    if (!browser) {
        logger.error("Aborting process: Browser failed to start.");
        return;
    }

    for (const merchant of MERCHANTS) {
        const activeCampaigns = [];
        for (const [campaignKey, campaignData] of Object.entries(CAMPAIGNS)) {
            if (campaignData.allowed_merchant_types.includes(merchant.type)) {
                activeCampaigns.push({ key: campaignKey, data: campaignData });
            }
        }

        if (activeCampaigns.length === 0) continue;

        logger.system(`=== Store: ${merchant.name} ===`);

        for (const campaign of activeCampaigns) {
            const { key: campaignKey, data: campaignData } = campaign;
            
            let targetUrl = merchant.getSearchUrl(campaignData.search_query);
            if (campaignData.merchant_urls && campaignData.merchant_urls[merchant.name]) {
                targetUrl = campaignData.merchant_urls[merchant.name];
            }
            
            let success = false;

            for (let attempt = 1; attempt <= 2; attempt++) {
                if (success) break;

                try {
                    const html = await browserService.fetchPageHtml(browser, targetUrl);
                    if (!html) throw new Error("Failed to retrieve HTML content.");

                    const htmlLower = html.toLowerCase();
                    const visibleText = cheerio.load(html)('body').text().toLowerCase();

                    // === ANTI-BOT SHIELD ===
                    if (ANTI_BOT_KEYWORDS.some(kw => htmlLower.includes(kw))) {
                        logger.warn(`Anti-bot block on ${merchant.name}. Skipping this campaign.`);
                        // On conserve l'état précédent pour ne pas déclencher de fausse rupture
                        for (const productKey of Object.keys(campaignData.products)) {
                            const stateKey = `${merchant.name}_${productKey}`;
                            currentState[stateKey] = previousState[stateKey] || false;
                        }
                        success = true; 
                        continue;
                    }

                    const isGenuinelyInStock = merchant.verifyStock(html);

                    for (const [productKey, targetObj] of Object.entries(campaignData.products)) {
                        let isDetected = false;
                        if (html.includes(targetObj.ean) && targetObj.ean !== "N/A") {
                            isDetected = true;
                        } else {
                            isDetected = targetObj.required_keywords.some(wordGroup => 
                                wordGroup.every(word => visibleText.includes(word))
                            );
                        }

                        if (isDetected && targetObj.excluded_keywords) {
                            const matchExclusion = targetObj.excluded_keywords.some(phrase => visibleText.includes(phrase));
                            if (matchExclusion) isDetected = false; 
                        }

                        // Analyse du changement d'état
                        const stateKey = `${merchant.name}_${productKey}`;
                        const wasInStock = previousState[stateKey] || false;
                        const isInStockNow = isDetected && isGenuinelyInStock;

                        currentState[stateKey] = isInStockNow; // On enregistre le nouvel état

                        if (isInStockNow && !wasInStock) {
                            logger.info(`[ALERTE] 🟢 ${targetObj.name} est de retour en STOCK chez ${merchant.name}`);
                            await notifierService.sendStockAlert(merchant.name, targetUrl, targetObj.name, targetObj.topic, "IN_STOCK");
                        } 
                        else if (!isInStockNow && wasInStock) {
                            logger.info(`[ALERTE] 🔴 ${targetObj.name} est tombé en RUPTURE chez ${merchant.name}`);
                            await notifierService.sendStockAlert(merchant.name, targetUrl, targetObj.name, targetObj.topic, "OUT_OF_STOCK");
                        } 
                        else if (isInStockNow && wasInStock) {
                            logger.info(`[MÉMOIRE] ${merchant.name} - ${productKey} -> Toujours en stock (Silence)`);
                        }
                    }
                    success = true;

                } catch (error) {
                    logger.error(`Error on ${merchant.name} [${campaignKey}]: ${error.message}`);
                }
            }
        }
    }

    await browser.close();
    
    // 2. Sauvegarder la mémoire pour le prochain run
    fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2));
    logger.success("Verification cycle complete. State memory saved.\n");
};

checkAllInventory();
