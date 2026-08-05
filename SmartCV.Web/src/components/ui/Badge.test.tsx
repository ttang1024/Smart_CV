import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Strong</Badge>);

    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('applies the success color classes by default variant vs an explicit variant', () => {
    const { rerender } = render(<Badge variant="danger">At risk</Badge>);
    expect(screen.getByText('At risk').className).toContain('bg-red-100');

    rerender(<Badge variant="success">Strong</Badge>);
    expect(screen.getByText('Strong').className).toContain('bg-emerald-100');
  });

  it('merges a custom className onto the variant classes', () => {
    render(<Badge className="ml-auto">Custom</Badge>);

    expect(screen.getByText('Custom').className).toContain('ml-auto');
  });
});
