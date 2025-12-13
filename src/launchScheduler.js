const { runLaunchAudit } = require("./launchController");

let RUNNING = false;

function startLaunchScheduler() {
  if (RUNNING) return;
  RUNNING = true;

  console.log("[LAUNCH] Scheduler started");

  // Run immediately
  runLaunchAudit();

  // Then every 10 minutes
  setInterval(() => {
    runLaunchAudit();
  }, 10 * 60 * 1000);
}

module.exports = { startLaunchScheduler };
