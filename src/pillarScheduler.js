const { deployBatch } = require("./pillarController");

let RUNNING = false;

function startPillarScheduler() {
  if (RUNNING) return;
  RUNNING = true;

  console.log("[PILLAR] Scheduler started (parallel batch mode)");

  // Run once on startup
  deployBatch();
}

module.exports = { startPillarScheduler };
