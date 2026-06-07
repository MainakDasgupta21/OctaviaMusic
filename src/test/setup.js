import '@testing-library/jest-dom/vitest';

// jsdom doesn't ship ResizeObserver, but several Radix primitives read it
// on mount. Keep a no-op shim around so any future component test that
// pulls in a Radix component (Popover content sizing, Slider, etc.) doesn't
// blow up at import time.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
