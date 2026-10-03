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
            if (!btn.length || btn.prop('disabled') || btn.hasClass('cursor-not-allowed')) return false;
            return true;
        }
    },
    {
        name: "JOUECLUB",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.joueclub.fr/recherche.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            if (html.toLowerCase().includes('indisponible') || html.toLowerCase().includes('épuisé')) return false;
            return $('.c-product-add-to-cart, .product-actions').length > 0 || html.includes('schema.org/InStock');
        }
    },
    {
        name: "MICROMANIA",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.micromania.fr/recherche?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const body = cheerio.load(html)('body').text().toLowerCase();
            if (["vous ne passerez pas", "introuvable", "aucun résultat"].some(kw => body.includes(kw))) return false;
            return cheerio.load(html)('.add-to-cart, .product-actions').length > 0;
        }
    },
    {
        name: "FNAC",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.ResultList-items, .articleList').text().toLowerCase();
            if (!zone || (!zone.includes("vendu par fnac") && !zone.includes("vendu et expédié par fnac"))) return false;
            return cheerio.load(html)('.f-buyBox-button, .add-to-cart').length > 0;
        }
    },
    {
        name: "KAIRYU",
        type: "pure_player",
        getSearchUrl: (query) => `https://kairyu.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .grid, .product-list').text().toLowerCase();
            if (!zone || ["aucun résultat", "0 résultat", "en réassort", "épuisé", "sold out", "rupture"].some(kw => zone.includes(kw))) return false;
            return cheerio.load(html)('form[action="/cart/add"], button[name="add"]').length > 0;
        }
    },
    {
        name: "DESTOCKTCG",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.destocktcg.fr/search?type=product&q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .grid').text().toLowerCase();
            return zone && !["aucun résultat", "temporairement indisponible", "épuisé", "rupture", "sold out", "en réassort"].some(kw => zone.includes(kw));
        }
    },
    {
        name: "KING JOUET",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.king-jouet.com/recherche.htm?motClef=${encodeURIComponent(query)}`,
        verifyStock: (html) => cheerio.load(html)('.buy-box, .add-to-cart').length > 0
    },
    {
        name: "CULTURA",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.cultura.com/search.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.search-result-items, .product-grid').text().toLowerCase();
            if (!zone || (zone.includes("vendu par") && !zone.includes("cultura"))) return false;
            return cheerio.load(html)('.add-to-cart, .cart-button').length > 0;
        }
    },
    {
        name: "E.LECLERC",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.e.leclerc/recherche?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = html.toLowerCase();
            if ((text.includes('vendu et expédié par') && !text.includes('e.leclerc')) || text.includes('indisponible') || text.includes('épuisé')) return false;
            const hasAdd = cheerio.load(html)('button[data-test="add-to-cart"], .btn-add-to-cart').length > 0 || text.includes('schema.org/instock');
            const hasPickup = text.includes('retrait en magasin') || text.includes('vendu par e.leclerc');
            return hasAdd && hasPickup;
        }
    },
    {
        name: "AUCHAN",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.auchan.fr/recherche?text=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.search-results, .list__container').text().toLowerCase();
            if (!zone || (zone.includes("vendu par") && !zone.includes("auchan"))) return false;
            return cheerio.load(html)('.product-action__button, .btn--primary').length > 0;
        }
    },
    {
        name: "CARREFOUR",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.carrefour.fr/s?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('.product-grid, .search-results').text().toLowerCase();
            if (!zone || (zone.includes("vendu par") && !zone.includes("carrefour"))) return false;
            return cheerio.load(html)('.add-to-cart-button, .pl-button').length > 0;
        }
    },
    {
        name: "VCOLLECT (ETB FR)",
        type: "pure_player",
        getSearchUrl: (query) => `https://vcollect.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (!text.includes("français") || ["épuisé", "me prévenir", "bientôt disponible"].some(kw => text.includes(kw))) return false;
            const btn = cheerio.load(html)('form[action^="/cart/add"] button, button[name="add"]');
            return btn.length > 0 && !btn.prop('disabled');
        }
    }
];

module.exports = { MERCHANTS };
