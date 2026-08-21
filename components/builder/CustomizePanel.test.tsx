import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomizePanel } from './CustomizePanel';
import type { TemplateDefinition } from '@/lib/templates/types';

const template: TemplateDefinition = {
  id: 'corporate-vertical',
  name: 'Corporate',
  category: 'corporate',
  orientation: 'vertical',
  customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
  component: () => null,
};

describe('CustomizePanel', () => {
  it('shows an accent color picker when the template allows it', () => {
    render(<CustomizePanel template={template} style={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/accent color/i)).toBeInTheDocument();
  });

  it('hides the accent color picker when the template disallows it', () => {
    render(
      <CustomizePanel
        template={{ ...template, customizable: { ...template.customizable, accentColor: false } }}
        style={{}}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/accent color/i)).not.toBeInTheDocument();
  });

  it('clamps the font size stepper to the template bounds', () => {
    render(<CustomizePanel template={template} style={{ fontSizeStep: -1 }} onChange={vi.fn()} />);
    const input = screen.getByLabelText(/font size/i) as HTMLInputElement;
    expect(input.min).toBe('-1');
    expect(input.max).toBe('1');
  });

  it('calls onChange when the accent color changes', async () => {
    const onChange = vi.fn();
    render(<CustomizePanel template={template} style={{}} onChange={onChange} />);
    fireEvent_change(screen.getByLabelText(/accent color/i), '#123456');
    expect(onChange).toHaveBeenCalledWith({ accentColor: '#123456' });
  });
});

function fireEvent_change(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } });
}
