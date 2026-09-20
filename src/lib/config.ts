export function backend(): "local" | "supabase" {
  const value =
    process.env.DATA_BACKEND ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local");
  if (value !== "local" && value !== "supabase")
    throw new Error("DATA_BACKEND 必须是 local 或 supabase");
  if (value === "local" && process.env.VERCEL)
    throw new Error(
      "Vercel 必须使用 Supabase 持久化，请配置 DATA_BACKEND=supabase",
    );
  return value;
}
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
  txt: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
export function validateFile(name: string, size: number) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (!FILE_TYPES[ext])
    throw new Error("支持 PDF、Word、Markdown、TXT、JPG、PNG 和 WEBP");
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_FILE_SIZE)
    throw new Error("文件须大于 0 且不超过 25 MB");
  return { ext, mime: FILE_TYPES[ext] };
}
