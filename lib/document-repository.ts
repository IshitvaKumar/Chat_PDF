import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { DocumentRecord } from "@/lib/types";

type DatabaseDocument = {
  id: string;
  name: string;
  size: number;
  status: DocumentRecord["status"];
  created_at: string;
  file_search_store_name: string;
};

const documentsPath = path.join(process.cwd(), "data", "documents.json");

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Supabase is not configured.");

  // This client is imported only by server-side route handlers. The secret key
  // must never use a NEXT_PUBLIC_ name or be referenced from client components.
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function fromDatabase(document: DatabaseDocument): DocumentRecord {
  return {
    id: document.id,
    name: document.name,
    size: document.size,
    status: document.status,
    createdAt: document.created_at,
    fileSearchStoreName: document.file_search_store_name,
  };
}

async function readLocalDocuments(): Promise<DocumentRecord[]> {
  try {
    return JSON.parse(await readFile(documentsPath, "utf8")) as DocumentRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function saveLocalDocuments(documents: DocumentRecord[]) {
  await mkdir(path.dirname(documentsPath), { recursive: true });
  const temporaryPath = `${documentsPath}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(documents, null, 2), "utf8");
  await rename(temporaryPath, documentsPath);
}

function requireProductionDatabase() {
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    throw new Error("Supabase must be configured before this app can run in production.");
  }
}

export async function getStoredDocument(id: string) {
  requireProductionDatabase();
  if (!isSupabaseConfigured()) return (await readLocalDocuments()).find((document) => document.id === id);

  const { data, error } = await getSupabase()
    .from("documents")
    .select("id, name, size, status, created_at, file_search_store_name")
    .eq("id", id)
    .maybeSingle<DatabaseDocument>();
  if (error) throw new Error(`Could not load the document record: ${error.message}`);
  return data ? fromDatabase(data) : undefined;
}

export async function saveStoredDocument(document: DocumentRecord) {
  requireProductionDatabase();
  if (!isSupabaseConfigured()) {
    const documents = await readLocalDocuments();
    documents.push(document);
    await saveLocalDocuments(documents);
    return;
  }

  const { error } = await getSupabase().from("documents").insert({
    id: document.id,
    name: document.name,
    size: document.size,
    status: document.status,
    created_at: document.createdAt,
    file_search_store_name: document.fileSearchStoreName,
  });
  if (error) throw new Error(`Could not save the document record: ${error.message}`);
}

export async function removeStoredDocument(id: string) {
  requireProductionDatabase();
  if (!isSupabaseConfigured()) {
    await saveLocalDocuments((await readLocalDocuments()).filter((document) => document.id !== id));
    return;
  }

  const { error } = await getSupabase().from("documents").delete().eq("id", id);
  if (error) throw new Error(`Could not remove the document record: ${error.message}`);
}
