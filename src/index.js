// ======================================================
// AG3 ORCHESTRATOR — AUTOMATION + MISSION ROUTING ENGINE
// ======================================================

// Core dependencies
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// Mission Router (handles automation logic)
const missionRouter = require("./missionRouter");

// --------------------------------------
// INIT EXPRESS APP
// --------------------------------------
const app = express();
app.use(cors());

// Stripe CLI test events require JSON body parsing (no signatures)
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// --------------------------------------
// VERIFY ENV KEYS
// --------------------------------------
console.log("Loaded ENV keys:", {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "✔️ PRESENT" : "❌ MISSING",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "✔️ PRESENT" : "❌ MISSING",
});

// --------------------------------------
// STRIPE WEBHOOK ENDPOINT (NO SIGNATURE CHECK FOR CLI)
// --------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    console.log("⚡ Incoming Stripe Event:", event.type);

    // Route the event → mission handler
    const routed = await missionRouter(event);

    console.log("🎯 Mission Routed:", routed);

    // This is where AG3 agents would normally execute:
    // await axios.post("http://localhost:4603/missions", routed);

    return res.json({
      ok: true,
      received: event.type,
      routed,
    });
  } catch (err) {
    console.error("❌ Webhook Processing Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --------------------------------------
// HEALTH CHECK ENDPOINT
// --------------------------------------
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AG3 Orchestrator – Automation Enabled",
    status: "online",
    missionRouting: true,
  });
});

// --------------------------------------
// DYNAMIC PORT (Render sets process.env.PORT)
// --------------------------------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 AG3 Orchestrator running on port ${PORT} (Automation Mode Active)`);
});
