import { backend } from "./config";
import { supabase } from "./supabase";
import type { Tables } from "./types";
type Entity = keyof Tables;
export async function list<K extends Entity>(
  entity: K,
  uid: string,
): Promise<Tables[K][]> {
  if (backend() === "local") {
    const { db } = await import("./local-db");
    return (
      db()
        .prepare("SELECT data FROM records WHERE entity=? AND user_id=?")
        .all(entity, uid) as { data: string }[]
    ).map((r) => JSON.parse(r.data));
  }
  const client = await supabase(),
    result: Tables[K][] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client
      .from(entity)
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 999);
    if (error) throw new Error("读取数据失败：" + error.message);
    result.push(...(data as Tables[K][]));
    if (data.length < 1000) return result;
  }
}
export async function get<K extends Entity>(
  entity: K,
  uid: string,
  id: string,
): Promise<Tables[K] | null> {
  if (backend() === "local") {
    const { db } = await import("./local-db");
    const row = db()
      .prepare("SELECT data FROM records WHERE entity=? AND user_id=? AND id=?")
      .get(entity, uid, id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }
  const { data, error } = await (
    await supabase()
  )
    .from(entity)
    .select("*")
    .eq("user_id", uid)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Tables[K] | null;
}
export async function save<K extends Entity>(
  entity: K,
  uid: string,
  record: Tables[K],
): Promise<Tables[K]> {
  if (record.user_id !== uid) throw new Error("禁止跨用户写入");
  if (backend() === "local") {
    const { db } = await import("./local-db");
    db()
      .prepare(
        "INSERT INTO records(entity,id,user_id,data) VALUES(?,?,?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data WHERE records.user_id=excluded.user_id",
      )
      .run(entity, record.id, uid, JSON.stringify(record));
    return record;
  }
  const { data, error } = await (
    await supabase()
  )
    .from(entity)
    .upsert(record)
    .select()
    .single();
  if (error) throw new Error("保存失败：" + error.message);
  return data as Tables[K];
}
export async function remove(entity: Entity, uid: string, id: string) {
  if (backend() === "local") {
    const { db } = await import("./local-db");
    db()
      .prepare("DELETE FROM records WHERE entity=? AND user_id=? AND id=?")
      .run(entity, uid, id);
    return;
  }
  const { error } = await (
    await supabase()
  )
    .from(entity)
    .delete()
    .eq("user_id", uid)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
