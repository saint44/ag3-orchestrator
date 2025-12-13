const { checkReplies } = require("./replyController");

function startReplyScheduler() {
  console.log("[REPLY] IMAP scheduler started");
  checkReplies();
  setInterval(checkReplies, 10 * 60 * 1000); // every 10 minutes
}

module.exports = { startReplyScheduler };
