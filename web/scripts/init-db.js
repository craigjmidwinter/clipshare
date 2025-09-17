#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Initializing database...');

// Set DATABASE_URL if not provided
const databaseUrl = process.env.DATABASE_URL || 'file:/app/data/db/clipshare.db';
console.log('DATABASE_URL:', databaseUrl);

// Set the environment variable for this process
process.env.DATABASE_URL = databaseUrl;

try {
  // Check if database file exists
  const dbPath = databaseUrl.replace('file:', '');
  const dbDir = path.dirname(dbPath);
  
  console.log('Database path:', dbPath);
  console.log('Database directory:', dbDir);
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
  }
  
  // Run prisma db push with explicit DATABASE_URL
  console.log('Running prisma db push...');
  execSync('prisma db push --accept-data-loss', { 
    stdio: 'inherit',
    cwd: '/app',
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Database initialization error:', error.message);
  console.log('Attempting to continue anyway...');
}
