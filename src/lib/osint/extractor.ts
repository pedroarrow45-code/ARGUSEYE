import { createHash } from 'node:crypto';
import type { OsintExtractedDocument, OsintFetchedDocument } from '@/lib/osint/types';

export const MIN_EXTRACTED_TEXT_LENGTH = 80;

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeText(value: string): string {
  return decodeBasicEntities(value.replace(/\s+/g, ' ').trim());
}

function removeElements(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
}

function stripHtml(value: string): string {
  return normalizeText(value.replace(/<[^>]+>/g, ' '));
}

function extractTagText(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta\s+[^>]*(?:name=["']description["'][^>]*content=["']([^"']*)["']|content=["']([^"']*)["'][^>]*name=["']description["'])[^>]*>/i);
  return normalizeText(match?.[1] ?? match?.[2] ?? '');
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const pattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const heading = stripHtml(match[1]);
    if (heading) headings.push(heading);
  }
  return [...new Set(headings)].slice(0, 20);
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function extractHtmlDocument(document: OsintFetchedDocument): OsintExtractedDocument | null {
  const cleanedHtml = removeElements(document.html);
  const title = extractTagText(cleanedHtml, 'title') || 'Documento sem título';
  const description = extractMetaDescription(cleanedHtml);
  const headings = extractHeadings(cleanedHtml);
  const text = stripHtml(cleanedHtml);

  if (text.length < MIN_EXTRACTED_TEXT_LENGTH) return null;

  return {
    url: document.url,
    finalUrl: document.finalUrl,
    title,
    description,
    headings,
    text,
    textHash: hashText(text),
    excerpt: text.slice(0, 500),
    fetchedAt: document.fetchedAt,
    status: document.status,
  };
}
