const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");

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

const app = express();
app.use(cors());

// ⚠️ DO NOT use express.json() before the webhook
// Only enable JSON for non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === "/launch") return next();
  express.json()(req, res, next);
});

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "processed-events.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, "{}");

function loadEvents() {
  return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
}
function saveEvents(e) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(e, null, 2));
}

// Health
app.get("/health", (_, res) => {
  res.json({ ok: true, commander: "AG3", mode: "single-agent" });
});

// ✅ STRIPE WEBHOOK — RAW BODY ATTACHED HERE
app.post(
  "/launch",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
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

    console.log("[AG3] MISSION_RECEIVED → stripe_checkout_completed");
    console.log("[AG3] COMMANDER_MODE = ON");
    console.log("[AG3] COMMANDER → ag4");
    console.log("[AG3] MISSION_COMPLETE");

    res.json({ ok: true });
  }
);

app.listen(PORT, () => {
  console.log("[AG3] ORCHESTRATOR ONLINE");
  console.log("[AG3] MODE = SINGLE COMMANDER");
});
