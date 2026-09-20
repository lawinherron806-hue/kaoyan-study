import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_BASE_URL;
test(
  "V1 integration: auth, upload, ownership, persistence, tasks, logout",
  { skip: !base },
  async () => {
    const origin = base!;
    const password = randomUUID() + "Qa8";
    function client() {
      let cookie = "";
      return {
        async req(path: string, method = "GET", body?: unknown) {
          const headers: Record<string, string> = { Origin: origin };
          if (cookie) headers.Cookie = cookie;
          if (body && !(body instanceof FormData))
            headers["Content-Type"] = "application/json";
          const res = await fetch(origin + path, {
            method,
            headers,
            body:
              body instanceof FormData
                ? body
                : body
                  ? JSON.stringify(body)
                  : undefined,
            redirect: "manual",
          });
          const set = res.headers.getSetCookie();
          if (set.length) cookie = set.map((s) => s.split(";")[0]).join("; ");
          return res;
        },
      };
    }
    const a = client(),
      b = client(),
      anon = client();
    const emailA = `qa-${randomUUID()}@study.invalid`,
      emailB = `qa-${randomUUID()}@study.invalid`;
    assert.equal((await anon.req("/api/state")).status, 401);
    for (const [c, email] of [
      [a, emailA],
      [b, emailB],
    ] as const)
      assert.equal(
        (
          await c.req("/api/auth", "POST", {
            email,
            password,
            action: "register",
          })
        ).status,
        200,
      );
    let state = await (await a.req("/api/state")).json();
    assert.equal(state.subjects.length, 4);
    assert.equal(state.files.length, 0);
    assert.equal(state.records.length, 0);
    const subject_id = state.subjects[0].id,
      chapter_id = state.chapters.find(
        (c: { subject_id: string }) => c.subject_id === subject_id,
      ).id,
      category_id = state.categories.find(
        (c: { kind: string }) => c.kind === "note",
      ).id;
    const payload = {
      title: "QA 极限学习笔记",
      original_name: "qa-notes.md",
      size: Buffer.byteLength("# 极限\n等价无穷小"),
      subject_id,
      chapter_id,
      category_id,
      tags: ["等价无穷小"],
    };
    assert.equal(
      (await b.req("/api/files", "POST", payload)).status,
      400,
      "cross-owner foreign reference must fail",
    );
    assert.equal(
      (
        await a.req("/api/files", "POST", {
          ...payload,
          original_name: "attack.html",
        })
      ).status,
      400,
    );
    const created = await (await a.req("/api/files", "POST", payload)).json();
    assert.ok(created.id);
    assert.equal((await b.req(`/api/files/${created.id}`)).status, 404);
    assert.equal(
      (await b.req(`/api/files/${created.id}`, "DELETE")).status,
      404,
    );
    assert.equal((await anon.req(`/api/files/${created.id}`)).status, 401);
    assert.equal(
      (await a.req(`/api/files/${created.id}`, "POST")).status,
      400,
      "cannot finalize absent upload",
    );
    const form = new FormData();
    form.set(
      "file",
      new File(["# 极限\n等价无穷小"], "qa-notes.md", {
        type: "text/markdown",
      }),
    );
    assert.equal(
      (await a.req(`/api/files/${created.id}`, "PUT", form)).status,
      200,
    );
    assert.equal((await a.req(`/api/files/${created.id}`, "POST")).status, 200);
    assert.equal(
      await (await a.req(`/api/files/${created.id}`)).text(),
      "# 极限\n等价无穷小",
    );
    state = await (await a.req("/api/state")).json();
    assert.equal(state.files.length, 1);
    assert.equal((await (await b.req("/api/state")).json()).files.length, 0);
    assert.equal(
      (
        await a.req("/api/tasks", "POST", {
          title: "QA 660题",
          subject_id,
          date: "2026-09-19",
          minutes: 35,
          status: "done",
        })
      ).status,
      200,
    );
    state = await (await a.req("/api/state")).json();
    assert.equal(state.records.length, 1);
    assert.equal(state.records[0].minutes, 35);
    const task = state.tasks[0];
    assert.equal((await a.req("/api/tasks", "POST", task)).status, 200);
    state = await (await a.req("/api/state")).json();
    assert.equal(state.records.length, 1, "completion is idempotent");
    assert.equal((await b.req("/api/tasks", "POST", task)).status, 400);
    assert.equal(
      (await a.req("/api/tasks", "POST", { ...task, status: "todo" })).status,
      200,
    );
    assert.equal((await (await a.req("/api/state")).json()).records.length, 0);
    const csrf = await fetch(origin + "/api/profile", {
      method: "POST",
      headers: {
        Origin: "https://evil.invalid",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(csrf.status, 403);
    assert.equal(
      (await a.req("/api/auth", "POST", { action: "logout" })).status,
      200,
    );
    assert.equal((await a.req("/api/state")).status, 401);
    assert.equal(
      (
        await a.req("/api/auth", "POST", {
          action: "login",
          email: emailA,
          password: "incorrect-8",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await a.req("/api/auth", "POST", {
          action: "login",
          email: emailA,
          password,
        })
      ).status,
      200,
    );
    assert.equal(
      (await (await a.req("/api/state")).json()).files.length,
      1,
      "survives logout and re-login",
    );
    assert.equal(
      (await a.req(`/api/files/${created.id}`, "DELETE")).status,
      200,
    );
    assert.equal((await a.req(`/api/files/${created.id}`)).status, 404);
  },
);
