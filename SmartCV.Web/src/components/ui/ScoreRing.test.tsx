import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreRing from './ScoreRing';

describe('ScoreRing', () => {
  it('shows the score as a percentage label by default', () => {
    render(<ScoreRing score={82} />);

    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('hides the label when showLabel is false', () => {
    render(<ScoreRing score={82} showLabel={false} />);

    expect(screen.queryByText('82%')).not.toBeInTheDocument();
  });

  it.each([
    [90, '#10b981'], // green: score >= 75
    [60, '#f59e0b'], // amber: 50 <= score < 75
    [20, '#ef4444'], // red: score < 50
  ])('colors the score %i as %s based on its threshold', (score, expectedColor) => {
    render(<ScoreRing score={score} />);

    const label = screen.getByText(`${score}%`);
    expect(label).toHaveStyle({ color: expectedColor });
  });
});
