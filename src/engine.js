/* SignalStack: privacy-first, event-based funnel analysis. No external services. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SignalStack = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = new Set(['landing_view', 'opt_in', 'checkout_view', 'purchase']);
  const stageKey = { landing_view: 'landingVisitors', opt_in: 'leads', checkout_view: 'checkoutVisitors' };
  const priority = { server: 2, browser: 1 };
  const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const rate = (num, den) => den === 0 ? null : money(num / den * 100);

  function validateReport(report) {
    if (!report || typeof report !== 'object') throw new TypeError('Report must be an object');
    if (!report.period || typeof report.period !== 'object') throw new TypeError('period required');
    const { start, end } = report.period;
    if (typeof start !== 'string' || typeof end !== 'string' || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) >= Date.parse(end)) {
      throw new RangeError('Period needs valid start and end timestamps, start before end');
    }
    if (!Number.isFinite(report.adSpendINR) || report.adSpendINR < 0) throw new RangeError('adSpendINR must be non-negative');
    if (!Array.isArray(report.events)) throw new TypeError('events must be an array');
    for (const [i, e] of report.events.entries()) {
      if (!e || typeof e !== 'object') throw new TypeError(`Invalid event at ${i}`);
      for (const key of ['eventId', 'personId', 'type', 'at']) {
        if (typeof e[key] !== 'string' || !e[key].trim()) throw new TypeError(`Invalid ${key} in event ${i}`);
      }
      if (!TYPES.has(e.type)) throw new RangeError(`Unknown event type: ${e.type}`);
      if (!Number.isFinite(Date.parse(e.at))) throw new RangeError(`Bad timestamp in event ${i}`);
      if (e.type === 'purchase') {
        if (typeof e.orderId !== 'string' || !e.orderId.trim()) throw new TypeError('Purchase needs orderId');
        if (!Number.isFinite(e.valueINR) || e.valueINR < 0) throw new RangeError('Purchase valueINR must be non-negative');
      }
    }
    return report;
  }

  function dedupeEvents(events) {
    const byId = new Map();
    const warnings = [];
    for (const item of events) {
      const previous = byId.get(item.eventId);
      if (!previous) { byId.set(item.eventId, item); continue; }
      if (previous.personId !== item.personId || previous.type !== item.type || previous.orderId !== item.orderId || previous.valueINR !== item.valueINR) {
        warnings.push(`Conflicting payloads share eventId ${item.eventId}. Inspect source data.`);
      }
      if ((priority[item.source] || 0) > (priority[previous.source] || 0)) byId.set(item.eventId, item);
    }
    return { events: Array.from(byId.values()), warnings, removed: events.length - byId.size };
  }

  function analyze(report) {
    validateReport(report);
    const from = Date.parse(report.period.start);
    const to = Date.parse(report.period.end);
    const scoped = report.events.filter(e => Date.parse(e.at) >= from && Date.parse(e.at) < to);
    const dedup = dedupeEvents(scoped);
    const warnings = [...dedup.warnings];
    const stage = { landingVisitors: new Set(), leads: new Set(), checkoutVisitors: new Set(), buyers: new Set() };
    const orders = new Map();
    const firstLandingChannel = new Map();
    const firstLandingAt = new Map();
    for (const e of dedup.events) {
      if (stageKey[e.type]) stage[stageKey[e.type]].add(e.personId);
      if (e.type === 'landing_view') {
        const ts = Date.parse(e.at);
        if (!firstLandingAt.has(e.personId) || ts < firstLandingAt.get(e.personId)) {
          firstLandingAt.set(e.personId, ts);
          firstLandingChannel.set(e.personId, e.channel || 'unattributed');
        }
      }
      if (e.type === 'purchase') {
        stage.buyers.add(e.personId);
        const earlier = orders.get(e.orderId);
        if (earlier) {
          if (earlier.personId !== e.personId || earlier.valueINR !== e.valueINR) {
            warnings.push(`Conflicting records for order ${e.orderId}. Revenue uses one record.`);
          }
        } else orders.set(e.orderId, e);
      }
    }
    const counts = {
      landingVisitors: stage.landingVisitors.size,
      leads: stage.leads.size,
      checkoutVisitors: stage.checkoutVisitors.size,
      uniqueBuyers: stage.buyers.size,
      orders: orders.size,
      rawEvents: scoped.length,
      uniqueEvents: dedup.events.length,
      duplicateEventIds: dedup.removed
    };
    const revenueINR = money([...orders.values()].reduce((total, order) => total + order.valueINR, 0));
    const adSpendINR = money(report.adSpendINR);
    const metrics = {
      landingToOptIn: rate(counts.leads, counts.landingVisitors),
      optInToCheckout: rate(counts.checkoutVisitors, counts.leads),
      checkoutToOrder: rate(counts.orders, counts.checkoutVisitors),
      landingToOrderLPCR: rate(counts.orders, counts.landingVisitors),
      landingToBuyer: rate(counts.uniqueBuyers, counts.landingVisitors),
      costPerOrderINR: counts.orders ? money(adSpendINR / counts.orders) : null,
      adRevenueMultiple: adSpendINR ? money(revenueINR / adSpendINR) : null,
      revenueINR,
      adSpendINR,
      revenueMinusAdSpendINR: money(revenueINR - adSpendINR)
    };
    if (counts.leads > counts.landingVisitors) warnings.push('More leads than unique landing visitors. Tracking paths or IDs may differ.');
    if (counts.checkoutVisitors > counts.leads) warnings.push('More checkout visitors than opt-ins. Some buyers may skip the opt-in.');
    if (counts.orders > counts.checkoutVisitors) warnings.push('More orders than checkout visitors. Check date windows, identity, or tracking.');
    if ([...stage.buyers].some(id => !stage.landingVisitors.has(id))) warnings.push('Some buyers lack landing-view events in this window. LPCR may mix attribution paths.');
    const attribution = {};
    for (const [person, channel] of firstLandingChannel) {
      if (!attribution[channel]) attribution[channel] = { landingVisitors: 0, uniqueBuyers: 0 };
      attribution[channel].landingVisitors += 1;
      if (stage.buyers.has(person)) attribution[channel].uniqueBuyers += 1;
    }
    for (const row of Object.values(attribution)) row.buyerRate = rate(row.uniqueBuyers, row.landingVisitors);
    return {
      project: 'SignalStack', prototype: true,
      period: { ...report.period },
      counts, metrics, attribution,
      warnings,
      experiment: suggestExperiment(counts),
      limitations: [
        'All values are based on the provided events, not a verified analytics platform.',
        'Revenue minus ad spend is NOT profit: fees, refunds, labor and taxes are excluded.',
        'Channel grouping is first observed landing channel, not causal attribution or incrementality.',
        'Counts are period-scoped rather than lifetime cohorts. Do not assume each person progresses through every stage.'
      ]
    };
  }

  function suggestExperiment(counts) {
    const candidates = [
      { stage: 'landing_to_opt_in', lost: Math.max(0, counts.landingVisitors - counts.leads), hypothesis: 'Reduce form friction, make the result clear, and test one stronger above-the-fold explanation.' },
      { stage: 'opt_in_to_checkout', lost: Math.max(0, counts.leads - counts.checkoutVisitors), hypothesis: 'Test a clearer transition from the opt-in result to the paid offer; check whether visitors can skip the form.' },
      { stage: 'checkout_to_purchase', lost: Math.max(0, counts.checkoutVisitors - counts.uniqueBuyers), hypothesis: 'Audit mobile checkout steps, payment failures and trust cues before changing prices.' }
    ];
    candidates.sort((a, b) => b.lost - a.lost);
    const best = candidates[0];
    return {
      priorityStage: best.stage,
      observedGap: best.lost,
      hypothesis: best.hypothesis,
      nextStep: 'Validate tracking, pick one change, run a controlled experiment, and record the outcome.',
      caution: 'Largest count gap is a triage heuristic, not proof of root cause or expected uplift.'
    };
  }

  return { analyze, dedupeEvents, validateReport, suggestExperiment, rate };
});
