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

// Blacklist globale pour les cartes à l'unité
const GLOBAL_EXCLUSIONS = [
    "japonaise", "jap", "anglaise", "eng", "coréenne", 
    "pca", "psa", "bgs", "cgc", "gradé", "gradée", "grade", 
    "reverse", "holographique", "oversize", "jumbo" 
];

const CAMPAIGNS = {
    "CARTES_A_L_UNITE": {
        allowed_merchant_types: ["pure_player"],
        products: {
            "SINGLE_VERT_DE_FER_203": {
                display_name: "Vert-de-Fer ex 203/162 (Forces Temporelles)",
                topic: TOPICS.CARTE,
                search_query: "Vert Fer 203", 
                validation: {
                    must_include_one_name: ["vert-de-fer", "vert de fer", "vert defer"],
                    must_include_one_number: ["203/162", "203-162", "203 "],
                    must_include_one_marker: ["alternative", "alt", "sir", "forces temporelles", "tef"],
                    must_not_include: GLOBAL_EXCLUSIONS
                }
            },
            "SINGLE_FEU_PERCANT_204": {
                display_name: "Feu-Perçant ex 204/162 (Forces Temporelles)",
                topic: TOPICS.CARTE,
                search_query: "Feu Percant 204", 
                validation: {
                    must_include_one_name: ["feu-perçant", "feu-percant", "feu perçant", "feu percant"],
                    must_include_one_number: ["204/162", "204-162", "204 "], 
                    must_include_one_marker: ["alternative", "alt", "sir", "forces temporelles", "tef"], 
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
            },
            "SINGLE_CHEF_DE_FER_206": {
                display_name: "Chef-de-Fer ex 206/162 (Forces Temporelles)",
                topic: TOPICS.CARTE,
                search_query: "Chef Fer 206",
                validation: {
                    must_include_one_name: ["chef-de-fer", "chef de fer", "chef defer"],
                    must_include_one_number: ["206/162", "206-162", "206 "],
                    must_include_one_marker: ["alternative", "alt", "sir", "forces temporelles", "tef"],
                    must_not_include: GLOBAL_EXCLUSIONS
                }
            },
            "SINGLE_IRE_FOUDRE_208": {
                display_name: "Ire-Foudre ex 208/162 (Forces Temporelles)",
                topic: TOPICS.CARTE,
                search_query: "Ire Foudre 208",
                validation: {
                    must_include_one_name: ["ire-foudre", "ire foudre", "irefoudre"],
                    must_include_one_number: ["208/162", "208-162", "208 "],
                    must_include_one_marker: ["alternative", "alt", "sir", "forces temporelles", "tef"],
                    must_not_include: GLOBAL_EXCLUSIONS
                }
            }
        }
    }
};

module.exports = { TOPICS, ANTI_BOT_KEYWORDS, USER_AGENTS, GLOBAL_EXCLUSIONS, CAMPAIGNS };
