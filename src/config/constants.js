/**
 * @fileoverview Global constants, targets configuration, and static data arrays.
 */

try {
    require('dotenv').config();
} catch (error) {
    // Silently ignore in GitHub Actions
}

const TOPICS = {
    ME_30ANS: process.env.NTFY_TOPIC_30ANS,
    ETB: process.env.NTFY_TOPIC_ETB,
    COFFRET: process.env.NTFY_TOPIC_COFFRET,
    BUNDLE_BLISTER: process.env.NTFY_TOPIC_BUNDLE_BLISTER,
    CARTE: process.env.NTFY_TOPIC_CARTE
};

const CONFIG = {
    BACKLOG_FILE: 'backlog_pokemon.json',
    HEARTBEAT_HOURS: [8, 16, 22],
    HEARTBEAT_TOPIC: TOPICS.ETB 
};

const CAMPAIGNS = {
    "SERIE_30_ANS_ME": {
        allowed_merchant_types: ["pure_player"],
        search_query: "pokemon 30 ans",
        merchant_urls: {},
        products: {
            "ETB_ME01_LUCARIO": {
                name: "ETB ME01 - Méga-Évolution - Lucario", ean: "A_COMPLETER", topic: TOPICS.ME_30ANS,
                required_keywords: [ ["etb", "mega", "lucario"], ["coffret", "dresseur", "lucario"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "ETB_ME01_GARDEVOIR": {
                name: "ETB ME01 - Méga-Évolution - Gardevoir", ean: "A_COMPLETER", topic: TOPICS.ME_30ANS,
                required_keywords: [ ["etb", "mega", "gardevoir"], ["coffret", "dresseur", "gardevoir"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "ETB_ME02.5_HEROS": {
                name: "ETB ME02.5 - Héro Transcendant", ean: "A_COMPLETER", topic: TOPICS.ME_30ANS,
                required_keywords: [ ["etb", "héros", "transcendant"], ["etb", "heros", "transcendant"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "BUNDLE_ME02.5_HEROS": {
                name: "Bundle Pokemon ME02.5 - Héros Transcendant", ean: "A_COMPLETER", topic: TOPICS.ME_30ANS,
                required_keywords: [ ["bundle", "héros", "transcendant"], ["bundle", "heros", "transcendant"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "TRIPACK_ME03_EQUILIBRE": {
                name: "Tripack ME03 - Equilibre Parfait", ean: "A_COMPLETER", topic: TOPICS.ME_30ANS,
                required_keywords: [ ["tripack", "equilibre", "parfait"], ["blister", "3", "equilibre"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            }
        }
    },
    "SERIES_ECARLATE_VIOLET": {
        allowed_merchant_types: ["physical_retailer", "pure_player"],
        search_query: "pokemon ecarlate violet",
        merchant_urls: {},
        products: {
            "ETB_EV08_ETINCELLES": {
                name: "ETB EV08 - Étincelles Déferlantes", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "étincelles", "déferlantes"], ["etb", "etincelles", "deferlantes"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "ETB_EV08.5_PRISMATIQUES": {
                name: "ETB EV08.5 - Evolutions Prismatiques", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "evolutions", "prismatiques"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "ETB_EV10_RIVALITES": {
                name: "ETB EV10 - Rivalités Destinées", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "rivalités", "destinées"], ["etb", "rivalite", "destinee"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "ETB_EV10.5_FLAMME": {
                name: "ETB EV10.5 - Flamme Blanche", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "flamme", "blanche"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            }
        }
    },
    "SERIES_EPEE_BOUCLIER": {
        allowed_merchant_types: ["physical_retailer", "pure_player"],
        search_query: "pokemon epee bouclier",
        merchant_urls: {},
        products: {
            "ETB_EB11_ORIGINE": {
                name: "ETB EB11 - Origine Perdue", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "origine", "perdue"], ["coffret", "origine", "perdue"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            },
            "ETB_EB12.5_ZENITH": {
                name: "ETB EB12.5 - Zénith Suprême", ean: "A_COMPLETER", topic: TOPICS.ETB,
                required_keywords: [ ["etb", "zénith", "suprême"], ["etb", "zenith", "supreme"] ],
                excluded_keywords: ["version japonaise", "version anglaise", "import jp", "import us"]
            }
        }
    },
    "CARTES_A_L_UNITE": {
        allowed_merchant_types: ["pure_player"],
        search_query: "pokemon carte a l'unite", 
        merchant_urls: {},
        products: {
            "SINGLE_GARDE_DE_FER_225": {
                name: "Garde-de-Fer ex 225/162 (Force Temporelle)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ ["garde-de-fer", "225/162"], ["iron", "leaves", "225/162"], ["garde", "de", "fer", "225"] ],
                excluded_keywords: ["version japonaise", "carte gradée pca", "carte gradée psa"]
            }
        }
    }
};

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

const ANTI_BOT_KEYWORDS = [ "cloudflare", "access denied", "prouver que vous êtes humain", "verify you are human", "checking your browser", "attention required" ];

module.exports = { CONFIG, CAMPAIGNS, USER_AGENTS, ANTI_BOT_KEYWORDS };
