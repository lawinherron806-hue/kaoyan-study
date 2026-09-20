import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFile, MAX_FILE_SIZE } from "../src/lib/config";
import { dayOffset, streak, chinaDay } from "../src/lib/dates";
test("reject executable/empty/oversize files and accept requested formats", () => {
  for (const ext of ["pdf", "doc", "docx", "md", "txt", "jpg", "png", "webp"])
    assert.ok(validateFile("学习." + ext, 20).mime);
  assert.throws(() => validateFile("attack.html", 100));
  assert.throws(() => validateFile("attack.svg", 100));
  assert.throws(() => validateFile("notes.pdf", 0));
  assert.throws(() => validateFile("notes.pdf", MAX_FILE_SIZE + 1));
});
test("streak counts distinct completed days, handles yesterday and month boundary", () => {
  assert.equal(chinaDay("2026-09-19T16:01:00Z"), "2026-09-20");
  assert.equal(dayOffset("2028-03-01", -1), "2028-02-29");
  assert.equal(
    streak(["2026-09-19", "2026-09-19", "2026-09-18"], "2026-09-19"),
    2,
  );
  assert.equal(streak(["2026-09-18", "2026-09-17"], "2026-09-19"), 2);
  assert.equal(streak(["2026-09-17"], "2026-09-19"), 0);
});
