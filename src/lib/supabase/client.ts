"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Supabase client cho trình duyệt (dùng cho Realtime và đọc dữ liệu có RLS) */
export function getBrowserSupabase() {
  client ??= createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return client;
}
