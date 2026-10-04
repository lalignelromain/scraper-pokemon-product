/**
 * @fileoverview Notification service using NTFY.
 */
const logger = require('../utils/logger');

/**
 * Sends a push notification via NTFY.
 * @param {string} merchantName - The name of the merchant.
 * @param {string} url - The URL of the product.
 * @param {string} productName - The name of the product.
 * @param {string} topic - The NTFY topic (from env variables).
 * @param {string} status - "IN_STOCK" or "OUT_OF_STOCK".
 */
const sendStockAlert = async (merchantName, url, productName, topic, status) => {
    if (!topic) {
        logger.warn(`No NTFY topic defined for ${productName}. Notification skipped.`);
        return;
    }

    const isStock = status === "IN_STOCK";
    
    // On génère un titre propre sans émojis pour l'en-tête HTTP
    const rawTitle = isStock 
        ? `STOCK: ${productName} chez ${merchantName}` 
        : `RUPTURE: ${productName} chez ${merchantName}`;
        
    // CORRECTION : Encodage RFC 2047 (Base64) pour supporter les accents dans les Headers HTTP sans crasher Node (Erreur ByteString)
    const encodedTitle = `=?UTF-8?B?${Buffer.from(rawTitle).toString('base64')}?=`;

    const messageBody = isStock 
        ? `Le produit est disponible ! Cliquez sur la notification pour y accéder.\n\nLien direct: ${url}` 
        : `Le produit est retombé en rupture de stock.`;
        
    // On utilise le système natif de tags NTFY pour afficher les émojis sans casser le script
    const tags = isStock ? "large_green_circle,tada" : "red_circle";

    try {
        const response = await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: messageBody,
            headers: {
                'Title': encodedTitle,
                'Tags': tags,
                'Click': url,
                'Priority': isStock ? '4' : '3'
            }
        });

        if (!response.ok) {
            throw new Error(`NTFY API responded with status: ${response.status}`);
        }
        
    } catch (error) {
        logger.error(`Failed to send NTFY alert for ${productName}: ${error.message}`);
    }
};

module.exports = { sendStockAlert };
