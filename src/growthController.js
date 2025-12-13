const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const GROWTH_DIR = path.join(DATA_DIR, "growth");
fs.mkdirSync(GROWTH_DIR, { recursive: true });

function write(name, payload) {
  fs.writeFileSync(
    path.join(GROWTH_DIR, `${name}.json`),
    JSON.stringify(payload, null, 2)
  );
}

function now() {
  return new Date().toISOString();
}

function runGrowthCycle() {
  // NOTE: For now, subscriber count is inferred from Stripe activity.
  // This will be expanded later.
  const state = {
    timestamp: now(),
    phase: "PRIVATE_BETA",
    maxSubscribers: 10,
    currentSubscribers: "AUTO-DETECT",
    actions: [
      "IDENTIFY_NEXT_BETA_USERS",
      "SEND_INVITE_RECOMMENDATIONS",
      "MONITOR_CONVERSION",
      "PREPARE_PRICE_INCREASE"
    ]
  };

  const decisions = {
    timestamp: now(),
    allowInvites: true,
    inviteCount: 3,
    priceChangeProposed: false,
    nextPrice: null,
    notes: "Growth operating within private beta limits."
  };

  write("state", state);
  write("decisions", decisions);

  console.log("[GROWTH] Cycle complete → PRIVATE_BETA");
}

module.exports = { runGrowthCycle };
