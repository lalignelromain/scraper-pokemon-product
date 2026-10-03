/**
 * @fileoverview Registry of merchant websites categorized by type (Physical Retailers vs Pure Players).
 */
const cheerio = require('cheerio');

const MERCHANTS = [
    // === ENSEIGNES PHYSIQUES (5) ===
    {
        name: "SMYTHS TOYS",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.smythstoys.com/fr/fr-fr/search/?text=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const btn = $('#addToCartForm button[type="submit"], .js-add-to-cart-button');
            if (!btn.length) return false;
            if (btn.prop('disabled')) return false;
            if (btn.hasClass('cursor-not-allowed')) return false;
            return true;
        }
    },
    {
        name: "JOUECLUB",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.joueclub.fr/recherche.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = html.toLowerCase();
            if (text.includes('indisponible') || text.includes('épuisé')) return false;
            const $ = cheerio.load(html);
            if ($('.c-product-add-to-cart, .product-actions').length > 0) return true;
            if (html.includes('schema.org/InStock')) return true;
            return false;
        }
    },
    {
        name: "KING JOUET",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.king-jouet.com/recherche.htm?motClef=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            if (cheerio.load(html)('.buy-box, .add-to-cart').length > 0) return true;
            return false;
        }
    },
    {
        name: "CULTURA",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.cultura.com/search.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.search-result-items, .product-grid').text().toLowerCase();
            if (!zone) return false;
            if (zone.includes("vendu par") && !zone.includes("cultura")) return false;
            if (cheerio.load(html)('.add-to-cart, .cart-button').length > 0) return true;
            return false;
        }
    },
    {
        name: "FNAC",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.ResultList-items, .articleList').text().toLowerCase();
            if (!zone) return false;
            let isValidSeller = zone.includes("vendu par fnac") || zone.includes("vendu et expédié par fnac");
            if (!isValidSeller) return false;
            if (cheerio.load(html)('.f-buyBox-button, .add-to-cart').length > 0) return true;
            return false;
        }
    },

    // === PURE PLAYERS / SHOPS EN LIGNE (6) ===
    {
        name: "KAIRYU",
        type: "pure_player",
        getSearchUrl: (query) => `https://kairyu.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .grid, .product-list').text().toLowerCase();
            if (!zone) return false;
            if (["aucun résultat", "0 résultat", "en réassort", "épuisé", "sold out", "rupture"].some(kw => zone.includes(kw))) return false;
            if (cheerio.load(html)('form[action="/cart/add"], button[name="add"]').length > 0) return true;
            return false;
        }
    },
    {
        name: "DESTOCKTCG",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.destocktcg.fr/search?type=product&q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .grid').text().toLowerCase();
            if (!zone) return false;
            if (["aucun résultat", "temporairement indisponible", "épuisé", "rupture", "sold out", "en réassort"].some(kw => zone.includes(kw))) return false;
            return true;
        }
    },
    {
        name: "VCOLLECT",
        type: "pure_player",
        getSearchUrl: (query) => `https://vcollect.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (!text.includes("français")) return false;
            if (["épuisé", "me prévenir", "bientôt disponible"].some(kw => text.includes(kw))) return false;
            const btn = cheerio.load(html)('form[action^="/cart/add"] button, button[name="add"]');
            if (btn.length === 0 || btn.prop('disabled')) return false;
            return true;
        }
    },
    {
        name: "BLAZING TAIL",
        type: "pure_player",
        getSearchUrl: (query) => `https://blazingtail.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .grid').text().toLowerCase();
            if (!zone || ["rupture", "épuisé", "sold out"].some(kw => zone.includes(kw))) return false;
            return true;
        }
    },
    {
        name: "FANTASY SPHERE",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.fantasysphere.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.products, .product-list').text().toLowerCase();
            if (!zone || ["rupture", "épuisé", "indisponible"].some(kw => zone.includes(kw))) return false;
            return true;
        }
    },
    {
        name: "CARDS HUNTER",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.cardshunter.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.products, .product-list').text().toLowerCase();
            if (!zone || ["rupture", "épuisé", "indisponible"].some(kw => zone.includes(kw))) return false;
            return true;
        }
    }
];

module.exports = { MERCHANTS };
