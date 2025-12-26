module.exports = {
  apps: [
    {
      name: 'gam-backend',
      script: 'src/index.js',
      instances: process.env.NODE_ENV === 'production' ? 2 : 1, // Reduced for Windows
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        // Windows-specific environment
        TMPDIR: process.env.TEMP || 'C:\\temp'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        TMPDIR: process.env.TEMP || 'C:\\temp'
      },
      
      // Performance settings (adjusted for Windows)
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Logging (Windows-compatible paths)
      log_file: '.\\logs\\pm2-combined.log',
      out_file: '.\\logs\\pm2-out.log',
      error_file: '.\\logs\\pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart settings
      watch: process.env.NODE_ENV === 'development' ? ['src'] : false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
      
      // Advanced settings (Windows-optimized)
      kill_timeout: 10000, // Increased for Windows
      listen_timeout: 15000, // Increased for Windows
      shutdown_with_message: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Instance settings
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // PM2 specific settings
      pmx: true,
      autorestart: true,
      
      // Node.js specific settings (Windows-optimized)
      node_args: [
        '--max-old-space-size=2048',
        '--optimize-for-size'
      ],
      
      // Windows-specific settings
      windowsHide: true,
      force: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/your-repo.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
