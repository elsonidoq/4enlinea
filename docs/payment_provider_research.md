# Payment provider research — charging global consumers from Argentina

**Date**: 2026-07-16 · **Status**: decided (Paddle), execution in progress
**Question**: which payment provider can an Argentine resident (individual/monotributista, **no US or foreign company**) use to charge global consumers for a B2C subscription?

## Decision

**Paddle**, a merchant of record (MoR). It is the only evaluated provider that is both (a) documented as accepting Argentine sole traders without foreign incorporation and (b) **observed** offering a USD wire to an Argentine bank.

Native **Stripe is not an option** — Argentina is absent from Stripe's supported countries. This is why the project's existing Stripe integration cannot ship as-is, and why `project_stripe_traps.md` describes a path that is only viable behind Stripe Atlas / foreign incorporation.

## Read this first: the evidence-layer rule

Nearly every *positive* finding below rests on **vendor policy documents, not observed onboarding**. "Argentina is not on the exclusion list" is a claim about what a page says — necessary, but **not sufficient** to conclude that a monotributista's KYC completes and money lands. No first-hand Argentine seller report was locatable for Paddle, Polar, or 2Checkout. Both Paddle and Verifone reserve discretionary compliance review over any jurisdiction.

Each claim is tagged:
- **[OBSERVED]** — seen directly in our own Paddle account or via a live API/HTTP call. Highest confidence.
- **[VERIFIED]** — passed the 3-vote adversarial research panel. Carries a confidence (high/med/low) from the vote.
- **[DOCUMENTED]** — a vendor's own page says so. Good, but pages describe policy, not outcomes.
- **[POST-WORKFLOW CHECK, date]** — a single-source founder check done *after* the research workflow, not panel-verified. Lower provenance than [VERIFIED].
- **[INFERRED]** — reasoning from documented facts. Treat as a hypothesis until confirmed.

> **The primary reason to use an MoR was NOT verified.** The whole point of paying Paddle's 5% is that, as merchant of record, it becomes seller-of-record and remits VAT/sales tax on your behalf. The research claim asserting Paddle does this "across all supported countries and currencies" was **refuted (1–2)** on its cited source (see Refuted table). The benefit is real in principle and is Paddle's core value proposition — but this research did **not** confirm it. Confirm the VAT/tax-remittance scope before relying on it, especially for the specific countries your buyers are in.

### Not evaluated (coverage gaps, not negatives)

One of the four original question dimensions — **payer/checkout friction** — went essentially unanswered. **Not assessed for any provider**: checkout UX, whether checkout requires a buyer account or redirect, webhook/API quality for automated entitlement, and Argentine-local card acceptance. The only survivor on this axis: 2Subscribe includes recurring billing. A future re-review must not assume these were checked and found fine.

## Glossary (for a non-AR / future reader)

- **MoR (merchant of record)** — the legal seller of the transaction. The buyer pays the MoR, not you; the MoR handles tax and pays you out. Shifts VAT/sales-tax liability off you.
- **Monotributista** — Argentina's simplified small-taxpayer regime for individuals; no company. Capped annual billing per category.
- **Responsable Inscripto** — the heavier standard tax regime you're forced into if you exceed the top monotributo category.
- **Factura E** — the invoice type for service *exports* in Argentina.
- **MEP / CCL dollar** — legal parallel FX rates (~11% better than the *oficial* rate at time of research) via securities trades. The point of receiving USD is to avoid being force-converted at *oficial*.
- **ingresar vs liquidar** — *ingresar* = bring the funds into a local account; *liquidar* = convert them to pesos. Current rules require the first, not the second.
- **caja de ahorro en dólares** — a USD-denominated local savings account (as opposed to a peso account).
- **retención / percepción** — tax withholdings applied at source / on transactions (IIBB provincial, Ganancias income tax).

> **Staleness — recheck-by guidance.** Two classes of fact here go stale fastest: (1) **Argentine FX/BCRA rules** — anything dated before Sept-2025 on FX should be treated as suspect; the regime changed materially with A 8330. (2) **Vendor country lists** (Stripe, Paddle, Polar) are live-changing — re-fetch before relying on an eligibility claim. Fees and thresholds also drift. Treat this doc's specifics as a 2026-07 snapshot.

## Options compared

| Provider | AR eligible? | Real cost to us | Verdict |
|---|---|---|---|
| **Paddle** | Yes — not on the 28-entry exclusion list; **no business verification for sole traders** | 5% + 50¢; payout $15 SWIFT | **Chosen** |
| **Polar** | Lists 🇦🇷, but pays out via Stripe Connect Express | unresolved | Fallback; inherits Stripe-AR risk |
| **2Checkout / Verifone** | Available; entity type unresolved | **~6.5% + $0.45** (not the listed 4.5%) | Works, expensive |
| **dLocal Go** | "company registered in" — unresolved for individuals | ~3.49% cards | Blocked on entity question |
| **PayPal** | Mechanically yes | official rate **+3–4.5% spread**, forced pesos | Worst economics |
| **Lemon Squeezy** | **Unknown / likely negative** — both supporting claims refuted | — | Do not treat as an option |
| **Deel / Payoneer / Mercado Pago** | — | — | Structurally unsuited to B2C card checkout |

## Findings

### Paddle — chosen

- **[VERIFIED, high]** *"Paddle works with software businesses anywhere in the world with the exception of the unsupported countries listed below."* The list has 28 sanctioned/high-risk entries; **Argentina is absent**, as are Brazil, Mexico, Chile, Colombia — it is a sanctions list, not a LatAm exclusion. ([supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle))
- **[VERIFIED, high]** Business verification is **not required for individuals or sole traders** — the only provider evaluated with such a statement. Identity verification **is** required, performed on the person. ([business identification](https://www.paddle.com/help/start/account-verification/what-is-business-verification), [identity verification](https://www.paddle.com/help/start/account-verification/what-is-identity-verification))
- **[POST-WORKFLOW CHECK, 2026-07-16]** Fee: **5% + 50¢** per transaction, all-inclusive. Single-source founder check, not panel-verified. ([pricing](https://www.paddle.com/pricing))
- **[OBSERVED, 2026-07-16]** In our own account, payout settings offer **Wire transfer** and **Payoneer**, with **Bank Country = Argentina** and **Transfer Currency = USD**. *This resolved the single most load-bearing open question:* Paddle will send dollars to an Argentine bank. No document stated this.
- **[VERIFIED, high]** Payouts are **monthly, paid by the 15th**, with a **$100 minimum threshold**. No payout fee for most countries, but a **$15 SWIFT fee** applies on currency/bank-country mismatch, plus up to 1.5% conversion margin. ([payouts](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid), [payout fees](https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts))
- **[INFERRED]** ARS is not a Paddle payout currency, so an AR seller takes USD to a non-US bank → **the $15 SWIFT likely applies**. The 1.5% conversion margin should *not* apply (USD→USD, no conversion).
- **[POST-WORKFLOW CHECK, 2026-07-16]** Domain review: most submissions **auto-approve**; manual review is typically **5–7 business days**. Single-source founder check, not panel-verified. ([domain review](https://www.paddle.com/help/start/account-verification/what-is-domain-verification))

> **TRAP — [INFERRED, UNVERIFIED] the $100 threshold is probably net of fees, not gross.** The source states only "$100 minimum" with no net/gross qualifier — "net of fees" is **our assumption**, not documented. *If* it holds, a $100 charge nets ~$94.50 and never pays out; gross would need to be ≥ ~$106 to clear, making the minimum viable end-to-end payout test ~$110 gross → ~$104 balance → ~$89 wired after SWIFT. **Confirm net-vs-gross on the first real payout** before trusting these figures.

### Stripe — not available

- **[OBSERVED]** `stripe.com/global` enumerates 44 supported countries (including Brazil and Mexico); **Argentina is absent**, with no beta/invite-only/coming-soon note. ([stripe.com/global](https://stripe.com/global))
- **[DOCUMENTED]** 2026 Argentina activity is **recipient-side only**: changelog 2026-03-25 *"Adds support for Global Payouts recipient bank accounts in Argentina, Colombia, and Egypt"* — no acquiring.
- **Warning**: search summaries claiming "Stripe is supported in Argentina" are **SEO from incorporation vendors**. Fetching the actual articles inverts the claim: *"Stripe is not available for Argentina entrepreneurs"* — available only *"when you incorporate your company in the UK."* One such summary was hallucinated during this research and only caught by fetching the source.

### Polar — fallback, with a caveat

- **[DOCUMENTED]** *"Polar uses Stripe Connect Express to issue payouts to residents or businesses in any of the countries below"* — and 🇦🇷 Argentina appears in that seller-payout list. ([supported countries](https://polar.sh/docs/merchant-of-record/supported-countries))
- **[REFUTED]** The sub-claim that Stripe Connect Express accepts the **`individual` business type in AR** did **not** survive verification (1–2). Since Connect generally requires a bank account in the business's country and currency, Polar may imply **ARS settlement at the official rate** — the exact outcome we are trying to avoid.

### 2Checkout / Verifone — works, expensive

- **[DOCUMENTED]** List price: 2Sell 3.5% + $0.35; **2Subscribe 4.5% + $0.45**. ([pricing](https://www.2checkout.com/pricing/))
- **[DOCUMENTED]** *"In specific countries an additional 2% fee applies to accept payments from shoppers outside your own country"* — and **Argentina is not in the ~23-nation exempt list**. Since essentially all volume is cross-border for this product, effective cost ≈ **6.5% + $0.45**.
- **[VERIFIED, med (2–1)]** Of its payout rails (wire, PayPal, Payoneer), only **Payoneer** works for a monotributista — PayPal Argentina cannot receive commercial cross-border payments, and ACH is US-bank-only. Payout minimums: **$50** (2Sell/2Subscribe), **$100** (2Monetize); "weekly" is the default cadence, not guaranteed.

### PayPal — worst economics

- **[DOCUMENTED]** Verbatim from PayPal AR: *"La cuenta bancaria vinculada debe estar en pesos argentinos para completar los retiros. **Los retiros a cuentas en dólares locales se cancelarán**."* To withdraw USD you must link a US bank account you own. ([help394](https://www.paypal.com/ar/cshelp/article/how-do-i-withdraw-money-from-paypal-to-my-bank-account-help394))
- **[VERIFIED, med (2–1)]** PayPal applies its own internal rate carrying a **3–4.5% surcharge** over the official rate — i.e. worse than clean official, and definitively not MEP (~11% gap before the spread).

### dLocal Go — unresolved

- **[DOCUMENTED]** Argentina is listed among eligible merchant-registration countries; AR pricing ≈ **3.49% cards / 2.99% cash / 1.99% bank transfer**, no fixed or maintenance fee.
- **Blocker**: eligibility is phrased as *"company registered in"*. Whether a **monotributista individual** qualifies is exactly our question and is **not answered** by any source found.

### Lemon Squeezy — do not treat as an option

Both supporting claims were **refuted**: that Argentina is a supported merchant country for bank payouts (1–2), and that eligibility is gated on payout capability with PayPal as a 200-country fallback (**0–3, unanimous**). No verified evidence supports Lemon Squeezy as AR-viable. Note it is **now owned by Stripe**, whose own AR merchant exclusion is a plausible mechanism worth checking before revisiting.

### Deel / Payoneer / Mercado Pago — structurally wrong

No claim about these reached verification. Their absence is a **coverage gap, not a verified negative** — but structurally: Payoneer's Billing Service is an invoicing tool, not a card-checkout/subscription processor; Deel is contractor-payments/EOR; Mercado Pago is AR/LatAm-local rather than a global-consumer acquirer. None offers a consumer checkout with a webhook for automated entitlement.

## Argentine legal & FX frame

- **[DOCUMENTED]** ARCA/AFIP, verbatim: *"Los monotributistas pueden exportar servicios, sin superar los límites de facturación de la categoría máxima correspondiente a su actividad"*, and *"Las exportaciones de servicios son las prestaciones realizadas en el país... cuya utilización económica se efectúa en el exterior"* — a non-AR consumer means economic use abroad. ([AFIP](https://www.afip.gob.ar/monotributo/exportacion-servicios/))
- **[DOCUMENTED]** Any category A–K can issue **Factura E** without becoming Responsable Inscripto (needs a dedicated punto de venta). Monotributistas in the **MiPyME registry** with a current certificate are **exempt from the 5% export duty** and need not register as exporters.
- **[VERIFIED, high] Hard revenue ceiling.** Monotributo has an annual billing cap per category; exceeding the **top** category forces exclusion into **Responsable Inscripto** (a heavier tax regime — a business-structure change, not a formality). Live ceilings for the 01/08/2025–31/01/2026 window: **A = ARS 8,992,597.87**, **B = ARS 13,175,201.52** (higher categories scale up). This is the revenue level at which the whole "monotributista exports services" strategy breaks and must be re-planned — decision-critical if the subscription scales.
- **[VERIFIED, med (2–1)]** BCRA Com. **"A" 8330** (18-Sep-2025) removed the USD 36,000 annual cap and the *liquidation* obligation; **"A" 8417** (9-Apr-2026) extended the liquidation exception to all service-export codes. **Both preserve the *ingreso* obligation**: **20 business days** to bring funds in, credited to a **USD account at a local bank**. Evidence base: primary BCRA text was partially recovered (zlib-decompressed from the PDF streams; `pdftotext` failed) and corroborated by secondary accounting/law-firm commentary ([blogdelcontador A-8330 summary](https://blogdelcontador.com.ar/news-46233-exportaciones-de-servicios-como-cobrar-en-dolares-sin-limites-y-condiciones-del-nuevo-regimen-del-bcra)). This is the shakiest pillar the strategy rests on — **re-verify against the primary BCRA communication before relying on it.**
- **Key distinction**: *ingresar* ≠ *liquidar*. Dollars must **land** in a local USD account but need **not be converted** to pesos. The exception is conditional on the exporter not buying FX through the financial system.

> **TRAP — the receiving account decides everything.** Paddle sending USD does not mean you receive USD. If the account on file is a **peso** account, the bank converts the inbound wire at the official rate on arrival — the exact haircut this whole exercise avoids. It must be a **caja de ahorro en dólares**.

## Refuted claims — do not re-derive these

Seven claims were killed by adversarial verification. They are recorded because they are **widely repeated** and will resurface:

| Claim | Vote | Reality |
|---|---|---|
| BCRA "A" 8330 removed **all** liquidation obligation for service exporters | **0–3** | The *ingreso* obligation survives; only *liquidation* was excepted |
| The 90-day MEP/CCL restriction for service exporters was **eliminated** | **0–3** | Not supported |
| Lemon Squeezy eligibility is gated on payout capability, PayPal as fallback | **0–3** | Not supported |
| Argentina is an explicitly supported Lemon Squeezy merchant country | 1–2 | Not supported |
| Stripe Connect Express supports `individual` business type in AR | 1–2 | Not supported — undermines Polar |
| Paddle pays **only** via wire/Payoneer | 1–2 | Overstated |
| Paddle calculates/assumes sales-tax liability across **all** supported countries and currencies | 1–2 | Overstated *on the cited source* — the MoR tax value prop is real but this specific phrasing did not survive |

## Open questions

1. **Does a USD wire from Paddle actually land as USD in an Argentine bank?** Still the decisive unknown. Payout settings accept AR+USD **[OBSERVED]**, but no money has moved. Only a real payout answers this.
2. **What is the retención/percepción stack** (IIBB by jurisdiction, Ganancias, bank-side percepciones) on an inbound USD service-export payment? Every fee comparison above **omits the Argentine side**. Confirmed only: IVA-exempt; Ganancias applies; IIBB generally exempt but jurisdiction-dependent; 5% export duty waived with MiPyME.
3. **Does paying with an Argentine card drag the local tax/FX stack onto the buyer side?** Relevant because the payout test involves buying our own product. Prefer a non-AR card.
4. **Is Lemon Squeezy viable at all**, and does Stripe's ownership inherit the AR exclusion?

## Method & confidence

Deep-research workflow, 2026-07-16: **6 angles → 24 sources fetched → 91 claims extracted → 25 verified → 18 confirmed, 7 killed → 12 after synthesis**. 107 agent calls. Each surviving claim passed a 3-vote adversarial panel prompted to **refute**; a claim needed 2/3 refutes to be killed.

Raw transcript was session-local (`/private/tmp/...`, `subagents/workflows/wf_b623c664-8b2/journal.jsonl`) and is **not durable** — this document is the record.

## Sources (rated)

Quality as assigned during research. **primary** = the vendor/authority's own page; **secondary** = reputable commentary; **blog** = individual practitioner; **unreliable** = fetched but low-trust or empty. Post-workflow founder checks (Paddle pricing, domain-review) are marked in-line above and are *not* in this list — they did not pass the research panel.

| Source | Quality |
|---|---|
| paddle.com/help — which-countries-are-supported | primary |
| developer.paddle.com — supported-countries-locales | primary |
| paddle.com/help — when-and-how-do-i-get-paid | primary |
| polar.sh/docs — merchant-of-record/supported-countries | primary |
| stripe.com/global | primary |
| support.stripe.com — feature-availability-by-country | primary |
| afip.gob.ar — monotributo/exportacion-servicios | primary |
| paypal.com/ar — help394 (withdrawals) | primary |
| 2checkout.com/pricing | primary |
| verifone.cloud — 2checkout webhooks | primary |
| dlocalgo.com — payment-api, recurring-payments | primary |
| docs.lemonsqueezy.com — supported-countries | primary |
| blogdelcontador.com.ar — A-8330 service-export regime | secondary |
| cronista.com — "por cada US$1000 solo llegan US$450" | secondary |
| crypto.news — Visa/Stripe stablecoin cards 2026 | secondary |
| supportedcountries.com/paddle | blog |
| devmystify.com — MoR comparison 2025 | blog |
| dodopayments.com — Stripe alternatives | blog |
| mazinooyolo.com — Stripe in unsupported countries | blog |
| doola.com — Stripe account in Argentina | unreliable (incorporation-vendor SEO) |

Full run: 24 sources fetched; the ~5 not listed were URL-dupes or returned no usable claims.

## Related

- `docs/open_issues.md` — **OI-41** (pricing page is static; prices hardcoded, will drift)
- `connect-four/server/{terms,privacy,pricing}.html` — the Paddle domain-review requirements (legal name, refund policy, MoR clause, public pricing)
- Memory: `project_stripe_traps.md` — describes the Stripe path, which **is not viable from Argentina** without foreign incorporation
