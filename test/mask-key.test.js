'use strict';
// The device local key must never reach the log in full: at most the first 2 characters, the rest '*'.
const { expect } = require('chai');
const { maskKey } = require('../lib/mask-key');

describe('maskKey', () => {
    it('keeps the first 2 characters and masks the rest', () => {
        expect(maskKey('ab3456789012cdef')).to.equal(`ab${'*'.repeat(14)}`);
    });
    it('keeps the length so a wrong key length is still visible', () => {
        expect(maskKey('abcdefghij')).to.have.lengthOf(10);
    });
    it('masks short keys completely beyond 2 characters', () => {
        expect(maskKey('abc')).to.equal('ab*');
        expect(maskKey('ab')).to.equal('ab');
        expect(maskKey('a')).to.equal('a');
    });
    it('returns (none) for an empty or missing key', () => {
        expect(maskKey('')).to.equal('(none)');
        expect(maskKey(undefined)).to.equal('(none)');
        expect(maskKey(null)).to.equal('(none)');
    });
    it('handles non-string keys (e.g. Buffer) without leaking them', () => {
        expect(maskKey(Buffer.from('ab3456789012cdef'))).to.equal(`ab${'*'.repeat(14)}`);
    });
});

describe('stringifyMasked', () => {
    const { stringifyMasked } = require('../lib/mask-key');
    const secret = 'ab3456789012cdef';

    it('masks localKey in nested objects and arrays (cloud device list)', () => {
        const out = stringifyMasked([{ devId: 'd1', name: 'Dehumidifier', localKey: secret, productKey: 'pk1' }]);
        expect(out).to.not.include(secret);
        expect(JSON.parse(out)).to.deep.equal([{ devId: 'd1', name: 'Dehumidifier', localKey: `ab${'*'.repeat(14)}`, productKey: 'pk1' }]);
    });
    it('masks every key field name tuyapi and the cloud use', () => {
        const obj = { data: { localKey: secret }, local_key: secret, device: { key: secret, productKey: 'pk1' }, sessionKey: secret, _tmpLocalKey: secret, _tmpRemoteKey: secret };
        const out = stringifyMasked(obj);
        expect(out).to.not.include(secret);
        expect(out).to.include('"productKey":"pk1"');
    });
    it('masks binary keys (Buffer) completely', () => {
        const out = stringifyMasked({ sessionKey: Buffer.from(secret), key: Buffer.from(secret) });
        expect(JSON.parse(out)).to.deep.equal({ sessionKey: '(masked)', key: '(masked)' });
    });
    it('keeps empty keys visible as (none) and leaves other values alone', () => {
        expect(JSON.parse(stringifyMasked({ localKey: '', ip: '1.2.3.4', dps: { 1: true } }))).to.deep.equal({ localKey: '(none)', ip: '1.2.3.4', dps: { 1: true } });
    });
    it('behaves like JSON.stringify for undefined', () => {
        expect(stringifyMasked(undefined)).to.equal(undefined);
    });
});
