const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 1. High-resolution Vector SVG for modern browsers & Next.js App Router
const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Background Gradient: Medical Emerald to Teal -->
    <linearGradient id="bp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="55%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>

    <!-- Pill Gradient: Fresh Mint to Deep Emerald -->
    <linearGradient id="pill-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Drop Shadows for depth -->
    <filter id="bp-cross-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#022c22" flood-opacity="0.25" />
    </filter>

    <filter id="bp-pill-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#022c22" flood-opacity="0.32" />
    </filter>
  </defs>

  <!-- Squircle Base with smooth rounded corners -->
  <rect width="512" height="512" rx="120" fill="url(#bp-bg)" />

  <!-- Inner Soft Border Ring -->
  <rect x="12" y="12" width="488" height="488" rx="110" fill="none" stroke="#a7f3d0" stroke-width="6" stroke-opacity="0.4" />

  <!-- Universal Pharmacy Medical Cross (Crisp White) -->
  <g filter="url(#bp-cross-shadow)">
    <!-- Vertical Cross Arm -->
    <rect x="206" y="80" width="100" height="352" rx="30" fill="#ffffff" />
    <!-- Horizontal Cross Arm -->
    <rect x="80" y="206" width="352" height="100" rx="30" fill="#ffffff" />
  </g>

  <!-- Overlaid Diagonal Medicine Capsule Pill (Pharmacy Identity) -->
  <g transform="translate(256, 256) rotate(-45)" filter="url(#bp-pill-shadow)">
    <!-- Pill Base Container -->
    <rect x="-42" y="-105" width="84" height="210" rx="42" fill="#ffffff" stroke="#e2e8f0" stroke-width="3" />
    
    <!-- Top Half of Capsule (Pure Clean White) -->
    <path d="M -42,0 L -42,-63 A 42,42 0 0,1 42,-63 L 42,0 Z" fill="#ffffff" />
    
    <!-- Bottom Half of Capsule (Medical Emerald Gradient) -->
    <path d="M -42,0 L -42,63 A 42,42 0 0,0 42,63 L 42,0 Z" fill="url(#pill-green)" />
    
    <!-- Pill Center Joint Band -->
    <line x1="-42" y1="0" x2="42" y2="0" stroke="#047857" stroke-width="4" stroke-opacity="0.45" />
    
    <!-- Glossy Reflection Highlight -->
    <path d="M -24,-84 A 15,15 0 0,1 -6,-95 L -6,-16 A 15,15 0 0,1 -24,-5 Z" fill="#ffffff" opacity="0.65" />
  </g>
</svg>
`;

// Helper: CRC32
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ (-1));
}

// Helper: Make PNG Buffer from RGBA
function createPng(width, height, rgbaBuffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const rowSize = width * 4;
  const raw = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = 0;
    rgbaBuffer.copy(raw, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }
  
  const idatData = zlib.deflateSync(raw);
  
  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.slice(4, 8 + len));
    buf.writeInt32BE(crcVal, 8 + len);
    return buf;
  }
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Math rasterizer for high quality supersampled rendering
function renderPharmacyIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const SAMPLES = 4; // 4x4 supersampling for ultra smooth anti-aliasing
  const invS = 1.0 / SAMPLES;

  // Signed distance function to rounded box
  function sdRoundedBox(px, py, bx, by, r) {
    const qx = Math.abs(px) - bx + r;
    const qy = Math.abs(py) - by + r;
    return Math.min(Math.max(qx, qy), 0.0) + Math.hypot(Math.max(qx, 0.0), Math.max(qy, 0.0)) - r;
  }

  // Capsule distance
  function sdCapsule(px, py, length, r) {
    const clampedY = Math.max(-length, Math.min(length, py));
    return Math.hypot(px, py - clampedY) - r;
  }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          // Normalized coordinates: center at (0, 0), range [-1, 1]
          const subX = px + (sx + 0.5) * invS;
          const subY = py + (sy + 0.5) * invS;
          const nx = (subX / size) * 2.0 - 1.0;
          const ny = (subY / size) * 2.0 - 1.0;

          // Squircle container: size ~ 0.94, radius ~ 0.28
          const dBase = sdRoundedBox(nx, ny, 0.90, 0.90, 0.32);

          if (dBase > 0) {
            // outside squircle
            continue;
          }

          // Squircle background gradient (Emerald #10b981 to Deep Emerald #047857)
          const t = Math.max(0, Math.min(1, (nx + ny + 1.8) / 3.6));
          let r = Math.round(16 + (4 - 16) * (1 - t));
          let g = Math.round(185 + (120 - 185) * (1 - t));
          let b = Math.round(129 + (87 - 129) * (1 - t));

          // Medical Cross arms
          const dCrossV = sdRoundedBox(nx, ny, 0.18, 0.68, 0.08);
          const dCrossH = sdRoundedBox(nx, ny, 0.68, 0.18, 0.08);
          const inCross = (dCrossV <= 0) || (dCrossH <= 0);

          if (inCross) {
            r = 255;
            g = 255;
            b = 255;
          }

          // Diagonal Capsule Pill (rotated 45 deg counter-clockwise)
          // Rotation matrix for -45 deg: [ cos(-45), -sin(-45); sin(-45), cos(-45) ]
          const cos45 = Math.SQRT1_2;
          const sin45 = Math.SQRT1_2;
          const rx = nx * cos45 - ny * -sin45;
          const ry = nx * -sin45 + ny * cos45;

          // Capsule params: radius 0.16, half-length 0.24 (total span 0.40)
          const dCap = sdCapsule(rx, ry, 0.22, 0.16);

          if (dCap <= 0) {
            if (Math.abs(ry) <= 0.02) {
              // Joint line
              r = 4;
              g = 120;
              b = 87;
            } else if (ry < 0) {
              // Top half of pill: Pure White with subtle gloss
              r = 255;
              g = 255;
              b = 255;
              if (rx < -0.04 && ry < -0.06 && ry > -0.32) {
                // Gloss sheen highlight
                r = 255;
                g = 255;
                b = 255;
              }
            } else {
              // Bottom half of pill: Vibrant Emerald/Mint
              const capT = Math.max(0, Math.min(1, ry / 0.38));
              r = Math.round(52 + (5 - 52) * capT);
              g = Math.round(211 + (150 - 211) * capT);
              b = Math.round(153 + (105 - 153) * capT);
            }
          }

          rSum += r;
          gSum += g;
          bSum += b;
          aSum += 255;
        }
      }

      const totalSamples = SAMPLES * SAMPLES;
      const alpha = aSum / totalSamples;
      const offset = (py * size + px) * 4;

      if (alpha > 0) {
        buf[offset + 0] = Math.round(rSum / totalSamples);
        buf[offset + 1] = Math.round(gSum / totalSamples);
        buf[offset + 2] = Math.round(bSum / totalSamples);
        buf[offset + 3] = Math.round(alpha);
      } else {
        buf[offset + 0] = 0;
        buf[offset + 1] = 0;
        buf[offset + 2] = 0;
        buf[offset + 3] = 0;
      }
    }
  }

  return buf;
}

// Generate ICO containing multiple PNG sizes (16, 32, 48)
function buildIco(sizes) {
  const images = sizes.map(sz => {
    const raw = renderPharmacyIcon(sz);
    const png = createPng(sz, sz, raw);
    return { size: sz, png };
  });

  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + dirEntrySize * images.length;

  let currentOffset = totalHeaderSize;
  const headerBuf = Buffer.alloc(totalHeaderSize);

  // ICO Header
  headerBuf.writeUInt16LE(0, 0); // reserved
  headerBuf.writeUInt16LE(1, 2); // type 1 = ICO
  headerBuf.writeUInt16LE(images.length, 4); // count

  images.forEach((img, idx) => {
    const offset = 6 + idx * 16;
    headerBuf[offset + 0] = img.size >= 256 ? 0 : img.size;
    headerBuf[offset + 1] = img.size >= 256 ? 0 : img.size;
    headerBuf[offset + 2] = 0; // color palette count
    headerBuf[offset + 3] = 0; // reserved
    headerBuf.writeUInt16LE(1, offset + 4); // planes
    headerBuf.writeUInt16LE(32, offset + 6); // bit count
    headerBuf.writeUInt32LE(img.png.length, offset + 8); // size of image data
    headerBuf.writeUInt32LE(currentOffset, offset + 12); // file offset
    currentOffset += img.png.length;
  });

  return Buffer.concat([headerBuf, ...images.map(img => img.png)]);
}

// Run Generation
const publicDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'src', 'app');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

console.log('1. Writing vector SVG favicons...');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), SVG_CONTENT, 'utf8');
fs.writeFileSync(path.join(appDir, 'icon.svg'), SVG_CONTENT, 'utf8');

console.log('2. Generating multi-resolution ICO file (16x16, 32x32, 48x48)...');
const icoData = buildIco([16, 32, 48]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoData);
fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoData);

console.log('3. Generating high-resolution PNG icons (192x192, 512x512)...');
const raw192 = renderPharmacyIcon(192);
const png192 = createPng(192, 192, raw192);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

console.log('Favicon generation completed successfully!');

