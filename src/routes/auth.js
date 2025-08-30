// Bridge router to keep existing app.js import working
// Re-exports the legacy user routes so /auth/* endpoints function.
// This avoids a breaking refactor while other src/* routes are used.

module.exports = require('../../routes/user');

