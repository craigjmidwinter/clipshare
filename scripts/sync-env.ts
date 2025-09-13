#!/usr/bin/env ts-node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');
const supabaseEnvPath = resolve(root, 'supabase', '.env');
const webEnvLocalPath = resolve(root, 'web', '.env.local');

function main() {
  if (!existsSync(supabaseEnvPath)) {
    console.error('Missing supabase/.env. Create it via `supabase start` or manual.');
    process.exit(1);
  }

  const src = readFileSync(supabaseEnvPath, 'utf8');
  const outLines: string[] = [];

  const map: Record<string, string> = {};
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2];
    map[key] = value;
  }

  // Supabase local provides these keys
  const supabaseUrl = map['SUPABASE_URL'] || 'http://localhost:54321';
  const supabaseAnonKey = map['SUPABASE_ANON_KEY'] || '';

  outLines.push(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
  outLines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);
  outLines.push(`NEXT_PUBLIC_SITE_URL=http://localhost:3000`);

  // MinIO defaults
  outLines.push(`S3_ENDPOINT=http://localhost:9000`);
  outLines.push(`S3_REGION=us-east-1`);
  outLines.push(`S3_BUCKET=clipshare`);
  outLines.push(`S3_ACCESS_KEY_ID=minioadmin`);
  outLines.push(`S3_SECRET_ACCESS_KEY=minioadmin`);
  outLines.push(`S3_FORCE_PATH_STYLE=true`);

  writeFileSync(webEnvLocalPath, outLines.join('\n') + '\n');
  console.log(`Wrote ${webEnvLocalPath}`);
}

main();


