const { runGrowthCycle } = require("./growthController");

let RUNNING = false;

function startGrowthScheduler() {
  if (RUNNING) return;
  RUNNING = true;

  console.log("[GROWTH] Scheduler started");

  // Run immediately
  runGrowthCycle();

  // Then every 24 hours
  setInterval(runGrowthCycle, 24 * 60 * 60 * 1000);
}

module.exports = { startGrowthScheduler };
