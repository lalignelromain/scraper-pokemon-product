/**
 * @fileoverview Registry of pure player websites with Scoped Extraction logic.
 */

// Liste de sélecteurs CSS très courants sur Shopify / Prestashop / WooCommerce pour cibler un bloc produit
const GENERIC_BLOCK_SELECTORS = '.product-item, .product-miniature, .grid-item, .grid__item, .product-card, article.product';

const MERCHANTS = [
    {
        name: "KAIRYU",
        type: "pure_player",
        getSearchUrl: (query) => `https://kairyu.fr/search?q=${encodeURIComponent(query)}`,
        productBlockSelector: GENERIC_BLOCK_SELECTORS,
        verifyStock: ($, productBlock) => {
            const text = $(productBlock).text().toLowerCase();
            return text.includes("ajouter au panier") || text.includes("choix des options");
        }
    },
    {
        name: "DESTOCKTCG",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.destocktcg.fr/search?type=product&q=${encodeURIComponent(query)}`,
        productBlockSelector: GENERIC_BLOCK_SELECTORS,
        verifyStock: ($, productBlock) => {
            const text = $(productBlock).text().toLowerCase();
            return text.includes("ajouter au panier") || text.includes("choix des options");
        }
    },
    {
        name: "VCOLLECT",
        type: "pure_player",
        getSearchUrl: (query) => `https://vcollect.fr/search?q=${encodeURIComponent(query)}`,
        productBlockSelector: GENERIC_BLOCK_SELECTORS,
        verifyStock: ($, productBlock) => {
            const text = $(productBlock).text().toLowerCase();
            return text.includes("ajouter au panier") || text.includes("choisir une option");
        }
    },
    {
        name: "BLAZING TAIL",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.blazingtail.fr/search?q=${encodeURIComponent(query)}`,
        productBlockSelector: GENERIC_BLOCK_SELECTORS,
        verifyStock: ($, productBlock) => {
            const text = $(productBlock).text().toLowerCase();
            return text.includes("ajouter au panier");
        }
    },
    {
        name: "FANTASY SPHERE",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.fantasysphere.net/recherche?controller=search&s=${encodeURIComponent(query)}`,
        productBlockSelector: GENERIC_BLOCK_SELECTORS,
        verifyStock: ($, productBlock) => {
            const text = $(productBlock).text().toLowerCase();
            return text.includes("ajouter au panier") || text.includes("commander");
        }
    },
    {
        name: "CARDS HUNTER",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.cardshunter.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
        productBlockSelector: GENERIC_BLOCK_SELECTORS,
        verifyStock: ($, productBlock) => {
            const text = $(productBlock).text().toLowerCase();
            return text.includes("ajouter au panier");
        }
    }
];

module.exports = { MERCHANTS };
