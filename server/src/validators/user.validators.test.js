/* global describe, it, expect */
const { updateCurrentUserSchema } = require('./user.validators');

const asRequest = (body) => ({ body, params: {}, query: {} });

// A tiny but structurally valid base64 image data URL.
const DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD';

describe('updateCurrentUserSchema avatar handling', () => {
  it('accepts an uploaded base64 image data URL', () => {
    const result = updateCurrentUserSchema.safeParse(asRequest({ avatarUrl: DATA_URL }));
    expect(result.success).toBe(true);
    expect(result.data.body.avatarUrl).toBe(DATA_URL);
  });

  it('accepts an external https image URL', () => {
    const result = updateCurrentUserSchema.safeParse(
      asRequest({ avatarUrl: 'https://example.com/avatar.png' }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts null to clear the avatar', () => {
    const result = updateCurrentUserSchema.safeParse(asRequest({ avatarUrl: null }));
    expect(result.success).toBe(true);
    expect(result.data.body.avatarUrl).toBeNull();
  });

  it('rejects a non-image / non-url string', () => {
    const result = updateCurrentUserSchema.safeParse(asRequest({ avatarUrl: 'not-a-url' }));
    expect(result.success).toBe(false);
  });

  it('rejects a non-image data URL', () => {
    const result = updateCurrentUserSchema.safeParse(
      asRequest({ avatarUrl: 'data:text/html;base64,PHNjcmlwdD4=' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects an oversized data URL', () => {
    const huge = `data:image/jpeg;base64,${'A'.repeat(500 * 1024)}`;
    const result = updateCurrentUserSchema.safeParse(asRequest({ avatarUrl: huge }));
    expect(result.success).toBe(false);
  });

  it('still rejects an unknown top-level field (strict body)', () => {
    const result = updateCurrentUserSchema.safeParse(asRequest({ nope: true }));
    expect(result.success).toBe(false);
  });
});
