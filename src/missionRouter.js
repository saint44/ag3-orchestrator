const axios = require('axios');
const { sendMission } = require('./autopilotClient');
const { logSupervisorEvent } = require('./supervisorHooks');
const { findAgentWithCapability } = require('./fleet');

async function routeMission(mission) {
  const { type, payload, requiredCapability } = mission;

  logSupervisorEvent('MISSION_RECEIVED', { type, payload, requiredCapability });

  // --- AUTOPILOT MISSIONS ---
  const autopilotRouting = {
    'restart-ag3': { type: 'PM2_RESTART', processName: 'ag3-orchestrator' },
    'deploy-render': { type: 'RENDER_DEPLOY' },
    'heal-tunnel': { type: 'TUNNEL_RESTART' },
  };

  if (autopilotRouting[type]) {
    const missionToSend = autopilotRouting[type];
    const resp = await sendMission(missionToSend);
    logSupervisorEvent('AUTOPILOT_MISSION_SENT', { type, missionToSend, resp });
    return { mode: 'autopilot', type, response: resp };
  }

  // --- AGENT MISSIONS ---
  const capabilityMap = {
    'marketing-cycle': 'marketing',
    'content-cycle': 'content',
    'analysis-scan': 'analysis',
    'recovery-cycle': 'recovery',
  };

  const cap = requiredCapability || capabilityMap[type];

  if (cap) {
    const candidates = findAgentWithCapability(cap);
    if (!candidates.length) {
      logSupervisorEvent('MISSION_NO_AGENT', { type, capability: cap });
      return { error: 'No agents with capability', capability: cap };
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    logSupervisorEvent('MISSION_AGENT_ASSIGNED', {
      type,
      capability: cap,
      agent: selected.name,
    });

    // NOW: actually send HTTP mission to the agent
    try {
      const agentPort = selected.port;
      const url = `http://localhost:${agentPort}/task`;

      const resp = await axios.post(url, {
        type,
        payload,
      });

      logSupervisorEvent('MISSION_AGENT_EXECUTED', {
        type,
        agent: selected.name,
        saved: resp.data?.saved,
      });

      return {
        mode: 'agent',
        assignedAgent: selected.name,
        saved: resp.data?.saved,
      };

    } catch (err) {
      logSupervisorEvent('MISSION_AGENT_ERROR', {
        type,
        agent: selected.name,
        error: err.message,
      });

      return {
        mode: 'agent',
        assignedAgent: selected.name,
        error: err.message,
      };
    }
  }

  logSupervisorEvent('MISSION_UNROUTABLE', { type, mission });
  return { error: 'Unknown mission type', type };
}

module.exports = { routeMission };
