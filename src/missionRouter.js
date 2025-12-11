// ===============================
// MISSION ROUTING ENGINE (AG3)
// ===============================

module.exports = async function missionRouter(stripeEvent) {
  try {
    const type = stripeEvent.type;
    const data = stripeEvent.data?.object || {};

    console.log("🚀 Dispatching Mission for Event:", type);

    switch (type) {
      // ------------------------------------
      // PAYMENTS
      // ------------------------------------
      case "payment_intent.succeeded":
        return {
          mission: "activatePurchase",
          payload: {
            amount: data.amount,
            currency: data.currency,
            customer: data.customer,
            payment_intent: data.id,
          },
        };

      case "checkout.session.completed":
        return {
          mission: "checkoutCompleted",
          payload: {
            email: data.customer_details?.email,
            amount_total: data.amount_total,
            session: data.id,
            payment_intent: data.payment_intent,
          },
        };

      // ------------------------------------
      // SUBSCRIPTIONS
      // ------------------------------------
      case "customer.subscription.created":
        return {
          mission: "createSubscriptionProfile",
          payload: {
            subscription_id: data.id,
            customer: data.customer,
            status: data.status,
            plan: data.plan,
            current_period_end: data.current_period_end,
          },
        };

      case "customer.subscription.updated":
        return {
          mission: "updateSubscription",
          payload: {
            subscription_id: data.id,
            customer: data.customer,
            status: data.status,
            plan: data.plan,
          },
        };

      // ------------------------------------
      // INVOICES
      // ------------------------------------
      case "invoice.payment_succeeded":
      case "invoice.paid":
        return {
          mission: "invoicePaid",
          payload: {
            invoice_id: data.id,
            amount: data.amount_paid,
            customer: data.customer,
            hosted_invoice_url: data.hosted_invoice_url,
          },
        };

      // ------------------------------------
      // CUSTOMERS
      // ------------------------------------
      case "customer.created":
        return {
          mission: "createCRMProfile",
          payload: {
            customer_id: data.id,
            email: data.email,
          },
        };

      case "customer.updated":
        return {
          mission: "updateCRMProfile",
          payload: {
            customer_id: data.id,
            email: data.email,
            changes: stripeEvent.data.previous_attributes,
          },
        };

      // ------------------------------------
      // DEFAULT CATCH
      // ------------------------------------
      default:
        return {
          mission: "logEvent",
          payload: stripeEvent,
        };
    }
  } catch (err) {
    console.error("❌ Mission Router Error:", err);
    return { mission: "error", payload: { message: err.message } };
  }
};
