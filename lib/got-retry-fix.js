'use strict';

/**
 * Work around a crash with got 11 (used by @tuyapi/cloud) on Node.js >= 24.20.
 *
 * Since Node.js 24.20 (nodejs/node#64847) a failed connection (e.g. ECONNREFUSED, or the internet
 * being down while the router restarts) makes got reject early with ERR_SOCKET_CLOSED_BEFORE_CONNECTION.
 * The retry got had already scheduled still fires afterwards, attaches an onCancel handler to the
 * settled promise, and p-cancelable throws "The `onCancel` handler was attached after the promise settled."
 * from a timer. Nobody can catch that, so the adapter terminates with code 6 and, after three crashes,
 * ioBroker stops restarting it ("restart loop detected").
 * See sindresorhus/got#2469 and Apollon77/ioBroker.tuya#760.
 *
 * @tuyapi/cloud calls got with the default retry and has no option to change it. The adapter handles a
 * failed cloud login itself (local control keeps working), so we disable got's own retry for the copy of got
 * that @tuyapi/cloud loads. Must run before @tuyapi/cloud is required.
 */
const path = require('path');

let applied = false;

function applyGotRetryFix() {
    if (applied) return true;
    let gotPath;
    try {
        gotPath = require.resolve('got', { paths: [path.dirname(require.resolve('@tuyapi/cloud'))] });
    } catch (e) {
        return false; // @tuyapi/cloud or got not installed: nothing to fix
    }
    const got = require(gotPath);
    if (typeof got.extend !== 'function') return false;
    require.cache[gotPath].exports = got.extend({ retry: { limit: 0 } });
    applied = true;
    return true;
}

module.exports = { applyGotRetryFix };
