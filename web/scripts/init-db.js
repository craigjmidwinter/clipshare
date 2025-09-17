#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Initializing database...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
  // Check if database file exists
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/data/db/clipshare.db';
  const dbDir = path.dirname(dbPath);
  
  console.log('Database path:', dbPath);
  console.log('Database directory:', dbDir);
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
  }
  
  // Run prisma db push
  console.log('Running prisma db push...');
  execSync('prisma db push --accept-data-loss', { 
    stdio: 'inherit',
    cwd: '/app'
  });
  
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Database initialization error:', error.message);
  console.log('Attempting to continue anyway...');
}
