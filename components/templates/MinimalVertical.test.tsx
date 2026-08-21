import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MinimalVertical } from './MinimalVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('MinimalVertical', () => {
  it('renders with only required fields', () => {
    render(<MinimalVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links, but never a logo, even when logoUrl is set', () => {
    render(
      <MinimalVertical
        data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan', logoUrl: 'https://abc.com/logo.png' }}
        style={{}}
      />
    );
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies an accent color override to the divider', () => {
    render(<MinimalVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const divider = screen.getByTestId('accent-divider');
    expect(divider).toHaveStyle({ backgroundColor: '#ff0000' });
  });
});
