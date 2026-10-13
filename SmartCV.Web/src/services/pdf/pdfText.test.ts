import { describe, expect, it } from 'vitest';
import { runsToLines, type TextRun } from './pdfText';

const run = (str: string, x: number, y: number, width = str.length * 5): TextRun => ({ str, x, y, width, fontSize: 10 });

describe('runsToLines', () => {
  it('orders lines top to bottom and runs left to right', () => {
    expect(runsToLines([run('second', 10, 100), run('first', 10, 200)])).toEqual(['first', 'second']);
  });

  it('marks column-sized gaps with a tab for the rule-based parser', () => {
    const lines = runsToLines([run('Engineer · Acme', 10, 500, 80), run(' ', 90, 500, 300), run('2020 – Present', 400, 500)]);

    expect(lines).toEqual(['Engineer · Acme\t2020 – Present']);
  });

  it('joins runs split mid-word without inserting spaces', () => {
    expect(runsToLines([run('Kuber', 10, 100, 25), run('netes', 35, 100, 25)])).toEqual(['Kubernetes']);
  });

  it('inserts a single space for word gaps', () => {
    expect(runsToLines([run('Hello', 10, 100, 25), run('world', 38, 100, 25)])).toEqual(['Hello world']);
  });
});
