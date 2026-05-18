/**
 * Maps our region IDs → ISO 3166-1 alpha-2 codes for flagcdn.com.
 * flagcdn.com SVG: https://flagcdn.com/{code}.svg  (crispest, any size)
 * flagcdn.com PNG: https://flagcdn.com/w40/{code}.png  (fixed-width raster)
 */
export const FLAG_CODES = {
  iran:        "ir",
  ukraine:     "ua",
  gaza:        "ps",   // Palestinian territories
  sudan:       "sd",
  usa:         "us",
  russia:      "ru",
  uk:          "gb",
  germany:     "de",
  france:      "fr",
  china:       "cn",
  india:       "in",
  brazil:      "br",
  nigeria:     "ng",
  norway:      "no",
  denmark:     "dk",
  japan:       "jp",
  mexico:      "mx",
  australia:   "au",
  kenya:       "ke",
  argentina:   "ar",
  south_korea: "kr",
  turkey:      "tr",
  sweden:      "se",
  indonesia:   "id",
  ethiopia:    "et",
  new_zealand: "nz",
};

/** Returns a flagcdn.com SVG URL for a region id, or null if unmapped. */
export function flagUrl(regionId) {
  const code = FLAG_CODES[regionId];
  return code ? `https://flagcdn.com/${code}.svg` : null;
}
