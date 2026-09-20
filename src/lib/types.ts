export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};
export type Chapter = {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  created_at: string;
};
export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: "note" | "mistake" | "material";
  created_at: string;
};
export type StudyFile = {
  id: string;
  user_id: string;
  title: string;
  subject_id: string;
  chapter_id: string | null;
  category_id: string;
  tags: string[];
  original_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  status: "pending" | "ready";
  created_at: string;
};
export type Task = {
  id: string;
  user_id: string;
  title: string;
  subject_id: string | null;
  date: string;
  minutes: number;
  status: "todo" | "doing" | "done";
  created_at: string;
};
export type StudyRecord = {
  id: string;
  user_id: string;
  task_id: string | null;
  subject_id: string | null;
  title: string;
  minutes: number;
  date: string;
  created_at: string;
};
export type Profile = {
  id: string;
  user_id: string;
  name: string;
  exam_date: string | null;
  created_at: string;
};
export type KnowledgePoint = {
  id: string;
  user_id: string;
  name: string;
  subject_id: string;
  mastery: number;
  next_review_at: string | null;
  created_at: string;
};
export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
};
export type Mistake = {
  id: string;
  user_id: string;
  question_text: string;
  mastered: boolean;
  next_review_at: string | null;
  created_at: string;
};
export type PracticeAnswer = {
  id: string;
  user_id: string;
  is_correct: boolean;
  created_at: string;
};
export type Tables = {
  subjects: Subject;
  chapters: Chapter;
  categories: Category;
  files: StudyFile;
  study_tasks: Task;
  study_records: StudyRecord;
  users: Profile;
  knowledge_points: KnowledgePoint;
  notes: Note;
  mistakes: Mistake;
  practice_answers: PracticeAnswer;
};
export type User = { id: string; email: string };
export type Snapshot = {
  user: User;
  backend: "local" | "supabase";
  profile: Profile;
  subjects: Subject[];
  chapters: Chapter[];
  categories: Category[];
  files: StudyFile[];
  tasks: Task[];
  records: StudyRecord[];
  knowledge: KnowledgePoint[];
  notes: Note[];
  mistakes: Mistake[];
  answers: PracticeAnswer[];
};
