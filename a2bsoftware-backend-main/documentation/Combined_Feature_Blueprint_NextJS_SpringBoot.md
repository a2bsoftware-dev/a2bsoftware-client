# Combined Feature Blueprint: CAWI + Panel Monetization → Your Tool (Next.js + Spring Boot)

**Source documents synthesized:**
1. `CA_Feature_and_Architecture_Analysis.md` — survey engine, fraud/quality, quotas, ERP, AI, benchmarks
2. `Ci_Feature_and_Architecture_Analysis.md` — panel/audience monetization, yield management, incentives, trust scoring, marketplace routing

**Stack assumed:** Next.js (App Router, React/TypeScript) frontend, Spring Boot (Java) backend, relational DB (Postgres assumed — swap notes if you're on MySQL), Redis for counters/caching. Every implementation note below is written for this exact combination.

---

## Quick Nav

0. Stack-Specific Architecture Split
1. Survey Engine & Questionnaire Layer
2. Quota Management & Intelligent Routing
3. Fraud-Cop / Trust & Data Quality Engine
4. Panel & Audience Ingestion
5. Monetization & Yield Management
6. Vendor / Supplier Marketplace & ERP
7. Incentives & Gamified Retention
8. AI/ML Layer (cross-cutting)
9. Communication & Marketing Automation
10. Business Intelligence & Analytics
11. Access Control & Multi-Tenant Architecture
12. Multi-Mode Integration (CATI/CAPI)
13. Hardcoded Industry Benchmarks (UX defaults)
14. Buy-vs-Build Shortcut Map
15. Phased Implementation Roadmap
16. Dependency Shortlist (copy-paste starting point)

---

## 0. Stack-Specific Architecture Split

General rule for this whole blueprint: **Spring Boot owns all state, rules, and security. Next.js owns rendering and UX.** Don't put business logic (quota math, fraud rules, margin checks) in Next.js API routes — keep Next.js as a thin client calling Spring Boot's REST API, so there's one source of truth and one place to audit.

| Layer | Next.js responsibility | Spring Boot responsibility |
|---|---|---|
| Survey builder/taker | Render question components, form state, MediaRecorder capture, client-side validation | Persist survey definitions, resolve piping/randomization, serve next-question payloads |
| Fraud/quality | Render CAPTCHA widget, block paste via `onPaste` | Verify CAPTCHA server-side, call fraud APIs, own all flag/threshold logic |
| Quotas/routing | Display "you're routed to survey B" screen | Own quota counters (Redis), routing decisions, least-filled math |
| Payments/rewards | Progress dashboard UI | All reward API calls (Tremendous/Stripe), trust-score gating |
| Auth/RBAC | Route-level guards reading JWT claims (UX only, not security boundary) | Actual enforcement via Spring Security `@PreAuthorize` — this is the real gate |
| Reporting/BI | Charts (Recharts) consuming REST endpoints | Aggregation queries, scheduled report generation |

Auth pattern: Spring Boot (Spring Security + a JWT library like `io.jsonwebtoken`/jjwt, or Spring Authorization Server if you want full OAuth2) issues and validates tokens. Next.js stores the token (httpOnly cookie set by Spring Boot is safest) and reads role claims only to decide what to *render* — never treat a client-side check as the actual security boundary.

---

## 1. Survey Engine & Questionnaire Layer

### 1.1 AI Word-Doc-to-Survey Import
- **What it does:** Ingests a client's Word brief and auto-detects questions/logic to draft a survey.
- **Profit impact:** Cuts survey setup time from hours to minutes.
- **Implementation path:**
  - *Spring Boot:* Controller accepts `MultipartFile`, extracts text with Apache POI or Apache Tika, sends it to Claude/OpenAI via `WebClient` with a prompt requesting strict JSON (`{questions, options, logic}`), maps the response into your `Survey`/`Question` JPA entities.
  - *Next.js:* An upload page (`react-dropzone`) posts the file to the Spring Boot endpoint, then renders the parsed draft in an editable preview before the user confirms save.
- **What improves:** Removes your biggest manual-labor bottleneck with one new controller + one LLM call.
- **Effort:** Low–Medium

### 1.2 Extensive Question Library (80+ types)
- **What it does:** Templates for radio/matrix/MaxDiff/conjoint/etc.
- **Profit impact:** Lets you sell advanced methodologies as premium items.
- **Implementation path:**
  - *Spring Boot:* One `Question` entity with a `type` discriminator column + a `config` JSONB column (map via `hypersistence-utils-hibernate`) instead of a table per question type.
  - *Next.js:* A component registry — `{ single_select: <SingleSelect/>, matrix: <Matrix/>, maxdiff: <MaxDiff/> }` — rendered dynamically by `type`, so adding a question type is "add one React component + one map entry," not a schema migration.
- **What improves:** Expands project types without re-architecting the survey engine each time.
- **Effort:** Medium (core 10–12 types), High (full 80+)

### 1.3 Multimedia & Video Open-Ends
- **What it does:** Video/audio/image responses to open-ends.
- **Profit impact:** Opens a qualitative-research revenue line.
- **Implementation path:**
  - *Next.js:* Component wraps the browser's native `MediaRecorder` API, uploads the resulting blob directly to S3 using a presigned URL.
  - *Spring Boot:* `/media/presign` endpoint using AWS SDK for Java v2 to generate a presigned PUT URL; stores only the S3 key in the `Response` entity.
- **What improves:** Adds a qualitative layer on top of quant with no media ever touching your own servers.
- **Effort:** Medium

### 1.4 Piping & Dynamic Text Insertion
- **What it does:** Inserts earlier answers into later question text.
- **Profit impact:** Reduces drop-off, raises completed-survey volume.
- **Implementation path:**
  - *Spring Boot:* Resolve `{{q3_answer}}`-style placeholders server-side (a lightweight templating lib like Mustache.java, or a simple regex replace against session-stored answers) before returning the next question payload.
  - *Next.js:* Just renders whatever text it receives — no client-side logic.
- **What improves:** Personalized flow via a templating step, no new subsystem.
- **Effort:** Low

### 1.5 Advanced Randomization
- **What it does:** Randomizes question/answer order per render.
- **Profit impact:** Improves data defensibility for enterprise clients.
- **Implementation path:**
  - *Spring Boot:* `Collections.shuffle()` on the option list, seeded by respondent session ID if you need reproducibility for QA.
- **What improves:** Methodological credibility for a few lines of service code.
- **Effort:** Low

### 1.6 Multilingual Localization (single script, 80+ languages)
- **What it does:** One survey definition, many languages, merged dataset.
- **Profit impact:** Unlocks multi-country tracker studies.
- **Implementation path:**
  - *Spring Boot:* `question_translation` table (`question_id`, `locale`, `text`); service resolves by `Accept-Language` header or an explicit `locale` param. Use DeepL API via `WebClient` to auto-draft translations for human QA.
  - *Next.js:* `next-intl` (or simple locale-prefixed routing, e.g. `/[locale]/survey/[id]`) to pass locale through to the API calls.
- **What improves:** Global fielding from one build.
- **Effort:** Medium

### 1.7 AI Qualitative Probing on Open-Ends
- **What it does:** Auto-generates a follow-up if an open-end answer is thin.
- **Profit impact:** Upsell "AI-enhanced qual" over standard quant.
- **Implementation path:**
  - *Spring Boot:* On submit, an `@Async` service call to Claude/OpenAI ("is this substantive? If not, produce one clarifying follow-up") returns a conditional next-question payload.
  - *Next.js:* Shows a brief loading state, then renders the follow-up inline if one comes back.
- **What improves:** Deeper open-end data without a manual review step.
- **Effort:** Medium

---

## 2. Quota Management & Intelligent Routing

### 2.1 Interlocking Quota Engine with "Least-Filled" Allocation
- **What it does:** Tracks demographic cells live, routes to whichever is furthest from target.
- **Profit impact:** Prevents paying for over-quota completions clients discard.
- **Implementation path:**
  - *Spring Boot:* Quota cells as Postgres rows (`cell_id`, `criteria_json`, `target`), but **live counters in Redis** via `RedisTemplate.opsForValue().increment()` — atomic, no race conditions under concurrent traffic. A `QuotaAllocationService` ranks open cells by `(target - current) / target` to pick least-filled.
- **What improves:** Manual quota-watching becomes an automatic, race-safe balancing system.
- **Effort:** Medium

### 2.2 Dynamic Survey Router (screen-out redirect)
- **What it does:** Redirects disqualified respondents to a survey they're likely to qualify for.
- **Profit impact:** Recovers otherwise-wasted acquisition cost per click.
- **Implementation path:**
  - *Spring Boot:* `RouterService` matches respondent attributes against open studies' criteria, returns a redirect target via REST.
  - *Next.js:* Calls the endpoint on disqualification and does `router.push()` (or a full redirect if crossing to an external survey link), carrying over existing query params.
- **What improves:** Every screened-out click becomes a second monetization chance.
- **Effort:** Medium

### 2.3 Intelligent ML Respondent-to-Survey Matching
- **What it does:** Learns which profiles convert best on which survey types.
- **Profit impact:** Lower cost per complete, higher panel satisfaction.
- **Implementation path:**
  - *Spring Boot:* Start as a plain `@Service` weighted-scoring function over stored attributes + historical conversion rate. If you outgrow rules-based matching later, keep Spring Boot as the orchestrator and add a small Python (FastAPI) microservice for the actual model, called via `WebClient` — don't force real ML into the Java service prematurely.
- **What improves:** Reduces wasted respondent attempts and churn.
- **Effort:** Low (v1) → High (real ML later)

### 2.4 Recontact Algorithm (Panelist ID tracking)
- **What it does:** Re-invites a cohort of prior respondents for follow-ups.
- **Profit impact:** Unlocks premium longitudinal-study pricing.
- **Implementation path:**
  - *Spring Boot:* Persist a stable `panelist_id` on every `Completion` entity; one JPA query (or Spring Data Specification) filters by study + demographic + date range to build a recontact list, then hands it to your email service (Section 9).
  - *Next.js:* Admin form for building the recontact criteria, calling that endpoint.
- **What improves:** Converts a one-time respondent into a reusable asset.
- **Effort:** Low–Medium

---

## 3. Fraud-Cop / Trust & Data Quality Engine

### 3.1 Geo-IP + VPN/TOR Detection
- **What it does:** Flags/blocks mismatched-geo or VPN/TOR traffic.
- **Profit impact:** Protects your ability to get paid — bad geo data gets studies rejected.
- **Implementation path:**
  - *Spring Boot:* `WebClient` call to IPQualityScore or MaxMind GeoIP2 at the survey-entry controller; cache results per IP in Redis with a short TTL to avoid redundant lookups/cost.
- **What improves:** Enterprise-grade fraud defense via one API integration.
- **Effort:** Low

### 3.2 Duplicate IP / Device Mapping
- **What it does:** Caps completions per IP/device.
- **Profit impact:** Cheapest fraud win available.
- **Implementation path:**
  - *Spring Boot:* Redis `SETNX`/counter keyed on `(study_id, ip_hash)`, or a Postgres unique/counter constraint if you'd rather keep it durable in the relational store.
- **What improves:** Blocks the most common fraud vector immediately.
- **Effort:** Low

### 3.3 Bot Detection / CAPTCHA
- **What it does:** Filters non-human traffic pre-survey.
- **Profit impact:** Keeps garbage data out of billable completes.
- **Implementation path:**
  - *Next.js:* Render Google reCAPTCHA v3 or Cloudflare Turnstile at survey entry.
  - *Spring Boot:* Verify the token server-side (REST call to Google's `siteverify`) before issuing a survey session — never trust client-side verification alone.
- **What improves:** Off-the-shelf bot defense, real enforcement server-side.
- **Effort:** Low

### 3.4 Cookie-Deletion / Repeat-Attempt Detection
- **What it does:** Detects cookie-clearing to bypass exclusion rules.
- **Profit impact:** Stops incentive double-dipping.
- **Implementation path:**
  - *Spring Boot:* Set a signed httpOnly cookie **and** store a separate device-fingerprint hash (IP + user-agent + a client-generated canvas/device hash) in Postgres; flag when a completed record's fingerprint reappears without its cookie.
- **What improves:** Closes the most common fraud loophole beyond basic cookies.
- **Effort:** Medium

### 3.5 Speeder Detection (LOI floor)
- **What it does:** Flags implausibly fast completions.
- **Profit impact:** Removes low-effort junk before client delivery.
- **Implementation path:**
  - *Spring Boot:* `@Scheduled` job computes median LOI per study once ~30–50 completes exist, caches the floor value in Redis; inline check at submit time compares actual LOI against the cached floor.
- **What improves:** Statistically grounded quality gate, no ML needed.
- **Effort:** Low

### 3.6 Abandon Copy-Paste
- **What it does:** Disables paste in open-end fields.
- **Profit impact:** Blocks LLM-pasted/boilerplate answers.
- **Implementation path:**
  - *Next.js:* `onPaste={(e) => e.preventDefault()}` on open-end `<textarea>` components — pure frontend, no backend change needed.
- **What improves:** Blocks a fast-growing fraud vector for near-zero effort.
- **Effort:** Low

### 3.7 Straight-Lining / Logic-Consistency Checks
- **What it does:** Detects repeated matrix columns or contradictory answers.
- **Profit impact:** Catches low-effort respondents other checks miss.
- **Implementation path:**
  - *Spring Boot:* Post-submit service computes variance of selected column indices for matrix questions; a small rules table of known contradictory answer pairs is checked in the same service. Store results in a `quality_flags` column.
- **What improves:** Behavioral quality layer beyond metadata checks.
- **Effort:** Low–Medium

### 3.8 Dynamic Trust Score
- **What it does:** Continuous reliability score per panelist, replacing binary pass/fail rules.
- **Profit impact:** High-trust users get retention perks (7.2); low-trust users are quietly deprioritized instead of hard-blocked — less false-positive churn, same protection.
- **Implementation path:**
  - *Spring Boot:* `@Scheduled` nightly job (or a proper Spring Batch job if volume grows) recomputes a `trust_score` column on the `Panelist` entity from a weighted formula over recent LOI variance, straight-lining flags, and rejection rate.
- **What improves:** Fraud detection becomes graduated, not just gatekeeping.
- **Effort:** Medium

---

## 4. Panel & Audience Ingestion

### 4.1 Secure Data Import Engine (CSV + API)
- **What it does:** Bulk/continuous import of panelist profiles and reward history.
- **Profit impact:** Removes the biggest onboarding barrier — faster time-to-revenue.
- **Implementation path:**
  - *Spring Boot:* `MultipartFile` CSV endpoint using OpenCSV or Apache Commons CSV, batch-inserted via JPA `saveAll()` or raw JDBC batch for large files (JPA `saveAll` alone gets slow past tens of thousands of rows — use `JdbcTemplate.batchUpdate` if so).
  - *Next.js:* Drag-drop upload with a column-mapping step before submit.
- **What improves:** Onboard an entire existing community in a day.
- **Effort:** Low–Medium

### 4.2 Lead Import API
- **What it does:** Converts CRM/loyalty leads into panelists without re-verification.
- **Profit impact:** Dramatically lowers cost-per-acquired-panelist.
- **Implementation path:**
  - *Spring Boot:* REST endpoint secured with Spring Security's OAuth2 resource server (client-credentials tokens, one per client), mapping the external payload to your `Panelist` entity.
- **What improves:** Platform becomes a monetization layer over clients' existing audiences.
- **Effort:** Low–Medium

### 4.3 Multi-Panel Consolidation
- **What it does:** Multiple branded panels under one back end.
- **Profit impact:** One client can run several segments without extra licenses.
- **Implementation path:**
  - *Spring Boot:* Add `panel_id` to relevant entities; enforce scoping via a Hibernate `@Filter` (enabled per-session) or by adding `panelId` to every repository method/Specification rather than separate schemas.
- **What improves:** Supports multi-brand enterprise clients without a schema rewrite.
- **Effort:** Medium

### 4.4 Custom Profiling & Attributes
- **What it does:** Operator-defined demographic/behavioral fields.
- **Profit impact:** Higher IR through better targeting.
- **Implementation path:**
  - *Spring Boot:* JSONB column on `Panelist` mapped via `hypersistence-utils-hibernate`'s `@Type(JsonType.class)` — avoids a migration every time a client wants a new field.
- **What improves:** Flexible targeting without constant DB changes.
- **Effort:** Low–Medium

---

## 5. Monetization & Yield Management

### 5.1 Dynamic Margin Controls
- **What it does:** Minimum acceptable margin between CPI and incentive cost.
- **Profit impact:** Protects gross margin at the transaction level.
- **Implementation path:**
  - *Spring Boot:* `@Service` rule: `if ((cpi - incentiveCost) / cpi) < minMargin: hide`. Store `minMargin` in a `panel_settings` table, not hardcoded.
- **What improves:** Prevents silent margin erosion before month-end books.
- **Effort:** Low

### 5.2 Revenue Per Interview (RPI) Filtering
- **What it does:** Blocks inventory below an RPI threshold.
- **Profit impact:** Protects perceived platform value, reduces panelist churn.
- **Implementation path:**
  - *Spring Boot:* Extend the same rule engine (5.1) with a second threshold field — build both as one "inventory filter" service.
- **What improves:** Better retention from the same code you're already writing.
- **Effort:** Low

### 5.3 Offerwall Clustering
- **What it does:** Ranked list of alternatives instead of a dead end.
- **Profit impact:** More completions per visit.
- **Implementation path:**
  - *Next.js:* A grid/list component consuming the same Router endpoint (2.2), rendered as a list instead of an auto-redirect.
- **What improves:** One backend capability now powers two monetization surfaces.
- **Effort:** Low (if 2.2 exists)

### 5.4 Automated Financial Reconciliation & Invoicing
- **What it does:** Cross-references completed/approved IDs to auto-calculate payouts and invoices.
- **Profit impact:** Eliminates the biggest recurring admin cost.
- **Implementation path:**
  - *Spring Boot:* This is genuinely a good fit for **Spring Batch** (not just `@Scheduled`) given the volume/restart-ability needs — a nightly job diffs approved completions against supplier-reported IDs and generates invoice line items. Use the Stripe Java SDK for actual invoice generation instead of building PDF output yourself.
- **What improves:** Multi-day manual finance task → nightly automated job.
- **Effort:** Medium–High

---

## 6. Vendor / Supplier Marketplace & ERP

### 6.1 E-Bidding / RFQ Management
- **What it does:** Push project specs to multiple suppliers, compare bids.
- **Profit impact:** Competitive pricing instead of email-chain procurement.
- **Implementation path:**
  - *Spring Boot:* `Rfq`/`Bid` JPA entities, standard REST CRUD controllers.
  - *Next.js:* Dashboard table (shadcn/ui `<Table>` + sorting) comparing bids by price/feasibility.
- **What improves:** Formalized sourcing without a real-time auction engine.
- **Effort:** Medium

### 6.2 Supplier Portal
- **What it does:** Locked-down vendor view of their own quotas/stats.
- **Profit impact:** Removes PM's manual-reporting workload.
- **Implementation path:**
  - *Spring Boot:* `@PreAuthorize("hasRole('SUPPLIER') and #supplierId == authentication.principal.supplierId")` on relevant endpoints — reuses your existing Spring Security setup rather than a separate app.
  - *Next.js:* A `/supplier/*` route group gated by middleware checking the JWT role claim (UX gate only — the real enforcement is the `@PreAuthorize` above).
- **What improves:** Self-service vendor visibility, no duplicated dashboard codebase.
- **Effort:** Low–Medium (given RBAC already exists)

### 6.3 Server-to-Server (S2S) Integration
- **What it does:** Passes respondent IDs to external survey engines via backend channel, not URL params.
- **Profit impact:** Prevents URL-manipulation fraud, keeps interoperability with client tools.
- **Implementation path:**
  - *Spring Boot:* Issue a short-lived signed JWT (via `io.jsonwebtoken`/jjwt) carrying respondent claims, exchanged server-to-server instead of embedded in query strings.
- **What improves:** Makes your platform usable as infrastructure under other survey tools.
- **Effort:** Medium

---

## 7. Incentives & Gamified Retention

### 7.1 Global Reward Management System
- **What it does:** Gift cards, bank transfer, coupons via one integration.
- **Profit impact:** Retention lever — clunky payouts are the #1 churn cause.
- **Implementation path:**
  - *Spring Boot:* `WebClient` integration with Tremendous or Tango Card's REST API, triggered by a Spring Application Event on completion-approval — don't build payment rails yourself.
- **What improves:** Enterprise-grade global payouts via one vendor integration.
- **Effort:** Low–Medium

### 7.2 Zero-Day Wait Times / Priority Status
- **What it does:** Instant payout access for high-trust panelists.
- **Profit impact:** Cheap, high-impact retention lever for your best respondents.
- **Implementation path:**
  - *Spring Boot:* One conditional in the payout service: `if (trustScore > threshold) skipHoldPeriod()` — reads the field from 3.8, no new infra.
- **What improves:** Your fraud-detection investment now doubles as a retention feature.
- **Effort:** Low (if 3.8 exists)

### 7.3 Gamified Referral Program
- **What it does:** Trackable referral links, micro-rewards on referred completions.
- **Profit impact:** Low-cost acquisition channel from your existing base.
- **Implementation path:**
  - *Spring Boot:* `refCode` generated (UUID/short code) on `Panelist` creation; an event listener credits a reward when a referred user's first `Completion` record is created.
  - *Next.js:* Referral link/share UI on the progress dashboard (7.4).
- **What improves:** Acquisition channel that costs a small reward instead of ad spend.
- **Effort:** Low–Medium

### 7.4 Personalized Progress Dashboard
- **What it does:** Earnings, referral progress, priority-tier proximity.
- **Profit impact:** Measurable engagement/retention lift for low build cost.
- **Implementation path:**
  - *Spring Boot:* One `@RestController` endpoint (`/panelists/{id}/dashboard`) aggregating data you already store.
  - *Next.js:* Page fetching via React Query/SWR (built-in caching, revalidation) — no new backend logic beyond the aggregation endpoint.
- **What improves:** High engagement payoff, zero new backend infra.
- **Effort:** Low

---

## 8. AI/ML Layer (cross-cutting)

### 8.1 Predictive Supplier/Inventory Routing
- **What it does:** Auto-pulls historically strong supplier inventory for new projects.
- **Profit impact:** Higher conversion, faster project closure, better margin.
- **Implementation path:**
  - *Spring Boot:* v1 as a scheduled "supplier scorecard" query (conversion rate, rejection rate, LOI accuracy per segment) — gets 80% of the value before you need real ML. If/when you need actual ML, add a Python (FastAPI) microservice and call it via `WebClient`; keep Spring Boot as the orchestrator.
- **What improves:** Data-driven vendor selection replacing manual PM judgment calls.
- **Effort:** Low (scorecard) → High (real ML)

### 8.2 24/7 Anomaly Monitoring + Auto-Pause + Alerts
- **What it does:** Watches live traffic, can auto-pause a link and alert via WhatsApp/email.
- **Profit impact:** Catches fraud/budget-drain in minutes instead of hours.
- **Implementation path:**
  - *Spring Boot:* `@Scheduled` job every 1–5 minutes computing rolling z-scores on screen-out rate/VPN traffic from Postgres; on breach, `WebClient` calls to Twilio (SMS/WhatsApp Business API) or SendGrid. Optionally push a live update to an ops dashboard via Spring's WebSocket/STOMP support.
  - *Next.js:* Ops dashboard subscribes via a WebSocket client or simple polling with SWR.
- **What improves:** A safety net that currently needs a human watching dashboards 24/7.
- **Effort:** Medium

### 8.3 Leaderboard Mapping
- **What it does:** Ranks clients/suppliers by quality and profitability.
- **Profit impact:** Deliberately steers best supply to best (highest-margin) clients.
- **Implementation path:**
  - *Spring Boot:* One native SQL/JPA aggregation query grouped by supplier/client, ordered by margin and rejection rate, exposed via REST.
  - *Next.js:* Recharts or a sortable shadcn/ui table.
- **What improves:** Profitable matching becomes visible and deliberate.
- **Effort:** Low–Medium

---

## 9. Communication & Marketing Automation

### 9.1 Optimized Activation Emails
- **What it does:** Behavior/timezone-triggered outreach, not blanket blasts.
- **Profit impact:** Lower unsubscribe/spam rates, better open/click rates.
- **Implementation path:**
  - *Spring Boot:* Integrate SendGrid's Java SDK and use its native send-time optimization/segmentation features rather than building a custom scheduler.
- **What improves:** Better engagement from config on a tool you likely already pay for.
- **Effort:** Low

### 9.2 Targeted Marketing Activation (cohort campaigns)
- **What it does:** Specific outreach cohorts (near payout threshold, lapsed high-value, etc.).
- **Profit impact:** Fills niche demand, reactivates churning users.
- **Implementation path:**
  - *Spring Boot:* A query-builder endpoint translating filter criteria into JPA `Specification`s over panelist attributes/trust score/earnings, output pushed to SendGrid's segment API.
  - *Next.js:* Simple filter-builder UI (checkboxes/selects) calling that endpoint.
- **What improves:** Existing data becomes an active retention tool, not passive reporting.
- **Effort:** Low–Medium

### 9.3 Embedded Login Prompts (magic link)
- **What it does:** One click from email drops respondent straight into an authenticated survey session.
- **Profit impact:** Removes a major drop-off point at peak intent.
- **Implementation path:**
  - *Spring Boot:* Generate a signed, single-use, short-expiry JWT per invite; a `/survey/enter` endpoint validates it and issues a session (httpOnly cookie via Spring Security).
  - *Next.js:* `/survey/enter?token=...` page calls that endpoint, then redirects into the survey — no separate login form in the path.
- **What improves:** Closes the highest-friction funnel step with a standard auth pattern.
- **Effort:** Low–Medium

---

## 10. Business Intelligence & Analytics

### 10.1 Recruitment Reporting
- **What it does:** Volume/cost/source of new panelists.
- **Profit impact:** Doubles down marketing spend on what works.
- **Implementation path:**
  - *Spring Boot:* Tag `source` at signup; one aggregation REST endpoint.
  - *Next.js:* Recharts dashboard.
- **Effort:** Low

### 10.2 Retention & Health Analytics
- **What it does:** Churn velocity, active-day patterns, cohort degradation.
- **Profit impact:** Early-warning system, cheaper than reacquisition.
- **Implementation path:**
  - *Spring Boot:* Standard cohort-retention query via `@Query` (native SQL is often cleaner than JPQL for this pattern), exposed via REST.
- **Effort:** Low–Medium

### 10.3 Demographic Depth Reports
- **What it does:** Panel distribution vs. population benchmarks.
- **Profit impact:** Directs recruitment spend at underrepresented segments.
- **Implementation path:**
  - *Spring Boot:* Aggregation query joined against a static benchmark table (seeded via Flyway migration).
- **Effort:** Low

### 10.4 Live IR & LOI Calculators with Predictive Warnings
- **What it does:** Live incidence rate + survey-length abandonment warnings.
- **Profit impact:** Protects project profitability, discourages overlong surveys.
- **Implementation path:**
  - *Spring Boot:* IR computed live from existing response counts, exposed via REST.
  - *Next.js:* Builder shows inline warning banners as question count/estimated LOI grows, reading thresholds from a small shared constants file (Section 13).
- **Effort:** Low

---

## 11. Access Control & Multi-Tenant Architecture

### 11.1 Role-Based Access Control (RBAC) Matrix
- **What it does:** Super Admin / PM / QA / Sales / Supplier / Client tiers.
- **Profit impact:** Enterprise clients often require proof of RBAC before signing.
- **Implementation path:**
  - *Spring Boot:* This is squarely Spring Security's job — define roles/authorities centrally, enforce via `@PreAuthorize`/`@Secured` on service methods (not scattered per-endpoint checks). Issue JWTs with role claims (Spring Authorization Server, or a simpler custom JWT filter if you don't need full OAuth2).
  - *Next.js:* Middleware/route guards read the JWT's role claim purely for UX (hide/show nav, redirect) — the actual security boundary is always the Spring Boot `@PreAuthorize`.
- **What improves:** Enterprise-sale-readiness, reduced cross-role data leakage risk.
- **Effort:** Medium

### 11.2 Business Units (Account → BU segregation)
- **What it does:** Multi-entity segregation under one master account.
- **Profit impact:** Enables multinational clients to isolate regional data/compliance.
- **Implementation path:**
  - *Spring Boot:* `businessUnitId` scoping column (mirrors 4.3's `panelId` pattern), enforced via Hibernate `@Filter` or Specification predicates on every relevant repository.
- **Effort:** Medium

### 11.3 Service Clients (machine-to-machine API access)
- **What it does:** Narrow-scope credentials for external systems (CRMs, loyalty apps).
- **Profit impact:** Turns integrations into self-service instead of bespoke engineering per client.
- **Implementation path:**
  - *Spring Boot:* Spring Security's OAuth2 client-credentials flow (or Spring Authorization Server for full control) issuing scoped tokens per external client.
- **Effort:** Medium

---

## 12. Multi-Mode Integration (CATI/CAPI)

### 12.1 CATI/CAPI Bridging via Shared State
- **What it does:** Respondent can pause on web and resume via phone/tablet interviewer.
- **Profit impact:** Recovers partial completes, opens hybrid-methodology contracts.
- **Implementation path:**
  - *Spring Boot:* Store survey progress in a `SurveySession` JPA entity keyed by respondent + study, accessible to any channel — web (Next.js), a CATI agent screen (could be the same Next.js app under a different route), or a CAPI offline app that syncs back once online.
- **What improves:** Extends addressable market without a second survey engine.
- **Effort:** High (only worth it with real CATI/CAPI demand)

---

## 13. Hardcoded Industry Benchmarks (UX defaults)

| Signal | Benchmark | UI Behavior |
|---|---|---|
| Survey length | 4–5 questions = strongest response; 12+ ≈ 17% drop; 10+ min ≈ up to 40% drop | Live warning banner in Next.js builder as question count/LOI estimate grows |
| SMS distribution | ~40–60% response rate | Suggest SMS for short pulse surveys |
| In-app mobile | ~35–37% response rate | Recommend in-app delivery for embedded surveys |
| External customer email | ~20–30% response rate | Set client expectations at scoping |
| Reminder timing | 3–7 days after invite lifts response ~14% | Auto-suggest reminder send date in campaign scheduler |

- **Implementation path:** A shared constants module (a small JSON/TS file in Next.js, mirrored as a `@Value`-injected config or constants class in Spring Boot) — static data, no dynamic computation beyond current question count/estimated LOI.
- **Effort:** Low

---

## 14. Buy-vs-Build Shortcut Map

| Capability | Buy (integrate via Spring Boot `WebClient`) | Avoid building |
|---|---|---|
| Geo/VPN/proxy fraud detection | IPQualityScore, MaxMind GeoIP2 | Custom IP-range database maintenance |
| Bot/CAPTCHA | Google reCAPTCHA v3, Cloudflare Turnstile | Custom behavioral bot detection |
| Global payouts | Tremendous, Tango Card, PayPal Payouts | Direct bank/gift-card integrations per country |
| Email delivery/segmentation | SendGrid Java SDK, Mailgun | Custom SMTP + scheduling infra |
| SMS/WhatsApp alerts | Twilio Java SDK, WhatsApp Business API | Custom telephony integration |
| AI Word-import / qual probing | Claude/OpenAI API via `WebClient` | Custom NLP pipeline |
| Translation drafts | DeepL API, Google Translate API | In-house localization team only |
| Invoicing | Stripe Java SDK | Custom PDF/invoice generator |
| Auth/RBAC/OAuth2 | Spring Security + Spring Authorization Server | Hand-rolled permission system |
| File/media storage | AWS S3 (presigned URLs via AWS SDK for Java) | Self-hosted media storage |

---

## 15. Phased Implementation Roadmap

**Phase 1 — Quick wins (2–6 weeks)**
Mostly Spring Boot rule/config additions + small Next.js UI pieces, no new subsystems:
- 3.2 Duplicate IP, 3.3 CAPTCHA, 3.6 Copy-paste block, 3.5 Speeder detection
- 1.4 Piping, 1.5 Randomization
- 5.1 Margin controls, 5.2 RPI filtering
- 7.4 Progress dashboard
- 10.1 Recruitment reporting, 10.3 Demographic depth, 10.4 Live IR/LOI + Section 13 benchmarks

**Phase 2 — Medium build (1–3 months)**
Needs new entities/services and possibly Redis:
- 2.1 Quota engine (Redis counters), 2.2/5.3 Router + offerwall
- 3.8 Trust Score → 7.2 Zero-day priority
- 4.2 Lead Import API, 4.4 Custom profiling, 4.3/11.2 Multi-panel + BU segregation
- 7.1 Reward integration, 7.3 Referral program
- 9.3 Magic-link login, 9.2 Targeted campaigns
- 11.1 RBAC matrix (Spring Security), 11.3 Service Clients (OAuth2 client-credentials)
- 10.2 Retention analytics, 8.3 Leaderboard

**Phase 3 — Larger investment (3–6+ months)**
Needs Spring Batch, external microservices, or heavier integration work:
- 1.1 AI Word-import, 1.7 AI qual probing, 1.2 full question library
- 5.4 Reconciliation (Spring Batch + Stripe)
- 6.1 E-bidding, 6.2 Supplier portal, 6.3 S2S integration
- 8.1 Predictive routing (possible Python microservice), 8.2 Anomaly monitoring + WebSocket alerts
- 1.6 Multilingual localization
- 12.1 CATI/CAPI bridging — only if there's real hybrid-mode demand

---

## 16. Dependency Shortlist (starting point)

**Spring Boot (`pom.xml` / `build.gradle`):**
- `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-oauth2-resource-server`
- `spring-boot-starter-data-redis` (quota counters, IP-lookup caching)
- `spring-boot-starter-batch` (reconciliation, large recontact jobs)
- `spring-boot-starter-websocket` (live ops alerts, if using WebSocket over polling)
- `spring-boot-starter-validation`
- Flyway or Liquibase (migrations)
- `io.jsonwebtoken:jjwt` (JWT issuance, if not using full Spring Authorization Server)
- Apache POI or Apache Tika (docx parsing for 1.1)
- OpenCSV or Apache Commons CSV (4.1)
- `io.hypersistence:hypersistence-utils-hibernate` (JSONB mapping for 1.2 / 4.4)
- AWS SDK for Java v2 (S3 presigned URLs for 1.3)
- Stripe Java SDK, Twilio Java SDK, SendGrid Java SDK (as needed per integration)
- Quartz (only if `@Scheduled` isn't flexible enough for complex cron needs)

**Next.js (`package.json`):**
- App Router + TypeScript
- Tailwind CSS + shadcn/ui (component system)
- `@tanstack/react-query` or `swr` (data fetching/caching against the Spring Boot API)
- `react-hook-form` + `zod` (survey builder forms + validation)
- `recharts` (dashboards, leaderboards)
- `react-dropzone` (file/CSV uploads)
- `next-intl` (if pursuing 1.6 multilingual)
- Native `MediaRecorder` API (no package needed) for 1.3
- `next-auth` is optional — many teams find it simpler to just read/set the httpOnly JWT cookie issued directly by Spring Boot rather than running a parallel auth system in Next.js

---

## Bottom Line

With Spring Boot as the single source of truth for rules/state and Next.js as a thin rendering layer over its REST API, almost all of Phase 1 is achievable with existing Spring Security/Redis/Postgres primitives — no new services to stand up. The larger architectural decisions worth making early are: (1) Redis for quota counters from day one (retrofitting atomic counters later is painful), and (2) treating Spring Boot's `@PreAuthorize` as your only real security boundary, with Next.js route guards as UX sugar on top — never the reverse.
