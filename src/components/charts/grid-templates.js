// Shared chart row/header templates keep every chart surface aligned.
// Tablet (`md`) intentionally stays less dense; extra metadata columns defer
// to `lg` to avoid clipping in the 768-1023 range.
export const CHART_SONG_GRID_TEMPLATE =
  'grid-cols-[2.2rem_2.6rem_minmax(0,1fr)_auto] sm:grid-cols-[2.6rem_3rem_minmax(0,1fr)_5.2rem_auto] md:grid-cols-[2.8rem_3.2rem_minmax(0,1fr)_6rem_auto] lg:grid-cols-[3rem_4rem_minmax(0,1fr)_4.8rem_7rem_4.6rem_auto]';

export const CHART_ARTIST_GRID_TEMPLATE =
  'grid-cols-[2.4rem_2.8rem_minmax(0,1fr)_6rem] sm:grid-cols-[2.8rem_3rem_minmax(0,1fr)_5.5rem_6rem] md:grid-cols-[3rem_3.4rem_minmax(0,1fr)_6rem_7rem] lg:grid-cols-[3.2rem_4.2rem_minmax(0,1fr)_minmax(0,0.85fr)_6.5rem_8rem]';
