/**
 * @fileoverview Service for reading and updating the local JSON backlog file.
 */

const fs = require('fs');
const { CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Reads and parses the backlog JSON file.
 * Returns an empty object if the file doesn't exist or is corrupted.
 * @returns {Object} The current backlog data.
 */
const loadBacklog = () => {
    if (fs.existsSync(CONFIG.BACKLOG_FILE)) {
        try {
            const rawData = fs.readFileSync(CONFIG.BACKLOG_FILE, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            logger.warn(`Failed to parse ${CONFIG.BACKLOG_FILE}. Starting fresh.`);
            return {};
        }
    }
    return {};
};

/**
 * Writes the provided data to the backlog JSON file.
 * @param {Object} data - The backlog data to save.
 * @returns {boolean} True if successful, false otherwise.
 */
const saveBacklog = (data) => {
    try {
        fs.writeFileSync(CONFIG.BACKLOG_FILE, JSON.stringify(data, null, 2), 'utf8');
        logger.success(`File ${CONFIG.BACKLOG_FILE} successfully updated.`);
        return true;
    } catch (error) {
        logger.error(`Failed to write to ${CONFIG.BACKLOG_FILE}: ${error.message}`);
        return false;
    }
};

module.exports = {
    loadBacklog,
    saveBacklog
};
