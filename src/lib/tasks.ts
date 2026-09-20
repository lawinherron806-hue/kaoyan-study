import type { Task, StudyRecord } from "./types";
import { backend } from "./config";
import { supabase } from "./supabase";
import { today } from "./dates";
export async function saveTask(task: Task) {
  if (backend() === "supabase") {
    const { error } = await (
      await supabase()
    ).rpc("save_study_task", { payload: task });
    if (error) throw new Error(error.message);
    return;
  }
  const { db } = await import("./local-db");
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const raw = database
      .prepare("SELECT data FROM records WHERE entity=? AND id=? AND user_id=?")
      .get("study_records", task.id, task.user_id) as
      { data: string } | undefined;
    const prior = raw ? (JSON.parse(raw.data) as StudyRecord) : null;
    database
      .prepare(
        "INSERT INTO records(entity,id,user_id,data) VALUES(?,?,?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data WHERE records.user_id=excluded.user_id",
      )
      .run("study_tasks", task.id, task.user_id, JSON.stringify(task));
    if (task.status === "done") {
      const record: StudyRecord = {
        id: task.id,
        user_id: task.user_id,
        task_id: task.id,
        subject_id: task.subject_id,
        title: task.title,
        minutes: task.minutes,
        date: prior?.date || today(),
        created_at: prior?.created_at || new Date().toISOString(),
      };
      database
        .prepare(
          "INSERT INTO records(entity,id,user_id,data) VALUES(?,?,?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data WHERE records.user_id=excluded.user_id",
        )
        .run(
          "study_records",
          record.id,
          record.user_id,
          JSON.stringify(record),
        );
    } else
      database
        .prepare("DELETE FROM records WHERE entity=? AND id=? AND user_id=?")
        .run("study_records", task.id, task.user_id);
    database.exec("COMMIT");
  } catch (e) {
    database.exec("ROLLBACK");
    throw e;
  }
}
