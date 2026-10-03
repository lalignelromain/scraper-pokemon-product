/**
 * @fileoverview Main orchestrator for the Pokemon TCG Scraper.
 * Coordinates browser automation, parsing, backlog management, and notifications.
 */

const cheerio = require('cheerio');
const logger = require('./utils/logger');
const { TARGETS, ANTI_BOT_KEYWORDS } = require('./config/constants');
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

    // FILTER ACTIVE MERCHANTS
    // Currently tracking 30th anniversary items, which are physical-only in large retailers.
    // We only scrape pure online players for now.
    const activeMerchants = MERCHANTS.filter(m => m.type === 'pure_player');

    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    logger.system(`Starting Playwright browser engine for ${activeMerchants.length} targeted merchants...`);
    const browser = await browserService.launchBrowser();
    if (!browser) {
        logger.error("Aborting process: Browser failed to start.");
        return;
    }

    for (const merchant of activeMerchants) {
        logger.system(`Checking inventory for: ${merchant.name}`);
        let success = false;

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
                    success = true; // We skip cleanly, no need to retry
                    continue;
                }

                // === SMART TARGET DETECTION ON VISIBLE TEXT ===
                let productsFoundOnPage = [];

                for (const [productKey, targetObj] of Object.entries(TARGETS)) {
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
