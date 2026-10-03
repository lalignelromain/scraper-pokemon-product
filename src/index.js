/**
 * @fileoverview Main orchestrator for the Pokemon TCG Scraper.
 */
const cheerio = require('cheerio');
const logger = require('./utils/logger');
const { CAMPAIGNS, ANTI_BOT_KEYWORDS } = require('./config/constants');
const { MERCHANTS } = require('./sites');
const browserService = require('./services/browser');
const backlogService = require('./services/backlog');
const notifierService = require('./services/notifier');

const checkAllInventory = async () => {
    let backlog = backlogService.loadBacklog();
    let hasBacklogChanged = false;
    let inventoryStatus = {}; 
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    logger.system(`Starting Playwright browser engine...`);
    const browser = await browserService.launchBrowser();
    if (!browser) return logger.error("Aborting process: Browser failed to start.");

    for (const merchant of MERCHANTS) {
        // Find all active campaigns that authorize this type of merchant
        const activeCampaigns = [];
        for (const [campaignKey, campaignData] of Object.entries(CAMPAIGNS)) {
            if (campaignData.allowed_merchant_types.includes(merchant.type)) {
                activeCampaigns.push({ key: campaignKey, data: campaignData });
            }
        }

        if (activeCampaigns.length === 0) continue;

        logger.system(`=== Store: ${merchant.name} (Type: ${merchant.type}) ===`);

        if (!backlog[merchant.name] || backlog[merchant.name].historique) {
            backlog[merchant.name] = {}; 
            hasBacklogChanged = true;
        }

        for (const campaign of activeCampaigns) {
            const { key: campaignKey, data: campaignData } = campaign;
            
            // Generate URL: Priority to direct link if it exists, otherwise use site search engine
            const targetUrl = campaignData.merchant_urls?.[merchant.name] || merchant.getSearchUrl(campaignData.search_query);
            
            logger.info(`🔍 Campaign [${campaignKey}] -> URL: ${targetUrl}`);
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
                        success = true; 
                        continue;
                    }

                    // === PRODUCT DETECTION ===
                    let productsFoundOnPage = [];

                    for (const [productKey, targetObj] of Object.entries(campaignData.products)) {
                        if (!backlog[merchant.name][productKey]) {
                            backlog[merchant.name][productKey] = {
                                etat_actuel: false, statut: "🔴 RUPTURE", derniere_modification: "N/A",
                                compteur_apparitions: 0, derniere_apparition: "N/A", derniere_disparition: "N/A"
                            };
                            hasBacklogChanged = true;
                        }

                        let isDetected = false;
                        if (html.includes(targetObj.ean)) {
                            isDetected = true;
                        } else {
                            isDetected = targetObj.required_keywords.some(wordGroup => 
                                wordGroup.every(word => visibleText.includes(word))
                            );
                        }

                        // === LANGUAGE / EXCLUSION FILTER ===
                        if (isDetected && targetObj.excluded_keywords) {
                            if (targetObj.excluded_keywords.some(word => visibleText.includes(word))) {
                                logger.warn(`[FILTER] Product ${productKey} ignored (Foreign keyword detected).`);
                                isDetected = false; 
                            }
                        }

                        if (isDetected) productsFoundOnPage.push(targetObj.name);

                        // === BACKLOG MANAGEMENT ===
                        const lastState = backlog[merchant.name][productKey].etat_actuel;
                        if (isDetected !== lastState) {
                            hasBacklogChanged = true;
                            backlog[merchant.name][productKey].etat_actuel = isDetected;
                            backlog[merchant.name][productKey].statut = isDetected ? "🟢 EN LIGNE" : "🔴 RUPTURE";
                            backlog[merchant.name][productKey].derniere_modification = now;
                            
                            if (isDetected) {
                                backlog[merchant.name][productKey].compteur_apparitions += 1;
                                backlog[merchant.name][productKey].derniere_apparition = now;
                                logger.info(`[RADAR] ${merchant.name} - ${productKey} -> 🟢 APPEARED`);
                            } else {
                                backlog[merchant.name][productKey].derniere_disparition = now;
                                logger.info(`[RADAR] ${merchant.name} - ${productKey} -> 🔴 DISAPPEARED`);
                            }
                        }
                    }

                    // === BUY BUTTON VERIFICATION ===
                    const isGenuinelyInStock = merchant.verifyStock(html);
                    inventoryStatus[merchant.name] = isGenuinelyInStock;
                    
                    if (isGenuinelyInStock) {
                        if (productsFoundOnPage.length > 0) {
                            for (const product of productsFoundOnPage) {
                                await notifierService.sendStockAlert(merchant.name, targetUrl, product);
                            }
                        } else {
                            logger.warn(`False positive on ${merchant.name}: Buy button active, but no exact product match.`);
                        }
                    }
                    success = true;

                } catch (error) {
                    logger.error(`Error on ${merchant.name} [${campaignKey}] (Attempt ${attempt}/2): ${error.message}`);
                }
            }
        }
    }

    await browser.close();
    if (hasBacklogChanged) backlogService.saveBacklog(backlog);
    await notifierService.sendHeartbeat(inventoryStatus);
    logger.success("Verification cycle complete.\n");
};

checkAllInventory();
