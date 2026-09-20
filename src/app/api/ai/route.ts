import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    return NextResponse.json(
      {
        error:
          "AI 解析将在 V2 开启。当前版本仅保存原始资料，不会调用或消耗 AI 配额。",
        code: "NOT_IMPLEMENTED",
      },
      { status: 501 },
    );
  } catch (e) {
    return failure(e);
  }
}
