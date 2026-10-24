import test from "node:test";
import assert from "node:assert/strict";
import { buildEastCoastRows, buildSeminarInfo, buildServiceRows, ushersForWeek } from "./week-generation.ts";

test("usher rotation matches the printed 10/18 and 10/25 bulletins", () => {
  assert.deepEqual(ushersForWeek("2026-10-18"), { usherSun: "Jungho Park", usherWed: "John Park" });
  assert.deepEqual(ushersForWeek("2026-10-25"), { usherSun: "Andrew Kim", usherWed: "Jiwook Jang" });
  assert.deepEqual(ushersForWeek("2026-11-01"), { usherSun: "Jose H", usherWed: "John Park" });
  assert.deepEqual(ushersForWeek("2026-11-08"), { usherSun: "Jungho Park", usherWed: "Jiwook Jang" });
  assert.equal(ushersForWeek("2026-10-11").usherSun, "Jose H");
});

test("service rows keep lunch duty and child care for matching dates", () => {
  const rows = buildServiceRows("2026-10-18", [
    { date: "10/25", usherSun: "x", lunchDuty: "A", childCare: "B", usherWed: "y" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, "10/18");
  assert.equal(rows[0].lunchDuty, "");
  assert.equal(rows[1].date, "10/25");
  assert.equal(rows[1].lunchDuty, "A");
  assert.equal(rows[1].usherSun, "Andrew Kim");
});

test("east coast rows use one Monday-Sunday range for the nearest week", () => {
  const entries = [
    { date: "2026-10-25", church: "Orlando", speaker: "p.Oh", language: "Korean" },
    { date: "2026-10-18", church: "Southern Virginia", speaker: "p.Cho", speakerKo: "조정훈p", language: "Korean" },
    { date: "2026-10-18", church: "Washington DC", speaker: "p.Woo", speakerKo: "우성준p", language: "Korean" },
  ];
  const rows = buildEastCoastRows(entries, "2026-10-18");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.date === "10/19-25"));
  assert.deepEqual(rows.map((r) => r.church), ["S.Virginia", "Washington"]);
  assert.deepEqual(buildEastCoastRows(entries, "2026-12-06"), []);
});

test("seminar info follows the next grand bible seminar", () => {
  const info = buildSeminarInfo(
    [{ type: "grand-bible-seminar", startDate: "2026-10-19", endDate: "2026-10-23", pastor: "Chongkyung Park" }],
    "2026-10-18",
  );
  assert.deepEqual(info, {
    title: "October Bible Seminar",
    date: "October 19th(MON) - 23rd(FRI)",
    speaker: "Pastor Chongkyung Park",
  });
  assert.equal(buildSeminarInfo([], "2026-10-18"), null);
});

test("east coast rows print full speaker names and a same-month range", () => {
  const rows = buildEastCoastRows([
    { date: "2026-10-18", church: "Southern Virginia", speaker: "p.Cho", speakerKo: "조정훈p", language: "Korean" },
    { date: "2026-10-18", church: "Washington DC", speaker: "p.Woo", speakerKo: "우성준p", language: "Korean" },
  ], "2026-10-18");
  assert.deepEqual(rows.map((r) => [r.date, r.church, r.speaker]), [
    ["10/19-25", "S.Virginia", "P.Joseph Cho"],
    ["10/19-25", "Washington", "P.Sungjun Woo"],
  ]);
  // A week that crosses a month keeps both months.
  const cross = buildEastCoastRows([{ date: "2026-10-25", church: "Orlando", speaker: "p.Oh", language: "Korean" }], "2026-10-25");
  assert.equal(cross[0].date, "10/26-11/1");
});

test("seminar info also recognises a hand-added Bible Seminar event", () => {
  const info = buildSeminarInfo(
    [{ type: "other", label: "October Bible Seminar", startDate: "2026-10-19", endDate: "2026-10-23" }],
    "2026-10-18",
  );
  assert.equal(info?.date, "October 19th(MON) - 23rd(FRI)");
  assert.equal(buildSeminarInfo([{ type: "other", label: "Special Christian Life Bible Seminar", startDate: "2026-10-19", endDate: "2026-10-23" }], "2026-10-18"), null);
});
