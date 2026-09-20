import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { get, save, remove } from "@/lib/store";
import { backend, MAX_FILE_SIZE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { checkOrigin, failure } from "@/lib/http";
import { mkdir, writeFile, stat, unlink, readFile } from "node:fs/promises";
import path from "node:path";
type Context = { params: Promise<{ id: string }> };
async function owned(context: Context) {
  const user = await requireUser(),
    { id } = await context.params,
    file = await get("files", user.id, id);
  if (!file) throw new Error("NOT_FOUND");
  return { user, file };
}
async function diskPath(storage_path: string) {
  const { localRoot } = await import("@/lib/local-db");
  const root = path.join(localRoot(), "uploads"),
    target = path.resolve(root, storage_path);
  if (!target.startsWith(root + path.sep)) throw new Error("FORBIDDEN");
  return target;
}
export async function PUT(request: Request, context: Context) {
  try {
    checkOrigin(request);
    if (backend() !== "local") throw new Error("请使用云端直传");
    const { file } = await owned(context);
    if (file.status !== "pending") throw new Error("文件已上传");
    const declared = Number(request.headers.get("content-length"));
    if (declared > MAX_FILE_SIZE + 1024 * 1024) throw new Error("文件过大");
    const form = await request.formData(),
      upload = form.get("file");
    if (
      !(upload instanceof File) ||
      upload.size !== file.size ||
      upload.size > MAX_FILE_SIZE
    )
      throw new Error("上传文件大小与登记信息不符");
    const target = await diskPath(file.storage_path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await upload.arrayBuffer()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { user, file } = await owned(context);
    if (backend() === "local") {
      const info = await stat(await diskPath(file.storage_path));
      if (info.size !== file.size) throw new Error("文件上传不完整");
    } else {
      const folder = user.id,
        name = file.storage_path.split("/")[1];
      const { data, error } = await (
        await supabase()
      ).storage
        .from("study-files")
        .list(folder, { search: name });
      if (error) throw error;
      const actual = data.find((f) => f.name === name);
      if (!actual || Number(actual.metadata?.size) !== file.size)
        throw new Error("文件上传不完整");
    }
    await save("files", user.id, { ...file, status: "ready" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function GET(request: Request, context: Context) {
  try {
    const { file } = await owned(context);
    if (file.status !== "ready") throw new Error("NOT_FOUND");
    const download = new URL(request.url).searchParams.has("download");
    if (backend() === "supabase") {
      const { data, error } = await (
        await supabase()
      ).storage
        .from("study-files")
        .createSignedUrl(
          file.storage_path,
          60,
          download ? { download: file.original_name } : undefined,
        );
      if (error) throw error;
      return NextResponse.redirect(data.signedUrl, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    const bytes = await readFile(await diskPath(file.storage_path));
    const attachment = download || file.mime_type.includes("word");
    return new Response(bytes, {
      headers: {
        "Content-Type": file.mime_type + "; charset=utf-8",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${attachment ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { user, file } = await owned(context);
    if (backend() === "supabase") {
      const { error } = await (
        await supabase()
      ).storage
        .from("study-files")
        .remove([file.storage_path]);
      if (error) throw error;
    } else {
      await unlink(await diskPath(file.storage_path)).catch(
        (e: NodeJS.ErrnoException) => {
          if (e.code !== "ENOENT") throw e;
        },
      );
    }
    await remove("files", user.id, file.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
