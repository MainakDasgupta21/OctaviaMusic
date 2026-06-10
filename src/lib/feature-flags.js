const parseFlag = (value, fallback = false) => {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const EXPLORE_V2_ENABLED = (() => {
  if (typeof import.meta === 'undefined') return true;
  return parseFlag(import.meta.env?.VITE_EXPLORE_V2_ENABLED, true);
})();
export const EXPLORE_LOOPS_ENABLED = (() => {
  if (typeof import.meta === 'undefined') return true;
  return parseFlag(import.meta.env?.VITE_EXPLORE_LOOPS_ENABLED, true);
})();
export const EXPLORE_SOCIAL_ENABLED = (() => {
  if (typeof import.meta === 'undefined') return true;
  return parseFlag(import.meta.env?.VITE_EXPLORE_SOCIAL_ENABLED, true);
})();
export const EXPLORE_INFINITE_ENABLED = (() => {
  if (typeof import.meta === 'undefined') return true;
  return parseFlag(import.meta.env?.VITE_EXPLORE_INFINITE_ENABLED, true);
})();
export const EXPLORE_DISCOVERY_V3_ENABLED = (() => {
  if (typeof import.meta === 'undefined') return true;
  return parseFlag(import.meta.env?.VITE_EXPLORE_DISCOVERY_V3_ENABLED, true);
})();

export default {
  EXPLORE_V2_ENABLED,
  EXPLORE_LOOPS_ENABLED,
  EXPLORE_SOCIAL_ENABLED,
  EXPLORE_INFINITE_ENABLED,
  EXPLORE_DISCOVERY_V3_ENABLED,
};
