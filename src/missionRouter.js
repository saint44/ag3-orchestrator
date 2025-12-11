// ===========================================
// AG3 MISSION ROUTER
// Converts Stripe events → AG3 automation tasks
// ===========================================

module.exports = async function missionRouter(event) {
  const type = event.type || "unknown";
  const obj = event.data?.object || {};

  switch (type) {
    // --------------------------
    // PAYMENT SUCCESS LOGIC
    // --------------------------
    case "payment_intent.succeeded":
    case "checkout.session.completed":
    case "charge.succeeded":
    case "invoice.payment_succeeded":
      return {
        mission: "processPaymentSuccess",
        data: {
          amount: obj.amount || obj.amount_total || obj.amount_paid,
          currency: obj.currency,
          customer: obj.customer,
          email: obj.customer_email,
          status: obj.status,
          paymentIntent: obj.id,
          raw: obj
        }
      };

    // --------------------------
    // SUBSCRIPTION LOGIC
    // --------------------------
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return {
        mission: "handleSubscription",
        data: {
          subscriptionId: obj.id,
          customer: obj.customer,
          status: obj.status,
          plan: obj.plan,
          quantity: obj.quantity,
          raw: obj
        }
      };

    // --------------------------
    // INVOICE EVENTS
    // --------------------------
    case "invoice.finalized":
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return {
        mission: "processInvoice",
        data: {
          invoiceId: obj.id,
          amountDue: obj.amount_due,
          amountPaid: obj.amount_paid,
          status: obj.status,
          pdf: obj.invoice_pdf,
          raw: obj
        }
      };

    // --------------------------
    // CUSTOMER EVENTS
    // --------------------------
    case "customer.created":
    case "customer.updated":
      return {
        mission: "handleCustomerUpdate",
        data: {
          customerId: obj.id,
          email: obj.email,
          name: obj.name,
          raw: obj
        }
      };

    // --------------------------
    // DEFAULT / UNKNOWN
    // --------------------------
    default:
      return {
        mission: "logOnly",
        data: {
          type,
          raw: obj
        }
      };
  }
};
