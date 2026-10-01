export type LegalSection = { h: string; p: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };
export type Legal = { updated: string; privacy: LegalDoc; terms: LegalDoc };
