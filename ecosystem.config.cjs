const path = require('path')
const root = __dirname

module.exports = {
  apps: [
    {
      name: 'celepar-be',
      script: path.join(root, 'backend', 'server.js'),
      cwd: path.join(root, 'backend'),
      watch: false,
    },
    {
      name: 'celepar-fe',
      script: path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'),
      cwd: path.join(root, 'frontend'),
      watch: false,
    },
  ],
}
