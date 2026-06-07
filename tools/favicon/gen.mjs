// Regenerate public/favicon.ico from public/favicon-octavia.svg.
//
// Why this exists
// ===============
// The SVG declared in index.html (rel="icon" type="image/svg+xml") is what
// every modern browser uses. The .ico is a raster fallback for legacy
// browsers, Windows shortcut UIs, and a handful of link-preview crawlers
// that don't accept SVG icons. It needs to be re-rasterised whenever the
// SVG changes, otherwise the fallback drifts from the in-app brand mark.
//
// Usage
// =====
//   cd tools/favicon
//   npm install        # one-time, installs sharp + png-to-ico locally
//   npm run build      # writes ../../public/favicon.ico
//
// Sizes
// =====
// Only 16/32/48 are emitted. Browsers never request larger frames from a
// favicon.ico (they pull SVG instead) and png-to-ico expands every frame
// to uncompressed BMP, so each extra size adds ~size*size*4 bytes for no
// real-world benefit.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] ?? resolve(HERE, '../../public/favicon-octavia.svg');
const OUT = process.argv[3] ?? resolve(HERE, '../../public/favicon.ico');

const SIZES = [16, 32, 48];

// Strip XML comments before handing the SVG to sharp/librsvg. Browsers
// tolerate "--" inside <!-- ... --> (e.g. CSS custom-property tokens like
// --brand-500 that the SVG's docblock references) but the strict XML
// parser librsvg uses rejects them. The original file on disk keeps the
// comment for humans.
const rawSvg = readFileSync(SRC, 'utf8');
const svg = Buffer.from(rawSvg.replace(/<!--[\s\S]*?-->/g, ''), 'utf8');

const buffers = [];
for (const size of SIZES) {
  const png = await sharp(svg, { density: Math.max(96, size * 4) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  buffers.push(png);
  console.log(`  rendered ${size}x${size} (${png.length} bytes)`);
}

const ico = await pngToIco(buffers);
writeFileSync(OUT, ico);
console.log(`wrote ${OUT} (${ico.length} bytes, ${SIZES.length} sizes)`);
