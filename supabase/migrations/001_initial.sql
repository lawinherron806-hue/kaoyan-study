-- 知序 V1 + V2–V4 foundations. Run once in a new Supabase project's SQL editor.
begin;
create extension if not exists pgcrypto;

create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null default '考研同学', exam_date date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(id=user_id), unique(id,user_id)
);
create table public.subjects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, color text not null default 'green',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id), unique(user_id,name)
);
create table public.chapters (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null, parent_id uuid, name text not null, sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id) on delete cascade,
 foreign key(parent_id,user_id) references public.chapters(id,user_id), check(parent_id is null or parent_id<>id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, kind text not null check(kind in ('note','mistake','material')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(user_id,name)
);
create table public.knowledge_points (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null, chapter_id uuid, parent_id uuid, name text not null, description text not null default '',
 mastery numeric(5,2) not null default 0 check(mastery between 0 and 100), study_count integer not null default 0 check(study_count>=0),
 question_count integer not null default 0 check(question_count>=0), correct_count integer not null default 0 check(correct_count>=0), mistake_count integer not null default 0 check(mistake_count>=0),
 last_studied_at timestamptz, last_reviewed_at timestamptz, next_review_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id), foreign key(chapter_id,user_id) references public.chapters(id,user_id),
 foreign key(parent_id,user_id) references public.knowledge_points(id,user_id), check(parent_id is null or parent_id<>id), check(correct_count<=question_count)
);
create table public.files (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null, chapter_id uuid, category_id uuid not null, title text not null, original_name text not null,
 mime_type text not null, size bigint not null check(size>0 and size<=26214400), storage_path text not null unique,
 tags text[] not null default '{}', status text not null default 'pending' check(status in ('pending','ready')),
 source text not null default 'upload' check(source in ('upload','text','connector')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id), foreign key(chapter_id,user_id) references public.chapters(id,user_id),
 foreign key(category_id,user_id) references public.categories(id,user_id), check(split_part(storage_path,'/',1)=user_id::text)
);
create table public.notes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 file_id uuid, subject_id uuid not null, chapter_id uuid, title text not null, content text not null default '',
 priority text not null default 'understand' check(priority in ('essential','understand','overview')),
 source text not null default 'manual' check(source in ('manual','ai','import')), revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(file_id,user_id) references public.files(id,user_id) on delete set null (file_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id), foreign key(chapter_id,user_id) references public.chapters(id,user_id)
);
create table public.questions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null, chapter_id uuid, file_id uuid, question_text text not null, image_path text,
 question_type text not null check(question_type in ('single','multiple','text','calculation')), options jsonb,
 correct_answer jsonb not null, solution text not null default '', better_solution text,
 difficulty text not null check(difficulty in ('easy','medium','hard')), source text not null default 'manual',
 verified boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id), foreign key(chapter_id,user_id) references public.chapters(id,user_id),
 foreign key(file_id,user_id) references public.files(id,user_id) on delete set null (file_id)
);
create table public.mistakes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid, file_id uuid, subject_id uuid not null, chapter_id uuid, question_text text not null, image_path text,
 my_answer jsonb, correct_answer jsonb, solution text, better_solution text,
 reason text not null default '其他' check(reason in ('概念不清','方法不会','计算错误','审题错误','粗心','公式记错','其他')),
 difficulty text not null default 'medium' check(difficulty in ('easy','medium','hard')), source text not null default 'manual',
 retry_count integer not null default 0 check(retry_count>=0), retry_correct_count integer not null default 0 check(retry_correct_count>=0), mastered boolean not null default false,
 last_reviewed_at timestamptz, next_review_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(user_id,question_id),
 foreign key(question_id,user_id) references public.questions(id,user_id),foreign key(subject_id,user_id) references public.subjects(id,user_id),
 foreign key(chapter_id,user_id) references public.chapters(id,user_id), foreign key(file_id,user_id) references public.files(id,user_id) on delete set null (file_id),
 check(retry_correct_count<=retry_count)
);
create table public.practice_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid, source text not null check(source in ('chapter','mistakes','weak','mixed','review')),
 status text not null default 'in_progress' check(status in ('in_progress','submitted','abandoned')),
 difficulty text not null default 'mixed', requested_count integer not null check(requested_count between 1 and 200),
 correct_count integer not null default 0, answered_count integer not null default 0, started_at timestamptz not null default now(), submitted_at timestamptz,
 generation_context jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id)
);
create table public.practice_answers (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, question_id uuid not null, answer jsonb, is_correct boolean, bookmarked boolean not null default false,
 skipped boolean not null default false, time_seconds integer not null default 0 check(time_seconds>=0), position integer not null, feedback text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(session_id,question_id),
 foreign key(session_id,user_id) references public.practice_sessions(id,user_id) on delete cascade,
 foreign key(question_id,user_id) references public.questions(id,user_id)
);
create table public.study_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid, title text not null, date date not null, minutes integer not null check(minutes between 1 and 1440),
 status text not null default 'todo' check(status in ('todo','doing','done')), source text not null default 'manual',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id)
);
create table public.study_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid, subject_id uuid, chapter_id uuid, knowledge_point_id uuid, title text not null,
 minutes integer not null check(minutes between 1 and 1440), date date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(user_id,task_id),
 foreign key(task_id,user_id) references public.study_tasks(id,user_id) on delete cascade,
 foreign key(subject_id,user_id) references public.subjects(id,user_id),foreign key(chapter_id,user_id) references public.chapters(id,user_id),
 foreign key(knowledge_point_id,user_id) references public.knowledge_points(id,user_id)
);
create table public.review_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 knowledge_point_id uuid, mistake_id uuid, session_id uuid, scheduled_at timestamptz not null, reviewed_at timestamptz,
 grade integer check(grade between 0 and 5), interval_days integer not null default 1 check(interval_days>=0), ease_factor numeric not null default 2.5,
 status text not null default 'due' check(status in ('due','done','deferred')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(knowledge_point_id,user_id) references public.knowledge_points(id,user_id),foreign key(mistake_id,user_id) references public.mistakes(id,user_id),
 foreign key(session_id,user_id) references public.practice_sessions(id,user_id),check(num_nonnulls(knowledge_point_id,mistake_id)=1)
);
create table public.ai_analysis (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 file_id uuid, kind text not null check(kind in ('classify','notes','questions','plan')), provider text, model text,
 status text not null default 'queued' check(status in ('queued','running','succeeded','failed','cancelled')),
 input_context jsonb not null default '{}', output jsonb, error text, prompt_version text, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(file_id,user_id) references public.files(id,user_id) on delete set null (file_id)
);
create table public.tags (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(user_id,name)
);
create table public.question_knowledge_points (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null, knowledge_point_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(question_id,knowledge_point_id),
 foreign key(question_id,user_id) references public.questions(id,user_id) on delete cascade,
 foreign key(knowledge_point_id,user_id) references public.knowledge_points(id,user_id) on delete cascade
);
create table public.mistake_knowledge_points (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 mistake_id uuid not null, knowledge_point_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(mistake_id,knowledge_point_id),
 foreign key(mistake_id,user_id) references public.mistakes(id,user_id) on delete cascade,
 foreign key(knowledge_point_id,user_id) references public.knowledge_points(id,user_id) on delete cascade
);
create table public.note_knowledge_points (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 note_id uuid not null, knowledge_point_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(note_id,knowledge_point_id),
 foreign key(note_id,user_id) references public.notes(id,user_id) on delete cascade,
 foreign key(knowledge_point_id,user_id) references public.knowledge_points(id,user_id) on delete cascade
);
create table public.file_tags (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, file_id uuid not null, tag_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),unique(file_id,tag_id),
 foreign key(file_id,user_id) references public.files(id,user_id) on delete cascade,
 foreign key(tag_id,user_id) references public.tags(id,user_id) on delete cascade
);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
do $$declare t text;begin
 foreach t in array array['users','subjects','chapters','categories','knowledge_points','files','notes','questions','mistakes','practice_sessions','practice_answers','study_tasks','study_records','review_records','ai_analysis','tags','question_knowledge_points','mistake_knowledge_points','note_knowledge_points','file_tags'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create index %I on public.%I(user_id,created_at desc)',t||'_owner_created',t);
 execute format('create trigger updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end;$$;
create index knowledge_due on public.knowledge_points(user_id,next_review_at);
create index mistakes_due on public.mistakes(user_id,next_review_at) where not mastered;
create index files_subject on public.files(user_id,subject_id,chapter_id);
create index files_category on public.files(user_id,category_id,status);
create index files_tags on public.files using gin(tags);
create index tasks_date on public.study_tasks(user_id,date,status);
create index records_date on public.study_records(user_id,date);
create index review_due on public.review_records(user_id,scheduled_at) where status='due';
create index answers_session on public.practice_answers(user_id,session_id);
create index file_text_search on public.files using gin(to_tsvector('simple',title||' '||original_name));
create index note_text_search on public.notes using gin(to_tsvector('simple',title||' '||content));

-- Saving a task + its study record is one atomic, idempotent transaction.
create function public.save_study_task(payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); tid uuid:=(payload->>'id')::uuid;begin
 if uid is null or uid<>(payload->>'user_id')::uuid then raise exception 'Not authorized';end if;
 insert into public.study_tasks(id,user_id,subject_id,title,date,minutes,status,created_at)
 values(tid,uid,(payload->>'subject_id')::uuid,payload->>'title',(payload->>'date')::date,(payload->>'minutes')::integer,payload->>'status',(payload->>'created_at')::timestamptz)
 on conflict(id) do update set subject_id=excluded.subject_id,title=excluded.title,date=excluded.date,minutes=excluded.minutes,status=excluded.status;
 if payload->>'status'='done' then
 insert into public.study_records(id,user_id,task_id,subject_id,title,minutes,date)
 values(tid,uid,tid,(payload->>'subject_id')::uuid,payload->>'title',(payload->>'minutes')::integer,(now() at time zone 'Asia/Shanghai')::date)
 on conflict(id) do update set subject_id=excluded.subject_id,title=excluded.title,minutes=excluded.minutes;
 else delete from public.study_records where task_id=tid and user_id=uid;end if;
end;$$;
revoke all on function public.save_study_task(jsonb) from public,anon;
grant execute on function public.save_study_task(jsonb) to authenticated;

-- Private objects; browser uploads directly to Storage, bypassing Vercel's request-body limit.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('study-files','study-files',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/markdown','text/plain','image/jpeg','image/png','image/webp','application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy study_objects_read on storage.objects for select to authenticated using(bucket_id='study-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy study_objects_insert on storage.objects for insert to authenticated with check(bucket_id='study-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy study_objects_update on storage.objects for update to authenticated using(bucket_id='study-files' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='study-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy study_objects_delete on storage.objects for delete to authenticated using(bucket_id='study-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
