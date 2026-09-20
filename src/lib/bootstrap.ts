import { createHash } from "node:crypto";
import { list, save } from "./store";
import type { User } from "./types";
function stableId(uid: string, key: string) {
  const h = createHash("sha256")
    .update(uid + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function bootstrap(user: User) {
  if ((await list("users", user.id)).length) return;
  const created_at = new Date().toISOString(),
    user_id = user.id;
  for (const [name, color, chapters] of [
    ["数学二", "green", ["高等数学", "线性代数"]],
    ["英语二", "orange", ["单词", "长难句", "阅读", "真题精读"]],
    ["信号与系统", "blue", ["信号", "系统", "傅里叶变换", "拉普拉斯变换"]],
    ["其他资料", "purple", ["择校资料", "每日计划", "学习日志"]],
  ] as const) {
    const id = stableId(user.id, name);
    await save("subjects", user.id, { id, user_id, name, color, created_at });
    for (const chapter of chapters)
      await save("chapters", user.id, {
        id: stableId(user.id, name + chapter),
        user_id,
        subject_id: id,
        name: chapter,
        created_at,
      });
  }
  for (const [name, kind] of [
    ["课程笔记", "note"],
    ["课堂笔记", "note"],
    ["错题库", "mistake"],
    ["知识树", "material"],
    ["660题", "material"],
    ["例题", "material"],
    ["教材", "material"],
    ["作业", "material"],
    ["真题", "material"],
    ["学习截图", "material"],
    ["学习日志", "material"],
    ["其他资料", "material"],
  ] as const)
    await save("categories", user.id, {
      id: stableId(user.id, name),
      user_id,
      name,
      kind,
      created_at,
    });
  await save("users", user.id, {
    id: user.id,
    user_id,
    name: "考研同学",
    exam_date: null,
    created_at,
  });
}
