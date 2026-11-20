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

// Property names that hold a device key: cloud/app data (localKey, local_key), tuyapi (device.key,
// sessionKey, _tmpLocalKey, _tmpRemoteKey). productKey is a product type id, not a secret.
const KEY_FIELDS = new Set(['localKey', 'local_key', 'key', 'sessionKey', '_tmpLocalKey', '_tmpRemoteKey']);

/**
 * JSON.stringify for logging: every key field (see KEY_FIELDS) at any depth is masked with maskKey().
 * Binary keys (Buffer, already turned into {type, data} by JSON.stringify) become "(masked)".
 * @param {any} value
 * @returns {string|undefined}
 */
function stringifyMasked(value) {
    return JSON.stringify(value, (name, v) => {
        if (!KEY_FIELDS.has(name) || v === undefined || v === null) return v;
        return typeof v === 'string' ? maskKey(v) : '(masked)';
    });
}

module.exports = { maskKey, stringifyMasked };
