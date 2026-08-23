import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignatureVertical } from './SignatureVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('SignatureVertical', () => {
  it('renders with only required fields', () => {
    render(<SignatureVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders a logo image instead of the company name when logoUrl is present', () => {
    render(<SignatureVertical data={{ ...required, logoUrl: 'https://abc.com/logo.png' }} style={{}} />);
    expect(screen.queryByText('ABC Corporation')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'ABC Corporation logo' })).toHaveAttribute(
      'src',
      'https://abc.com/logo.png'
    );
  });

  it('renders optional website and social links when present', () => {
    render(<SignatureVertical data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('renders the WhatsApp phone number as a wa.me link, not a relative href', () => {
    render(<SignatureVertical data={{ ...required, whatsapp: '+63 917 123 4567' }} style={{}} />);
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/639171234567'
    );
  });

  it('applies an accent color override', () => {
    const { container } = render(<SignatureVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
