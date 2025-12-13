// dashboard.js — FIXED & CLEAN

module.exports = function renderDashboard(info) {
  const statusBadge = (val) =>
    val === "online"
      ? `<span style="color:#2ecc71;font-weight:bold;">ONLINE</span>`
      : `<span style="color:#e74c3c;font-weight:bold;">OFFLINE</span>`;

  return `
  <html>
  <head>
    <title>AG3 Dashboard</title>
    <style>
      body { font-family: Arial; background: #111; color: #eee; padding: 20px; }
      h1 { color: #f1c40f; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      td, th { padding: 10px; border-bottom: 1px solid #333; }
    </style>
  </head>
  <body>
    <h1>AG3 Orchestrator Dashboard</h1>

    <table>
      <tr>
        <th>Service</th>
        <th>Status</th>
      </tr>

      <tr><td>Autopilot Daemon</td><td>${statusBadge(info.services.autopilot)}</td></tr>
      <tr><td>Supervisor</td><td>${statusBadge(info.services.supervisor)}</td></tr>
      <tr><td>Marketing Engine</td><td>${statusBadge(info.services.marketing)}</td></tr>
      <tr><td>Content Engine</td><td>${statusBadge(info.services.content)}</td></tr>
      <tr><td>Recovery Engine</td><td>${statusBadge(info.services.recovery)}</td></tr>
      <tr><td>Analysis Engine</td><td>${statusBadge(info.services.analysis)}</td></tr>

    </table>
  </body>
  </html>
  `;
};
