const { createReporter } = require('./activityReporter');

// Initialized once and reused across the entire application
const reporter = createReporter(
    'mongodb+srv://mumin:M43M2TFgLfGvhBwY@muminai.tm6x81b.mongodb.net/?retryWrites=true&w=majority&appName=muminAI',
    'srv-d220g0je5dus7395phvg',
    'Update-Phone',
);

module.exports = reporter;