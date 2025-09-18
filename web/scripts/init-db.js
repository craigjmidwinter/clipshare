#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Initializing database...');

// Set DATABASE_URL if not provided
const databaseUrl = process.env.DATABASE_URL || 'file:/app/data/db/clipshare.db';
console.log('DATABASE_URL:', databaseUrl);

// Set the environment variable for this process
process.env.DATABASE_URL = databaseUrl;

async function recoverStuckProcessingJobs() {
  console.log('Checking for stuck processing jobs...');
  
  try {
    // Use Prisma CLI to run a recovery script
    const recoveryScript = `
      import { PrismaClient } from '@prisma/client';
      const prisma = new PrismaClient();
      
      async function recoverStuckJobs() {
        try {
          // Find all workspaces stuck in processing status
          const stuckWorkspaces = await prisma.workspace.findMany({
            where: {
              processingStatus: 'processing'
            },
            select: {
              id: true,
              title: true,
              contentTitle: true,
              updatedAt: true
            }
          });
          
          if (stuckWorkspaces.length === 0) {
            console.log('No stuck processing jobs found.');
            return;
          }
          
          console.log(\`Found \${stuckWorkspaces.length} stuck processing jobs:\`);
          stuckWorkspaces.forEach(workspace => {
            console.log(\`- Workspace: \${workspace.title} (\${workspace.contentTitle})\`);
            console.log(\`  Last updated: \${workspace.updatedAt}\`);
          });
          
          // Mark stuck workspaces as failed
          const updateResult = await prisma.workspace.updateMany({
            where: {
              processingStatus: 'processing'
            },
            data: {
              processingStatus: 'failed',
              processingProgress: 0
            }
          });
          
          console.log(\`Marked \${updateResult.count} workspaces as failed.\`);
          
          // Also mark any stuck processing jobs as failed
          const stuckJobs = await prisma.processingJob.findMany({
            where: {
              status: 'processing'
            },
            select: {
              id: true,
              type: true,
              workspaceId: true,
              createdAt: true
            }
          });
          
          if (stuckJobs.length > 0) {
            console.log(\`Found \${stuckJobs.length} stuck processing jobs:\`);
            stuckJobs.forEach(job => {
              console.log(\`- Job: \${job.type} (ID: \${job.id})\`);
              console.log(\`  Created: \${job.createdAt}\`);
            });
            
            const jobUpdateResult = await prisma.processingJob.updateMany({
              where: {
                status: 'processing'
              },
              data: {
                status: 'failed',
                errorText: 'Processing interrupted by application restart'
              }
            });
            
            console.log(\`Marked \${jobUpdateResult.count} processing jobs as failed.\`);
          }
          
          console.log('Recovery completed successfully.');
          
        } catch (error) {
          console.error('Error during recovery:', error);
          throw error;
        } finally {
          await prisma.\$disconnect();
        }
      }
      
      recoverStuckJobs().catch(console.error);
    `;
    
    // Write the recovery script to a temporary file
    const tempScriptPath = '/tmp/recovery-script.mjs';
    fs.writeFileSync(tempScriptPath, recoveryScript);
    
    // Execute the recovery script
    execSync(`node ${tempScriptPath}`, { 
      stdio: 'inherit',
      cwd: '/app',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    
    // Clean up the temporary script
    fs.unlinkSync(tempScriptPath);
    
  } catch (error) {
    console.error('Recovery failed:', error.message);
    console.log('Continuing with startup...');
  }
}

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
  
  // Run recovery for stuck processing jobs
  await recoverStuckProcessingJobs();
  
} catch (error) {
  console.error('Database initialization error:', error.message);
  console.log('Attempting to continue anyway...');
}