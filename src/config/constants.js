/**
 * @fileoverview Global constants, targets configuration, and static data arrays.
 */

try {
    require('dotenv').config();
} catch (error) {
    // Silently ignore in GitHub Actions
}

/**
 * Global application configuration.
 */
const CONFIG = {
    NTFY_TOPIC: process.env.NTFY_TOPIC,
    BACKLOG_FILE: 'backlog_pokemon.json',
    HEARTBEAT_HOURS: [8, 16, 22] // Hours (FR timezone) when the system sends a status report
};

/**
 * Pokemon TCG products to track, grouped by series.
 * Each series defines which merchant types it should be scraped against.
 */
const CAMPAIGNS = {
    "SERIE_30_ANS": {
        // 30th anniversary items are physical-only in large retailers, so we only scrape pure online players
        allowed_merchant_types: ["pure_player"],
        products: {
            "ETB_30ANS": {
                name: "ETB 30eme Anniversaire",
                ean: "0196214144835",
                required_keywords: [ ["coffret", "dresseur", "30"], ["etb", "30"] ]
            },
            "MINI_TIN_NUIT": {
                name: "Mini Tin NUIT (Mewtwo)",
                ean: "0196214146655",
                required_keywords: [ ["mini tin", "nuit"], ["mini tin", "mewtwo"] ]
            },
            "MINI_TIN_JOUR": {
                name: "Mini Tin JOUR (Mew)",
                ean: "0196214146402",
                required_keywords: [ ["mini tin", "jour"], ["mini tin", "mew"] ]
            }
        }
    },
    "FORCE_TEMPORELLE": {
        // Regular expansions are sold everywhere, so we scrape all merchant types
        allowed_merchant_types: ["physical_retailer", "pure_player"],
        products: {
            "ETB_FORCE_TEMPORELLE": {
                name: "ETB Force Temporelle (Vert-de-Fer / Serpente-Eau)",
                ean: "0196214146105", 
                required_keywords: [ ["coffret", "dresseur", "temporelle"], ["etb", "temporelle"] ]
            }
        }
    }
};

/**
 * Array of desktop User-Agents to prevent basic fingerprinting.
 */
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
];

/**
 * Keywords indicating the scraper has been blocked by anti-bot protections.
 */
const ANTI_BOT_KEYWORDS = [
    "cloudflare", 
    "access denied", 
    "prouver que vous êtes humain", 
    "verify you are human", 
    "checking your browser"
];

module.exports = {
    CONFIG,
    CAMPAIGNS,
    USER_AGENTS,
    ANTI_BOT_KEYWORDS
};
