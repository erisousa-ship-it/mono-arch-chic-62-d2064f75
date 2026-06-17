import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const TABLE = "whatsapp_auth";

const createPersistenceClient = () => {
  if (!SUPABASE_URL || !KEY) return null;

  try {
    new globalThis.URL(SUPABASE_URL);
    return createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  } catch (e) {
    console.warn("[persistAuth] disabled: Supabase env inválida:", e?.message || String(e));
    return null;
  }
};

const client = createPersistenceClient();

export const persistEnabled = !!client;

export async function restoreAuthDir(dir) {
  if (!client) return;
  try {
    await mkdir(dir, { recursive: true });
    const { data, error } = await client.from(TABLE).select("filename,data");
    if (error) { console.warn("[persistAuth] restore failed:", error.message); return; }
    for (const row of data || []) {
      try { await writeFile(path.join(dir, row.filename), Buffer.from(row.data, "base64")); } catch {}
    }
    console.log(`[persistAuth] restored ${data?.length || 0} session files from Supabase`);
  } catch (e) {
    console.warn("[persistAuth] restore error:", e.message);
  }
}

let syncQueued = false;
export function queueSync(dir) {
  if (!client) return;
  if (syncQueued) return;
  syncQueued = true;
  setTimeout(async () => {
    syncQueued = false;
    try {
      const files = await readdir(dir).catch(() => []);
      if (!files.length) return;
      const rows = [];
      for (const f of files) {
        try {
          const buf = await readFile(path.join(dir, f));
          rows.push({ filename: f, data: buf.toString("base64"), updated_at: new Date().toISOString() });
        } catch {}
      }
      if (!rows.length) return;
      const { error } = await client.from(TABLE).upsert(rows, { onConflict: "filename" });
      if (error) console.warn("[persistAuth] sync failed:", error.message);
    } catch (e) {
      console.warn("[persistAuth] sync error:", e.message);
    }
  }, 800);
}

export async function clearPersisted() {
  if (!client) return;
  try { await client.from(TABLE).delete().neq("filename", ""); } catch {}
}