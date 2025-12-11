import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ===============================
// CONFIG
// ===============================

// Later we can set this to a real microservice or queue
const MISSIONS_ENDPOINT = process.env.MISSIONS_ENDPOINT || null;

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AG3 Orchestrator – Infinity Billing Router",
    webhook: "Ready",
  });
});

// ===============================
// MISSION DISPATCHER
// ===============================
async function dispatchMission(mission, payload) {
  console.log(`🛰  Dispatching mission: ${mission}`);

  if (!MISSIONS_ENDPOINT) {
    console.log("⚠️ MISSIONS_ENDPOINT not set. Logging mission only.");
    console.log({ mission, payload });
    return;
  }

  try {
    const response = await fetch(MISSIONS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mission, payload }),
    });

    const data = await response.json().catch(() => null);
    console.log(`✅ Mission ${mission} dispatched. Status: ${response.status}`, data);
  } catch (err) {
    console.error(`❌ Failed to dispatch mission ${mission}:`, err.message);
  }
}

// ===============================
// STRIPE → MISSION ROUTING
// ===============================
function getMissionForEvent(event) {
  switch (event.type) {
    case "checkout.session.completed":
      return "AG4_OnboardUser";

    case "invoice.payment_succeeded":
    case "invoice.paid":
    case "invoice_payment.paid":
      return "AG5_ActivateSubscription";

    case "customer.subscription.created":
      return "AG6_SubscriptionCreated";

    case "customer.subscription.updated":
      return "AG7_SubscriptionUpdated";

    case "customer.subscription.deleted":
    case "customer.subscription.cancelled":
      return "AG8_SubscriptionCancelled";

    case "payment_intent.succeeded":
      return "AG9_PaymentSucceeded";

    default:
      return null;
  }
}

// ===============================
// WEBHOOK ENDPOINT (NO SIGNATURE VERIFICATION)
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;
    console.log("⚡ Incoming webhook event:", {
      id: event.id,
      type: event.type,
      summary: event.data && event.data.object && event.data.object.id,
    });

    const mission = getMissionForEvent(event);

    if (mission) {
      await dispatchMission(mission, event);
    } else {
      console.log("⚠️ No mission mapped for event type:", event.type);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 AG3 Orchestrator (Billing Router) running on PORT ${PORT}`);
});
