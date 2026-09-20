import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { get, save } from "@/lib/store";
import { checkOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({
        type: z.enum(["subject", "chapter", "category"]),
        name: z.string().trim().min(1).max(60),
        subject_id: z.uuid().optional(),
        kind: z.enum(["note", "mistake", "material"]).optional(),
      })
      .parse(await request.json());
    const base = {
      id: randomUUID(),
      user_id: user.id,
      name: input.name,
      created_at: new Date().toISOString(),
    };
    if (input.type === "subject")
      await save("subjects", user.id, { ...base, color: "green" });
    else if (input.type === "chapter") {
      if (
        !input.subject_id ||
        !(await get("subjects", user.id, input.subject_id))
      )
        throw new Error("请选择有效科目");
      await save("chapters", user.id, {
        ...base,
        subject_id: input.subject_id,
      });
    } else
      await save("categories", user.id, {
        ...base,
        kind: input.kind || "material",
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
