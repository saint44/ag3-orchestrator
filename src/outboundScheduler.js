const { runOutbound } = require("./outboundController");

let RUNNING = false;

function startOutboundScheduler() {
  if (RUNNING) return;
  RUNNING = true;

  console.log("[OUTBOUND] Scheduler started (automation_agency only)");

  // Run immediately
  runOutbound();

  // Then every 24 hours
  setInterval(runOutbound, 24 * 60 * 60 * 1000);
}

module.exports = { startOutboundScheduler };
