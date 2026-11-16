module.exports = {
  apps: [
    {
      name: 'rusky-api',
      // The API loads .env from its working directory on start.
      cwd: __dirname + '/apps/api',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};
