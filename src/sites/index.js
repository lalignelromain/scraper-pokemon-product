/**
 * @fileoverview Main orchestrator for the Pokemon TCG Scraper (Stabilized Version).
 */
const cheerio = require('cheerio');
const { CAMPAIGNS, ANTI_BOT_KEYWORDS } = require('./config/constants');
const { MERCHANTS } = require('./sites');
const browserService = require('./services/browser');
const notifierService = require('./services/notifier');

const checkAllInventory = async () => {
    let inventoryStatus = {}; 

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

        logger.system(`=== Store: ${merchant.name} (Type: ${merchant.type}) ===`);

        for (const campaign of activeCampaigns) {
            const { key: campaignKey, data: campaignData } = campaign;
            
            let targetUrl = merchant.getSearchUrl(campaignData.search_query);
            if (campaignData.merchant_urls) {
                if (campaignData.merchant_urls[merchant.name]) {
                    targetUrl = campaignData.merchant_urls[merchant.name];
                }
            }
            
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
                        let isDetected = false;
                        if (html.includes(targetObj.ean)) {
                            isDetected = true;
                        } else {
                            isDetected = targetObj.required_keywords.some(wordGroup => 
                                wordGroup.every(word => visibleText.includes(word))
                            );
                        }

                        // === PRECISE EXCLUSION FILTER ===
                        if (isDetected) {
                            if (targetObj.excluded_keywords) {
                                const matchExclusion = targetObj.excluded_keywords.some(phrase => visibleText.includes(phrase));
                                if (matchExclusion) {
                                    logger.warn(`[FILTER] Product ${productKey} ignored (Strict exclusion keyword matched).`);
                                    isDetected = false; 
                                }
                            }
                        }

                        if (isDetected) {
                            productsFoundOnPage.push(targetObj.name);
                            logger.info(`[RADAR] ${merchant.name} - ${productKey} -> 🟢 DETECTED ON PAGE`);
                        }
                    }

                    // === BUY BUTTON VERIFICATION ===
                    const isGenuinelyInStock = merchant.verifyStock(html);
                    inventoryStatus[merchant.name] = isGenuinelyInStock;
                    
                    if (isGenuinelyInStock) {
                        if (productsFoundOnPage.length > 0) {
                            for (const product of productsFoundOnPage) {
                                let productTopic = null;
                                for (const [pKey, pObj] of Object.entries(campaignData.products)) {
                                    if (pObj.name === product) {
                                        productTopic = pObj.topic;
                                    }
                                }
                                await notifierService.sendStockAlert(merchant.name, targetUrl, product, productTopic);
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
    await notifierService.sendHeartbeat(inventoryStatus);
    logger.success("Verification cycle complete.\n");
};

checkAllInventory();
