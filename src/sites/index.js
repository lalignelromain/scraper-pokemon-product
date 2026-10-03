/**
 * @fileoverview Registry of merchant websites and their specific parsing logic using Cheerio.
 */
const cheerio = require('cheerio');

const MERCHANTS = [
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
            if (text.includes('indisponible')) return false;
            if (text.includes('épuisé')) return false;
            
            const $ = cheerio.load(html);
            if ($('.c-product-add-to-cart, .product-actions').length > 0) return true;
            if (html.includes('schema.org/InStock')) return true;
            
            return false;
        }
    },
    {
        name: "MICROMANIA",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.micromania.fr/recherche?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const body = cheerio.load(html)('body').text().toLowerCase();
            if (["vous ne passerez pas", "introuvable", "aucun résultat"].some(kw => body.includes(kw))) return false;
            if (cheerio.load(html)('.add-to-cart, .product-actions').length > 0) return true;
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
            
            let isValidSeller = false;
            if (zone.includes("vendu par fnac")) isValidSeller = true;
            if (zone.includes("vendu et expédié par fnac")) isValidSeller = true;
            
            if (!isValidSeller) return false;
            if (cheerio.load(html)('.f-buyBox-button, .add-to-cart').length > 0) return true;
            
            return false;
        }
    },
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
            
            if (zone.includes("vendu par")) {
                if (!zone.includes("cultura")) return false;
            }
            
            if (cheerio.load(html)('.add-to-cart, .cart-button').length > 0) return true;
            return false;
        }
    },
    {
        name: "E.LECLERC",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.e.leclerc/recherche?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = html.toLowerCase();
            
            if (text.includes('indisponible')) return false;
            if (text.includes('épuisé')) return false;
            if (text.includes('vendu et expédié par')) {
                if (!text.includes('e.leclerc')) return false;
            }
            
            let hasAdd = false;
            if (cheerio.load(html)('button[data-test="add-to-cart"], .btn-add-to-cart').length > 0) hasAdd = true;
            if (text.includes('schema.org/instock')) hasAdd = true;
            
            let hasPickup = false;
            if (text.includes('retrait en magasin')) hasPickup = true;
            if (text.includes('vendu par e.leclerc')) hasPickup = true;
            
            if (hasAdd) {
                if (hasPickup) return true;
            }
            
            return false;
        }
    },
    {
        name: "AUCHAN",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.auchan.fr/recherche?text=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.search-results, .list__container').text().toLowerCase();
            if (!zone) return false;
            
            if (zone.includes("vendu par")) {
                if (!zone.includes("auchan")) return false;
            }
            
            if (cheerio.load(html)('.product-action__button, .btn--primary').length > 0) return true;
            return false;
        }
    },
    {
        name: "CARREFOUR",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.carrefour.fr/s?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .search-results').text().toLowerCase();
            if (!zone) return false;
            
            if (zone.includes("vendu par")) {
                if (!zone.includes("carrefour")) return false;
            }
            
            if (cheerio.load(html)('.add-to-cart-button, .pl-button').length > 0) return true;
            return false;
        }
    },
    {
        name: "VCOLLECT (ETB FR)",
        type: "pure_player",
        getSearchUrl: (query) => `https://vcollect.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (!text.includes("français")) return false;
            if (["épuisé", "me prévenir", "bientôt disponible"].some(kw => text.includes(kw))) return false;
            
            const btn = cheerio.load(html)('form[action^="/cart/add"] button, button[name="add"]');
            if (btn.length === 0) return false;
            if (btn.prop('disabled')) return false;
            
            return true;
        }
    }
];

module.exports = { MERCHANTS };
