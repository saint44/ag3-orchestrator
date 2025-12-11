// AG3 Full Automation Build v1 - deployed <timestamp>
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import bodyParser from "body-parser";

// ===============================
// INITIALIZE EXPRESS
// ===============================
const app = express();
app.use(cors());

// ===============================
// STRIPE – REAL WEBHOOK REQUIREMENTS
// ===============================

// Stripe requires RAW BODY for webhook signature verification.
// We ONLY use raw body on /webhook, JSON everywhere else.
app.use(
  "/webhook",
  bodyParser.raw({ type: "application/json" })
);

// Normal JSON parsing for everything else
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ===============================
// ENVIRONMENT VERIFICATION
// ===============================
console.log("Loaded ENV keys:", {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "✔️ PRESENT" : "❌ MISSING",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "✔️ PRESENT" : "❌ MISSING",
});

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===============================
// WEBHOOK ENDPOINT (PRODUCTION READY)
// ===============================

app.post("/webhook", (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Stripe signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("⚡ Valid Webhook Event:", {
      id: event.id,
      type: event.type,
    });

    // PLACE YOUR EVENT HANDLING LOGIC HERE:
    // switch (event.type) {
    //   case "checkout.session.completed":
    //   case "invoice.paid":
    //   ...
    // }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AG3 Orchestrator – Render Deployment Version",
    webhook: "Ready",
  });
});

// ===============================
// START SERVER ON RENDER PORT
// ===============================
const PORT = process.env.PORT || 4600;

app.listen(PORT, () => {
  console.log(`🚀 AG3 Orchestrator running on PORT ${PORT}`);
});
