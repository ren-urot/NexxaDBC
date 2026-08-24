import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateGallery } from './TemplateGallery';

describe('TemplateGallery', () => {
  it('lists all 14 templates by default', () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(14);
  });

  it('filters by orientation', async () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(7);
  });

  it('calls onSelect with the template id and orientation', async () => {
    const onSelect = vi.fn();
    render(<TemplateGallery onSelect={onSelect} />);
    const firstSelect = screen.getAllByRole('button', { name: /select/i })[0];
    await userEvent.click(firstSelect);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/vertical|horizontal/));
  });

  it('opens a larger preview when a card thumbnail is clicked, and closes it again', async () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    const firstPreview = screen.getAllByRole('button', { name: /view a larger preview/i })[0];
    await userEvent.click(firstPreview);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close preview/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
