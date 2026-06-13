// =============================================================================
// Avatar image helpers — pick, validate, and crop a photo entirely client-side
// into a small square data URL. We never upload the raw file; the editor emits
// a downscaled JPEG so the persisted `avatarUrl` stays tiny (a few tens of KB).
// =============================================================================

export const ACCEPTED_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

// Reject obviously-too-large source files before we even decode them.
export const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB

// Output square edge in CSS px. 256 is retina-crisp for both the 32px TopBar
// avatar and the larger account preview, while keeping the data URL small.
export const OUTPUT_SIZE = 256;

// Soft cap on the encoded data URL. If the first encode is larger we re-encode
// at progressively lower quality so a busy photo can't bloat the user record.
const SOFT_MAX_DATA_URL_CHARS = 120 * 1024; // ~120 KB

export class ImageInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageInputError';
  }
}

/**
 * Validate a picked File and decode it into an HTMLImageElement.
 * Resolves with `{ image, revoke }` — call `revoke()` once you're done drawing
 * to release the object URL.
 */
export const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new ImageInputError('No file selected'));
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject(new ImageInputError('Choose a PNG, JPEG, WebP, or GIF image'));
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      reject(new ImageInputError('That image is larger than 8 MB'));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    const revoke = () => URL.revokeObjectURL(url);

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        revoke();
        reject(new ImageInputError('That image could not be read'));
        return;
      }
      resolve({ image, revoke });
    };
    image.onerror = () => {
      revoke();
      reject(new ImageInputError('That image could not be read'));
    };
    image.src = url;
  });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Clamp a drag offset (in viewport px) so the scaled image always covers the
 * square viewport — the crop can never expose empty gutters.
 */
export const clampOffset = ({ image, viewport, scale, offset }) => {
  const maxX = Math.max(0, (image.naturalWidth * scale - viewport) / 2);
  const maxY = Math.max(0, (image.naturalHeight * scale - viewport) / 2);
  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
};

/**
 * Scale that makes the image exactly cover the square viewport at zoom = 1.
 */
export const baseCoverScale = ({ image, viewport }) =>
  Math.max(viewport / image.naturalWidth, viewport / image.naturalHeight);

/**
 * Render the current crop selection to a square JPEG data URL.
 *
 * The crop is defined purely by the on-screen `viewport`, `zoom`, and `offset`,
 * so the output is resolution-independent of `outputSize`.
 */
export const cropToDataUrl = ({
  image,
  viewport,
  zoom = 1,
  offset = { x: 0, y: 0 },
  outputSize = OUTPUT_SIZE,
  type = 'image/jpeg',
  quality = 0.82,
}) => {
  const scale = baseCoverScale({ image, viewport }) * zoom;
  const safeOffset = clampOffset({ image, viewport, scale, offset });

  // Source region (in image px) that maps onto the viewport square.
  const regionSize = viewport / scale;
  const centerX = image.naturalWidth / 2 - safeOffset.x / scale;
  const centerY = image.naturalHeight / 2 - safeOffset.y / scale;
  const sx = centerX - regionSize / 2;
  const sy = centerY - regionSize / 2;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageInputError('Image editing is not supported here');

  // JPEG has no alpha; flatten onto white so transparent PNGs look intentional.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, regionSize, regionSize, 0, 0, outputSize, outputSize);

  let q = quality;
  let dataUrl = canvas.toDataURL(type, q);
  // Re-encode a few times if a detailed photo lands above the soft cap.
  while (dataUrl.length > SOFT_MAX_DATA_URL_CHARS && q > 0.4) {
    q -= 0.12;
    dataUrl = canvas.toDataURL(type, q);
  }
  return dataUrl;
};
