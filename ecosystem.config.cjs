const path = require('path')
const root = __dirname

module.exports = {
  apps: [
    {
      name: 'CeleparApp',
      script: path.join(root, 'backend', 'server.js'),
      cwd: path.join(root, 'backend'),
      watch: false,
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
