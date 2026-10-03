/**
 * @fileoverview Registry of merchant websites and their specific parsing logic using Cheerio.
 */

const cheerio = require('cheerio');

/**
 * List of merchants to track.
 * Each object contains the target URL and a specific parsing function
 * that determines if the product is genuinely in stock.
 */
const MERCHANTS = [
    {
        name: "SMYTHS TOYS",
        url: "https://www.smythstoys.com/fr/fr-fr/jouets/jeux-de-societe-et-puzzles/cartes-a-collectionner/cartes-pokemon/pokemon-coffret-dresseur-delite-30eme-anniversaire/p/261821",
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
        url: "https://www.joueclub.fr/pokemon/pokemon-30eme-anniversaire-coffret-dresseur-d-elite-0196214144835.html",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const activeBtn = $('.c-product-add-to-cart, .product-actions').length > 0;
            const bodyText = $('body').text().toLowerCase();
            
            if (bodyText.includes('indisponible')) return false;
            if (bodyText.includes('épuisé')) return false;
            
            if (activeBtn) return true;
            if (html.includes('schema.org/InStock')) return true;
            
            return false;
        }
    },
    {
        name: "MICROMANIA",
        url: "https://www.micromania.fr/recherche?q=pokemon+30+ans",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const bodyText = $('body').text().toLowerCase();
            
            // "Anti-Gandalf" protection for known empty state messages
            if (bodyText.includes("vous ne passerez pas")) return false;
            if (bodyText.includes("introuvable")) return false;
            if (bodyText.includes("aucun résultat")) return false;
            
            const buyBtn = $('.add-to-cart, .product-actions');
            return buyBtn.length > 0;
        }
    },
    {
        name: "FNAC",
        url: "https://www.fnac.com/SearchResult/ResultList.aspx?Search=pokemon+30+ans",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const productZone = $('.ResultList-items, .articleList').text().toLowerCase();
            
            if (!productZone) return false;
            // Ensure it's sold by FNAC directly (not a third-party seller)
            if (!productZone.includes("vendu par fnac") && !productZone.includes("vendu et expédié par fnac")) {
                return false;
            }
            
            const buyBtn = $('.f-buyBox-button, .add-to-cart');
            return buyBtn.length > 0;
        }
    },
    {
        name: "KAIRYU",
        url: "https://kairyu.fr/search?q=pokemon+30",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const productZone = $('.product-grid, .grid, .product-list').text().toLowerCase();
            
            if (!productZone) return false;
            
            const outOfStockKeywords = ["aucun résultat", "0 résultat", "en réassort", "épuisé", "sold out", "rupture"];
            if (outOfStockKeywords.some(kw => productZone.includes(kw))) {
                return false;
            }
            
            // Require a strict Shopify add-to-cart button
            const buyBtn = $('form[action="/cart/add"], button[name="add"]');
            return buyBtn.length > 0;
        }
    },
    {
        name: "DESTOCKTCG",
        url: "https://www.destocktcg.fr/search?type=product&q=pokemon+30",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const productZone = $('.product-grid, .grid').text().toLowerCase();
            
            if (!productZone) return false;
            
            const outOfStockKeywords = ["aucun résultat", "0 résultat", "temporairement indisponible", "épuisé", "rupture", "sold out", "prévenez-moi", "en réassort"];
            if (outOfStockKeywords.some(kw => productZone.includes(kw))) {
                return false;
            }
            return true;
        }
    },
    {
        name: "KING JOUET",
        url: "https://www.king-jouet.com/jeux-jouets/coffrets-dresseur-pokemon/page1.htm",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const buyBtn = $('.buy-box, .add-to-cart');
            return buyBtn.length > 0;
        }
    },
    {
        name: "CULTURA",
        url: "https://www.cultura.com/search.html?q=pokemon+30",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const productZone = $('.search-result-items, .product-grid').text().toLowerCase();
            
            if (!productZone) return false;
            if (productZone.includes("vendu par") && !productZone.includes("cultura")) {
                return false;
            }
            
            const buyBtn = $('.add-to-cart, .cart-button');
            return buyBtn.length > 0;
        }
    },
    {
        name: "E.LECLERC",
        url: "https://www.e.leclerc/fp/pokemon-me03-coffret-dresseur-elite-0196214136380",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const content = html.toLowerCase();
            
            if (content.includes('vendu et expédié par') && !content.includes('e.leclerc')) {
                return false;
            }
            if (content.includes('indisponible') || content.includes('épuisé')) {
                return false;
            }
            
            const buyBtn = $('button[data-test="add-to-cart"], .btn-add-to-cart');
            const hasAddOption = buyBtn.length > 0 || content.includes('schema.org/instock');
            const hasPickupOption = content.includes('retrait en magasin') || content.includes('vendu par e.leclerc');
            
            return hasAddOption && hasPickupOption;
        }
    },
    {
        name: "AUCHAN",
        url: "https://www.auchan.fr/recherche?text=pokemon+30+ans",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const productZone = $('.search-results, .list__container').text().toLowerCase();
            
            if (!productZone) return false;
            if (productZone.includes("vendu par") && !productZone.includes("auchan")) {
                return false;
            }

            const buyBtn = $('.product-action__button, .btn--primary');
            return buyBtn.length > 0;
        }
    },
    {
        name: "CARREFOUR",
        url: "https://www.carrefour.fr/s?q=pokemon+30+ans",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const productZone = $('.product-grid, .search-results').text().toLowerCase();
            
            if (!productZone) return false;
            if (productZone.includes("vendu par") && !productZone.includes("carrefour")) {
                return false;
            }

            const buyBtn = $('.add-to-cart-button, .pl-button');
            return buyBtn.length > 0;
        }
    },
    {
        name: "VCOLLECT (ETB FR)",
        url: "https://vcollect.fr/products/coffret-dresseur-delite-30e-anniversaire-francais",
        verifyStock: (html) => {
            const $ = cheerio.load(html);
            const visibleText = $('body').text().toLowerCase();
            
            // 1. Absolute safety check for French language edition
            if (!visibleText.includes("français")) return false;

            // 2. Detection of out-of-stock markers
            if (visibleText.includes("épuisé")) return false;
            if (visibleText.includes("me prévenir de retour en stock")) return false;
            if (visibleText.includes("bientôt disponible")) return false;
            
            // 3. Strict Shopify buy button verification (ignores suggestive "+ Add" buttons)
            const buyBtn = $('form[action^="/cart/add"] button, button[name="add"]');
            if (buyBtn.length === 0) return false;
            if (buyBtn.prop('disabled')) return false;

            return true;
        }
    }
];

module.exports = {
    MERCHANTS
};
