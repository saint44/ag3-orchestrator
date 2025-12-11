/**
 * AG3 FULL AUTOMATION — Mission Router
 * This file receives Stripe events and forwards them to the Infinity Spine.
 */

const axios = require("axios");

// The Infinity Spine AG3 mission endpoint (local or production)
const MISSION_ENGINE_URL =
  process.env.MISSION_ENGINE_URL || "http://localhost:4600/missions";

async function routeMission(eventType, payload) {
  try {
    console.log(`🚀 Routing mission → ${eventType}`);

    const res = await axios.post(MISSION_ENGINE_URL, {
      eventType,
      payload,
    });

    console.log("✅ Mission routed successfully:", res.data);
  } catch (err) {
    console.error("❌ Mission routing failed:", err.response?.data || err);
  }
}

module.exports = { routeMission };
