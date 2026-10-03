/**
 * @fileoverview Configuration constants for campaigns, topics, and anti-bot detection.
 */

const TOPICS = {
    CARTE: process.env.NTFY_TOPIC_CARTE,
    ETB: process.env.NTFY_TOPIC_ETB,
    COFFRET: process.env.NTFY_TOPIC_COFFRET,
    BUNDLE: process.env.NTFY_TOPIC_BUNDLE_BLISTER,
    TRENTE_ANS: process.env.NTFY_TOPIC_30ANS
};

const ANTI_BOT_KEYWORDS = [
    "cloudflare",
    "captcha",
    "are you a human",
    "verify you are human",
    "access denied",
    "forbidden"
];

const CAMPAIGNS = {
    "SERIES_STANDARD_ETB_COFFRETS": {
        allowed_merchant_types: ["physical_retailer", "pure_player"],
        search_query: "pokemon coffret etb",
        products: {
            "ETB_EV08_ETINCELLES": {
                name: "ETB Écarlate et Violet 08 - Étincelles Déferlantes",
                ean: "0820650559797",
                topic: TOPICS.ETB,
                required_keywords: [["etb", "étincelles"], ["coffret", "dresseur", "etincelles"]],
                excluded_keywords: []
            },
            "COFFRET_STANDARD_POKEMON": {
                name: "Coffret Standard Pokémon",
                ean: "N/A",
                topic: TOPICS.COFFRET,
                required_keywords: [["coffret", "pokemon"]],
                excluded_keywords: []
            }
        }
    },
    "SERIE_30_ANS_ME": {
        allowed_merchant_types: ["physical_retailer", "pure_player"],
        search_query: "pokemon 30 ans",
        products: {
            "BUNDLE_ME02.5_HEROS": {
                name: "Bundle 30 Ans",
                ean: "N/A",
                topic: TOPICS.BUNDLE,
                required_keywords: [["bundle", "30 ans"]],
                excluded_keywords: []
            }
        }
    },
    "CARTES_A_L_UNITE": {
        allowed_merchant_types: ["pure_player"],
        search_query: "pokemon carte a l'unite", 
        merchant_urls: {
            "KAIRYU": "https://kairyu.fr/search?filter.p.m.custom.langue=Fran%C3%A7ais&filter.p.m.custom.s_rie=Forces+Temporelles&filter.v.availability=1&q=*&sort_by=price-descending&type=product",
            "BLAZING TAIL": "https://www.blazingtail.fr/116-cartes-pokemon-forces-temporelles-ecarlate-et-violet",
            "FANTASY SPHERE": "https://www.fantasysphere.net/carte-a-lunite-pokemon/bloc-ecarlate-et-violet/sv5-pokemon-ecarlate-et-violet-force-temporelle/",
            "CARDS HUNTER": "https://www.cardshunter.fr/categorie-produit/cartes-a-lunite/ecarlate-et-violet/ev-forces-temporelles/",
            "DESTOCKTCG": "https://www.destocktcg.fr/search?type=product&q=skip_singles",
            "VCOLLECT": "https://vcollect.fr/search?q=skip_singles"
        },
        products: {
            "SINGLE_SERPENTE_EAU_205": {
                name: "Serpente-Eau ex 205/162 (Forces Temporelles)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ 
                    ["serpente-eau", "205/162"], 
                    ["serpente", "eau", "205"] 
                ],
                excluded_keywords: ["japonaise", "anglaise", "pca", "psa", "gradée", "gradé"]
            },
            "SINGLE_IRE_FOUDRE_208": {
                name: "Ire-Foudre ex 208/162 (Forces Temporelles)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ 
                    ["ire-foudre", "208/162"], 
                    ["ire", "foudre", "208"] 
                ],
                excluded_keywords: ["japonaise", "anglaise", "pca", "psa", "gradée", "gradé"]
            },
            "SINGLE_FEU_PERCANT_204": {
                name: "Feu-Perçant ex 204/162 (Forces Temporelles)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ 
                    ["feu-perçant", "204"], 
                    ["feu-percant", "204"],
                    ["feu", "perçant", "204/162"]
                ],
                excluded_keywords: ["japonaise", "anglaise", "pca", "psa", "gradée", "gradé"]
            },
            "SINGLE_CHEF_DE_FER_206": {
                name: "Chef-de-Fer ex 206/162 (Forces Temporelles)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ 
                    ["chef-de-fer", "206/162"], 
                    ["chef", "fer", "206"],
                    ["chef-de-fer", "206"]
                ],
                excluded_keywords: ["japonaise", "anglaise", "pca", "psa", "gradée", "gradé"]
            },
            "SINGLE_VERT_DE_FER_203": {
                name: "Vert-de-Fer ex 203/162 (Forces Temporelles)", ean: "N/A", topic: TOPICS.CARTE,
                required_keywords: [ 
                    ["vert-de-fer", "203/162"], 
                    ["vert", "fer", "203"],
                    ["vert-de-fer", "203"]
                ],
                excluded_keywords: ["japonaise", "anglaise", "pca", "psa", "gradée", "gradé"]
            }
        }
    }
};

module.exports = { TOPICS, ANTI_BOT_KEYWORDS, CAMPAIGNS };
