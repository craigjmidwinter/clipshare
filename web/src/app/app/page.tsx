import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  // For local development, let's use client-side authentication
  // This is more reliable than server-side auth in local dev
  return <DashboardClient />;
}



