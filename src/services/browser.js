/**
 * @fileoverview Browser management service using Playwright.
 */

const { chromium } = require('playwright');
const { USER_AGENTS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Returns a random User-Agent string from the configured list.
 * @returns {string} Random User-Agent string.
 */
const getRandomUserAgent = () => {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

/**
 * Launches a new Chromium browser instance.
 * @returns {Promise<import('playwright').Browser|null>} The browser instance, or null if launch fails.
 */
const launchBrowser = async () => {
    try {
        logger.system("Starting Playwright browser instance...");
        const browser = await chromium.launch({ headless: true });
        return browser;
    } catch (error) {
        logger.error(`Failed to launch Playwright: ${error.message}`);
        return null;
    }
};

/**
 * Creates a new browser context and page, navigates to the URL, and fetches the HTML content.
 * Includes a random delay to simulate human behavior.
 * @param {import('playwright').Browser} browser - The active browser instance.
 * @param {string} url - The target URL to scrape.
 * @returns {Promise<string|null>} The raw HTML content, or null if navigation fails.
 */
const fetchPageHtml = async (browser, url) => {
    let context = null;
    try {
        context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            locale: 'fr-FR',
            viewport: { width: 1280, height: 720 }
        });

        const page = await context.newPage();
        
        // Wait until the DOM is parsed. 45s timeout for slower targets.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // Anti-bot mitigation: Random human-like delay between 2s and 5s
        const randomDelay = Math.floor(Math.random() * 3000) + 2000;
        await page.waitForTimeout(randomDelay);

        const html = await page.content();
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
