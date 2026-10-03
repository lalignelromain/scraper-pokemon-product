/**
 * @fileoverview Main orchestrator for the Pokemon TCG Scraper.
 * Coordinates browser automation, parsing, backlog management, and notifications.
 */

const cheerio = require('cheerio');
const logger = require('./utils/logger');
const { CAMPAIGNS, ANTI_BOT_KEYWORDS } = require('./config/constants');
const { MERCHANTS } = require('./sites');
const browserService = require('./services/browser');
const backlogService = require('./services/backlog');
const notifierService = require('./services/notifier');

/**
 * Main execution flow.
 */
const checkAllInventory = async () => {
    let backlog = backlogService.loadBacklog();
    let hasBacklogChanged = false;
    let inventoryStatus = {}; 

    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    logger.system(`Starting Playwright browser engine...`);
    const browser = await browserService.launchBrowser();
    if (!browser) {
        logger.error("Aborting process: Browser failed to start.");
        return;
    }

    for (const merchant of MERCHANTS) {
        logger.system(`Checking inventory for: ${merchant.name} (Type: ${merchant.type})`);
        let success = false;

        // Determine which products this merchant is allowed to sell based on campaign rules
        let activeTargetsForMerchant = {};
        for (const [campaignKey, campaignData] of Object.entries(CAMPAIGNS)) {
            if (campaignData.allowed_merchant_types.includes(merchant.type)) {
                // Merge all allowed products into a single verification list for this merchant
                Object.assign(activeTargetsForMerchant, campaignData.products);
            }
        }

        // If no products are scheduled to be checked on this site, skip entirely to save resources
        if (Object.keys(activeTargetsForMerchant).length === 0) {
            logger.info(`Skipping ${merchant.name}: No active campaigns target this merchant type.`);
            continue;
        }

        // Initialize merchant in backlog if it doesn't exist
        if (!backlog[merchant.name] || backlog[merchant.name].historique) {
            backlog[merchant.name] = {}; 
            hasBacklogChanged = true;
        }

        // Retry loop: 2 attempts max per merchant
        for (let attempt = 1; attempt <= 2; attempt++) {
            if (success) break;

            try {
                const html = await browserService.fetchPageHtml(browser, merchant.url);
                if (!html) throw new Error("Failed to retrieve HTML content.");

                const htmlLower = html.toLowerCase();
                const $ = cheerio.load(html);
                const visibleText = $('body').text().toLowerCase();

                // === ANTI-BOT SHIELD ===
                const isBotDetected = ANTI_BOT_KEYWORDS.some(kw => htmlLower.includes(kw));
                if (isBotDetected) {
                    logger.warn(`Anti-bot or block detected on ${merchant.name}. Skipping for this run.`);
                    success = true; 
                    continue;
                }

                // === SMART TARGET DETECTION ON VISIBLE TEXT ===
                let productsFoundOnPage = [];

                for (const [productKey, targetObj] of Object.entries(activeTargetsForMerchant)) {
                    // Initialize product state in backlog if missing
                    if (!backlog[merchant.name][productKey]) {
                        backlog[merchant.name][productKey] = {
                            etat_actuel: false,
                            statut: "🔴 RUPTURE",
                            derniere_modification: "N/A",
                            compteur_apparitions: 0,
                            derniere_apparition: "N/A",
                            derniere_disparition: "N/A"
                        };
                        hasBacklogChanged = true;
                    }

                    let isDetected = false;

                    if (html.includes(targetObj.ean)) {
                        isDetected = true;
                    } else {
                        // Strict keywords check
                        for (const wordGroup of targetObj.required_keywords) {
                            const isGroupValid = wordGroup.every(word => visibleText.includes(word));
                            if (isGroupValid) {
                                isDetected = true;
                                break;
                            }
                        }
                    }

                    // === LANGUAGE / EXCLUSION FILTER ===
                    if (isDetected && targetObj.excluded_keywords) {
                        const hasExcludedWord = targetObj.excluded_keywords.some(word => visibleText.includes(word));
                        if (hasExcludedWord) {
                            logger.warn(`[FILTER] Product ${productKey} detected but ignored due to foreign language keyword.`);
                            isDetected = false; 
                        }
                    }

                    if (isDetected) {
                        productsFoundOnPage.push(targetObj.name);
                    }

                    // Compare with last known state to detect changes
                    const lastKnownState = backlog[merchant.name][productKey].etat_actuel;
                    
                    if (isDetected !== lastKnownState) {
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
                
                logger.info(`Global Status for ${merchant.name}: ${isGenuinelyInStock ? '🟢 IN STOCK (Active Button)' : '🔴 OUT OF STOCK'}`);

                // === SECURE ALERTS ===
                if (isGenuinelyInStock) {
                    if (productsFoundOnPage.length > 0) {
                        for (const product of productsFoundOnPage) {
                            await notifierService.sendStockAlert(merchant.name, merchant.url, product);
                        }
                    } else {
                        logger.warn(`False positive avoided on ${merchant.name}: Buy button found, but no target products matched.`);
                    }
                }

                success = true;

            } catch (error) {
                logger.error(`Error processing ${merchant.name} (Attempt ${attempt}/2): ${error.message}`);
                if (attempt === 2) {
                    logger.error(`Failed to verify ${merchant.name} after 2 attempts.`);
                }
            }
        }
    }

    await browser.close();
    logger.system("Browser closed.");

    if (hasBacklogChanged) {
        backlogService.saveBacklog(backlog);
    } else {
        logger.info("No backlog changes detected.");
    }

    await notifierService.sendHeartbeat(inventoryStatus);
    logger.success("Verification cycle complete.\n");
};

// Execute the script
checkAllInventory();
