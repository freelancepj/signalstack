# SignalStack

**An open-source, creator-owned revenue observatory for digital product businesses.**

> Status: **research-stage / working local analytics prototype**. The long-term agentic vision is **not built**. Metrics are only as accurate as the events supplied. No live Meta Ads, payment, checkout, or CRM integration exists yet.

## The moonshot

Small digital product businesses often run Meta ads, landing pages, opt-ins, checkouts, payment providers, and email flows across several separate tools. When tracked events duplicate or IDs don't match, numbers stop adding up. A creator is left asking: *"What is my real landing page conversion rate, and what should I fix next?"*

**SignalStack aims to be the privacy-first decision layer for one-person digital product businesses.** Instead of ten dashboards, imagine a single transparent system that:

- Unifies consented, pseudonymous events from landing pages, forms, checkout, ads, and email.
- Detects double-counted purchases across browser pixels, server events, and payment webhooks.
- Shows the full path: **unique landing visitors → opt-ins → checkout visits → paid orders**.
- Explains uncertainty, mismatched windows, attribution limits, and tracking gaps.
- Proposes **one experiment at a time**, states its evidence, and waits for human approval.
- Learns from experiment outcomes without making up causal conclusions.
- Eventually supports portable creator-owned event schemas and local or self-hosted deployment.

This is a long-term, ambitious direction, not a finished AI growth platform.

## What works now

A zero-dependency event analytics engine with:

- Event-ID deduplication (including browser/server repeats) and order-ID deduplication.
- Unique-person stage counts, orders, opt-in %, checkout %, LPCR and ad-spend comparisons.
- First observed landing-channel grouping, clearly labeled non-causal.
- Tracking-quality warnings, zero-denominator safety, and a **heuristic** suggested experiment.
- CLI and a local browser dashboard for JSON input (nothing is uploaded).

Requires Node.js 20+ for CLI and tests:

```bash
npm run demo
npm test
```

Or open `index.html` locally, then select `examples/synthetic-event-stream.json`. All example data is fictional. Use only consented and pseudonymized real data when testing.

## What the numbers mean

- **LPCR** = number of distinct orders / unique landing page visitors × 100, for the same specified time window. An order is not necessarily a unique buyer.
- **Checkout conversion** = distinct orders / distinct checkout visitors × 100.
- **Revenue minus ad spend** is **not profit**, as refunds, taxes, fees, delivery costs, and team expenses are excluded.
- **First observed channel** is not an incrementality measurement or reliable attribution of ad effectiveness.
- **Largest stage gap** is a place to investigate, not proof that changing that stage will increase sales.

See [`docs/architecture.md`](docs/architecture.md) and [`docs/roadmap.md`](docs/roadmap.md).

## Build it with us

Early contributions: versioned open event schema, consent-safe upload parser, currency and refunds model, funnel cohort logic, statistical experiment design, and connectors. MIT licensed in [`../LICENSE`](LICENSE).
