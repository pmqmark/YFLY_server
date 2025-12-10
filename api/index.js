const app = require("../app");

// Vercel expects a function handler; wrap the Express app so Vercel can invoke it.
module.exports = (req, res) => app(req, res);
