# SignalStack ambitious roadmap

| Phase | Proposed milestone | Evidence of success |
|---|---|---|
| 0 (implemented) | Local event parser and revenue funnel calculations | Deterministic tests, warnings on broken tracking, no external requests |
| 1 | Open JSON event spec + schema checks | External developers can emit valid, independently checked events |
| 2 | Consent-safe connectors | Sandbox syncs with opt-in form, checkout and payment test environments |
| 3 | Cohort and refund-aware financial ledger | Event and order reconciliation agrees with test payment records |
| 4 | Anomaly and data-quality diagnostics | Controlled injected duplicate data triggers useful explanations |
| 5 | Experiment workbench | Pre-registered hypotheses, guardrail metrics, sample-size planning |
| 6 | Human-approved optimization assistants | Auditable proposed changes, no live writes without permission |
| 7 (moonshot) | Cross-platform creator-owned experimentation | Campaign, content and store adapters speak one open, privacy-safe event standard |

## Research questions

- Can funnel data be useful without invasive tracking?
- How can the system report uncertainty when one source misses most visits?
- What is the safest way to reconcile browser pixels with webhook orders?
- Can non-technical creators understand experiments without mistaking correlation for causation?
- Can we make checkout and ads adapters interchangeable, so business owners own the data?

## First issues

1. Add a JSON Schema and reject untrusted or unknown fields with clear errors.
2. Separate unique buyer conversion from purchase/order conversion in all views.
3. Add refunds and payment-processing fees without calling revenue-minus-ad-spend profit.
4. Build cohort-ordered event journeys with deterministic identity fixtures.
