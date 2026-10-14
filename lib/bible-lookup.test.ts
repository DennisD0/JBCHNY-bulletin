import test from "node:test";
import assert from "node:assert/strict";
import { convertScrollmapper } from "./bible-lookup.ts";

test("convertScrollmapper builds 0-indexed chapters/verses", () => {
  const bible = convertScrollmapper({
    books: [{ chapters: [{ verses: [{ verse: 1, text: "a" }, { verse: 2, text: "b" }] }, { verses: [{ verse: 1, text: "c" }] }] }],
  });
  assert.equal(bible[0].chapters[0][1], "b");
  assert.equal(bible[0].chapters[1][0], "c");
});
