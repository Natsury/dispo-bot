module.exports = {
  apps: [
    {
      name: 'discord-dispo-bot',
      script: 'src/index.js',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
