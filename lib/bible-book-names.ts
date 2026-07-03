import type { BulletinLanguage } from "@/lib/bulletin-languages";

type LangCode = Exclude<BulletinLanguage, "en">;

interface BookName { es: string; ko: string; zh: string; ru: string }

// Keyed by lowercase English name or common abbreviation.
// Longer keys must win over shorter ones — we sort by length desc at runtime.
const BOOK_MAP: Record<string, BookName> = {
  // ── Old Testament ──────────────────────────────────────────────────────
  "genesis":        { es:"Gén",   ko:"창",   zh:"创",  ru:"Быт"  },
  "gen":            { es:"Gén",   ko:"창",   zh:"创",  ru:"Быт"  },
  "gn":             { es:"Gén",   ko:"창",   zh:"创",  ru:"Быт"  },

  "exodus":         { es:"Éx",    ko:"출",   zh:"出",  ru:"Исх"  },
  "exo":            { es:"Éx",    ko:"출",   zh:"出",  ru:"Исх"  },
  "ex":             { es:"Éx",    ko:"출",   zh:"出",  ru:"Исх"  },

  "leviticus":      { es:"Lv",    ko:"레",   zh:"利",  ru:"Лев"  },
  "lev":            { es:"Lv",    ko:"레",   zh:"利",  ru:"Лев"  },
  "lv":             { es:"Lv",    ko:"레",   zh:"利",  ru:"Лев"  },

  "numbers":        { es:"Nm",    ko:"민",   zh:"民",  ru:"Чис"  },
  "num":            { es:"Nm",    ko:"민",   zh:"民",  ru:"Чис"  },
  "nm":             { es:"Nm",    ko:"민",   zh:"民",  ru:"Чис"  },

  "deuteronomy":    { es:"Dt",    ko:"신",   zh:"申",  ru:"Втор" },
  "deut":           { es:"Dt",    ko:"신",   zh:"申",  ru:"Втор" },
  "dt":             { es:"Dt",    ko:"신",   zh:"申",  ru:"Втор" },

  "joshua":         { es:"Jos",   ko:"수",   zh:"书",  ru:"Нав"  },
  "josh":           { es:"Jos",   ko:"수",   zh:"书",  ru:"Нав"  },

  "judges":         { es:"Jue",   ko:"삿",   zh:"士",  ru:"Суд"  },
  "judg":           { es:"Jue",   ko:"삿",   zh:"士",  ru:"Суд"  },
  "jdg":            { es:"Jue",   ko:"삿",   zh:"士",  ru:"Суд"  },

  "ruth":           { es:"Rt",    ko:"룻",   zh:"得",  ru:"Руф"  },

  "1 samuel":       { es:"1Sam",  ko:"삼상",  zh:"撒上", ru:"1Цар" },
  "1 sam":          { es:"1Sam",  ko:"삼상",  zh:"撒上", ru:"1Цар" },

  "2 samuel":       { es:"2Sam",  ko:"삼하",  zh:"撒下", ru:"2Цар" },
  "2 sam":          { es:"2Sam",  ko:"삼하",  zh:"撒下", ru:"2Цар" },

  "1 kings":        { es:"1Re",   ko:"왕상",  zh:"王上", ru:"3Цар" },
  "1 kgs":          { es:"1Re",   ko:"왕상",  zh:"王上", ru:"3Цар" },
  "1 ki":           { es:"1Re",   ko:"왕상",  zh:"王上", ru:"3Цар" },

  "2 kings":        { es:"2Re",   ko:"왕하",  zh:"王下", ru:"4Цар" },
  "2 kgs":          { es:"2Re",   ko:"왕하",  zh:"王下", ru:"4Цар" },
  "2 ki":           { es:"2Re",   ko:"왕하",  zh:"王下", ru:"4Цар" },

  "1 chronicles":   { es:"1Cr",   ko:"대상",  zh:"代上", ru:"1Пар" },
  "1 chron":        { es:"1Cr",   ko:"대상",  zh:"代上", ru:"1Пар" },
  "1 chr":          { es:"1Cr",   ko:"대상",  zh:"代上", ru:"1Пар" },

  "2 chronicles":   { es:"2Cr",   ko:"대하",  zh:"代下", ru:"2Пар" },
  "2 chron":        { es:"2Cr",   ko:"대하",  zh:"代下", ru:"2Пар" },
  "2 chr":          { es:"2Cr",   ko:"대하",  zh:"代下", ru:"2Пар" },

  "ezra":           { es:"Esd",   ko:"스",   zh:"拉",  ru:"Езд"  },
  "ezr":            { es:"Esd",   ko:"스",   zh:"拉",  ru:"Езд"  },

  "nehemiah":       { es:"Neh",   ko:"느",   zh:"尼",  ru:"Неем" },
  "neh":            { es:"Neh",   ko:"느",   zh:"尼",  ru:"Неем" },

  "esther":         { es:"Est",   ko:"에",   zh:"斯",  ru:"Есф"  },
  "est":            { es:"Est",   ko:"에",   zh:"斯",  ru:"Есф"  },

  "job":            { es:"Job",   ko:"욥",   zh:"伯",  ru:"Иов"  },

  "psalms":         { es:"Sal",   ko:"시",   zh:"诗",  ru:"Пс"   },
  "psalm":          { es:"Sal",   ko:"시",   zh:"诗",  ru:"Пс"   },
  "pss":            { es:"Sal",   ko:"시",   zh:"诗",  ru:"Пс"   },
  "ps":             { es:"Sal",   ko:"시",   zh:"诗",  ru:"Пс"   },

  "proverbs":       { es:"Prov",  ko:"잠",   zh:"箴",  ru:"Прит" },
  "prov":           { es:"Prov",  ko:"잠",   zh:"箴",  ru:"Прит" },
  "pro":            { es:"Prov",  ko:"잠",   zh:"箴",  ru:"Прит" },
  "pr":             { es:"Prov",  ko:"잠",   zh:"箴",  ru:"Прит" },

  "ecclesiastes":   { es:"Ecl",   ko:"전",   zh:"传",  ru:"Еккл" },
  "eccl":           { es:"Ecl",   ko:"전",   zh:"传",  ru:"Еккл" },
  "ecc":            { es:"Ecl",   ko:"전",   zh:"传",  ru:"Еккл" },

  "song of solomon":{ es:"Cant",  ko:"아",   zh:"歌",  ru:"Песн" },
  "song of songs":  { es:"Cant",  ko:"아",   zh:"歌",  ru:"Песн" },
  "song":           { es:"Cant",  ko:"아",   zh:"歌",  ru:"Песн" },
  "sos":            { es:"Cant",  ko:"아",   zh:"歌",  ru:"Песн" },

  "isaiah":         { es:"Is",    ko:"사",   zh:"赛",  ru:"Ис"   },
  "isa":            { es:"Is",    ko:"사",   zh:"赛",  ru:"Ис"   },

  "jeremiah":       { es:"Jer",   ko:"렘",   zh:"耶",  ru:"Иер"  },
  "jer":            { es:"Jer",   ko:"렘",   zh:"耶",  ru:"Иер"  },

  "lamentations":   { es:"Lam",   ko:"애",   zh:"哀",  ru:"Плач" },
  "lam":            { es:"Lam",   ko:"애",   zh:"哀",  ru:"Плач" },

  "ezekiel":        { es:"Ez",    ko:"겔",   zh:"结",  ru:"Иез"  },
  "ezek":           { es:"Ez",    ko:"겔",   zh:"结",  ru:"Иез"  },
  "eze":            { es:"Ez",    ko:"겔",   zh:"结",  ru:"Иез"  },

  "daniel":         { es:"Dn",    ko:"단",   zh:"但",  ru:"Дан"  },
  "dan":            { es:"Dn",    ko:"단",   zh:"但",  ru:"Дан"  },

  "hosea":          { es:"Os",    ko:"호",   zh:"何",  ru:"Ос"   },
  "hos":            { es:"Os",    ko:"호",   zh:"何",  ru:"Ос"   },

  "joel":           { es:"Jl",    ko:"욜",   zh:"珥",  ru:"Иоил" },
  "jl":             { es:"Jl",    ko:"욜",   zh:"珥",  ru:"Иоил" },

  "amos":           { es:"Am",    ko:"암",   zh:"摩",  ru:"Ам"   },

  "obadiah":        { es:"Abd",   ko:"옵",   zh:"俄",  ru:"Авд"  },
  "obad":           { es:"Abd",   ko:"옵",   zh:"俄",  ru:"Авд"  },

  "jonah":          { es:"Jon",   ko:"욘",   zh:"拿",  ru:"Иона" },
  "jon":            { es:"Jon",   ko:"욘",   zh:"拿",  ru:"Иона" },

  "micah":          { es:"Mi",    ko:"미",   zh:"弥",  ru:"Мих"  },
  "mic":            { es:"Mi",    ko:"미",   zh:"弥",  ru:"Мих"  },

  "nahum":          { es:"Nah",   ko:"나",   zh:"鸿",  ru:"Наум" },
  "nah":            { es:"Nah",   ko:"나",   zh:"鸿",  ru:"Наум" },

  "habakkuk":       { es:"Hab",   ko:"합",   zh:"哈",  ru:"Авв"  },
  "hab":            { es:"Hab",   ko:"합",   zh:"哈",  ru:"Авв"  },

  "zephaniah":      { es:"Sof",   ko:"습",   zh:"番",  ru:"Соф"  },
  "zeph":           { es:"Sof",   ko:"습",   zh:"番",  ru:"Соф"  },

  "haggai":         { es:"Ag",    ko:"학",   zh:"该",  ru:"Агг"  },
  "hag":            { es:"Ag",    ko:"학",   zh:"该",  ru:"Агг"  },

  "zechariah":      { es:"Zac",   ko:"슥",   zh:"亚",  ru:"Зах"  },
  "zech":           { es:"Zac",   ko:"슥",   zh:"亚",  ru:"Зах"  },
  "zec":            { es:"Zac",   ko:"슥",   zh:"亚",  ru:"Зах"  },

  "malachi":        { es:"Mal",   ko:"말",   zh:"玛",  ru:"Мал"  },
  "mal":            { es:"Mal",   ko:"말",   zh:"玛",  ru:"Мал"  },

  // ── New Testament ──────────────────────────────────────────────────────
  "matthew":        { es:"Mt",    ko:"마",   zh:"太",  ru:"Мф"   },
  "matt":           { es:"Mt",    ko:"마",   zh:"太",  ru:"Мф"   },
  "mat":            { es:"Mt",    ko:"마",   zh:"太",  ru:"Мф"   },

  "mark":           { es:"Mc",    ko:"막",   zh:"可",  ru:"Мк"   },
  "mrk":            { es:"Mc",    ko:"막",   zh:"可",  ru:"Мк"   },
  "mk":             { es:"Mc",    ko:"막",   zh:"可",  ru:"Мк"   },

  "luke":           { es:"Lc",    ko:"눅",   zh:"路",  ru:"Лк"   },
  "luk":            { es:"Lc",    ko:"눅",   zh:"路",  ru:"Лк"   },
  "lk":             { es:"Lc",    ko:"눅",   zh:"路",  ru:"Лк"   },

  // numbered Johns must come before bare "john" / "jn"
  "1 john":         { es:"1Jn",   ko:"요일",  zh:"约一", ru:"1Ин"  },
  "1 jn":           { es:"1Jn",   ko:"요일",  zh:"约一", ru:"1Ин"  },
  "2 john":         { es:"2Jn",   ko:"요이",  zh:"约二", ru:"2Ин"  },
  "2 jn":           { es:"2Jn",   ko:"요이",  zh:"约二", ru:"2Ин"  },
  "3 john":         { es:"3Jn",   ko:"요삼",  zh:"约三", ru:"3Ин"  },
  "3 jn":           { es:"3Jn",   ko:"요삼",  zh:"约三", ru:"3Ин"  },
  "john":           { es:"Jn",    ko:"요",   zh:"约",  ru:"Ин"   },
  "jhn":            { es:"Jn",    ko:"요",   zh:"约",  ru:"Ин"   },
  "jn":             { es:"Jn",    ko:"요",   zh:"约",  ru:"Ин"   },

  "acts":           { es:"Hch",   ko:"행",   zh:"徒",  ru:"Деян" },

  "romans":         { es:"Rom",   ko:"롬",   zh:"罗",  ru:"Рим"  },
  "rom":            { es:"Rom",   ko:"롬",   zh:"罗",  ru:"Рим"  },

  "1 corinthians":  { es:"1Cor",  ko:"고전",  zh:"林前", ru:"1Кор" },
  "1 cor":          { es:"1Cor",  ko:"고전",  zh:"林前", ru:"1Кор" },
  "2 corinthians":  { es:"2Cor",  ko:"고후",  zh:"林后", ru:"2Кор" },
  "2 cor":          { es:"2Cor",  ko:"고후",  zh:"林后", ru:"2Кор" },

  "galatians":      { es:"Gál",   ko:"갈",   zh:"加",  ru:"Гал"  },
  "gal":            { es:"Gál",   ko:"갈",   zh:"加",  ru:"Гал"  },

  "ephesians":      { es:"Ef",    ko:"엡",   zh:"弗",  ru:"Еф"   },
  "eph":            { es:"Ef",    ko:"엡",   zh:"弗",  ru:"Еф"   },

  "philippians":    { es:"Flp",   ko:"빌",   zh:"腓",  ru:"Флп"  },
  "phil":           { es:"Flp",   ko:"빌",   zh:"腓",  ru:"Флп"  },
  "php":            { es:"Flp",   ko:"빌",   zh:"腓",  ru:"Флп"  },

  "colossians":     { es:"Col",   ko:"골",   zh:"西",  ru:"Кол"  },
  "col":            { es:"Col",   ko:"골",   zh:"西",  ru:"Кол"  },

  "1 thessalonians":{ es:"1Tes",  ko:"살전",  zh:"帖前", ru:"1Фес" },
  "1 thess":        { es:"1Tes",  ko:"살전",  zh:"帖前", ru:"1Фес" },
  "1 thes":         { es:"1Tes",  ko:"살전",  zh:"帖前", ru:"1Фес" },
  "2 thessalonians":{ es:"2Tes",  ko:"살후",  zh:"帖后", ru:"2Фес" },
  "2 thess":        { es:"2Tes",  ko:"살후",  zh:"帖后", ru:"2Фес" },
  "2 thes":         { es:"2Tes",  ko:"살후",  zh:"帖后", ru:"2Фес" },

  "1 timothy":      { es:"1Tim",  ko:"딤전",  zh:"提前", ru:"1Тим" },
  "1 tim":          { es:"1Tim",  ko:"딤전",  zh:"提前", ru:"1Тим" },
  "2 timothy":      { es:"2Tim",  ko:"딤후",  zh:"提后", ru:"2Тим" },
  "2 tim":          { es:"2Tim",  ko:"딤후",  zh:"提后", ru:"2Тим" },

  "titus":          { es:"Tit",   ko:"딛",   zh:"多",  ru:"Тит"  },
  "tit":            { es:"Tit",   ko:"딛",   zh:"多",  ru:"Тит"  },

  "philemon":       { es:"Flm",   ko:"몬",   zh:"门",  ru:"Флм"  },
  "phlm":           { es:"Flm",   ko:"몬",   zh:"门",  ru:"Флм"  },

  "hebrews":        { es:"Heb",   ko:"히",   zh:"来",  ru:"Евр"  },
  "heb":            { es:"Heb",   ko:"히",   zh:"来",  ru:"Евр"  },

  "james":          { es:"Sant",  ko:"약",   zh:"雅",  ru:"Иак"  },
  "jas":            { es:"Sant",  ko:"약",   zh:"雅",  ru:"Иак"  },

  // numbered Peters before bare "peter"
  "1 peter":        { es:"1Pe",   ko:"벧전",  zh:"彼前", ru:"1Пет" },
  "1 pet":          { es:"1Pe",   ko:"벧전",  zh:"彼前", ru:"1Пет" },
  "2 peter":        { es:"2Pe",   ko:"벧후",  zh:"彼后", ru:"2Пет" },
  "2 pet":          { es:"2Pe",   ko:"벧후",  zh:"彼后", ru:"2Пет" },

  "jude":           { es:"Jud",   ko:"유",   zh:"犹",  ru:"Иуд"  },
  "jud":            { es:"Jud",   ko:"유",   zh:"犹",  ru:"Иуд"  },

  "revelation":     { es:"Ap",    ko:"계",   zh:"启",  ru:"Откр" },
  "rev":            { es:"Ap",    ko:"계",   zh:"启",  ru:"Откр" },
  "apo":            { es:"Ap",    ko:"계",   zh:"启",  ru:"Откр" },
};

// Sort keys longest-first so "1 john" wins over "john", "1 pet" over "pet" etc.
const SORTED_KEYS = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length);

/**
 * Translate a single bible-reading cell.
 * Cells may contain multiple segments separated by "\n" or " / ".
 * Each segment looks like "Gen 20-23" or "1 Pet 1-5".
 * Only the book-name prefix is translated; chapter/verse numbers stay as-is.
 */
export function translateBibleReadingEntry(entry: string, lang: LangCode): string {
  // Split on newline first, then on " / " within each line
  return entry
    .split("\n")
    .map((line) =>
      line
        .split(" / ")
        .map((seg) => translateOneLine(seg.trim(), lang))
        .join(" / ")
    )
    .join("\n");
}

function translateOneLine(line: string, lang: LangCode): string {
  const lower = line.toLowerCase();
  for (const key of SORTED_KEYS) {
    // Match the book name at the start, followed by a space or end-of-string
    if (lower.startsWith(key + " ") || lower === key) {
      const translated = BOOK_MAP[key][lang];
      return translated + line.slice(key.length); // keep chapter part verbatim
    }
  }
  return line; // unrecognised book — pass through unchanged
}
