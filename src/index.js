// AG3 Orchestrator – Full Autonomous Mesh Version (ESM)

// Load environment variables
import "dotenv/config";
import express from "express";
import Stripe from "stripe";

// ---------- ENV ----------
const {
  PORT,
  NODE_ENV,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  RENDER_API_KEY,
  RENDER_SERVICE_ID,
} = process.env;

const port = Number(PORT) || 4600;

// Mask values in logs
const mask = (val) => {
  if (!val) return "MISSING";
  if (val.length <= 8) return "SET";
  return `${val.slice(0, 4)}***${val.slice(-4)}`;
};

console.log("🔐 Loaded ENV keys:", {
  PORT: port,
  NODE_ENV: NODE_ENV || "not set",
  STRIPE_SECRET_KEY: STRIPE_SECRET_KEY ? "SET" : "MISSING",
  STRIPE_WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET ? "SET" : "MISSING",
  RENDER_API_KEY: RENDER_API_KEY ? "SET" : "MISSING",
  RENDER_SERVICE_ID: RENDER_SERVICE_ID || "MISSING",
});

// ---------- STRIPE CLIENT ----------
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });
} else {
  console.warn("⚠️ Stripe secret key missing — Stripe features disabled.");
}

// ---------- EXPRESS APP ----------
const app = express();

// MUST register webhook BEFORE JSON parser (Stripe needs raw body)
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      console.warn("⚠️ Stripe webhook secret not configured.");
      return res.status(500).send("Webhook not configured");
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      console.warn("⚠️ Missing stripe-signature header.");
      return res.status(400).send("Missing stripe-signature header");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Stripe signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("✅ Stripe webhook received:", event.type);

    // TODO: Convert Stripe events → Missions
    switch (event.type) {
      case "checkout.session.completed":
        console.log("💰 Checkout complete:", event.data.object.id);
        break;
      case "invoice.paid":
        console.log("📄 Invoice paid:", event.data.object.id);
        break;
      case "customer.subscription.created":
        console.log("🔁 Subscription created:", event.data.object.id);
        break;
      case "customer.subscription.updated":
        console.log("🔁 Subscription updated:", event.data.object.id);
        break;
      case "payment_intent.succeeded":
        console.log("💳 Payment succeeded:", event.data.object.id);
        break;
      default:
        console.log("ℹ️ Unhandled event type:", event.type);
    }

    res.json({ received: true });
  }
);

// JSON parser for all other endpoints
app.use(express.json());

// ---------- AGENT REGISTRY ----------
const agents = new Map();

// POST /agents/register
app.post("/agents/register", (req, res) => {
  const { name, role, url, capabilities } = req.body || {};

  if (!name) {
    return res.status(400).json({
      ok: false,
      error: "Agent name is required",
    });
  }

  const now = new Date().toISOString();
  const previous = agents.get(name);

  const agent = {
    name,
    role: role || null,
    url: url || null,
    capabilities: Array.isArray(capabilities) ? capabilities : [],
    registeredAt: previous?.registeredAt || now,
    lastSeen: now,
  };

  agents.set(name, agent);

  console.log(
    `🤝 Agent registered: ${name}` +
      (agent.role ? ` (role: ${agent.role})` : "") +
      (agent.url ? ` @ ${agent.url}` : "")
  );

  return res.json({ ok: true, agent });
});

// POST /agents/heartbeat
app.post("/agents/heartbeat", (req, res) => {
  const { name } = req.body || {};

  if (!name || !agents.has(name)) {
    return res.status(404).json({
      ok: false,
      error: "Unknown agent",
      path: "/agents/heartbeat",
    });
  }

  const info = agents.get(name);
  info.lastSeen = new Date().toISOString();
  agents.set(name, info);

  console.log(`💓 Heartbeat from ${name}`);

  return res.json({ ok: true });
});

// GET /agents
app.get("/agents", (req, res) => {
  const list = Array.from(agents.values());
  res.json({ ok: true, count: list.length, agents: list });
});

// ---------- HEALTH CHECK ----------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    port,
    env: NODE_ENV,
    stripeConfigured: Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET),
    agents: agents.size,
  });
});

// ---------- MISSIONS ----------
app.post("/missions", async (req, res) => {
  try {
    const mission = req.body || {};
    console.log("🛰️ Incoming mission:", JSON.stringify(mission, null, 2));

    // TODO: choose best agent by capability
    // Example:
    // if (mission.type === "parse") route to AG4

    return res.json({
      ok: true,
      message: "Mission received",
    });
  } catch (err) {
    console.error("❌ Mission handler error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- 404 ----------
app.use((req, res) =>
  res.status(404).json({ ok: false, error: "Not found", path: req.path })
);

// ---------- START SERVER ----------
app.listen(port, "0.0.0.0", () => {
  console.log(
    `🚀 AG3 Orchestrator running on PORT ${port} (NODE_ENV=${NODE_ENV})`
  );
});

export default app;
