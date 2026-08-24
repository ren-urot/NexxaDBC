import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkylineHorizontal } from './SkylineHorizontal';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('SkylineHorizontal', () => {
  it('renders with only required fields', () => {
    render(<SkylineHorizontal data={required} style={{}} />);
    expect(screen.getByText('juan@abc.com')).toBeInTheDocument();
    expect(screen.getByText('+639171234567')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
  });

  it('renders optional address, website, and social links when present', () => {
    render(
      <SkylineHorizontal
        data={{ ...required, address: '123 Main St', website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }}
        style={{}}
      />
    );
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('renders the WhatsApp phone number as a wa.me link, not a relative href', () => {
    render(<SkylineHorizontal data={{ ...required, whatsapp: '+63 917 123 4567' }} style={{}} />);
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/639171234567');
  });

  it('renders a logo image when logoUrl is present', () => {
    render(<SkylineHorizontal data={{ ...required, logoUrl: 'https://abc.com/logo.png' }} style={{}} />);
    expect(screen.getByRole('img', { name: 'ABC Corporation logo' })).toHaveAttribute('src', 'https://abc.com/logo.png');
  });

  it('applies an accent color override', () => {
    const { container } = render(<SkylineHorizontal data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
