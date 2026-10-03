/**
 * @fileoverview Handles sending notifications via Ntfy.
 */
const { CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

const sendStockAlert = async (merchantName, url, productName, productTopic) => {
    let targetTopic = productTopic;
    if (!targetTopic) {
        targetTopic = CONFIG.HEARTBEAT_TOPIC; 
    }

    if (!targetTopic) {
        logger.warn("Notification skipped: No NTFY topic configured for this alert.");
        return;
    }

    try {
        await fetch(`https://ntfy.sh/${targetTopic}`, {
            method: 'POST',
            body: `🚨 STOCK DETECTE chez ${merchantName} 🚨\nProduit : ${productName}\nFonce !`,
            headers: {
                'Title': 'Pokémon en Stock !',
                'Priority': 'urgent',
                'Tags': 'warning,tada',
                'Click': url
            }
        });
        logger.success(`Notification sent to ${targetTopic} for ${productName} at ${merchantName}`);
    } catch (error) {
        logger.error(`Failed to send notification: ${error.message}`);
    }
};

const sendHeartbeat = async (inventoryStatus) => {
    const currentHour = new Date().getHours();
    let shouldSend = false;
    
    if (CONFIG.HEARTBEAT_HOURS.includes(currentHour)) {
        shouldSend = true;
    }

    if (!shouldSend) return;

    if (!CONFIG.HEARTBEAT_TOPIC) {
        logger.warn("Heartbeat skipped: CONFIG.HEARTBEAT_TOPIC is not defined.");
        return;
    }

    const onlineStores = [];
    const offlineStores = [];

    for (const [store, isOnline] of Object.entries(inventoryStatus)) {
        if (isOnline) {
            onlineStores.push(store);
        } else {
            offlineStores.push(store);
        }
    }

    const message = `Boutiques actives : ${onlineStores.length}\nBoutiques hors-ligne/bloquées : ${offlineStores.length}`;

    try {
        await fetch(`https://ntfy.sh/${CONFIG.HEARTBEAT_TOPIC}`, {
            method: 'POST',
            body: message,
            headers: {
                'Title': '🤖 Radar Pokémon Actif',
                'Tags': 'robot'
            }
        });
        logger.success("Heartbeat notification sent.");
    } catch (error) {
        logger.error(`Failed to send heartbeat: ${error.message}`);
    }
};

module.exports = { sendStockAlert, sendHeartbeat };
