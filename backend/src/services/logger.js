/**
 * Logger service for tracking events and notifications
 * Stores logs in memory with timestamps and event types
 */

const MAX_LOGS = 100; // Maximum number of logs to keep in memory

// In-memory log storage
let logs = [];

/**
 * Log event types
 */
export const LOG_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Event categories
 */
export const EVENT_CATEGORIES = {
  SCRAPING: 'scraping',
  SYSTEM: 'system',
  ERROR: 'error'
};

/**
 * Adds a log entry
 * @param {string} message - Log message
 * @param {string} type - Log type (info, success, warning, error)
 * @param {string} category - Event category
 * @param {Object} metadata - Additional metadata
 */
export function addLog(message, type = LOG_TYPES.INFO, category = EVENT_CATEGORIES.SYSTEM, metadata = {}) {
  const logEntry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    message,
    type,
    category,
    metadata
  };

  logs.unshift(logEntry); // Add to beginning

  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS);
  }

  return logEntry;
}

/**
 * Gets all logs
 * @param {number} limit - Maximum number of logs to return
 * @returns {Array} Array of log entries
 */
export function getLogs(limit = 50) {
  return logs.slice(0, limit);
}

/**
 * Gets logs filtered by type
 * @param {string} type - Log type to filter
 * @param {number} limit - Maximum number of logs to return
 * @returns {Array} Filtered log entries
 */
export function getLogsByType(type, limit = 50) {
  return logs.filter(log => log.type === type).slice(0, limit);
}

/**
 * Gets logs filtered by category
 * @param {string} category - Event category to filter
 * @param {number} limit - Maximum number of logs to return
 * @returns {Array} Filtered log entries
 */
export function getLogsByCategory(category, limit = 50) {
  return logs.filter(log => log.category === category).slice(0, limit);
}

/**
 * Clears all logs
 */
export function clearLogs() {
  logs = [];
}

/**
 * Gets unread count (logs since a specific timestamp)
 * @param {string} sinceTimestamp - ISO timestamp
 * @returns {number} Count of unread logs
 */
export function getUnreadCount(sinceTimestamp) {
  if (!sinceTimestamp) return logs.length;
  return logs.filter(log => log.timestamp > sinceTimestamp).length;
}

