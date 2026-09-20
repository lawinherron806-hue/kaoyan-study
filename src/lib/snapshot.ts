import { requireUser } from "./auth";
import { bootstrap } from "./bootstrap";
import { list } from "./store";
import { backend } from "./config";
import type { Snapshot } from "./types";
export async function snapshot(): Promise<Snapshot> {
  const user = await requireUser();
  await bootstrap(user);
  const [
    profiles,
    subjects,
    chapters,
    categories,
    files,
    tasks,
    records,
    knowledge,
    notes,
    mistakes,
    answers,
  ] = await Promise.all([
    list("users", user.id),
    list("subjects", user.id),
    list("chapters", user.id),
    list("categories", user.id),
    list("files", user.id),
    list("study_tasks", user.id),
    list("study_records", user.id),
    list("knowledge_points", user.id),
    list("notes", user.id),
    list("mistakes", user.id),
    list("practice_answers", user.id),
  ]);
  return {
    user,
    backend: backend(),
    profile: profiles[0],
    subjects,
    chapters,
    categories,
    files: files
      .filter((f) => f.status === "ready")
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    tasks,
    records,
    knowledge,
    notes,
    mistakes,
    answers,
  };
}
