import test from 'node:test';
import assert from 'node:assert/strict';
import { createBus } from '../../src/core/bus.js';
import { createRng, hash2 } from '../../src/core/rng.js';
import { createClock } from '../../src/core/clock.js';

test('bus: on/once/emit/defer, throwing handler does not stop others', () => {
  const errs = [];
  const bus = createBus((t, e) => errs.push([t, e.message]));
  const seen = [];
  const off = bus.on('a:b', (p) => seen.push(['h1', p.n]));
  bus.on('a:b', () => { throw new Error('boom'); });
  bus.on('a:b', (p) => seen.push(['h3', p.n]));
  bus.once('a:b', (p) => seen.push(['once', p.n]));
  bus.emit('a:b', { n: 1 }); bus.emit('a:b', { n: 2 });
  assert.deepEqual(seen, [['h1', 1], ['h3', 1], ['once', 1], ['h1', 2], ['h3', 2]]);
  assert.equal(errs.length, 2);
  off(); bus.emit('a:b', { n: 3 });
  assert.equal(seen.filter((s) => s[0] === 'h1').length, 2);
  bus.defer('a:b', { n: 9 });
  assert.equal(seen.filter((s) => s[1] === 9).length, 0);
  bus.flush();
  assert.equal(seen.filter((s) => s[1] === 9).length, 1);
});

test('rng: same seed gives the same sequence, different seeds differ, state round-trips', () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const sa = Array.from({ length: 100 }, () => a.nextU32()), sb = Array.from({ length: 100 }, () => b.nextU32()), sc = Array.from({ length: 100 }, () => c.nextU32());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  const st = a.state(); const x1 = a.float(); const d = createRng(1); d.setState(st); assert.equal(d.float(), x1);
  for (let i = 0; i < 1000; i++) { const f = a.float(); assert.ok(f >= 0 && f < 1); }
  assert.equal(hash2(5, 9, 3), hash2(5, 9, 3));
});

test('clock: 1 real second = 1 game minute, emits minute/hour/day events', () => {
  const bus = createBus(); const ev = [];
  for (const t of ['time:minute', 'time:hour', 'time:day', 'time:week']) bus.on(t, (p) => ev.push([t, p]));
  const clk = createClock(bus, { total: 480 });
  for (let i = 0; i < 60; i++) clk.advance(1);
  assert.equal(ev.filter((e) => e[0] === 'time:minute').length, 60);
  assert.equal(ev.filter((e) => e[0] === 'time:hour').length, 1);
  assert.equal(clk.gameTime().minute, 540);
  clk.advance(1440 * 60);
  assert.ok(ev.some((e) => e[0] === 'time:day'));
});
