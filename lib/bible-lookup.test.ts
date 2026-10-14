import test from "node:test";
import assert from "node:assert/strict";
import { convertScrollmapper, normalizeVerseText, ruPsalmRef } from "./bible-lookup.ts";

test("convertScrollmapper builds 0-indexed chapters/verses", () => {
  const bible = convertScrollmapper({
    books: [{ chapters: [{ verses: [{ verse: 1, text: "a" }, { verse: 2, text: "b" }] }, { verses: [{ verse: 1, text: "c" }] }] }],
  });
  assert.equal(bible[0].chapters[0][1], "b");
  assert.equal(bible[0].chapters[1][0], "c");
});

test("convertScrollmapper picks the canonical 66 books out of a file with apocrypha", () => {
  const book = (name: string, text: string) => ({ name, chapters: [{ verses: [{ verse: 1, text }] }] });
  const names = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","I Samuel","II Samuel","I Kings","II Kings","I Chronicles","II Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","I Corinthians","II Corinthians","Galatians","Ephesians","Philippians","Colossians","I Thessalonians","II Thessalonians","I Timothy","II Timothy","Titus","Philemon","Hebrews","James","I Peter","II Peter","I John","II John","III John","Jude","Revelation of John"];
  // Apocrypha wedged in before Psalms, as in RusSynodal.
  const src = { books: [...names.slice(0, 18).map((n) => book(n, n)), book("Tobit", "tobit"), book("Judith", "judith"), ...names.slice(18).map((n) => book(n, n))] };
  const bible = convertScrollmapper(src);
  assert.equal(bible.length, 66);
  assert.equal(bible[18].chapters[0][0], "Psalms");
  assert.equal(bible[65].chapters[0][0], "Revelation of John");
  assert.equal(bible[42].chapters[0][0], "John");
});

test("ruPsalmRef maps Hebrew psalm numbering to Synodal (Septuagint) numbering", () => {
  assert.deepEqual(ruPsalmRef(23, 1), [22, 1]);
  assert.deepEqual(ruPsalmRef(118, 17), [117, 17]);
  assert.deepEqual(ruPsalmRef(119, 9), [118, 9]);
  assert.deepEqual(ruPsalmRef(10, 1), [9, 22]);
  assert.deepEqual(ruPsalmRef(116, 12), [115, 3]);
  assert.deepEqual(ruPsalmRef(3, 4), [3, 4]);
  assert.deepEqual(ruPsalmRef(150, 1), [150, 1]);
});

test("zh verses are de-spaced and converted to Simplified", async () => {
  assert.equal(await normalizeVerseText("zh", "我必不 致死，仍要 存活，並要傳揚 耶和華 的作為。"), "我必不致死，仍要存活，并要传扬耶和华的作为。");
  assert.equal(await normalizeVerseText("ko", "내가 죽지 않고"), "내가 죽지 않고");
});
