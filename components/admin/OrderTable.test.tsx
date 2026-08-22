import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderTable } from './OrderTable';

const sampleOrders = [
  { id: '11111111-1111-1111-1111-111111111111', status: 'submitted', amount: 499, paymentMethod: 'gcash', createdAt: '2026-08-22T00:00:00.000Z' },
  { id: '22222222-2222-2222-2222-222222222222', status: 'approved', amount: 499, paymentMethod: 'bank_transfer', createdAt: '2026-08-22T00:00:00.000Z' },
];

describe('OrderTable', () => {
  it('renders a row per order with status and method', () => {
    render(<OrderTable orders={sampleOrders} />);
    expect(screen.getByText('submitted')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('gcash')).toBeInTheDocument();
    expect(screen.getByText('bank_transfer')).toBeInTheDocument();
  });

  it('links each row to its order detail page', () => {
    render(<OrderTable orders={sampleOrders} />);
    const links = screen.getAllByRole('link', { name: /view/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/admin/orders/11111111-1111-1111-1111-111111111111');
  });

  it('shows an empty state with no orders', () => {
    render(<OrderTable orders={[]} />);
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
  });
});
