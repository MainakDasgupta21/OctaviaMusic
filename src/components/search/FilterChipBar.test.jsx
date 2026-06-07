import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterChipBar } from '@/components/search/FilterChipBar';
import { EMPTY_FILTERS, MAX_DURATION, MAX_YEAR, MIN_YEAR } from '@/lib/search-filter-state';

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
  it('Add filter button opens a flat dimensions menu', async () => {
    renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));

    // The picker is a single, standard dropdown menu listing every dimension.
    const menu = await screen.findByRole('menu', { name: /add a filter/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(8);
    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Length')).toBeInTheDocument();
  });

  it('renders a quiet menu with no header band, search, group headings, or legend', async () => {
    renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    await screen.findByRole('menu', { name: /add a filter/i });

    // No search field, no preset/recent/suggested rails, no group headings,
    // no permanent keyboard legend — just the menu rows.
    expect(screen.queryByPlaceholderText(/search filters/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quick filters/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^recent$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/suggested from your search/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Refine')).not.toBeInTheDocument();
    expect(screen.queryByText('Scope')).not.toBeInTheDocument();
    expect(screen.queryByText('Mode')).not.toBeInTheDocument();
    expect(screen.queryByText(/^nav$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^find$/i)).not.toBeInTheDocument();
  });

  it('every dimension row drills into its editor — including Mood and Clean', async () => {
    renderBar();

    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Mood'));
    // Mood opens the dedicated editor (no inline chip strip in the menu).
    expect(await screen.findByText(/mood \/ version/i)).toBeInTheDocument();

    // Back to the menu, then drill into Clean — it should also open its
    // editor instead of toggling inline.
    fireEvent.click(screen.getByLabelText(/back to filter picker/i));
    fireEvent.click(await screen.findByText('Clean only'));
    expect(await screen.findByText(/explicit content/i)).toBeInTheDocument();
  });

  it('Back row returns to the menu without committing changes', async () => {
    const { onFiltersChange } = renderBar();

    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Artist'));
    expect(await screen.findByPlaceholderText(/frank ocean/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/back to filter picker/i));
    expect(await screen.findByRole('menu', { name: /add a filter/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/frank ocean/i)).not.toBeInTheDocument();
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('reopens on the menu after an editor closes itself', async () => {
    renderBar();

    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Sort'));
    expect(await screen.findByText(/sort results/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^newest$/i));
    await waitFor(() => {
      expect(screen.queryByText(/sort results/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/add filter/i));
    expect(await screen.findByRole('menu', { name: /add a filter/i })).toBeInTheDocument();
    expect(screen.queryByText(/sort results/i)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Behavioral regression coverage — every dimension's commit path must emit
// the right structured shape and respect the disabled/empty contract. These
// tests guard against the bug class where a slider boundary or an Enter on
// an empty input silently corrupts filter state.
// =============================================================================

describe('FilterChipBar — Add filter commits the right structured shape', () => {
  it('Sort row commits the chosen option (object, never operator string)', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Sort'));
    fireEvent.click(await screen.findByText(/^newest$/i));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const next = onFiltersChange.mock.calls[0][0];
    expect(typeof next).toBe('object');
    expect(next.sort).toBe('newest');
  });

  it('Artist Add commits the trimmed text and closes the popover', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Artist'));

    const input = await screen.findByPlaceholderText(/frank ocean/i);
    fireEvent.change(input, { target: { value: '  Frank Ocean  ' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].artist).toBe('Frank Ocean');
  });

  it('Album Add commits the trimmed text', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Album'));

    const input = await screen.findByPlaceholderText(/blonde/i);
    fireEvent.change(input, { target: { value: 'Blonde' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].album).toBe('Blonde');
  });

  it('Mood toggles add to the structured mood array', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Mood'));

    fireEvent.click(await screen.findByRole('button', { name: /^live$/i }));
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const next = onFiltersChange.mock.calls[0][0];
    expect(Array.isArray(next.mood)).toBe(true);
    expect(next.mood).toContain('live');
  });

  it('Clean toggle commits clean=true', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Clean only'));

    fireEvent.click(await screen.findByLabelText(/toggle clean-only filter/i));
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].clean).toBe(true);
  });

  it('Exclude Add appends a lowercased token without leading dashes', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Exclude'));

    const input = await screen.findByPlaceholderText(/karaoke/i);
    fireEvent.change(input, { target: { value: '-Karaoke' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].exclude).toEqual(['karaoke']);
  });
});

describe('FilterChipBar — text editors honor the disabled-when-empty contract', () => {
  it('Enter on a blank Artist input does not commit', async () => {
    const { onFiltersChange } = renderBar({
      filters: { ...EMPTY_FILTERS, artist: 'Frank Ocean' },
    });
    fireEvent.click(screen.getByLabelText(/edit artist filter/i));

    const input = await screen.findByPlaceholderText(/frank ocean/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('Update button is disabled when the input is whitespace', async () => {
    renderBar({ filters: { ...EMPTY_FILTERS, artist: 'Frank Ocean' } });
    fireEvent.click(screen.getByLabelText(/edit artist filter/i));

    const input = await screen.findByPlaceholderText(/frank ocean/i);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /update/i })).toBeDisabled();
  });

  it('Remove button always wipes the existing artist value', async () => {
    const { onFiltersChange } = renderBar({
      filters: { ...EMPTY_FILTERS, artist: 'Frank Ocean' },
    });
    fireEvent.click(screen.getByLabelText(/edit artist filter/i));

    // The chip rail also shows a "Remove Artist filter" × button, so we
    // anchor on the exact editor button label to avoid an ambiguous match.
    fireEvent.click(await screen.findByRole('button', { name: /^remove$/i }));
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].artist).toBe('');
  });
});

describe('FilterChipBar — Year editor controls', () => {
  it('seeds From/To inputs from URL state without clipping the lower bound', async () => {
    renderBar({ filters: { ...EMPTY_FILTERS, yearFrom: MIN_YEAR } });
    expect(screen.getByLabelText(/edit year filter/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/edit year filter/i));
    expect(await screen.findByLabelText(/^from year$/i)).toHaveValue(MIN_YEAR);
    expect(await screen.findByLabelText(/^to year$/i)).toHaveValue(null);
  });

  it('seeds the To input when only the upper bound is set', async () => {
    renderBar({ filters: { ...EMPTY_FILTERS, yearFrom: 1995, yearTo: MAX_YEAR } });
    fireEvent.click(screen.getByLabelText(/edit year filter/i));
    expect(await screen.findByLabelText(/^from year$/i)).toHaveValue(1995);
    expect(await screen.findByLabelText(/^to year$/i)).toHaveValue(MAX_YEAR);
  });

  it('typing a year and pressing Enter commits the structured update', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Year'));

    const fromInput = await screen.findByLabelText(/^from year$/i);
    fireEvent.change(fromInput, { target: { value: '2010' } });
    fireEvent.keyDown(fromInput, { key: 'Enter' });

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].yearFrom).toBe(2010);
  });

  it('typing an out-of-range year clamps it to the editor bounds', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Year'));

    const fromInput = await screen.findByLabelText(/^from year$/i);
    fireEvent.change(fromInput, { target: { value: '1700' } });
    fireEvent.keyDown(fromInput, { key: 'Enter' });

    expect(onFiltersChange.mock.calls[0][0].yearFrom).toBe(MIN_YEAR);
  });

  it('clicking a decade preset commits a closed range', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Year'));

    fireEvent.click(await screen.findByRole('button', { name: /^90s$/i }));
    const next = onFiltersChange.mock.calls[0][0];
    expect(next.yearFrom).toBe(1990);
    expect(next.yearTo).toBe(1999);
  });

  it('the Year "Any" preset wipes both bounds', async () => {
    const { onFiltersChange } = renderBar({
      filters: { ...EMPTY_FILTERS, yearFrom: 2010, yearTo: 2019 },
    });
    fireEvent.click(screen.getByLabelText(/edit year filter/i));
    // Multiple "Any" buttons can exist (decade + clear) — the year editor's
    // is unique within its popover, so we scope by role.
    const anyButton = await screen.findByRole('button', { name: /^any$/i });
    fireEvent.click(anyButton);
    const next = onFiltersChange.mock.calls[0][0];
    expect(next.yearFrom).toBeNull();
    expect(next.yearTo).toBeNull();
  });
});

describe('FilterChipBar — Length editor controls', () => {
  it('seeds the minute input from URL state in whole minutes', async () => {
    renderBar({ filters: { ...EMPTY_FILTERS, durationMax: 900 } });
    fireEvent.click(screen.getByLabelText(/edit length filter/i));
    expect(await screen.findByLabelText(/^max minutes$/i)).toHaveValue(15);
  });

  it('typing a minute count and pressing Enter commits the duration cap', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Length'));

    const input = await screen.findByLabelText(/^max minutes$/i);
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0].durationMax).toBe(240);
  });

  it('typing zero or a negative number does not commit', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Length'));

    const input = await screen.findByLabelText(/^max minutes$/i);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onFiltersChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '-3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('a duration preset commits the matching cap in seconds', async () => {
    const { onFiltersChange } = renderBar();
    fireEvent.click(screen.getByLabelText(/add filter/i));
    fireEvent.click(await screen.findByText('Length'));

    fireEvent.click(await screen.findByRole('button', { name: /^3m$/i }));
    expect(onFiltersChange.mock.calls[0][0].durationMax).toBe(180);
  });

  it('the Length "Any" preset clears the cap', async () => {
    const { onFiltersChange } = renderBar({
      filters: { ...EMPTY_FILTERS, durationMax: 300 },
    });
    fireEvent.click(screen.getByLabelText(/edit length filter/i));

    fireEvent.click(await screen.findByRole('button', { name: /^any$/i }));
    expect(onFiltersChange.mock.calls[0][0].durationMax).toBeNull();
  });

  it('opens with the URL cap reflected — never silently clipped to a smaller editor max', async () => {
    // Pick a value safely inside the new editor range that is still
    // multi-minute. The old editor used to cap the slider at 600s, which
    // dropped any URL-supplied cap above that on the next commit.
    renderBar({ filters: { ...EMPTY_FILTERS, durationMax: MAX_DURATION - 60 } });
    fireEvent.click(screen.getByLabelText(/edit length filter/i));
    const expectedMinutes = Math.round((MAX_DURATION - 60) / 60);
    expect(await screen.findByLabelText(/^max minutes$/i)).toHaveValue(
      expectedMinutes,
    );
  });
});
