import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { readMonthSheets, shortenLabel } from "./month-sheet.ts";
import { monthCalendarPatch } from "./month-calendar-patch.ts";

// Builds a minimal .xlsx from { "B5": 46296, "B6": "- Item" } cell maps.
async function workbook(sheets: Record<string, { cells: Record<string, string | number>; merges?: string[] }>) {
  const zip = new JSZip();
  const strings: string[] = [];
  const names = Object.keys(sheets);
  zip.file("xl/workbook.xml", `<workbook xmlns:r="r"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<Relationships>${names.map((_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`);
  names.forEach((n, i) => {
    const { cells, merges = [] } = sheets[n];
    const rows = new Map<number, string[]>();
    for (const [ref, value] of Object.entries(cells)) {
      const row = Number(/\d+/.exec(ref)![0]);
      const xml = typeof value === "number"
        ? `<c r="${ref}"><v>${value}</v></c>`
        : `<c r="${ref}" t="s"><v>${strings.push(value) - 1}</v></c>`;
      rows.set(row, [...(rows.get(row) ?? []), xml]);
    }
    const body = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([r, cs]) => `<row r="${r}">${cs.join("")}</row>`).join("");
    const mergeXml = merges.length ? `<mergeCells>${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, `<worksheet><sheetData>${body}</sheetData>${mergeXml}</worksheet>`);
  });
  zip.file("xl/sharedStrings.xml", `<sst>${strings.map((s) => `<si><t xml:space="preserve">${s.replace(/&/g, "&amp;")}</t></si>`).join("")}</sst>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

const HEADER = { B4: "LORD'S DAY", C4: "MON", D4: "TUE", E4: "WED", F4: "THU", G4: "FRI", H4: "SAT" };

// October 2026: the 1st is a Thursday, so the first row starts on Sep 27.
const OCT_1 = 46296;
const october = {
  cells: {
    B3: OCT_1, ...HEADER,
    B5: 27, C5: 28, D5: 29, E5: 30, F5: OCT_1, G5: 2, H5: 3,
    B6: "- Lord's Day Sermon (11:00a)", H6: "- Translator Meeting (5:00p)",
    D11: "Special Christian Life Bible Seminar",
    B12: 46299, C12: 5, D12: 6, E12: 7, F12: 8, G12: 9, H12: 10,
    B13: "- Lord's Day Sermon (11:00a)", E13: "- Wed Sermon (8:00p)", H13: "- Translator Meeting (5:00p)",
    B14: "- Altogether Fel. (2:00p)",
    B19: 11, C19: 12, D19: 13, E19: 14, F19: 15, G19: 16, H19: 17,
    B20: "- Lord's Day Sermon (11:00a)", H20: "- Translator Meeting (5:00p)",
    E24: "DC Dedication Ceremony", C25: "US Pastor Retreat", H25: "EC Online Teacher Retreat", C32: "October Bible Seminar",
    B26: 18, C26: 19, D26: 20, E26: 21, F26: 22, G26: 23, H26: 24,
    B27: "- Lord's Day Sermon (11:00a)", H27: "- Translator Meeting (5:00p)",
    B28: "- New Believers (2:00p)",
    B33: 25, C33: 26, D33: 27, E33: 28, F33: 29, G33: 30, H33: 31,
    B34: "- Lord's Day Sermon (11:00a)", H34: "- Translator Meeting (5:00p)",
    B35: "- Region 3 (2:00p)\n- Fellowship by Lang (2:00p)",
  } as Record<string, string | number>,
  merges: ["B3:F3", "D11:F11", "C25:F25", "C32:G32"],
};

test("shortenLabel maps the sheet's wording to the bulletin's short labels", () => {
  assert.deepEqual(shortenLabel("- Lord's Day Sermon (11:00a)"), { label: "Sermon", known: true });
  assert.deepEqual(shortenLabel("- Mother Officer Mtg(4:00p)"), { label: "Mothers Officers'", known: true });
  assert.deepEqual(shortenLabel("- Fel. by Language (2:00p)"), { label: "Fel. by Lang", known: true });
  assert.deepEqual(shortenLabel("- SM Sermon(8:00a)"), { label: "SM Sermon", known: false });
});

test("reads the month, day notes and recurring meetings", async () => {
  const [oct] = await readMonthSheets(await workbook({ Feb: october }));
  assert.equal(oct.calendarMonth, "10/2026");
  assert.deepEqual(oct.calendarEvents["10/4"], ["Sermon", "Altogether"]);
  assert.deepEqual(oct.calendarEvents["10/7"], ["Wed sermon"]);
  assert.deepEqual(oct.calendarEvents["10/25"], ["Sermon", "Region 3", "Fel. by Lang"]);
  assert.deepEqual(oct.calendarEvents["9/27"], ["Sermon"]);
  // Sermon is on all four October Sundays and the Translators' meeting on all five Saturdays;
  // the Wednesday sermon is missing on some Wednesdays, so it stays a day note only.
  assert.deepEqual(oct.weeklyRecurring, [
    { dayOfWeek: 0, label: "Sermon" },
    { dayOfWeek: 6, label: "Translators'" },
  ]);
});

test("banner width comes from the merged cells, in the week they sit in", async () => {
  const [oct] = await readMonthSheets(await workbook({ Feb: october }));
  assert.deepEqual(oct.calendarBanners, [
    { label: "Special Christian Life Bible Seminar", startDate: "9/29", endDate: "10/1" },
    { label: "DC Dedication Ceremony", startDate: "10/14", endDate: "10/14" },
    { label: "US Pastor Retreat", startDate: "10/12", endDate: "10/15" },
    { label: "October Bible Seminar", startDate: "10/19", endDate: "10/23" },
  ]);
  assert.equal(oct.skipped.length, 1);
  assert.match(oct.skipped[0], /Online Teacher Retreat/);
});

test("dates written in a banner override its width; place and speaker are tidied", async () => {
  const march = {
    cells: {
      B3: 45717, ...HEADER,
      H5: 45717,
      B12: 45718, C12: 45719, D12: 45720, E12: 45721, F12: 45722, G12: 45723, H12: 45724,
      B19: 45725, B26: 45732, B33: 45739,
      G17: "East Coast YA Officer’s Retreat(3/7~9):KRC",
      B40: 45746, C40: 45747, D40: "MEMO:",
      C44: "Bible Seminar_\nP.Samuel Park(3/31~4/6)",
    } as Record<string, string | number>,
    merges: ["G17:H18", "D40:H40", "C44:C46"],
  };
  const [mar] = await readMonthSheets(await workbook({ Mar: march }));
  assert.equal(mar.calendarMonth, "03/2025");
  assert.deepEqual(mar.calendarBanners, [
    { label: "East Coast YA Officer’s Retreat", startDate: "3/7", endDate: "3/9" },
    { label: "Bible Seminar (p.Park)", startDate: "3/31", endDate: "4/6" },
  ]);
});

test("a sheet that isn't a month calendar is ignored; a mismatched week is flagged", async () => {
  const other = { cells: { A1: "Budget", B2: 100 } as Record<string, string | number> };
  const shifted = { cells: { B3: OCT_1, ...HEADER, B5: 20, C5: 21 } as Record<string, string | number> };
  const result = await readMonthSheets(await workbook({ Budget: other, Shifted: shifted }));
  assert.equal(result.length, 1);
  assert.equal(result[0].sheetName, "Shifted");
  assert.match(result[0].warnings[0], /Week 1/);
});

test("week dates come from the sheet's own date cells when the title isn't the 1st", async () => {
  // Title is Nov 2, 2025 (a Sunday), and the first row starts there.
  const nov = {
    cells: {
      B3: 45963, ...HEADER,
      B5: 45963, C5: 45964, D5: 45965, E5: 45966, F5: 45967, G5: 45968, H5: 45969,
      B6: "- Lord's Day Sermon (11:00a)",
      B12: 45970, C12: 10, D12: 11, E12: 12, F12: 13, G12: 14, H12: 15,
      B13: "- Lord's Day Sermon (11:00a)",
    } as Record<string, string | number>,
  };
  const [result] = await readMonthSheets(await workbook({ Nov: nov }));
  assert.equal(result.calendarMonth, "11/2025");
  assert.deepEqual(Object.keys(result.calendarEvents), ["11/2", "11/9"]);
  assert.deepEqual(result.warnings, []);
});

test("any Bible seminar banner fills Bible Seminar Info — the next one on or after the bulletin date", async () => {
  const [oct] = await readMonthSheets(await workbook({ Feb: october }));
  assert.deepEqual(oct.seminars.map((s) => [s.label, s.startDate, s.endDate]), [
    ["Special Christian Life Bible Seminar", "2026-09-29", "2026-10-01"],
    ["October Bible Seminar", "2026-10-19", "2026-10-23"],
  ]);

  const ctx = { bulletinDate: "10/04/2026", pastor: "Chang Kyung Park", seminarInfo: { title: "", date: "", speaker: "", hidden: true } };
  const patch = monthCalendarPatch(oct, ctx);
  assert.deepEqual(patch.seminarInfo, {
    title: "October Bible Seminar",
    date: "October 19th(MON) - 23rd(FRI)",
    speaker: "Pastor Chang Kyung Park",
    hidden: false,
  });
  assert.equal(patch.calendarMonth, "10/2026");

  // Before the special seminar ends, that one is next.
  assert.equal(monthCalendarPatch(oct, { ...ctx, bulletinDate: "09/27/2026" }).seminarInfo?.title, "September Bible Seminar");
  // After the last seminar: the section is left alone.
  assert.equal(monthCalendarPatch(oct, { ...ctx, bulletinDate: "10/25/2026" }).seminarInfo, undefined);
});

test("a named speaker on the banner is used for the seminar", async () => {
  const sheet = {
    cells: { B3: 45717, ...HEADER, H5: 45717, B40: 45746, C44: "Bible Seminar_\nP.Samuel Park(3/31~4/6)" } as Record<string, string | number>,
    merges: ["C44:C46"],
  };
  const [mar] = await readMonthSheets(await workbook({ Mar: sheet }));
  const info = monthCalendarPatch(mar, { bulletinDate: "03/30/2025", pastor: "Someone Else" }).seminarInfo;
  assert.equal(info?.speaker, "Pastor Samuel Park");
  assert.equal(info?.date, "March 31st(MON) - April 6th(SUN)");
});
