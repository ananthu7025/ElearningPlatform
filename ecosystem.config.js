module.exports = {
  apps: [
    {
      name: 'ledxElearn-app',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/ledxElearn',
      env: {
        NODE_ENV:  'production',
        PORT:      3000,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
    },
    {
      name: 'ledxElearn-worker',
      script: 'node_modules/.bin/ts-node',
      args: '--project tsconfig.json worker/index.ts',
      cwd: '/var/www/ledxElearn',
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      restart_delay: 5000,
    },
    {
      name: 'ledxElearn-ai',
      script: 'uvicorn',
      args: 'main:app --host 127.0.0.1 --port 8000 --workers 2',
      cwd: '/var/www/ledxElearn-ai',
      interpreter: '/usr/local/bin/python3',
      env: { PYTHONUNBUFFERED: '1' },
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
