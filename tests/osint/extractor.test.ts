import { describe, expect, it } from 'vitest';
import { extractHtmlDocument } from '@/lib/osint/extractor';

const longParagraph = 'Conteúdo público relevante sobre Argus Eye LTDA com informações suficientes para superar o limite mínimo de extração e validar normalização textual.';

describe('extractHtmlDocument', () => {
  it('extrai título, descrição, headings, texto e hash removendo blocos não principais', () => {
    const extracted = extractHtmlDocument({
      url: 'https://example.com/a',
      finalUrl: 'https://example.com/a',
      status: 200,
      contentType: 'text/html',
      fetchedAt: new Date('2026-06-13T10:00:00Z'),
      html: `<html><head><title>Fonte &amp; Pública</title><meta name="description" content="Descrição pública do documento"></head><body><header>topo</header><nav>menu</nav><h1>Argus Eye</h1><h2>Due diligence</h2><aside>lateral</aside><form>campo</form><script>alert(1)</script><p>${longParagraph}</p><footer>rodapé</footer></body></html>`,
    });

    expect(extracted).not.toBeNull();
    expect(extracted?.title).toBe('Fonte & Pública');
    expect(extracted?.description).toBe('Descrição pública do documento');
    expect(extracted?.headings).toEqual(['Argus Eye', 'Due diligence']);
    expect(extracted?.text).toContain('Argus Eye');
    expect(extracted?.text).toContain(longParagraph);
    expect(extracted?.textHash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(extracted?.text).not.toContain('alert');
    expect(extracted?.text).not.toContain('menu');
    expect(extracted?.text).not.toContain('campo');
  });

  it('ignora documentos com texto muito curto', () => {
    const extracted = extractHtmlDocument({
      url: 'https://example.com/curto',
      finalUrl: 'https://example.com/curto',
      status: 200,
      contentType: 'text/html',
      fetchedAt: new Date('2026-06-13T10:00:00Z'),
      html: '<html><head><title>Curto</title></head><body><p>pouco texto</p></body></html>',
    });

    expect(extracted).toBeNull();
  });
});
