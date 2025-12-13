const axios = require('axios');

const AUTOPILOT_URL = process.env.AUTOPILOT_URL || 'http://localhost:5050/mission';
const AUTOPILOT_TOKEN = process.env.AUTOPILOT_TOKEN || 'super-secret-autopilot-token';

async function sendMission(mission) {
  const res = await axios.post(AUTOPILOT_URL, mission, {
    headers: {
      'Content-Type': 'application/json',
      'x-autopilot-token': AUTOPILOT_TOKEN,
    },
    timeout: 30000,
  });
  return res.data;
}

module.exports = { sendMission };
