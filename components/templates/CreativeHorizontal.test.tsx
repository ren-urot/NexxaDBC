import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreativeHorizontal } from './CreativeHorizontal';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('CreativeHorizontal', () => {
  it('renders with only required fields', () => {
    render(<CreativeHorizontal data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links when present', () => {
    render(<CreativeHorizontal data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('applies an accent color override', () => {
    const { container } = render(<CreativeHorizontal data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
