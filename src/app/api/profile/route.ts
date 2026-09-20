import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { get, save } from "@/lib/store";
import { checkOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const data = z
      .object({
        name: z.string().trim().min(1).max(40),
        exam_date: z.iso.date().nullable(),
      })
      .parse(await request.json());
    const profile = await get("users", user.id, user.id);
    if (!profile) throw new Error("NOT_FOUND");
    await save("users", user.id, { ...profile, ...data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
