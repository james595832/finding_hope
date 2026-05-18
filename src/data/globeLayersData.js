/** 3D label + spike payloads for three-globe (words & lines off the sphere). */

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * @param {string|null} hoveredId — when set, that region’s label uses the country name at its lat/lng (not a screen-center overlay).
 */
export function buildGlobeLabels(countries, sentimentColor, hoveredId = null) {
  return countries.map((c) => {
    const top = c.words?.[0]?.t ?? c.name;
    const isHover = hoveredId != null && c.id === hoveredId;
    const text = isHover ? String(c.name).toUpperCase() : String(top).toUpperCase();
    const col = sentimentColor(c.valence);
    return {
      id: c.id,
      lat: c.lat,
      lng: c.lon,
      text,
      color: col,
      arousal: c.arousal,
      alt: isHover ? 0.008 : 0.004,
      size: isHover ? 0.78 + c.arousal * 0.6 : 0.62 + c.arousal * 0.55,
    };
  });
}

export function buildGlobeSpikePaths(countries, sentimentColor) {
  return countries.map((c) => {
    const col = sentimentColor(c.valence);
    const heightNorm = (c.valence + 1) / 2;
    // Scale tip heavily so they act as literal bar indicators standing off the globe
    const tip = 0.12 + heightNorm * 0.65;
    const mid = tip * 0.5;
    return {
      points: [
        [c.lat, c.lon, 0.002],
        [c.lat, c.lon, mid],
        [c.lat, c.lon, tip],
      ],
      // Keep opacity very high so they don't dissolve against the ocean map
      pathColor: [rgba(col, 1.0), rgba(col, 0.9), rgba(col, 0.8)],
    };
  });
}

/**
 * Hope altitude — a single gold pole at each region.
 * Height = "hope reserve" (never zero). Even the worst regions hold a small spark.
 *   hope = 0.25 + ((valence + 1) / 2) * 0.75   →  range 0.25 – 1.0
 *   tip  = 0.06 + hope * 0.55                  →  range ~0.24 – 0.61 above the surface
 * Colour is the same gold used for the hope word in the panel, so the visual
 * language across the globe and the word set stays consistent.
 */
export function buildGlobeHopeSpikes(countries, hopeHex = "#D4A800") {
  return countries.map((c) => {
    const hope = 0.25 + ((c.valence + 1) / 2) * 0.75;
    const tip = 0.06 + hope * 0.55;
    const mid = tip * 0.5;
    return {
      points: [
        [c.lat, c.lon, 0.002],
        [c.lat, c.lon, mid],
        [c.lat, c.lon, tip],
      ],
      pathColor: [rgba(hopeHex, 0.92), rgba(hopeHex, 0.5), rgba(hopeHex, 0.0)],
      hope,
    };
  });
}
