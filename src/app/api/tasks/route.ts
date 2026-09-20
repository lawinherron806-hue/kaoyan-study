import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { get } from "@/lib/store";
import { checkOrigin, failure } from "@/lib/http";
import { saveTask } from "@/lib/tasks";
const schema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(180),
  subject_id: z.uuid().nullable(),
  date: z.iso.date(),
  minutes: z.number().int().min(1).max(1440),
  status: z.enum(["todo", "doing", "done"]),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser(),
      data = schema.parse(await request.json());
    if (data.subject_id && !(await get("subjects", user.id, data.subject_id)))
      throw new Error("科目不存在");
    const old = data.id ? await get("study_tasks", user.id, data.id) : null;
    if (data.id && !old) throw new Error("NOT_FOUND");
    const task = {
      ...data,
      id: data.id || randomUUID(),
      user_id: user.id,
      created_at: old?.created_at || new Date().toISOString(),
    };
    await saveTask(task);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
