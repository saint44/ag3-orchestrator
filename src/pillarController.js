const fs = require("fs");
const path = require("path");
const pillars = require("./pillars");

const DATA_DIR = path.join(process.cwd(), "data", "pillars");
fs.mkdirSync(DATA_DIR, { recursive: true });

function write(id, payload) {
  fs.writeFileSync(
    path.join(DATA_DIR, `${id}.json`),
    JSON.stringify(payload, null, 2)
  );
}

function now() {
  return new Date().toISOString();
}

async function deployPillar(pillar) {
  const state = {
    id: pillar.id,
    name: pillar.name,
    type: pillar.type,
    status: "DEPLOYING",
    startedAt: now(),
    offer: pillar.offer,
    price: pillar.price,
    marketing: pillar.marketing,
    fulfillment: pillar.fulfillment
  };

  write(pillar.id, state);

  // Simulate marketing + sales + fulfillment activation
  state.status = "ACTIVE";
  state.activatedAt = now();

  write(pillar.id, state);

  console.log(`[PILLAR] DEPLOYED → ${pillar.name}`);
}

async function deployBatch() {
  console.log("[PILLAR] Deploying batch...");
  for (const pillar of pillars) {
    await deployPillar(pillar);
  }
  console.log("[PILLAR] Batch deployment complete");
}

module.exports = { deployBatch };
