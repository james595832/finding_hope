import * as THREE from "three";

/** Clear satellite land/water separation (self-hosted). */
const EARTH_RGB_URL = "/earth-blue-marble.jpg";

const EARTH_DARK_URL = "/earth-dark.jpg";

export const EARTH_TOPOLOGY_URL = "/earth-topology.png";

export const PALETTE = {
  water: [118, 154, 188],
  waterDeep: [96, 132, 168],
  land: [236, 229, 216],
  landDeep: [216, 206, 190],
};

const MODULE = 32;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed: ${src}`));
    img.src = src;
  });
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Blue-marble style RGB: ocean is blue-dominant; land is vegetation, rock, or sand.
 * Produces a stable 0…1 “land” weight per pixel so coastlines read.
 */
function paintFromSatelliteRgb(ctx, W, H, img) {
  const src = document.createElement("canvas");
  src.width = W;
  src.height = H;
  const sctx = src.getContext("2d");
  sctx.drawImage(img, 0, 0, W, H);
  const { data: s } = sctx.getImageData(0, 0, W, H);

  const pix = W * H;
  const landW = new Float32Array(pix);

  for (let p = 0; p < pix; p++) {
    const i = p * 4;
    const r = s[i];
    const g = s[i + 1];
    const b = s[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    const br = b - r;
    const bg = b - g * 0.92;
    let ocean = 0.55 * smoothstep(6, 42, br) + 0.45 * smoothstep(-4, 28, bg);
    ocean = Math.min(1, ocean);

    if (g > r + 14 && g > b - 8 && lum > 38) ocean *= 0.15;
    if (r > g + 18 && r > b - 10 && lum > 95) ocean *= 0.2;
    if (lum > 218 && Math.abs(r - g) < 25 && b > r - 10) ocean = Math.max(ocean, 0.55);

    let land = 1 - ocean;
    land = Math.max(0, Math.min(1, land));
    landW[p] = land;
  }

  const [Wr, Wg, Wb] = PALETTE.water;
  const [WdR, WdG, WdB] = PALETTE.waterDeep;
  const [Lr, Lg, Lb] = PALETTE.land;
  const [Dr, Dg, Db] = PALETTE.landDeep;

  const out = new Uint8ClampedArray(pix * 4);
  for (let p = 0; p < pix; p++) {
    const i = p * 4;
    const r = s[i];
    const g = s[i + 1];
    const b = s[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const land = landW[p];

    const shade = (lum - 85) / 130;
    const Lr2 = Lr + shade * 18;
    const Lg2 = Lg + shade * 16;
    const Lb2 = Lb + shade * 14;

    let rr = Wr + (Lr2 - Wr) * land;
    let gg = Wg + (Lg2 - Wg) * land;
    let bb = Wb + (Lb2 - Wb) * land;

    const coast = land * (1 - land) * 4;
    rr += (Dr - rr) * coast * 0.35;
    gg += (Dg - gg) * coast * 0.35;
    bb += (Db - bb) * coast * 0.35;

    const y = (p / W) | 0;
    const pole = Math.abs(y - H * 0.5) / (H * 0.5);
    const deep = pole * 0.12 * (1 - land * 0.92);
    rr += (WdR - rr) * deep;
    gg += (WdG - gg) * deep;
    bb += (WdB - bb) * deep;

    const x = p % W;
    let edge = 0;
    if (x > 0 && x < W - 1 && y > 0 && y < H - 1) {
      edge =
        Math.abs(land - landW[p - 1]) +
        Math.abs(land - landW[p + 1]) +
        Math.abs(land - landW[p - W]) +
        Math.abs(land - landW[p + W]);
    }
    if (edge > 0.28) {
      const k = 0.9;
      rr *= k;
      gg *= k;
      bb *= k;
    }

    out[i] = Math.round(Math.max(0, Math.min(255, rr)));
    out[i + 1] = Math.round(Math.max(0, Math.min(255, gg)));
    out[i + 2] = Math.round(Math.max(0, Math.min(255, bb)));
    out[i + 3] = 255;
  }

  ctx.putImageData(new ImageData(out, W, H), 0, 0);
}

/** Fallback when only night map is available: luminance quantiles. */
function paintFromDarkLuminance(ctx, W, H, img) {
  const src = document.createElement("canvas");
  src.width = W;
  src.height = H;
  const sctx = src.getContext("2d");
  sctx.filter = "contrast(1.5) brightness(1.1)";
  sctx.drawImage(img, 0, 0, W, H);
  sctx.filter = "none";
  const { data: s } = sctx.getImageData(0, 0, W, H);

  const lums = [];
  for (let i = 0; i < s.length; i += 20) {
    lums.push(0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]);
  }
  lums.sort((a, b) => a - b);
  const n = lums.length;
  const q = (t) => lums[Math.max(0, Math.min(n - 1, Math.floor(t * (n - 1))))];
  let lo = q(0.18);
  let hi = q(0.52);
  if (hi - lo < 18) hi = lo + 24;

  const pix = W * H;
  const landW = new Float32Array(pix);
  for (let p = 0; p < pix; p++) {
    const i = p * 4;
    const lum = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
    landW[p] = smoothstep(lo, Math.max(lo + 10, hi), lum);
  }

  const [Wr, Wg, Wb] = PALETTE.water;
  const [WdR, WdG, WdB] = PALETTE.waterDeep;
  const [Lr, Lg, Lb] = PALETTE.land;
  const [Dr, Dg, Db] = PALETTE.landDeep;
  const out = new Uint8ClampedArray(pix * 4);

  for (let p = 0; p < pix; p++) {
    const i = p * 4;
    const lum = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
    const land = landW[p];
    const shade = (lum - 40) / 100;
    const Lr2 = Lr + shade * 14;
    const Lg2 = Lg + shade * 12;
    const Lb2 = Lb + shade * 10;
    let rr = Wr + (Lr2 - Wr) * land;
    let gg = Wg + (Lg2 - Wg) * land;
    let bb = Wb + (Lb2 - Wb) * land;
    const coast = land * (1 - land) * 4;
    rr += (Dr - rr) * coast * 0.35;
    gg += (Dg - gg) * coast * 0.35;
    bb += (Db - bb) * coast * 0.35;
    const y = (p / W) | 0;
    const pole = Math.abs(y - H * 0.5) / (H * 0.5);
    const deep = pole * 0.1 * (1 - land * 0.9);
    rr += (WdR - rr) * deep;
    gg += (WdG - gg) * deep;
    bb += (WdB - bb) * deep;
    const x = p % W;
    let edge = 0;
    if (x > 0 && x < W - 1 && y > 0 && y < H - 1) {
      edge =
        Math.abs(land - landW[p - 1]) +
        Math.abs(land - landW[p + 1]) +
        Math.abs(land - landW[p - W]) +
        Math.abs(land - landW[p + W]);
    }
    if (edge > 0.22) {
      rr *= 0.9;
      gg *= 0.9;
      bb *= 0.9;
    }
    out[i] = Math.round(rr);
    out[i + 1] = Math.round(gg);
    out[i + 2] = Math.round(bb);
    out[i + 3] = 255;
  }
  ctx.putImageData(new ImageData(out, W, H), 0, 0);
}

function paintFallbackBeigeBlue(ctx, W, H) {
  const [Wr, Wg, Wb] = PALETTE.water;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${Wr + 10},${Wg + 6},${Wb + 4})`);
  g.addColorStop(1, `rgb(${Wr},${Wg},${Wb})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const blobs = [
    { lng: -100, lat: 40, rx: 0.16, ry: 0.12 },
    { lng: -70, lat: -15, rx: 0.08, ry: 0.14 },
    { lng: 10, lat: 52, rx: 0.11, ry: 0.09 },
    { lng: 22, lat: 8, rx: 0.1, ry: 0.15 },
    { lng: 78, lat: 24, rx: 0.17, ry: 0.11 },
    { lng: 118, lat: 35, rx: 0.13, ry: 0.1 },
    { lng: 138, lat: -28, rx: 0.09, ry: 0.08 },
    { lng: 20, lat: -32, rx: 0.07, ry: 0.1 },
  ];
  const [Lr, Lg, Lb] = PALETTE.land;
  for (const z of blobs) {
    const x = ((z.lng + 180) / 360) * W;
    const y = ((90 - z.lat) / 180) * H;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.09);
    rg.addColorStop(0, `rgb(${Lr},${Lg},${Lb})`);
    rg.addColorStop(0.55, `rgba(${Lr},${Lg},${Lb},0.45)`);
    rg.addColorStop(1, `rgba(${Lr},${Lg},${Lb},0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(x, y, W * z.rx, H * z.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintFibonacciLattice(ctx, W, H, count) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const t = i + 0.5;
    const y = 1 - (t / count) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * t;
    const x3 = Math.cos(theta) * r;
    const z3 = Math.sin(theta) * r;
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
    const lng = Math.atan2(z3, x3) * (180 / Math.PI);
    const px = ((lng + 180) / 360) * W;
    const py = ((90 - lat) / 180) * H;
    const a = 0.016 + (i % 4) * 0.007;
    ctx.fillStyle = `rgba(70, 92, 112, ${a})`;
    ctx.fillRect(Math.floor(px), Math.floor(py), 1, 1);
  }
  ctx.restore();
}

export async function createSentimentGlobeTexture(countries, sentimentColorFn) {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  try {
    const img = await loadImage(EARTH_RGB_URL);
    paintFromSatelliteRgb(ctx, W, H, img);
  } catch {
    try {
      const img = await loadImage(EARTH_DARK_URL);
      paintFromDarkLuminance(ctx, W, H, img);
    } catch {
      paintFallbackBeigeBlue(ctx, W, H);
    }
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255, 252, 248, 0.03)";
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += MODULE) {
    const major = x % (MODULE * 4) === 0;
    ctx.strokeStyle = major ? "rgba(65, 88, 108, 0.05)" : "rgba(65, 88, 108, 0.025)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += MODULE) {
    const major = y % (MODULE * 4) === 0;
    ctx.strokeStyle = major ? "rgba(65, 88, 108, 0.05)" : "rgba(65, 88, 108, 0.025)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const list = [...(countries || [])].sort((a, b) => a.arousal - b.arousal);
  for (const c of list) {
    const x = ((c.lon + 180) / 360) * W;
    const y = ((90 - c.lat) / 180) * H;
    const hex = sentimentColorFn(c.valence);
    const { r, g, b } = hexToRgb(hex);
    const radius = 48 + c.arousal * 120;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, radius);
    rg.addColorStop(0, `rgba(${r},${g},${b},0.09)`);
    rg.addColorStop(0.55, `rgba(${r},${g},${b},0.05)`);
    rg.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  paintFibonacciLattice(ctx, W, H, 3600);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
}
