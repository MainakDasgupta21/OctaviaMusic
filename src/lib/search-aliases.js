// =============================================================================
// Hand-curated aliases and abbreviation maps used by the local ranker to widen
// lexical matching. When the user types "MJ" the ranker also scores items as
// if "michael jackson" had been typed; "rmx" expands to "remix" so a song
// titled "Blinding Lights (Remix)" matches the `rmx` token.
//
// Keys are lowercased and diacritic-free; values are the expansion the ranker
// uses. The maps are intentionally small — only common, unambiguous shorthand
// the user is likely to actually type. Anything more elaborate belongs in the
// upstream search engine (YTM), not here.
// =============================================================================

const ALIASES = {
  mj: 'michael jackson',
  bey: 'beyonce',
  jt: 'justin timberlake',
  rih: 'rihanna',
  hov: 'jay z',
  jayz: 'jay z',
  yeezy: 'kanye west',
  kanye: 'kanye west',
  taytay: 'taylor swift',
  tswift: 'taylor swift',
  drizzy: 'drake',
  ari: 'ariana grande',
  arr: 'a r rahman',
  srgm: 'shankar mahadevan',
  bts: 'bts',
  bp: 'blackpink',
  jb: 'justin bieber',
};

const ABBREVIATIONS = {
  rmx: 'remix',
  feat: 'featuring',
  ft: 'featuring',
  prod: 'produced by',
  og: 'original',
  inst: 'instrumental',
  ver: 'version',
  vol: 'volume',
};

const lower = (value) => String(value ?? '').toLowerCase().trim();

export const resolveAlias = (token) => ALIASES[lower(token)] || null;
export const expandAbbreviation = (token) => ABBREVIATIONS[lower(token)] || null;

// Walk the parsed positive tokens and collect every alias / abbreviation hit.
// Returned arrays are deduplicated and preserve insertion order so the ranker
// can reason about "what did the user *probably* mean".
export const collectExpansions = (tokens = []) => {
  const aliasTerms = [];
  const abbreviationTokens = [];
  const seenAlias = new Set();
  const seenAbbrev = new Set();

  for (const raw of tokens) {
    const token = lower(raw);
    if (!token) continue;
    const alias = ALIASES[token];
    if (alias && !seenAlias.has(alias)) {
      seenAlias.add(alias);
      aliasTerms.push(alias);
    }
    const abbrev = ABBREVIATIONS[token];
    if (abbrev && !seenAbbrev.has(abbrev)) {
      seenAbbrev.add(abbrev);
      abbreviationTokens.push(abbrev);
    }
  }

  return { aliasTerms, abbreviationTokens };
};

export const ALIAS_KEYS = Object.freeze({ ...ALIASES });
export const ABBREVIATION_KEYS = Object.freeze({ ...ABBREVIATIONS });
