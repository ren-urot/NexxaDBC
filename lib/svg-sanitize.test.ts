// @vitest-environment node
//
// sanitizeSvg builds its own isolated JSDOM instance internally, so this
// test doesn't need the project's default jsdom environment — and running
// under it is actively wrong here: jsdom's own global `File` doesn't
// implement `.text()`, so `new File([...])` below would silently produce an
// object sanitizeSvg can't read from, unrelated to anything being tested.
// Node's native File does implement it.
import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from './svg-sanitize';

function svgFile(markup: string): File {
  return new File([markup], 'logo.svg', { type: 'image/svg+xml' });
}

describe('sanitizeSvg', () => {
  it('strips embedded <script> elements', async () => {
    const file = svgFile('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5" /></svg>');
    const clean = await sanitizeSvg(file);
    const text = await clean.text();
    expect(text).not.toContain('<script');
    expect(text).not.toContain('alert');
  });

  it('strips event handler attributes', async () => {
    const file = svgFile('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect onclick="alert(2)" /></svg>');
    const clean = await sanitizeSvg(file);
    const text = await clean.text();
    expect(text).not.toContain('onload');
    expect(text).not.toContain('onclick');
  });

  it('preserves legitimate SVG shape markup', async () => {
    const file = svgFile('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red" /></svg>');
    const clean = await sanitizeSvg(file);
    const text = await clean.text();
    expect(text).toContain('<circle');
    expect(text).toContain('fill="red"');
  });

  it('returns a File with the original name and an svg MIME type', async () => {
    const file = svgFile('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const clean = await sanitizeSvg(file);
    expect(clean.name).toBe('logo.svg');
    expect(clean.type).toBe('image/svg+xml');
  });
});
