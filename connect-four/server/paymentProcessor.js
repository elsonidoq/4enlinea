// server/paymentProcessor.js
//
// Payment-processor interface (spec 045 US3, contracts/payment-processor-interface.md).
// A thin abstraction over "create a checkout session" / "handle a webhook event" /
// "derive subscription status", so a concrete processor (Paddle today) can be swapped
// or mocked without route code knowing about vendor specifics.
//
// This module holds ONLY the interface shape + the pure getSubscriptionStatus helper.
// The concrete Paddle-backed implementation lives in server/paddleProcessor.js.

/**
 * @typedef {Object} PaymentProcessor
 * @property {(args: {userId: string, email: string, plan: 'monthly'|'annual'}) => Promise<{priceId: string, customerEmail: string, successUrl: string}>} createCheckout
 * @property {(rawBody: Buffer, signatureHeader: string) => Promise<{handled: boolean, eventType: string}>} handleWebhook
 * @property {(args: {tier: string, customerId: string|null}) => {status: 'free'|'paid'}} getSubscriptionStatus
 */
// NOTE (spec 050 US2, T022): `createCheckout`'s return shape above reflects the
// Paddle.js overlay model — a server-built hosted-checkout redirect target is no
// longer used; the client opens the Paddle.js overlay directly.

/**
 * Typed error thrown by createCheckout on misconfiguration (e.g. missing price id).
 * Carries `.status` so route code doesn't need processor-specific knowledge to map it
 * to an HTTP status code.
 */
export class PaymentConfigError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'PaymentConfigError';
    this.status = status;
  }
}

/**
 * Pure, synchronous function of { tier, customerId } -> { status }.
 * No I/O, no DB read, no new stored field. `status` is derived purely from `tier`;
 * `customerId` is accepted for interface-shape completeness but does not
 * affect the result.
 *
 * Deliberately test-only in production wiring: no production call site is wired
 * through it today. Real paid-gates read `tier` off `req.user` directly. This
 * function exists to prove the 3-method PaymentProcessor interface is substitutable.
 *
 * @param {{tier: string, customerId: string|null}} args
 * @returns {{status: 'free'|'paid'}}
 */
export function getSubscriptionStatus({ tier }) {
  return { status: tier === 'paid' ? 'paid' : 'free' };
}

/**
 * Generic factory: builds a PaymentProcessor object from the three method
 * implementations. Concrete processors (e.g. createPaddleProcessor) call this
 * to assemble their return value, or construct the object literal directly —
 * both satisfy the PaymentProcessor shape.
 *
 * @param {{
 *   createCheckout: PaymentProcessor['createCheckout'],
 *   handleWebhook: PaymentProcessor['handleWebhook'],
 *   getSubscriptionStatus?: PaymentProcessor['getSubscriptionStatus'],
 * }} methods
 * @returns {PaymentProcessor}
 */
export function createPaymentProcessor({ createCheckout, handleWebhook, getSubscriptionStatus: getStatus }) {
  return {
    createCheckout,
    handleWebhook,
    getSubscriptionStatus: getStatus || getSubscriptionStatus,
  };
}
