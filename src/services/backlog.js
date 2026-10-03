/**
 * @fileoverview Lightweight backlog service for debugging and state tracking.
 */
const fs = require('fs');
const { CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

const loadBacklog = () => {
    try {
        if (fs.existsSync(CONFIG.BACKLOG_FILE)) {
            const data = fs.readFileSync(CONFIG.BACKLOG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        logger.warn("Could not load backlog file, initializing empty state.");
    }
    return {};
};

const saveBacklog = (backlogData) => {
    // Désactivé pour ne plus encombrer le dépôt ou générer des commits inutiles
    // Le backlog reste purement informatif ou local si nécessaire.
    logger.system("Backlog state update bypassed (Debug mode).");
};

module.exports = { loadBacklog, saveBacklog };
