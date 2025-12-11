// AG3 — Infinity Nexus Orchestrator (FINAL AUTONOMOUS EDITION)

// ---------------------- IMPORTS ----------------------
import "dotenv/config";
import express from "express";
import Stripe from "stripe";
import axios from "axios";

// ---------------------- ENV --------------------------
const {
  PORT,
  NODE_ENV,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} = process.env;

const port = Number(PORT) || 4600;

// Mask env logs
const mask = (v) => (!v ? "MISSING" : "SET");
console.log("🔐 Loaded ENV keys:", {
  PORT: port,
  NODE_ENV: NODE_ENV || "not set",
  STRIPE_SECRET_KEY: mask(STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: mask(STRIPE_WEBHOOK_SECRET),
});

// ---------------------- STRIPE -------------------------
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

// ---------------------- EXPRESS APP --------------------
const app = express();

// Raw handler for Stripe
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET)
      return res.status(500).send("Webhook not configured");

    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).send("Missing stripe-signature header");

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
      console.log("⚡ Stripe event:", event.type);

      if (event.type === "checkout.session.completed") {
        enqueueMission({
          type: "launch",
          requiredCapability: "route",
          payload: { source: "stripe" },
        });
      }

      res.json({ received: true });
    } catch (err) {
      console.error("❌ Stripe verification failed:", err.message);
      res.status(400).send("Webhook Error");
    }
  }
);

app.use(express.json());

// ---------------------- AGENT REGISTRY ------------------
const agents = new Map();

app.post("/agents/register", (req, res) => {
  const { name, role, capabilities } = req.body || {};
  if (!name) return res.status(400).json({ ok: false });

  const now = new Date().toISOString();
  const previous = agents.get(name);

  const agent = {
    name,
    role: role || null,
    capabilities: Array.isArray(capabilities) ? capabilities : [],
    registeredAt: previous?.registeredAt || now,
    lastSeen: now,
  };

  agents.set(name, agent);

  console.log(`🤝 Registered agent: ${name} (${role})`);
  res.json({ ok: true, agent });
});

app.post("/agents/heartbeat", (req, res) => {
  const { name } = req.body || {};
  if (!name || !agents.has(name))
    return res.status(404).json({ ok: false, error: "Unknown agent" });

  const info = agents.get(name);
  info.lastSeen = new Date().toISOString();
  agents.set(name, info);

  console.log(`💓 Heartbeat from ${name}`);
  res.json({ ok: true });
});

app.get("/agents", (req, res) => {
  const list = Array.from(agents.values());
  res.json({ ok: true, count: list.length, agents: list });
});

// ---------------------- MISSION STORE -------------------
let missions = [];
let missionCounter = 0;

function enqueueMission(mission) {
  const id = `mission-${Date.now()}-${missionCounter++}`;
  const full = {
    id,
    status: "pending",
    assignedTo: null,
    createdAt: new Date().toISOString(),
    ...mission,
  };
  missions.push(full);
  console.log("🛰️ Mission enqueued:", full);
  return full;
}

app.post("/missions", (req, res) => {
  const { type, requiredCapability, payload } = req.body;
  const m = enqueueMission({ type, requiredCapability, payload });
  res.json({ ok: true, mission: m });
});

app.post("/missions/next", (req, res) => {
  const { name, capabilities } = req.body;

  const m = missions.find(
    (x) =>
      x.status === "pending" &&
      capabilities.includes(x.requiredCapability)
  );

  if (!m) return res.json({ ok: true, mission: null });

  m.status = "assigned";
  m.assignedTo = name;
  m.assignedAt = new Date().toISOString();

  console.log(`🎯 Mission assigned to ${name}:`, m);

  res.json({ ok: true, mission: m });
});

app.post("/missions/result", (req, res) => {
  const { id, status, output } = req.body;
  const m = missions.find((x) => x.id === id);
  if (!m) return res.status(404).json({ ok: false });

  m.status = status;
  m.output = output;
  m.completedAt = new Date().toISOString();

  console.log(`✅ Mission completed: ${id}`, output);
  res.json({ ok: true });
});

// ---------------------- AUTONOMOUS LAUNCH PIPELINE ------------------
function runInfinityLaunchPipeline() {
  console.log("🚀 Starting Infinity Launch Pipeline");

  // AG4 parses strategy
  enqueueMission({
    type: "parse-strategy",
    requiredCapability: "parse",
    payload: {},
  });

  // AG5 builds assets
  enqueueMission({
    type: "build-assets",
    requiredCapability: "fs",
    payload: {},
  });

  // AG6 deploys system
  enqueueMission({
    type: "deploy-system",
    requiredCapability: "deploy",
    payload: {},
  });

  // AG7 broadcasts launch
  enqueueMission({
    type: "broadcast",
    requiredCapability: "route",
    payload: {},
  });

  // AG8 monitors
  enqueueMission({
    type: "monitor",
    requiredCapability: "monitor",
    payload: {},
  });

  // AG9 handles recovery
  enqueueMission({
    type: "recovery",
    requiredCapability: "rollback",
    payload: {},
  });

  // AG10 optimizes
  enqueueMission({
    type: "optimize",
    requiredCapability: "optimize",
    payload: {},
  });

  console.log("🔥 Infinity Launch Missions Queued.");
}

app.post("/launch", (req, res) => {
  runInfinityLaunchPipeline();
  res.json({ ok: true, message: "Infinity Launch Started" });
});

// ---------------------- HEALTH --------------------------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    port,
    env: NODE_ENV,
    agents: agents.size,
  });
});

// ---------------------- 404 ------------------------------
app.use((req, res) =>
  res.status(404).json({ ok: false, error: "Not found", path: req.path })
);

// ---------------------- START SERVER ---------------------
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 AG3 Orchestrator running on PORT ${port}`);
});
