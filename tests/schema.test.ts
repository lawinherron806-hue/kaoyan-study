import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL schema, tenant RLS, composite foreign keys and atomic task records", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql as $$select string_to_array(name,'/')$$;
 grant usage on schema public,auth,storage to authenticated,anon;grant all on storage.objects to authenticated;`);
    const sql = (
      await readFile(
        new URL("../supabase/migrations/001_initial.sql", import.meta.url),
        "utf8",
      )
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      s = "00000000-0000-4000-8000-000000000003",
      t = "00000000-0000-4000-8000-000000000004";
    await db.exec(
      `insert into auth.users values('${a}'),('${b}');set role authenticated;set request.jwt.claim.sub='${a}';insert into public.subjects(id,user_id,name) values('${s}','${a}','数学二');`,
    );
    assert.equal(
      (await db.query("select * from public.subjects")).rows.length,
      1,
    );
    await db.exec(`set request.jwt.claim.sub='${b}'`);
    assert.equal(
      (await db.query("select * from public.subjects")).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(
        `insert into public.subjects(user_id,name) values('${a}','forbidden')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(
        `insert into public.chapters(user_id,subject_id,name) values('${b}','${s}','cross owner')`,
      ),
      /foreign key/,
    );
    await db.exec(`set request.jwt.claim.sub='${a}'`);
    const payload = {
      id: t,
      user_id: a,
      subject_id: s,
      title: "高数",
      date: "2026-09-19",
      minutes: 30,
      status: "done",
      created_at: new Date().toISOString(),
    };
    await db.query("select public.save_study_task($1::jsonb)", [
      JSON.stringify(payload),
    ]);
    await db.query("select public.save_study_task($1::jsonb)", [
      JSON.stringify(payload),
    ]);
    assert.equal(
      (await db.query("select * from public.study_records")).rows.length,
      1,
    );
    await db.query("select public.save_study_task($1::jsonb)", [
      JSON.stringify({ ...payload, status: "todo" }),
    ]);
    assert.equal(
      (await db.query("select * from public.study_records")).rows.length,
      0,
    );
    await db.exec(
      `insert into storage.objects(bucket_id,name) values('study-files','${a}/test.pdf');set request.jwt.claim.sub='${b}';`,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name) values('study-files','${a}/attack.pdf')`,
      ),
      /row-level security/,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.files"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
