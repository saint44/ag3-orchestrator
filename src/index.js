/**
 * AG3 ORCHESTRATOR — LIVE SAFE, SINGLE COMMANDER
 * =============================================
 * - Stripe live webhook safe
 * - No task assumptions
 * - No toLowerCase crashes
 * - Deterministic single-agent execution
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");

/* ===================== CONFIG ===================== */
const PORT = process.env.PORT || 10000;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  console.error("[AG3] Missing Stripe env vars");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

/* ===================== APP ===================== */
const app = express();
app.use(cors());

// RAW body ONLY for Stripe
app.post("/launch", bodyParser.raw({ type: "application/json" }));
app.use(express.json());

/* ===================== STORAGE ===================== */
const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "processed-events.json");
const LOG_FILE = path.join(DATA_DIR, "missions.log");

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, "{}");
}

function loadEvents() {
  return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
}

function saveEvents(e) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(e, null, 2));
}

function audit(line) {
  fs.appendFileSync(LOG_FILE, line + "\n");
}

/* ===================== AGENT CONTROL ===================== */
const DEFAULT_AGENT = { id: "ag4" };
const QUEUE = [];
let BUSY = false;

// NEVER assume task exists
function selectSingleAgent() {
  return DEFAULT_AGENT;
}

async function executeAgent(agent, mission, payload) {
  return {
    agent: agent.id,
    mission,
    status: "OK",
    payload,
    ts: new Date().toISOString(),
  };
}

async function pumpQueue() {
  if (BUSY) return;
  BUSY = true;

  try {
    while (QUEUE.length) {
      const job = QUEUE.shift();

      console.log(`[AG3] MISSION_RECEIVED → ${job.mission}`);
      console.log("[AG3] COMMANDER_MODE = ON");
      console.log("[AG3] FAN_OUT = DISABLED");
      console.log("[AG3] RETRIES = DISABLED");

      const agent = selectSingleAgent();
      console.log(`[AG3] COMMANDER → ${agent.id}`);

      const result = await executeAgent(agent, job.mission, job.payload);

      console.log("[AG3] MISSION_COMPLETE");
      audit(JSON.stringify(result));
    }
  } catch (err) {
    console.error("[AG3] EXEC_ERROR", err);
  } finally {
    BUSY = false;
  }
}

/* ===================== HEALTH ===================== */
app.get("/health", (_, res) => {
  res.json({
    ok: true,
    commander: "AG3",
    mode: "single-agent",
    queueDepth: QUEUE.length,
    time: new Date().toISOString(),
  });
});

/* ===================== STRIPE WEBHOOK ===================== */
app.post("/launch", (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[AG3] INVALID SIGNATURE");
    return res.status(400).send("Invalid signature");
  }

  const processed = loadEvents();
  if (processed[event.id]) {
    return res.json({ ok: true, deduped: true });
  }

  processed[event.id] = true;
  saveEvents(processed);

  if (event.type !== "checkout.session.completed") {
    return res.json({ ok: true, ignored: true });
  }

  const s = event.data.object;

  QUEUE.push({
    mission: "stripe_checkout_completed",
    payload: {
      eventId: event.id,
      sessionId: s.id,
      customer: s.customer,
      email: s.customer_details?.email,
      amount: s.amount_total,
      currency: s.currency,
    },
  });

  pumpQueue();
  res.json({ ok: true, queued: true });
});

/* ===================== START ===================== */
app.listen(PORT, () => {
  console.log("=================================");
  console.log("[AG3] ORCHESTRATOR ONLINE");
  console.log(`[AG3] PORT = ${PORT}`);
  console.log("[AG3] MODE = SINGLE COMMANDER");
  console.log("=================================");
});
