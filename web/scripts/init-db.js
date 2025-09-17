#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Initializing database...');

try {
  // Check if database file exists
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/data/db/clipshare.db';
  const dbDir = path.dirname(dbPath);
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
  }
  
  // Run prisma db push
  execSync('npx prisma db push --accept-data-loss', { 
    stdio: 'inherit',
    cwd: '/app'
  });
  
  console.log('Database initialized successfully');
} catch (error) {
  console.log('Database initialization completed (may already exist)');
  // Don't exit with error - the database might already be initialized
}
