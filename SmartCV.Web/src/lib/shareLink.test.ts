import { describe, expect, it } from 'vitest';
import { decodeSharePayload, encodeSharePayload, type SharePayload } from './shareLink';
import { createEmptyResume } from '../store/resumeStore';
import { DEFAULT_PAGE_MARGINS_MM } from '../components/resume/resumeTypes';

function payload(overrides: Partial<SharePayload> = {}): SharePayload {
  return {
    resume: { ...createEmptyResume('Shared'), summary: 'Hello' },
    styleId: 'custom',
    mainColor: '#047857',
    pageSize: 'a4',
    pageMarginsMm: DEFAULT_PAGE_MARGINS_MM,
    customOptions: { header: 'classic', experience: 'list', skillsColumns: 2, sectionStyle: 'plain', skillsStyle: 'tags', education: 'compact', summary: 'callout' },
    ...overrides,
  };
}

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('share links', () => {
  it('round-trips a payload including Custom style options', async () => {
    const original = payload();

    const decoded = await decodeSharePayload(await encodeSharePayload(original));

    expect(decoded.resume.summary).toBe('Hello');
    expect(decoded.customOptions).toEqual(original.customOptions);
  });

  it('rejects a payload with an injected colour value', async () => {
    const tampered = { ...payload(), mainColor: 'red; background:url(https://evil)' };

    await expect(decodeSharePayload('r.' + toBase64Url(JSON.stringify(tampered)))).rejects.toThrow(/valid resume/);
  });

  it('rejects a payload without a resume', async () => {
    await expect(decodeSharePayload('r.' + toBase64Url(JSON.stringify({ styleId: 'classic' })))).rejects.toThrow();
  });

  it('strips unknown fields from the shared resume', async () => {
    const withExtra = { ...payload(), resume: { ...payload().resume, evil: '<script>' } };

    const decoded = await decodeSharePayload('r.' + toBase64Url(JSON.stringify(withExtra)));

    expect('evil' in decoded.resume).toBe(false);
  });

  it('refuses links that decompress to an oversized payload', async () => {
    const huge = { ...payload(), resume: { ...payload().resume, summary: 'a'.repeat(3_000_000) } };

    await expect(decodeSharePayload(await encodeSharePayload(huge))).rejects.toThrow(/too large/);
  });

  it('rejects unknown formats', async () => {
    await expect(decodeSharePayload('x.abc')).rejects.toThrow(/Unrecognized/);
  });
});
