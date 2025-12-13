const axios = require('axios');

const FLEET = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `ag${i + 1}`,
  port: 4600 + (i + 1),
  capabilities: [],
}));

// CAPABILITY MAPPING
for (const agent of FLEET) {
  // FULL-SPECTRUM MARKETING + CONTENT ONLY ON AG4 & AG5
  if (agent.id === 4 || agent.id === 5) {
    agent.capabilities.push('marketing', 'content');
  }
  // RECOVERY
  else if (agent.id >= 11 && agent.id <= 20) {
    agent.capabilities.push('recovery');
  }
  // ANALYSIS
  else if (agent.id >= 21 && agent.id <= 40) {
    agent.capabilities.push('analysis');
  }
  // BUILD / DEPLOY
  else if (agent.id >= 41 && agent.id <= 60) {
    agent.capabilities.push('build', 'deploy');
  }
  // GENERAL (NO CONTENT HERE TO AVOID ERRORS)
  else {
    agent.capabilities.push('general');
  }
}

async function heartbeat(agent) {
  try {
    const r = await axios.get(`http://localhost:${agent.port}/health`, { timeout: 1500 });
    return { agent: agent.name, status: 'ok', http: r.status };
  } catch (err) {
    return { agent: agent.name, status: 'fail', error: err.message };
  }
}

function findAgentWithCapability(cap) {
  return FLEET.filter(a => a.capabilities.includes(cap));
}

module.exports = {
  FLEET,
  heartbeat,
  findAgentWithCapability,
};
