// AG3 Orchestrator – Full Mesh Version (ESM)

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

console.log("🔐 Loaded ENV keys:", {
  PORT: port,
  NODE_ENV: NODE_ENV || "not set",
  STRIPE_SECRET_KEY: STRIPE_SECRET_KEY ? "SET" : "MISSING",
  STRIPE_WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET ? "SET" : "MISSING",
  RENDER_API_KEY: RENDER_API_KEY ? "SET" : "MISSING",
  RENDER_SERVICE_ID: RENDER_SERVICE_ID || "MISSING",
});

// ---------- STRIPE SETUP ----------
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });
}

// ---------- EXPRESS APP ----------
const app = express();

// Stripe needs raw body
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send("Webhook not configured");
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("✅ Stripe webhook:", event.type);

    // Stripe → Mission mapping
    switch (event.type) {
      case "checkout.session.completed":
        enqueueMission({
          type: "onboard",
          requiredCapability: "exec",
          payload: event.data.object,
        });
        break;
      case "invoice.paid":
        enqueueMission({
          type: "notify-payment",
          requiredCapability: "broadcast",
          payload: event.data.object,
        });
        break;
    }

    res.json({ received: true });
  }
);

// JSON for everything else
app.use(express.json());

// ---------- AGENT REGISTRY ----------
const agents = new Map();

// Agent Register
app.post("/agents/register", (req, res) => {
  const { name, role, capabilities } = req.body;

  if (!name)
    return res.status(400).json({ ok: false, error: "Agent name required" });

  const now = new Date().toISOString();
  const existing = agents.get(name);

  const agent = {
    name,
    role,
    capabilities,
    registeredAt: existing?.registeredAt || now,
    lastSeen: now,
  };

  agents.set(name, agent);

  console.log("🤝 Agent registered:", agent);
  res.json({ ok: true, agent });
});

// Agent Heartbeat
app.post("/agents/heartbeat", (req, res) => {
  const { name } = req.body;

  if (!name || !agents.has(name))
    return res.status(404).json({ ok: false, error: "Unknown agent" });

  const agent = agents.get(name);
  agent.lastSeen = new Date().toISOString();
  agents.set(name, agent);

  console.log(`💓 Heartbeat from ${name}`);
  res.json({ ok: true });
});

// GET agents
app.get("/agents", (req, res) => {
  res.json({ ok: true, count: agents.size, agents: [...agents.values()] });
});

// ---------- MISSION STORE ----------
let missions = [];
let missionCounter = 0;

function enqueueMission(m) {
  const id = `mission-${Date.now()}-${missionCounter++}`;
  const full = {
    id,
    status: "pending",
    assignedTo: null,
    createdAt: new Date().toISOString(),
    ...m,
  };
  missions.push(full);
  console.log("🛰️ Mission enqueued:", full);
  return full;
}

// ---------- /missions (create mission) ----------
app.post("/missions", (req, res) => {
  const { type, requiredCapability, payload } = req.body;
  const mission = enqueueMission({ type, requiredCapability, payload });
  res.json({ ok: true, mission });
});

// ---------- /missions/next (agent polls) ----------
app.post("/missions/next", (req, res) => {
  const { name, capabilities } = req.body;

  const mission = missions.find(
    (m) =>
      m.status === "pending" &&
      capabilities.includes(m.requiredCapability)
  );

  if (!mission) return res.json({ ok: true, mission: null });

  mission.status = "assigned";
  mission.assignedTo = name;
  mission.assignedAt = new Date().toISOString();

  console.log(`🎯 Mission assigned to ${name}:`, mission);
  res.json({ ok: true, mission });
});

// ---------- /missions/result ----------
app.post("/missions/result", (req, res) => {
  const { id, status, output } = req.body;

  const m = missions.find((x) => x.id === id);
  if (!m) return res.status(404).json({ ok: false });

  m.status = status;
  m.output = output;
  m.completedAt = new Date().toISOString();

  console.log(`✅ Mission complete: ${id}`, m);
  res.json({ ok: true });
});

// ---------- HEALTH ----------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    port,
    env: NODE_ENV,
    stripeConfigured: Boolean(
      STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET
    ),
    agents: agents.size,
  });
});

// ---------- START SERVER ----------
app.listen(port, "0.0.0.0", () =>
  console.log(`🚀 AG3 Orchestrator running on PORT ${port}`)
);

export default app;
