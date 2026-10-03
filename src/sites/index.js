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
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat") || text.includes("nous n'avons trouvé aucun")) return false;
            return true;
        }
    },
    {
        name: "JOUECLUB",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.joueclub.fr/recherche.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "KING JOUET",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.king-jouet.com/recherche.htm?motClef=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 produit") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "CULTURA",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.cultura.com/search.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('body').text().toLowerCase();
            if (zone.includes("aucun résultat") || zone.includes("0 résultat")) return false;
            // Sécurité Marketplace : on ignore si tout est vendu par des tiers
            if (zone.includes("vendu par") && !zone.includes("cultura")) return false;
            return true;
        }
    },
    {
        name: "FNAC",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const zone = cheerio.load(html)('body').text().toLowerCase();
            if (zone.includes("aucun résultat") || zone.includes("0 résultat")) return false;
            // Sécurité Marketplace : on s'assure que c'est vendu par la Fnac
            let isValidSeller = zone.includes("vendu par fnac") || zone.includes("vendu et expédié par fnac");
            if (!isValidSeller) return false;
            return true;
        }
    },

    // === PURE PLAYERS / SHOPS EN LIGNE (6) ===
    {
        name: "KAIRYU",
        type: "pure_player",
        getSearchUrl: (query) => `https://kairyu.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "DESTOCKTCG",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.destocktcg.fr/search?type=product&q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "VCOLLECT",
        type: "pure_player",
        getSearchUrl: (query) => `https://vcollect.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "BLAZING TAIL",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.blazingtail.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "FANTASY SPHERE",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.fantasysphere.net/recherche?controller=search&s=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    },
    {
        name: "CARDS HUNTER",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.cardshunter.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return true;
        }
    }
];

module.exports = { MERCHANTS };
