/**
 * @fileoverview Registry of merchant websites with Positive Stock Verification.
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
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            // Vérification positive : Il faut qu'au moins un produit puisse être mis au panier
            return text.includes("ajouter au panier") || text.includes("en stock");
        }
    },
    {
        name: "JOUECLUB",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.joueclub.fr/recherche.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return text.includes("ajouter au panier") || text.includes("ajout au panier");
        }
    },
    {
        name: "KING JOUET",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.king-jouet.com/recherche.htm?motClef=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 produit")) return false;
            return text.includes("ajouter au panier");
        }
    },
    {
        name: "CULTURA",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.cultura.com/search.html?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            if (text.includes("vendu par") && !text.includes("cultura")) return false; // Filtre Marketplace
            return text.includes("ajouter au panier") || text.includes("précommander");
        }
    },
    {
        name: "FNAC",
        type: "physical_retailer",
        getSearchUrl: (query) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            let isValidSeller = text.includes("vendu par fnac") || text.includes("vendu et expédié par fnac");
            if (!isValidSeller) return false;
            return text.includes("ajouter au panier") || text.includes("précommander");
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
            return text.includes("ajouter au panier") || text.includes("choix des options");
        }
    },
    {
        name: "DESTOCKTCG",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.destocktcg.fr/search?type=product&q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return text.includes("ajouter au panier") || text.includes("choix des options");
        }
    },
    {
        name: "VCOLLECT",
        type: "pure_player",
        getSearchUrl: (query) => `https://vcollect.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return text.includes("ajouter au panier") || text.includes("choisir une option");
        }
    },
    {
        name: "BLAZING TAIL",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.blazingtail.fr/search?q=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return text.includes("ajouter au panier");
        }
    },
    {
        name: "FANTASY SPHERE",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.fantasysphere.net/recherche?controller=search&s=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return text.includes("ajouter au panier") || text.includes("commander");
        }
    },
    {
        name: "CARDS HUNTER",
        type: "pure_player",
        getSearchUrl: (query) => `https://www.cardshunter.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
        verifyStock: (html) => {
            const text = cheerio.load(html)('body').text().toLowerCase();
            if (text.includes("aucun résultat") || text.includes("0 résultat")) return false;
            return text.includes("ajouter au panier");
        }
    }
];

module.exports = { MERCHANTS };
