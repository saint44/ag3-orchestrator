/**
 * Infinity Nexus – AG3 Orchestrator
 * Self-healing, autonomous revenue execution
 */

const express = require("express");
const cors = require("cors");

// Core schedulers
const { startOutboundScheduler } = require("./outboundScheduler");
const { startReplyScheduler } = require("./replyScheduler");
const { startAutoHealScheduler } = require("./autoHealScheduler");

// Optional (if present in your repo)
// const { startGrowthScheduler } = require("./growthScheduler");
// const { startPillarScheduler } = require("./pillarScheduler");

const app = express();
const PORT = process.env.PORT || 10000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Health endpoint (source of truth)
// ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "running",
    launchState: "LAUNCHED",
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

  // Core revenue loop
  startOutboundScheduler();

  // Inbound intelligence
  startReplyScheduler();

  // Self-healing revenue watchdog
  startAutoHealScheduler();

  // Optional expansion loops
  // startGrowthScheduler();
  // startPillarScheduler();

  console.log("[AG3] All schedulers started");
});
