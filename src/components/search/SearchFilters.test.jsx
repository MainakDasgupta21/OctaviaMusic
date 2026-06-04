import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilters } from '@/components/search/SearchFilters';
import { ActiveFilterChips } from '@/components/search/ActiveFilterChips';
import { parseQuery } from '@/lib/search-rank';

describe('SearchFilters — trigger button', () => {
  it('renders the filters trigger when the popover is closed', () => {
    render(
      <SearchFilters query="rock" parsed={parseQuery('rock')} onChange={() => {}} />,
    );
    // Trigger reads "Filters" — visible whether the popover is open or not.
    expect(screen.getByLabelText(/advanced filters/i)).toBeInTheDocument();
  });

  it('shows an active count badge when filters are present in the parsed query', () => {
    const parsed = parseQuery('rock year>=2000 year<=2010 sort:newest');
    render(
      <SearchFilters
        query="rock year>=2000 year<=2010 sort:newest"
        parsed={parsed}
        onChange={() => {}}
      />,
    );
    // year-from + year-to + sort = 3 active filters
    const trigger = screen.getByLabelText(/advanced filters/i);
    expect(trigger).toHaveTextContent('3');
  });
});

describe('ActiveFilterChips — round-trip', () => {
  it('emits the URL operator string when a chip is removed', () => {
    const onChange = vi.fn();
    const query = 'rock year>=2000 year<=2010 sort:newest live';
    const parsed = parseQuery(query);
    render(<ActiveFilterChips query={query} parsed={parsed} onChange={onChange} />);

    const yearRemove = screen.getByLabelText(/remove 2000–2010 filter/i);
    fireEvent.click(yearRemove);
    expect(onChange).toHaveBeenCalled();
    // Year operators stripped, sort + intent preserved
    const next = onChange.mock.calls[0][0];
    expect(next).not.toContain('year>=');
    expect(next).not.toContain('year<=');
    expect(next).toContain('sort:newest');
    expect(next).toContain('live');
  });

  it('renders nothing when no filters are active', () => {
    const { container } = render(
      <ActiveFilterChips
        query="rock"
        parsed={parseQuery('rock')}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('clear-all sets the query to the empty string', () => {
    const onChange = vi.fn();
    const query = 'rock sort:newest';
    const parsed = parseQuery(query);
    render(<ActiveFilterChips query={query} parsed={parsed} onChange={onChange} />);

    fireEvent.click(screen.getByText(/clear all/i));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
