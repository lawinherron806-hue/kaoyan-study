import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new Error("FORBIDDEN");
  const parsed = new URL(origin),
    host = request.headers.get("host") || new URL(request.url).host;
  // Next may normalize the internal request URL to localhost. Validate the actual
  // HTTP Host; browsers cannot forge it in a cross-origin fetch.
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.host !== host)
    throw new Error("FORBIDDEN");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Error("FORBIDDEN");
}
export function failure(error: unknown) {
  const message =
    error instanceof ZodError
      ? error.issues[0]?.message || "请检查填写内容"
      : error instanceof Error
        ? error.message
        : "操作失败，请重试";
  const status =
    message === "UNAUTHORIZED"
      ? 401
      : message === "FORBIDDEN"
        ? 403
        : message === "NOT_FOUND"
          ? 404
          : 400;
  return NextResponse.json(
    {
      error:
        message === "UNAUTHORIZED"
          ? "请先登录"
          : message === "FORBIDDEN"
            ? "请求来源不被允许"
            : message === "NOT_FOUND"
              ? "内容不存在或无访问权限"
              : message,
    },
    { status },
  );
}
