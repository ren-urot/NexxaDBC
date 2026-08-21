import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateGallery } from './TemplateGallery';

describe('TemplateGallery', () => {
  it('lists all 10 templates by default', () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(10);
  });

  it('filters by orientation', async () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /horizontal/i }));
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(5);
  });

  it('calls onSelect with the template id and orientation', async () => {
    const onSelect = vi.fn();
    render(<TemplateGallery onSelect={onSelect} />);
    const firstSelect = screen.getAllByRole('button', { name: /select/i })[0];
    await userEvent.click(firstSelect);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/vertical|horizontal/));
  });
});
