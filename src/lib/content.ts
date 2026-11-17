import { getDb } from "./db";

export type Page = { slug: string; title: string; body: string; meta_title: string; meta_description: string; is_draft_content: number; updated_at: string };
export type Faq = { id: number; question: string; answer: string; category: string; sort_order: number; published: number };

export function getPage(slug: string): Page | null {
  return (getDb().prepare("SELECT * FROM pages WHERE slug = ?").get(slug) as Page | undefined) ?? null;
}
export function listPages(): Page[] {
  return getDb().prepare("SELECT * FROM pages ORDER BY slug").all() as Page[];
}
export function listFaqs(publishedOnly = true): Faq[] {
  return getDb().prepare(`SELECT * FROM faqs ${publishedOnly ? "WHERE published = 1" : ""} ORDER BY sort_order, id`).all() as Faq[];
}
