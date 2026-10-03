/**
 * @fileoverview Service handling push notifications via NTFY.sh
 */

const { CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Sends an urgent stock alert notification.
 * @param {string} merchantName - The name of the website (e.g., "JOUECLUB").
 * @param {string} url - The direct product URL.
 * @param {string} productName - The detected product name.
 * @returns {Promise<void>}
 */
const sendStockAlert = async (merchantName, url, productName) => {
    if (!CONFIG.NTFY_TOPIC) {
        logger.warn(`Cannot send alert for ${merchantName} - NTFY_TOPIC is missing.`);
        return;
    }

    try {
        const fetchArgs = {
            method: 'POST',
            body: `🚨 ALERTE STOCK 🚨\nLe produit [ ${productName} ] est EN STOCK sur ${merchantName} !\nLien : ${url}`,
            headers: {
                'Title': `Pokemon 30e : ${productName} !`,
                'Priority': 'urgent',
                'Tags': 'rotating_light,pokemon'
            }
        };
        
        const response = await fetch(`https://ntfy.sh/${CONFIG.NTFY_TOPIC}`, fetchArgs);
        
        if (!response.ok) {
            logger.error(`NTFY rejected the alert for ${merchantName}. Status: ${response.status}`);
        } else {
            logger.success(`Push alert sent for ${merchantName} - ${productName}`);
        }
    } catch (error) {
        logger.error(`Network error while sending alert for ${merchantName}: ${error.message}`);
    }
};

/**
 * Sends a periodic heartbeat to confirm the scraper is alive and reports current stock status.
 * @param {Object} inventoryStatus - Map of merchant names to boolean stock status.
 * @returns {Promise<void>}
 */
const sendHeartbeat = async (inventoryStatus) => {
    if (!CONFIG.NTFY_TOPIC) return;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const hourFR = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minuteFR = parseInt(parts.find(p => p.type === 'minute').value, 10);

    // Only send if we are at the beginning (first 5 mins) of a scheduled hour
    const isScheduledReportHour = CONFIG.HEARTBEAT_HOURS.includes(hourFR) && minuteFR < 5;
    
    if (!isScheduledReportHour) return;

    let message = `🤖 BILAN DES STOCKS (${hourFR}h00)\n\n`;
    for (const [merchant, inStock] of Object.entries(inventoryStatus)) {
        const statusStr = inStock ? "🟢 EN STOCK" : "🔴 Rupture";
        message += `${merchant} : ${statusStr}\n`;
    }
    message += "\n✅ Scraper Playwright opérationnel.";

    try {
        const fetchArgs = {
            method: 'POST',
            body: message,
            headers: {
                'Title': `Heartbeat (${hourFR}h00)`,
                'Priority': 'low',
                'Tags': 'robot,bar_chart'
            }
        };
        const response = await fetch(`https://ntfy.sh/${CONFIG.NTFY_TOPIC}`, fetchArgs);
        
        if (!response.ok) {
            logger.error(`NTFY rejected the heartbeat. Status: ${response.status}`);
        } else {
            logger.success(`Heartbeat notification (${hourFR}h) sent successfully.`);
        }
    } catch (error) {
        logger.error(`Network error sending heartbeat: ${error.message}`);
    }
};

module.exports = {
    sendStockAlert,
    sendHeartbeat
};
