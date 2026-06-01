module.exports = {
  apps: [
    {
      name: 'discord-dispo-bot',
      script: 'src/index.js',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
