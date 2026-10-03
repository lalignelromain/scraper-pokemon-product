/**
 * @fileoverview Custom logger utility to standardize console outputs.
 * Provides distinct methods for different severity levels.
 */

/**
 * Returns the current timestamp formatted for Europe/Paris timezone.
 * @returns {string} Formatted timestamp (e.g., "03/10/2026 09:39:00")
 */
const getTimestamp = () => {
    return new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
};

const logger = {
    /**
     * Standard informational message.
     * @param {string} message 
     */
    info: (message) => console.log(`[${getTimestamp()}] ℹ INFO: ${message}`),

    /**
     * Successful operation message.
     * @param {string} message 
     */
    success: (message) => console.log(`[${getTimestamp()}] ✅ SUCCESS: ${message}`),

    /**
     * Warning message (e.g., bot detection, minor issue).
     * @param {string} message 
     */
    warn: (message) => console.warn(`[${getTimestamp()}] ⚠️ WARN: ${message}`),

    /**
     * Error message for failures and exceptions.
     * @param {string} message 
     */
    error: (message) => console.error(`[${getTimestamp()}] ❌ ERROR: ${message}`),

    /**
     * System or critical lifecycle message (e.g., startup).
     * @param {string} message 
     */
    system: (message) => console.log(`\n[${getTimestamp()}] ⚙️ SYSTEM: ${message}`)
};

module.exports = logger;
