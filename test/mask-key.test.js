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
