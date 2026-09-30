export type FaqItem = { id: string; q: string; a: string };
export type FaqCategory = { id: string; title: string; items: FaqItem[] };

/** The questions shown on the home page (the rest live on /faq). */
export const CORE_IDS = ["what", "cost", "pay", "what-can", "verified", "cancel"];
