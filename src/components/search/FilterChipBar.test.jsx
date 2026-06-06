import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterChipBar } from '@/components/search/FilterChipBar';
import { EMPTY_FILTERS } from '@/lib/search-filter-state';

const renderBar = (overrides = {}) => {
  const onFiltersChange = overrides.onFiltersChange || vi.fn();
  const onTypeChange = overrides.onTypeChange || vi.fn();
  const utils = render(
    <FilterChipBar
      filters={overrides.filters || { ...EMPTY_FILTERS }}
      type={overrides.type || 'all'}
      onFiltersChange={onFiltersChange}
      onTypeChange={onTypeChange}
    />,
  );
  return { ...utils, onFiltersChange, onTypeChange };
};

describe('FilterChipBar — base state', () => {
  it('renders type tabs and the + Add filter button when nothing is active', () => {
    renderBar();
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /songs/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/add filter/i)).toBeInTheDocument();
    // Nothing set => no chip rendered.
    expect(screen.queryByLabelText(/edit sort filter/i)).not.toBeInTheDocument();
  });

  it('selecting a type tab fires onTypeChange', () => {
    const { onTypeChange } = renderBar();
    fireEvent.click(screen.getByRole('tab', { name: /artists/i }));
    expect(onTypeChange).toHaveBeenCalledWith('artist');
  });
});

describe('FilterChipBar — chips reflect structured filters', () => {
  it('renders a Sort chip when sort != relevance', () => {
    renderBar({ filters: { ...EMPTY_FILTERS, sort: 'popularity' } });
    const chipTrigger = screen.getByLabelText(/edit sort filter/i);
    expect(chipTrigger).toHaveTextContent(/popularity/i);
  });

  it('renders both Mode and Mood chips when set together', () => {
    renderBar({
      filters: { ...EMPTY_FILTERS, clean: true, mood: ['live'] },
    });
    expect(screen.getByLabelText(/edit mode filter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edit mood filter/i)).toBeInTheDocument();
  });

  it('clicking the chip × removes only that dimension via onFiltersChange', () => {
    const { onFiltersChange } = renderBar({
      filters: {
        ...EMPTY_FILTERS,
        sort: 'popularity',
        clean: true,
      },
    });
    fireEvent.click(screen.getByLabelText(/remove sort filter/i));
    const next = onFiltersChange.mock.calls[0][0];
    expect(next.sort).toBe('relevance');
    expect(next.clean).toBe(true);
  });

  it('Clear all wipes every structured dimension at once', () => {
    const { onFiltersChange } = renderBar({
      filters: {
        ...EMPTY_FILTERS,
        sort: 'popularity',
        clean: true,
        yearFrom: 2010,
        yearTo: 2019,
        mood: ['live'],
      },
    });
    fireEvent.click(screen.getByLabelText(/clear all filters/i));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS });
  });
});

describe('FilterChipBar — sort editor', () => {
  it('opening the sort chip and picking a value emits the new structured filter (NOT operator text)', async () => {
    const { onFiltersChange } = renderBar({
      filters: { ...EMPTY_FILTERS, sort: 'popularity' },
    });
    fireEvent.click(screen.getByLabelText(/edit sort filter/i));
    // The popover renders the four sort options. We click "Newest".
    const newest = await screen.findByText(/^newest$/i);
    fireEvent.click(newest);
    const next = onFiltersChange.mock.calls[0][0];
    // Contract: the value coming out is the structured shape. It is NEVER
    // a string — that's how we keep operators out of the search input.
    expect(typeof next).toBe('object');
    expect(next.sort).toBe('newest');
  });
});

describe('FilterChipBar — Add filter flow', () => {
  it('Add filter button opens the dimensions picker', async () => {
    renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    expect(await screen.findByText(/add a filter/i)).toBeInTheDocument();
    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Length')).toBeInTheDocument();
  });
});
