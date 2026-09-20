import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { backend } from "./config";
import { supabase } from "./supabase";
import type { User } from "./types";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function passwordMatches(password: string, hash: string) {
  const candidate = passwordHash(password, hash.split(":")[0]);
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}
export async function currentUser(): Promise<User | null> {
  if (backend() === "supabase") {
    const { data, error } = await (await supabase()).auth.getUser();
    return error || !data.user
      ? null
      : { id: data.user.id, email: data.user.email || "" };
  }
  const token = (await cookies()).get("study_session")?.value;
  if (!token) return null;
  const { db } = await import("./local-db");
  const row = db()
    .prepare(
      "SELECT a.id,a.email FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires>?",
    )
    .get(digest(token), Date.now()) as User | undefined;
  return row ? { id: row.id, email: row.email } : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
export async function localSignIn(
  email: string,
  password: string,
  register: boolean,
): Promise<User> {
  const { db } = await import("./local-db");
  const database = db();
  const limit = database
    .prepare("SELECT attempts,reset_at FROM auth_limits WHERE key=?")
    .get(email) as { attempts: number; reset_at: number } | undefined;
  if (limit && limit.reset_at > Date.now() && limit.attempts >= 10)
    throw new Error("尝试过于频繁，请 15 分钟后再试");
  database
    .prepare(
      "INSERT INTO auth_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END",
    )
    .run(email, Date.now() + 900000, Date.now(), Date.now());
  let account = database
    .prepare("SELECT * FROM accounts WHERE email=?")
    .get(email) as (User & { hash: string }) | undefined;
  if (register) {
    if (account) throw new Error("该邮箱已注册，请直接登录");
    const id = randomUUID();
    database
      .prepare("INSERT INTO accounts(id,email,hash) VALUES(?,?,?)")
      .run(id, email, passwordHash(password));
    account = { id, email, hash: "" };
  } else if (!account || !passwordMatches(password, account.hash))
    throw new Error("邮箱或密码不正确");
  const user = account!;
  const token = randomBytes(32).toString("hex");
  database.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  database
    .prepare("INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)")
    .run(digest(token), user.id, Date.now() + 30 * 86400000);
  (await cookies()).set("study_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 30 * 86400,
  });
  database.prepare("DELETE FROM auth_limits WHERE key=?").run(email);
  return { id: user.id, email: user.email };
}
export async function signOut() {
  if (backend() === "supabase") {
    const { error } = await (await supabase()).auth.signOut();
    if (error) throw error;
  } else {
    const jar = await cookies(),
      token = jar.get("study_session")?.value;
    if (token) {
      const { db } = await import("./local-db");
      db()
        .prepare("DELETE FROM sessions WHERE token_hash=?")
        .run(digest(token));
    }
    jar.delete("study_session");
  }
}
