'use strict';
// Regression test for Apollon77/ioBroker.tuya#760 / sindresorhus/got#2469:
// on Node.js >= 24.20 a refused connection made got 11 throw an uncaught
// "The `onCancel` handler was attached after the promise settled." from its retry timer.
const { expect } = require('chai');
const { spawnSync } = require('child_process');
const path = require('path');

const [major, minor] = process.versions.node.split('.').map(Number);
const affectedNode = major > 24 || (major === 24 && minor >= 20);

// Child process: optionally load lib/appcloud.js (applies the fix), then request a port nobody listens on.
function run(withFix) {
    const script = `
        ${withFix ? "require(" + JSON.stringify(path.join(__dirname, 'appcloud.js')) + ");" : ''}
        const got = require(require.resolve('got', { paths: [require('path').dirname(require.resolve('@tuyapi/cloud'))] }));
        process.on('unhandledRejection', (e) => { console.log('CRASH ' + e.message); process.exit(6); });
        process.on('uncaughtException', (e) => { console.log('CRASH ' + e.message); process.exit(6); });
        got('http://127.0.0.1:59999/', { timeout: { request: 10000 } })
            .catch((e) => console.log('CAUGHT ' + e.code))
            .finally(() => setTimeout(() => process.exit(0), 4000));
    `;
    return spawnSync(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 20000 });
}

// Child process: the adapter's AppCloud client against a cloud endpoint that is down (e.g. router restart).
function runAppCloud() {
    const script = `
        const AppCloud = require(${JSON.stringify(path.join(__dirname, 'appcloud.js'))});
        process.on('unhandledRejection', (e) => { console.log('CRASH ' + e.message); process.exit(6); });
        process.on('uncaughtException', (e) => { console.log('CRASH ' + e.message); process.exit(6); });
        const cloud = new AppCloud('user@example.invalid', 'x', 'EU', 'tuya_smart', undefined, undefined, 'EU', 'http://127.0.0.1:59999/api.json', null);
        cloud.login()
            .catch((e) => console.log('LOGIN_FAILED ' + e.code))
            .then(() => cloud.getGroupDevices('gid'))
            .then((r) => console.log('RESULT ' + JSON.stringify(r)), (e) => console.log('REJECTED ' + e.message))
            .finally(() => setTimeout(() => process.exit(0), 4000));
    `;
    return spawnSync(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 20000 });
}

describe('got retry fix (Node.js >= 24.20, #760)', function () {
    this.timeout(30000);

    it('AppCloud reports a cloud outage as a rejected call (not undefined) and nothing crashes later', function () {
        const r = runAppCloud();
        expect(r.status, r.stdout + r.stderr).to.equal(0);
        expect(r.stdout).to.contain('LOGIN_FAILED ECONNREFUSED');
        expect(r.stdout).to.match(/REJECTED /);
        expect(r.stdout).not.to.contain('RESULT');
        expect(r.stdout).not.to.contain('CRASH');
    });

    it('without the fix the bug is reproducible (only on affected Node.js versions)', function () {
        if (!affectedNode) this.skip();
        const r = run(false);
        if (!r.stdout.includes('CRASH')) this.skip(); // this Node.js version doesn't have the regression (e.g. Node.js 25)
        expect(r.stdout).to.contain('CRASH The `onCancel` handler was attached after the promise settled.');
    });

    it('with the fix a refused connection is a normal, catchable error and nothing crashes later', function () {
        const r = run(true);
        expect(r.status, r.stdout + r.stderr).to.equal(0);
        expect(r.stdout).to.contain('CAUGHT ECONNREFUSED');
        expect(r.stdout).not.to.contain('CRASH');
    });
});
