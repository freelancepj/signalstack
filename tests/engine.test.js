const test = require('node:test');
const assert = require('node:assert/strict');
const example = require('../examples/synthetic-event-stream.json');
const { analyze, dedupeEvents } = require('../src/engine');

test('calculates deduplicated business funnel from event stream', () => {
  const report = analyze(example);
  assert.equal(report.counts.landingVisitors, 10);
  assert.equal(report.counts.leads, 6);
  assert.equal(report.counts.checkoutVisitors, 4);
  assert.equal(report.counts.orders, 3);
  assert.equal(report.counts.uniqueBuyers, 3);
  assert.equal(report.metrics.landingToOptIn, 60);
  assert.equal(report.metrics.optInToCheckout, 66.67);
  assert.equal(report.metrics.checkoutToOrder, 75);
  assert.equal(report.metrics.landingToOrderLPCR, 30);
});
test('duplicate event IDs and order IDs are not double-counted', () => {
  const report = analyze(example);
  assert.equal(report.counts.duplicateEventIds, 1);
  assert.equal(report.counts.orders, 3);
  assert.equal(report.metrics.revenueINR, 1497);
});
test('ad spend subtraction is not described as profit', () => {
  const report = analyze(example);
  assert.equal(report.metrics.revenueMinusAdSpendINR, -3);
  assert.match(report.limitations.join(' '), /NOT profit/);
});
test('source priority prefers server with same event ID', () => {
  const events = example.events.filter(e => e.eventId === 'pu01');
  const result = dedupeEvents(events);
  assert.equal(result.events[0].source, 'server');
});
test('zero denominators return null, not zero conversion', () => {
  const copy = { period: example.period, adSpendINR: 0, events: [] };
  const report = analyze(copy);
  assert.equal(report.metrics.landingToOrderLPCR, null);
  assert.equal(report.metrics.adRevenueMultiple, null);
});
test('out-of-window events are excluded', () => {
  const report = analyze(example);
  assert.equal(report.counts.rawEvents, example.events.length - 1);
});
test('invalid event and negative spend fail loudly', () => {
  assert.throws(() => analyze({ ...example, adSpendINR: -1 }), RangeError);
  const broken = structuredClone(example);
  broken.events[0].type = 'random';
  assert.throws(() => analyze(broken), RangeError);
});
test('does not mutate input', () => {
  const before = JSON.stringify(example);
  analyze(example);
  assert.equal(JSON.stringify(example), before);
});
test('reports buyers missing landing events as attribution risk', () => {
  const copy = structuredClone(example);
  copy.events.push({ eventId: 'mystery-purchase', personId: 'anon-99', type: 'purchase', at: '2026-11-03T12:00:00+05:30', orderId: 'order-99', valueINR: 499, source: 'server' });
  const report = analyze(copy);
  assert.match(report.warnings.join(' '), /lack landing-view/);
});
