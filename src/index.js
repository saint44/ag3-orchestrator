/**
 * Infinity Nexus – AG3 Orchestrator
 * Autonomous revenue execution (resilient boot)
 */

const express = require("express");
const cors = require("cors");

// Core schedulers (required)
const { startOutboundScheduler } = require("./outboundScheduler");
const { startReplyScheduler } = require("./replyScheduler");

// Optional auto-heal (do NOT crash if missing)
let startAutoHealScheduler = null;
try {
  ({ startAutoHealScheduler } = require("./autoHealScheduler"));
} catch (err) {
  console.warn("[AG3] Auto-Heal Scheduler not present — continuing without it");
}

const app = express();
const PORT = process.env.PORT || 10000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Health endpoint
// ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "running",
    launchState: "LAUNCHED",
    autoHeal: !!startAutoHealScheduler,
    time: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// Boot sequence
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("=================================");
  console.log("[AG3] ORCHESTRATOR ONLINE");
  console.log("[AG3] MODE = AUTONOMOUS");
  console.log("=================================");

  startOutboundScheduler();
  startReplyScheduler();

  if (startAutoHealScheduler) {
    startAutoHealScheduler();
    console.log("[AG3] Auto-Heal Scheduler started");
  }

  console.log("[AG3] Core schedulers running");
});
