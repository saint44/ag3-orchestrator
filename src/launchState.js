const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(process.cwd(), "data", "launch", "state.json");

function getState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { status: "READY" };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function setState(status) {
  const payload = {
    status,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2));
  console.log(`[LAUNCH] STATE → ${status}`);
}

module.exports = { getState, setState };
