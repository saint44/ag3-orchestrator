/**
 * AG3 ORCHESTRATOR — LIVE STRIPE + SINGLE COMMANDER
 * -------------------------------------------------
 * - Stripe webhook verified
 * - Idempotent
 * - Queue-based
 * - Single agent execution
 * - Safe defaults for live payloads
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");

// -------------------- CONFIG --------------------
const PORT = process.env.PORT || 10000;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  console.error("[AG3] Missing Stripe environment variables");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// -------------------- APP --------------------
const app = express();
app.use(cors());

// Raw body ONLY for Stripe
app.post("/launch", bodyParser.raw({ type: "application/json" }));

// JSON for everything else
app.use(express.json());

// -------------------- STORAGE --------------------
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "processed-events.json");
const LOG_FILE = path.join(DATA_DIR, "missions.log");

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

function loadProcessed() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveProcessed(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function log(line) {
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// -------------------- AGENT CONTROL --------------------
const DEFAULT_AGENT = { id: "ag4" };
const QUEUE = [];
let BUSY = false;

function selectSingleAgent(task) {
  // LIVE-SAFE: Stripe events may not include a task string
  if (!task || typeof task !== "string") {
    return DEFAULT_AGENT;
  }
  return DEFAULT_AGENT;
}

async function executeAgent(agent, mission, payload) {
  return {
    agent: agent.id,
    mission,
    status: "OK",
    payload,
    timestamp: new Date().toISOString(),
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

      const agent = selectSingleAgent(job.task);
      console.log(`[AG3] COMMANDER → ${agent.id}`);

      const result = await executeAgent(agent, job.mission, job.payload);

      console.log(`[AG3] RESULT ← ${agent.id}`);
      console.log("[AG3] MISSION_COMPLETE");

      log(JSON.stringify(result));
    }
  } catch (err) {
    console.error("[AG3] EXECUTION_ERROR", err);
  } finally {
    BUSY = false;
  }
}

// -------------------- HEALTH --------------------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    commander: "AG3",
    mode: "single-agent",
    queueDepth: QUEUE.length,
    time: new Date().toISOString(),
  });
});

// -------------------- STRIPE WEBHOOK --------------------
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
    console.error("[AG3] INVALID_SIGNATURE");
    return res.status(400).send("Invalid signature");
  }

  const processed = loadProcessed();
  if (processed[event.id]) {
    return res.json({ ok: true, deduped: true });
  }

  processed[event.id] = true;
  saveProcessed(processed);

  // Map Stripe → Mission
  let mission = null;
  let payload = {};

  if (event.type === "checkout.session.completed") {
    mission = "stripe_checkout_completed";
    payload = {
      eventId: event.id,
      session: event.data.object.id,
      customer: event.data.object.customer,
      email: event.data.object.customer_details?.email,
      amount: event.data.object.amount_total,
      currency: event.data.object.currency,
    };
  }

  if (!mission) {
    return res.json({ ok: true, ignored: true });
  }

  QUEUE.push({
    mission,
    task: null, // LIVE SAFE
    payload,
  });

  pumpQueue();

  res.json({ ok: true, queued: true });
});

// -------------------- START --------------------
app.listen(PORT, () => {
  console.log("=================================");
  console.log("[AG3] ORCHESTRATOR ONLINE");
  console.log(`[AG3] PORT = ${PORT}`);
  console.log("[AG3] MODE = SINGLE COMMANDER");
  console.log("=================================");
});
