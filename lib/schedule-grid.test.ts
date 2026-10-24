import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEastCoastEntries, formatCell, learnFromGrid, matchPreacher, parseCellInput, parseEventBand, quarterSundays,
  type GridChurch,
} from "./schedule-grid-shared.ts";

test("matchPreacher snaps OCR noise to the known preacher", () => {
  assert.deepEqual(matchPreacher("박종경[").status, "ok");
  const fixed = matchPreacher("박총경[");
  assert.equal(fixed.name, "박종경");
  assert.equal(fixed.status, "corrected");
  assert.equal(matchPreacher("최인우[)").name, "최현우");
  assert.equal(matchPreacher("이재순(?").name, "이재준");
  assert.equal(matchPreacher("[4]").status, "unknown");
  assert.equal(matchPreacher("김지환6").title, "e");
});

test("quarterSundays gives the 13 Sundays of the quarter", () => {
  const q4 = quarterSundays(2026, 4);
  assert.equal(q4.length, 13);
  assert.equal(q4[0], "2026-10-04");
  assert.equal(q4[12], "2026-12-27");
  assert.equal(quarterSundays(2026, 3)[0], "2026-07-05");
});

test("parseCellInput / formatCell round-trip", () => {
  assert.equal(parseCellInput("→", "2026-10-04").status, "same");
  assert.equal(parseCellInput("", "2026-10-04").status, "empty");
  const c = parseCellInput("김지환e", "2026-10-04");
  assert.equal(c.name, "김지환");
  assert.equal(c.title, "e");
  assert.equal(formatCell(c), "김지환e");
  assert.equal(formatCell(parseCellInput("DVD", "2026-10-04")), "DVD");
});

test("parseEventBand keeps East/US-wide/NY events and fixes the year", () => {
  const text = [
    "서 울 강 서 선 교 팀 뉴 욕 교회 방문 (9/28~10/5, 김 재 광 [)",
    "광 주 봉 선 선 교 팀 뉴 저 지 교 회 방문 (9/29~10/2. 배 현 기 6)",
    "미 주 전 도 인 수 련 회 (10/12~16, 워 싱 턴 교회)",
    "통 부 교 사 수 련 회 (10/17, 온라인)",
    "중부 전 도 인 수 련 회 (11/9~11, 휴 스 턴 교회)",
    "통 부 통 계 수련회 (11/26~29, 8",
    "서부 전 도 인 부 부 수 련 회 (12/21~22, 라 스 베 가 스 교회)",
    "구 본 효 ? 가족 한 국 방문 (11/30~12/18)",
  ].join("\n");
  const ev = parseEventBand(text, 4, 2026);
  assert.deepEqual(ev.map((e) => [e.label, e.startDate, e.endDate]), [
    ["Special Christian Life Seminar", "2026-09-28", "2026-10-05"],
    ["US Pastor Retreat", "2026-10-12", "2026-10-16"],
    ["EC Teacher Retreat", "2026-10-17", "2026-10-17"],
    ["EC Winter Retreat", "2026-11-26", "2026-11-29"],
  ]);
  assert.equal(ev[1].location, "Washington DC");
  // Year-end wrap: a Q4 event running into January belongs to the next year.
  const wrap = parseEventBand("동부 동계수련회 (12/28~1/2)", 4, 2026);
  assert.deepEqual([wrap[0].startDate, wrap[0].endDate], ["2026-12-28", "2027-01-02"]);
});

test("buildEastCoastEntries skips arrows, retreats, DVD and non-East churches", () => {
  const cell = (date: string, name: string, status: "ok" | "same" | "retreat", title: "p" | "e" = "p") => ({ date, name, title, status });
  const churches: GridChurch[] = [
    { no: 1, ko: "올랜도", en: "Orlando", region: "East", sundays: [
      cell("2026-10-04", "오동준", "ok"), cell("2026-10-11", "오동준", "same"),
      cell("2026-10-18", "", "retreat"), cell("2026-10-25", "DVD", "ok"),
    ] },
    ...Array.from({ length: 8 }, (_, i): GridChurch => ({ no: i + 2, ko: "x", en: "x", region: "East", sundays: [] })),
    { no: 10, ko: "덴버", en: "Denver", region: "Central", sundays: [cell("2026-10-04", "구본효", "ok")] },
  ];
  const rows = buildEastCoastEntries(churches);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { date: "2026-10-04", church: "Orlando", speakerKo: "오동준p", speaker: "p.Oh", language: "Korean" });
});

test("learned aliases fix a repeated misread; new names join the roster", () => {
  // "앙책이" is too far from any known name to snap automatically.
  assert.equal(matchPreacher("1앙책이[)").status, "unknown");
  const cell = (name: string, raw: string, status: "ok" | "unknown" = "ok") => ({ date: "2026-10-11", name, title: "p" as const, status, raw });
  const churches: GridChurch[] = [
    { no: 11, ko: "콜로라도", en: "Colorado", region: "Central", sundays: [cell("박철오", "1앙책이[)"), cell("박철오", "박철오["), cell("김새이", "김새이[")] },
  ];
  const learned = learnFromGrid(churches, { names: {}, aliases: {} });
  assert.deepEqual(learned.aliases, { 앙책이: "박철오" });   // matching reads and known names are not aliased
  assert.deepEqual(learned.names, { 김새이: "p" });
  const again = matchPreacher("1앙책이[)", { 박철오: "p", ...learned.names } as Record<string, "p" | "e">, learned.aliases);
  assert.deepEqual([again.name, again.status], ["박철오", "ok"]);
  // An unrecognised cell nobody fixed is garbage: it must not become a "known" name.
  const junk = learnFromGrid([{ ...churches[0], sundays: [cell("앙책이", "1앙책이[)", "unknown")] }], { names: {}, aliases: {} });
  assert.deepEqual(junk, { names: {}, aliases: {} });
  // Never alias a string that is itself a real preacher.
  const bad = learnFromGrid([{ ...churches[0], sundays: [cell("김상원", "김승준[")] }], { names: {}, aliases: {} });
  assert.deepEqual(bad.aliases, {});
});

test("only bold (marked) East Coast speakers become seminar rows", () => {
  const cell = (name: string, seminar?: boolean) => ({ date: "2026-10-18", name, title: "p" as const, status: "ok" as const, seminar });
  const row = (no: number, en: string, c?: ReturnType<typeof cell>): GridChurch => ({ no, ko: "x", en, region: "East", sundays: c ? [c] : [] });
  const churches: GridChurch[] = [
    row(1, "Orlando", cell("오동준", false)),
    row(2, "Atlanta"),
    row(3, "Southern Virginia", cell("조정훈", true)),
    row(4, "Washington DC", cell("우성준", true)),
    ...Array.from({ length: 5 }, (_, i) => row(i + 5, "x")),
  ];
  assert.deepEqual(buildEastCoastEntries(churches).map((e) => [e.church, e.speaker]), [
    ["S.Virginia", "P.Joseph Cho"], ["Washington", "P.Sungjun Woo"],
  ]);
  // "*" after a typed name marks it; formatCell round-trips it.
  const c = parseCellInput("우성준p*", "2026-10-18");
  assert.equal(c.seminar, true);
  assert.equal(formatCell(c), "우성준p*");
  assert.equal(parseCellInput("우성준p", "2026-10-18").seminar, false);
});
