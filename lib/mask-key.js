'use strict';

/**
 * Mask a device local key for logging: keep at most the first 2 characters, replace the rest with '*'.
 * The length stays visible (helps to spot a truncated key), the key itself does not.
 * @param {string|Buffer|undefined|null} key
 * @returns {string} e.g. "ab**************", or "(none)" if there is no key
 */
function maskKey(key) {
    if (key === undefined || key === null) return '(none)';
    const k = String(key);
    if (!k.length) return '(none)';
    return k.slice(0, 2) + '*'.repeat(Math.max(0, k.length - 2));
}

module.exports = { maskKey };
