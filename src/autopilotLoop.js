const axios = require('axios');
const { routeMission } = require('./missionRouter');
const { logSupervisorEvent } = require('./supervisorHooks');

function startAutopilotLoop() {
  const intervalMs = 2000; // 2 seconds

  async function cycle() {
    const ts = new Date().toISOString();
    logSupervisorEvent('AUTOPILOT_CYCLE_START', { timestamp: ts });

    try {
      const healthRes = await axios.get('http://localhost:4600/health', { timeout: 1500 });
      const uptime = healthRes.data?.uptimeSeconds || 0;

      const missions = [
        { type: 'deploy-render' },   // handled by Autopilot
        { type: 'heal-tunnel' },     // handled by Autopilot
        { type: 'marketing-cycle' }, // handled by marketing agents
        { type: 'content-cycle' }    // handled by marketing agents as content
      ];

      for (const m of missions) {
        await routeMission(m);
      }

      logSupervisorEvent('AUTOPILOT_CYCLE_END', {
        timestamp: ts,
        intervalMs,
        uptime,
        missionsCount: missions.length
      });
    } catch (err) {
      logSupervisorEvent('AUTOPILOT_CYCLE_ERROR', { error: err.message || String(err) });
    }
  }

  setInterval(cycle, intervalMs);
  cycle();
}

module.exports = { startAutopilotLoop };
