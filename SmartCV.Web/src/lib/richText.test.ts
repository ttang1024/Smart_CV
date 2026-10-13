import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasVisibleText, isRichTextEmpty, richTextToPlainText, sanitizeRichText } from './richText';

describe('sanitizeRichText', () => {
  it('removes scripts, event handlers and dangerous elements', () => {
    const dirty = '<b onclick="steal()">Hi</b><script>alert(1)</script><img src=x onerror="alert(1)"><iframe src="https://evil"></iframe>';

    const clean = sanitizeRichText(dirty);

    expect(clean).toContain('<b>Hi</b>');
    expect(clean).not.toMatch(/script|onclick|onerror|iframe|alert/);
  });

  it('turns links into plain spans so no href survives', () => {
    const clean = sanitizeRichText('<a href="javascript:alert(1)">click</a>');

    expect(clean).toBe('<span>click</span>');
  });

  it('keeps only safe inline styles', () => {
    const clean = sanitizeRichText('<span style="color: red; background: url(https://evil/x.png); font-size: 12pt; position: fixed">x</span>');

    expect(clean).toContain('color: red');
    expect(clean).toContain('font-size: 12pt');
    expect(clean).not.toMatch(/url\(|position/);
  });

  it('preserves list styles through the data attribute', () => {
    const clean = sanitizeRichText('<ul data-list-style="check"><li>Done</li></ul>');

    expect(clean).toContain('data-list-style="check"');
  });

  describe('without a DOM (static prerender)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('keeps allow-listed tags, drops attributes and dangerous content', () => {
      vi.stubGlobal('DOMParser', undefined);

      const clean = sanitizeRichText('<b style="color:red" onclick="x()">Bold</b> <script>alert(1)</script><img src=x onerror=alert(1)> 1 < 2');

      expect(clean).toBe('<b>Bold</b>  1 &lt; 2');
    });
  });
});

describe('rich text helpers', () => {
  it('treats markup with no visible text as empty', () => {
    expect(isRichTextEmpty('<p><br></p>')).toBe(true);
    expect(isRichTextEmpty('<p>&nbsp;</p>')).toBe(true);
    expect(isRichTextEmpty('<p>Hello</p>')).toBe(false);
    expect(hasVisibleText('<b>a</b>')).toBe(true);
  });

  it('converts block elements and breaks to newlines', () => {
    expect(richTextToPlainText('<div>One</div><div>Two<br>Three</div>')).toBe('One\nTwo\nThree');
  });
});
