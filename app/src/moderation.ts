/**
 * A light first filter for what goes on the public board. It doesn't decide
 * anything on its own: a match only HOLDS the request until an admin looks
 * at it (Admin → Requests → Held), so a false alarm costs a few minutes,
 * not a lost request.
 *
 * Words are matched whole, after undoing simple disguises (v4pe, r0kok,
 * "b.e.e.r"), so "airport" doesn't trip "port" and "Kafe" doesn't trip
 * anything. English, Malay and Indonesian.
 */

const BANNED_ITEMS = [
  // tobacco and vapes
  "vape",
  "vapes",
  "vaping",
  "rokok",
  "cigarette",
  "cigarettes",
  "ciggy",
  "ciggies",
  "cigar",
  "tobacco",
  "tembakau",
  "shisha",
  "juul",
  "liquid vape",
  // alcohol
  "alcohol",
  "alkohol",
  "beer",
  "bir",
  "arak",
  "wine",
  "vodka",
  "whisky",
  "whiskey",
  "soju",
  "tuak",
  "todi",
  "heineken",
  "carlsberg",
  "tiger beer",
  // drugs
  "ganja",
  "weed",
  "marijuana",
  "cannabis",
  "dadah",
  "drugs",
  "narkoba",
  "syabu",
  "sabu",
  "meth",
  "ketum",
  "pil kuda",
  "ecstasy",
  // weapons, gambling, adult
  "pistol",
  "gun",
  "senjata",
  "senapang",
  "parang",
  "judi",
  "gambling",
  "betting",
  "slot online",
  "togel",
  "porn",
  "porno",
  "bogel",
  "sex",
  "seks",
  // academic dishonesty
  "jawapan exam",
  "exam answers",
  "kunci jawaban",
  "buat assignment",
  "do my assignment",
  "joki tugas",
];

const BAD_WORDS = [
  "fuck",
  "fucking",
  "fck",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "motherfucker",
  "wtf",
  "babi",
  "sial",
  "bodoh",
  "bangang",
  "bengap",
  "celaka",
  "keparat",
  "pukimak",
  "puki",
  "lancau",
  "pantat",
  "sundal",
  "jubur",
  "anjing",
  "anjir",
  "bangsat",
  "kontol",
  "memek",
  "ngentot",
  "jancok",
  "jancuk",
  "goblok",
  "tolol",
  "kampret",
  "asu",
  "tai",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

/** Lowercase, undo look-alike characters, and join letters split by dots or spaces ("b.e.e.r"). */
export function normalise(text: string): string {
  let s = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  // "b.e.e.r" / "b e e r" / "b-e-e-r" → "beer" (only runs of single letters)
  s = s.replace(/\b(?:[a-z][.\-_* ]){2,}[a-z]\b/g, (m) => m.replace(/[.\-_* ]/g, ""));
  return s
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const toPattern = (words: string[]) =>
  new RegExp(`(?:^|\\s)(${words.map((w) => w.replace(/\s+/g, "\\s")).join("|")})(?=\\s|$)`);
const ITEMS = toPattern(BANNED_ITEMS);
const WORDS = toPattern(BAD_WORDS);
const LINK =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|my|id|io|xyz|me|ly|link|site|top)\b|t\.me\/|wa\.me\/|bit\.ly)/i;
/** 9+ digits in a row (spaces and dashes allowed): a phone number, which belongs in the WhatsApp step, not the board. */
const PHONE = /(?:\+?\d[\s-]?){9,}/;

export type HoldReason = "banned_item" | "bad_word" | "link" | "phone";

/** Why these texts should wait for an admin, or null if they can go straight on the board. */
export function holdReason(...texts: string[]): { reason: HoldReason; match: string } | null {
  for (const raw of texts) {
    if (LINK.test(raw)) return { reason: "link", match: raw.match(LINK)![0] };
    if (PHONE.test(raw)) return { reason: "phone", match: raw.match(PHONE)![0].trim() };
    const n = normalise(raw);
    const item = n.match(ITEMS);
    if (item) return { reason: "banned_item", match: item[1] };
    const word = n.match(WORDS);
    if (word) return { reason: "bad_word", match: word[1] };
  }
  return null;
}
