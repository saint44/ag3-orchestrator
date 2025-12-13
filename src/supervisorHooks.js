function logSupervisorEvent(type, details = {}) {
  const ts = new Date().toISOString();
  console.log(`[AG3→SUPERVISOR ${ts}]`, type, JSON.stringify(details));
}

module.exports = { logSupervisorEvent };
