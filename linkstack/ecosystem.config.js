// PM2 config untuk production
// Install: npm install -g pm2
// Start: pm2 start ecosystem.config.js
// Auto-start on reboot: pm2 startup && pm2 save

module.exports = {
  apps: [{
    name: 'linkstack',
    script: './server.js',
    cwd: '/var/www/linkstack',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3500
    },
    error_file: '/var/log/linkstack/error.log',
    out_file: '/var/log/linkstack/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
