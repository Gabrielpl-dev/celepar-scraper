const path = require('path')
const root = __dirname

module.exports = {
  apps: [
    {
      name: 'celepar-be',
      script: path.join(root, 'backend', 'server.js'),
      cwd: path.join(root, 'backend'),
      watch: false,
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
    },
  ],
}
