/** PM2 — LinkTo on port 3003 */
const path = require('path');

const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

module.exports = {
  apps: [
    {
      name: 'linkto',
      cwd: __dirname,
      script: nextBin,
      args: 'start -H 0.0.0.0 -p 3003',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
    },
  ],
};
