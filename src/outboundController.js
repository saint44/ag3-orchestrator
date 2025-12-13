const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data", "outbound");
fs.mkdirSync(DATA_DIR, { recursive: true });

const DAILY_CAP = 5; // hard safety limit

function now() {
  return new Date().toISOString();
}

function loadToday() {
  const f = path.join(DATA_DIR, "today.json");
  if (!fs.existsSync(f)) return { date: new Date().toDateString(), sent: 0 };
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

function saveToday(d) {
  fs.writeFileSync(
    path.join(DATA_DIR, "today.json"),
    JSON.stringify(d, null, 2)
  );
}

function log(payload) {
  fs.appendFileSync(
    path.join(DATA_DIR, "log.jsonl"),
    JSON.stringify(payload) + "\n"
  );
}

function generateLeads(limit) {
  // SAFE PLACEHOLDER — replace later with real lead source
  const leads = [];
  for (let i = 0; i < limit; i++) {
    leads.push({
      email: `lead${Date.now()}_${i}@example.com`,
      source: "seed",
    });
  }
  return leads;
}

async function runOutbound() {
  const today = loadToday();
  if (today.sent >= DAILY_CAP) {
    console.log("[OUTBOUND] Daily cap reached");
    return;
  }

  const remaining = DAILY_CAP - today.sent;
  const leads = generateLeads(remaining);

  for (const lead of leads) {
    // Simulated send — replace with SMTP/ESP later
    log({
      timestamp: now(),
      pillar: "automation_agency",
      action: "OUTBOUND_ATTEMPT",
      lead,
      status: "QUEUED",
    });

    today.sent += 1;
    console.log(`[OUTBOUND] Queued outreach → ${lead.email}`);
  }

  saveToday(today);
  console.log(`[OUTBOUND] Cycle complete (${today.sent}/${DAILY_CAP})`);
}

module.exports = { runOutbound };
