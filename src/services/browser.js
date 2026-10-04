/**
 * @fileoverview Browser management service using Playwright with Stealth Plugin.
 */

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { USER_AGENTS } = require('../config/constants');
const logger = require('../utils/logger');

// Activation du mode furtif (bypass Cloudflare/Datadome)
chromium.use(stealth);

/**
 * Returns a random User-Agent string from the configured list.
 * @returns {string} Random User-Agent string.
 */
const getRandomUserAgent = () => {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

/**
 * Launches a new Chromium browser instance.
 * @returns {Promise<import('playwright').Browser|null>} The browser instance.
 */
const launchBrowser = async () => {
    try {
        logger.system("Starting Playwright Stealth browser instance...");
        const browser = await chromium.launch({ headless: true });
        return browser;
    } catch (error) {
        logger.error(`Failed to launch Playwright: ${error.message}`);
        return null;
    }
};

/**
 * Creates a new browser context and page, navigates to the URL, and fetches HTML.
 * @param {import('playwright').Browser} browser - The active browser instance.
 * @param {string} url - The target URL to scrape.
 * @returns {Promise<string|null>} The raw HTML content.
 */
const fetchPageHtml = async (browser, url) => {
    let context = null;
    try {
        context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            locale: 'fr-FR',
            viewport: { width: 1280, height: 720 },
            // On ajoute des permissions basiques pour simuler un vrai navigateur
            permissions: ['geolocation'] 
        });

        const page = await context.newPage();
        
        // Navigation initiale
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // Délai humain aléatoire (2s à 5s)
        const randomDelay = Math.floor(Math.random() * 3000) + 2000;
        await page.waitForTimeout(randomDelay);

        let html = null;
        try {
            html = await page.content();
        } catch (contentError) {
            // CORRECTION CARDS HUNTER : Si la page redirige pendant qu'on tente de lire le code
            if (contentError.message.includes('navigating')) {
                logger.warn(`Redirection en cours détectée sur ${url}. Attente de stabilisation...`);
                await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                html = await page.content();
            } else {
                throw contentError;
            }
        }

        return html;

    } catch (error) {
        logger.error(`Navigation failed for ${url}: ${error.message}`);
        return null;
    } finally {
        if (context) {
            await context.close();
        }
    }
};

module.exports = {
    launchBrowser,
    fetchPageHtml
};
