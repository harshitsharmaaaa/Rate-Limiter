import { describe, it, expect } from 'vitest';
const dist = require('../dist/index.js');

describe('SDK basic', () => {
  it('exports RateLimiterClient', () => {
    expect(dist).toHaveProperty('RateLimiterClient');
    const { RateLimiterClient } = dist;
    expect(typeof RateLimiterClient).toBe('function');
  });
});
