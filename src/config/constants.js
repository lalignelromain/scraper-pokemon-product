/**
 * @fileoverview Global constants, targets configuration, and categorized products linked to exact Ntfy topics.
 */

try {
    require('dotenv').config();
} catch (error) {
    // Silently ignore in GitHub Actions
}

const TOPICS = {
    ME_30ANS: process.env.NTFY_TOPIC_30ANS,
    BUNDLE_BLISTER: process.env.NTFY_TOPIC_BUNDLE_BLISTER,
    CARTE: process.env.NTFY_TOPIC_CARTE,
    COFFRET: process.env.NTFY_TOPIC_COFFRET,
    ETB: process.env.NTFY_TOPIC_ETB
};

const CONFIG = {
    HEARTBEAT_HOURS: [8, 16, 22],
    HEARTBEAT_TOPIC: TOPICS.ETB 
};

const CAMPAIGNS = {
    // Campagne 30 ans : Réservée aux Pure Players uniquement
    "SERIE_30_ANS_ME": {
        allowed_merchant_types: ["pure_player"],
        search_query: "pokemon 30 ans",
        merchant_urls: {},
        products: {
            "ETB_ME01_LUCARIO": {
                name: "ETB ME01 - Méga-Évolution - Lucario", ean: "A_COMPLETER", topic: TOPICS.ME_30ANS,
                required_keywords: [ ["etb", "mega", "lucario"], ["coffret", "dresseur", "lucario"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp"]
            },
            "BUNDLE_ME02.5_HEROS": {
                name: "Bundle Pokemon ME02.5 - Héros Transcendant", ean: "A_COMPLETER", topic: TOPICS.BUNDLE_BLISTER,
                required_keywords: [ ["bundle", "héros", "transcendant"], ["bundle", "heros", "transcendant"] ],
                excluded_keywords: ["version japonaise", "version anglaise"]
            }
        }
    },
    // Campagnes Standard (ETB, Coffrets, Blisters, Bundles) : Ouvertes aux Enseignes Physiques ET Pure Players
    "SERIES_STANDARD_ETB_COFFRETS": {
        allowed_merchant_types: ["physical_retailer", "pure_player"],
        search_query: "pokemon coffret etb",
        merchant_urls: {},
        products: {
            "ETB_EV08_ETINCELLES": {
                name: "ETB EV08 - Étincelles Déferlantes", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "étincelles", "déferlantes"], ["etb", "etincelles", "deferlantes"] ],
                excluded_keywords: ["version japonaise", "version anglaise"]
            },
            "COFFRET_STANDARD_POKEMON": {
                name: "Coffret Dresseur / Collection Standard", ean: "A_COMPLETER", topic: TOPICS.COFFRET,
                required_keywords: [ ["coffret", "pokemon"], ["coffret dresseur d'élite"] ],
                excluded_keywords: ["version japonaise"]
            }
        }
    },
    // Campagne Cartes à l'unité : Réservée aux Pure Players uniquement
    "CARTES_A_L_UNITE": {
        allowed_merchant_types: ["pure_player"],
        search_query: "pokemon carte a l'unite", 
        merchant_urls: {},
        products: {
            "SINGLE_GARDE_DE_FER_225": {
                name: "Garde-de-Fer ex 225/162 (Force Temporelle)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ ["garde-de-fer", "225/162"], ["iron", "leaves", "225/162"] ],
                excluded_keywords: ["version japonaise", "carte gradée pca"]
            }
        }
    }
};

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
];

const ANTI_BOT_KEYWORDS = [ "cloudflare", "access denied", "prouver que vous êtes humain", "verify you are human", "checking your browser" ];

module.exports = { CONFIG, CAMPAIGNS, USER_AGENTS, ANTI_BOT_KEYWORDS };
