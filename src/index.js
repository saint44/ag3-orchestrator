/**
 * AG3 ORCHESTRATOR — SINGLE COMMANDER MODE
 * ---------------------------------------
 * One mission → one agent → one result → stop
 * No fan-out, no retries, no auto-heal
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 10000;

/* ================================
   MIDDLEWARE
================================ */
app.use(cors());
app.use(bodyParser.json());

/* ================================
   MOCK / EXISTING AGENT REGISTRY
   (Replace only if you already
    have a real registry module)
================================ */
const AGENTS = [
  { id: "ag4", capability: "content" },
  { id: "ag11", capability: "recovery" },
  { id: "ag21", capability: "analysis" },
  { id: "ag41", capability: "deploy" }
];

/* ================================
   AGENT SELECTION (STRICT)
================================ */
function selectSingleAgent(task) {
  // simple deterministic selection
  const agent = AGENTS.find(a =>
    task.toLowerCase().includes(a.capability)
  );

  return agent || AGENTS[0]; // guaranteed single agent
}

/* ================================
   AGENT EXECUTION (ONCE)
================================ */
function executeAgent(agent, task) {
  return new Promise((resolve) => {
    console.log(
      `[AG3] WORKER_EXEC_START → ${agent.id} | task=${task}`
    );

    // Simulated execution — replace with real call if needed
    setTimeout(() => {
      const result = {
        agent: agent.id,
        task,
        status: "OK",
        timestamp: new Date().toISOString()
      };

      console.log(
        `[AG3] WORKER_EXEC_DONE → ${agent.id}`
      );

      resolve(result);
    }, 500);
  });
}

/* ================================
   CONTROL PROOF / LAUNCH ENDPOINT
================================ */
app.post("/launch", async (req, res) => {
  const { mission, task } = req.body || {};

  console.log("=================================");
  console.log(`[AG3] MISSION_RECEIVED → ${mission}`);
  console.log(`[AG3] TASK → ${task}`);

  // STRICT COMMANDER RULES
  console.log("[AG3] COMMANDER_MODE = ON");
  console.log("[AG3] FAN_OUT = DISABLED");
  console.log("[AG3] RETRIES = DISABLED");

  const agent = selectSingleAgent(task);

  console.log(
    `[AG3] COMMANDER → ${agent.id} (single-agent lock)`
  );

  try {
    const result = await executeAgent(agent, task);

    console.log(
      `[AG3] RESULT ← ${agent.id}`,
      result
    );

    console.log("[AG3] MISSION_COMPLETE");
    console.log("=================================");

    return res.json({
      ok: true,
      commander: "AG3",
      mission,
      agent: agent.id,
      result
    });
  } catch (err) {
    console.log(
      `[AG3] MISSION_ABORTED → ${agent.id}`,
      err?.message || err
    );

    return res.status(500).json({
      ok: false,
      error: "MISSION_FAILED_NO_RETRY"
    });
  }
});

/* ================================
   HEALTH CHECK
================================ */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    commander: "AG3",
    mode: "single-agent",
    time: new Date().toISOString()
  });
});

/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log("=================================");
  console.log(`[AG3] ORCHESTRATOR ONLINE`);
  console.log(`[AG3] PORT = ${PORT}`);
  console.log(`[AG3] MODE = SINGLE COMMANDER`);
  console.log("=================================");
});
