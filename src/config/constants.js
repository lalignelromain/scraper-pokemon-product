/**
 * @fileoverview Configuration constants for pure player campaigns and single cards.
 */

const TOPICS = {
    CARTE: process.env.NTFY_TOPIC_CARTE
};

const ANTI_BOT_KEYWORDS = [
    "cloudflare", "captcha", "are you a human", "verify you are human", "access denied", "forbidden"
];

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
];

// Blacklist globale pour les cartes à l'unité (évite de le répéter pour chaque carte)
const GLOBAL_EXCLUSIONS = [
    "japonaise", "jap", "anglaise", "eng", "coréenne", // Langues
    "pca", "psa", "bgs", "cgc", "gradé", "gradée", "grade", // Gradation
    "reverse", "holographique", "oversize", "jumbo" // Formats
];

const CAMPAIGNS = {
    "CARTES_A_L_UNITE": {
        allowed_merchant_types: ["pure_player"],
        // On n'utilise plus d'URLs directes, on utilise la barre de recherche native.
        products: {
            "SINGLE_FEU_PERCANT_204": {
                display_name: "Feu-Perçant ex 204/162 (Forces Temporelles)",
                topic: TOPICS.CARTE,
                search_query: "Feu Percant 204", // Ce que le bot tape dans la barre de recherche
                validation: {
                    must_include_one_name: ["feu-perçant", "feu-percant", "feu perçant", "feu percant"],
                    must_include_one_number: ["204/162", "204-162", "204 "], // L'espace après le 4 est voulu
                    must_include_one_marker: ["alternative", "alt", "sir", "forces temporelles", "tef"], // Sécurité optionnelle
                    must_not_include: GLOBAL_EXCLUSIONS
                }
            },
            "SINGLE_SERPENTE_EAU_205": {
                display_name: "Serpente-Eau ex 205/162 (Forces Temporelles)",
                topic: TOPICS.CARTE,
                search_query: "Serpente Eau 205",
                validation: {
                    must_include_one_name: ["serpente-eau", "serpente eau"],
                    must_include_one_number: ["205/162", "205-162", "205 "],
                    must_include_one_marker: ["alternative", "alt", "sir", "forces temporelles", "tef"],
                    must_not_include: GLOBAL_EXCLUSIONS
                }
            }
        }
    }
};

module.exports = { TOPICS, ANTI_BOT_KEYWORDS, USER_AGENTS, GLOBAL_EXCLUSIONS, CAMPAIGNS };
