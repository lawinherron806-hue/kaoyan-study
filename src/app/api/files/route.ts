import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { get, save } from "@/lib/store";
import { backend, validateFile } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { checkOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const data = z
      .object({
        title: z.string().trim().min(1).max(180),
        original_name: z.string().min(1).max(250),
        size: z.number().int(),
        subject_id: z.uuid(),
        chapter_id: z.uuid().nullable(),
        category_id: z.uuid(),
        tags: z.array(z.string().trim().min(1).max(30)).max(10),
      })
      .parse(await request.json());
    const { ext, mime } = validateFile(data.original_name, data.size);
    if (
      !(await get("subjects", user.id, data.subject_id)) ||
      !(await get("categories", user.id, data.category_id))
    )
      throw new Error("科目或资料类型无效");
    if (data.chapter_id) {
      const chapter = await get("chapters", user.id, data.chapter_id);
      if (!chapter || chapter.subject_id !== data.subject_id)
        throw new Error("章节与科目不匹配");
    }
    const id = randomUUID(),
      storage_path = `${user.id}/${id}.${ext}`;
    await save("files", user.id, {
      ...data,
      id,
      user_id: user.id,
      mime_type: mime,
      storage_path,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    if (backend() === "supabase") {
      const { data: upload, error } = await (
        await supabase()
      ).storage
        .from("study-files")
        .createSignedUploadUrl(storage_path);
      if (error) throw error;
      return NextResponse.json({
        id,
        backend: "supabase",
        path: storage_path,
        token: upload.token,
      });
    }
    return NextResponse.json({ id, backend: "local" });
  } catch (e) {
    return failure(e);
  }
}
