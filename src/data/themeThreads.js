import * as THREE from "three";

export const THEME_VOCAB = [
  "displacement",
  "conflict",
  "scarcity",
  "economic_anxiety",
  "political_fracture",
  "environmental_crisis",
  "surveillance",
  "demographic_pressure",
  "abundance",
  "calm",
  "resilience",
  "tradition",
  "innovation",
  "hope",
];

export const THEME_COLORS = {
  displacement: "#E5140A",
  conflict: "#E5140A",
  scarcity: "#E5140A",
  economic_anxiety: "#CC4400",
  political_fracture: "#CC4400",
  demographic_pressure: "#CC4400",
  environmental_crisis: "#886600",
  surveillance: "#555555",
  abundance: "#0035CC",
  calm: "#0035CC",
  resilience: "#0035CC",
  tradition: "#004488",
  innovation: "#004488",
  hope: "#D4A800",
};

const KEYWORD_THEME = {
  SIEGE: "conflict",
  RUBBLE: "conflict",
  CORRIDOR: "displacement",
  RESOLVE: "resilience",
  DIASPORA: "displacement",
  RESISTANCE: "resilience",
  PROXY: "conflict",
  STRIKE: "conflict",
  ENRICHMENT: "surveillance",
  PROTEST: "political_fracture",
  THREAD: "resilience",
  FRONTLINE: "conflict",
  DEFIANCE: "resilience",
  WINTER: "calm",
  AID: "scarcity",
  EXHAUSTION: "scarcity",
  DRONE: "conflict",
  GRAIN: "scarcity",
  SIREN: "conflict",
  NATO: "political_fracture",
  FROST: "calm",
  COLLAPSE: "scarcity",
  CHILDREN: "demographic_pressure",
  WITNESS: "resilience",
  HUNGER: "scarcity",
  TESTIMONY: "resilience",
  TRUCE: "conflict",
  TUNNEL: "conflict",
  FIELD: "conflict",
  EMBARGO: "economic_anxiety",
  FAMINE: "scarcity",
  DISPLACEMENT: "displacement",
  SILENCE: "calm",
  FORGOTTEN: "displacement",
  MILITIA: "conflict",
  RSF: "conflict",
  KHARTOUM: "conflict",
  PEACE: "resilience",
  BORDER: "displacement",
  UN: "political_fracture",
  FRACTURE: "political_fracture",
  TARIFF: "economic_anxiety",
  POLARISED: "political_fracture",
  DEBT: "economic_anxiety",
  NOISE: "political_fracture",
  ASSEMBLY: "political_fracture",
  COURT: "political_fracture",
  INFLATION: "economic_anxiety",
  AI: "innovation",
  VOTE: "political_fracture",
  SHUTDOWN: "political_fracture",
  CENSORSHIP: "surveillance",
  ISOLATION: "displacement",
  MOBILISATION: "conflict",
  DISSENT: "political_fracture",
  SANCTION: "economic_anxiety",
  PROPAGANDA: "surveillance",
  UKRAINE: "conflict",
  FSB: "surveillance",
  EXILE: "displacement",
  ORTHODOX: "tradition",
  AUSTERITY: "economic_anxiety",
  WAITING: "scarcity",
  REFORM: "innovation",
  INQUIRY: "political_fracture",
  NHS: "scarcity",
  HOUSING: "economic_anxiety",
  ROYAL: "tradition",
  CHANNEL: "displacement",
  RECESSION: "economic_anxiety",
  MIGRATION: "displacement",
  COALITION: "political_fracture",
  INDUSTRIAL: "innovation",
  MEMORY: "tradition",
  AFD: "political_fracture",
  STEEL: "innovation",
  WIND: "environmental_crisis",
  PENSION: "economic_anxiety",
  BARRICADE: "conflict",
  SOVEREIGNTY: "political_fracture",
  LAICITE: "tradition",
  MACRON: "political_fracture",
  RIOT: "conflict",
  ELITE: "political_fracture",
  GROWTH: "abundance",
  EXPORT: "abundance",
  SURVEILLANCE: "surveillance",
  FACTORY: "innovation",
  TAIWAN: "conflict",
  CHIP: "innovation",
  PROPERTY: "economic_anxiety",
  YOUTH: "demographic_pressure",
  INEQUALITY: "economic_anxiety",
  TECHNOLOGY: "innovation",
  MONSOON: "environmental_crisis",
  ELECTION: "political_fracture",
  PLURALITY: "political_fracture",
  CASTE: "demographic_pressure",
  FARMER: "scarcity",
  SPACE: "innovation",
  HEAT: "environmental_crisis",
  DEFORESTATION: "environmental_crisis",
  CARNIVAL: "tradition",
  CORRUPTION: "political_fracture",
  AMAZON: "environmental_crisis",
  FAVELA: "economic_anxiety",
  SOY: "abundance",
  MINING: "environmental_crisis",
  URBAN: "demographic_pressure",
  RAIN: "environmental_crisis",
  NAIRA: "economic_anxiety",
  INSURGENCY: "conflict",
  HUSTLE: "resilience",
  LAGOS: "demographic_pressure",
  OIL: "economic_anxiety",
  GRID: "scarcity",
  ABUNDANCE: "abundance",
  FJORD: "calm",
  SOVEREIGN: "abundance",
  FUND: "abundance",
  DISTANT: "calm",
  ELECTRIC: "innovation",
  ARCTIC: "environmental_crisis",
  GAS: "economic_anxiety",
  FISH: "abundance",
  PACIFIC: "calm",
  WELFARE: "abundance",
  TRUST: "calm",
  BICYCLE: "innovation",
  HYGGE: "calm",
  CONSENSUS: "political_fracture",
  GREEN: "environmental_crisis",
  EU: "political_fracture",
  CITY: "demographic_pressure",
  DEFLATION: "economic_anxiety",
  AGEING: "demographic_pressure",
  TRADITION: "tradition",
  PRECISION: "innovation",
  YEN: "economic_anxiety",
  ROBOT: "innovation",
  ENERGY: "economic_anxiety",
  CROWD: "demographic_pressure",
  SHRINE: "tradition",
  CARTEL: "conflict",
  FEMICIDE: "conflict",
  COMMUNITY: "resilience",
  USMCA: "economic_anxiety",
  VIOLENCE: "conflict",
  REMESA: "economic_anxiety",
  MAYOR: "political_fracture",
  DROUGHT: "environmental_crisis",
  REMOTE: "displacement",
  REEF: "environmental_crisis",
  VAST: "calm",
  INDIGENOUS: "tradition",
  FIRE: "environmental_crisis",
  COAL: "environmental_crisis",
  ASIA: "political_fracture",
  LABOR: "economic_anxiety",
  SURF: "calm",
  STARTUP: "innovation",
  SAVANNA: "environmental_crisis",
  CHINA: "political_fracture",
  NAIROBI: "demographic_pressure",
  DEFAULT: "economic_anxiety",
  TANGO: "tradition",
  RESILIENCE: "resilience",
  IMF: "economic_anxiety",
  MILEI: "political_fracture",
  BEEF: "abundance",
  PESO: "economic_anxiety",
  IMPEACHMENT: "political_fracture",
  BIRTHRATE: "demographic_pressure",
  PRECARITY: "economic_anxiety",
  HALLYU: "tradition",
  TRADE: "economic_anxiety",
  KPOP: "tradition",
  EARTHQUAKE: "environmental_crisis",
  OPPOSITION: "political_fracture",
  LIRA: "economic_anxiety",
  BOSPHORUS: "tradition",
  KURD: "political_fracture",
  MOSQUE: "tradition",
  GANGS: "conflict",
  DARKNESS: "calm",
  MUSIC: "tradition",
  CAPITAL: "abundance",
  OCEAN: "environmental_crisis",
  JAVA: "tradition",
  ISLAM: "tradition",
  PORT: "abundance",
  ANCIENT: "tradition",
  TIGRAY: "conflict",
  DAM: "environmental_crisis",
  NILE: "environmental_crisis",
  SOURCE: "resilience",
  TREATY: "tradition",
  ISLAND: "displacement",
  DISTANCE: "displacement",
  MAORI: "tradition",
  SHEEP: "abundance",
  STORM: "environmental_crisis",
  FARM: "abundance",
  DAWN: "hope",
  SPRING: "hope",
  MERCY: "hope",
  SURVIVE: "hope",
  ENDURE: "hope",
  EMIGRE: "hope",
  GRIT: "hope",
  ORDER: "hope",
  LIBERTE: "hope",
  POSSIBLE: "hope",
  VERDE: "hope",
  TOMORROW: "hope",
  LIGHT: "hope",
  ENOUGH: "hope",
  BLOSSOM: "hope",
  MANANA: "hope",
  HORIZON: "hope",
  TIERRA: "hope",
  BRIDGE: "hope",
  LJUS: "hope",
  ARCHIPELAGO: "hope",
  KINSHIP: "hope",
};

export const VALID_THEMES = new Set(THEME_VOCAB);

function normalizeWordKey(word) {
  return String(word ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function fallbackThemeFromSignals(word, country) {
  const v = Number(country?.valence ?? 0);
  const a = Number(country?.arousal ?? 0.5);
  const key = normalizeWordKey(word?.t);
  if (key.includes("HOPE") || word?.isHope) return "hope";
  if (v <= -0.5 && a > 0.65) return "conflict";
  if (v <= -0.3) return "economic_anxiety";
  if (v >= 0.35) return "abundance";
  if (a < 0.35) return "calm";
  return "resilience";
}

export function inferWordTheme(word, country) {
  if (word?.isHope) return "hope";
  if (VALID_THEMES.has(word?.theme)) return word.theme;
  const key = normalizeWordKey(word?.t);
  return KEYWORD_THEME[key] ?? fallbackThemeFromSignals(word, country);
}

export function applyThemesToCountry(country) {
  return {
    ...country,
    words: (country.words ?? []).map((word) => ({
      ...word,
      theme: inferWordTheme(word, country),
    })),
  };
}

export function applyThemesToCountries(countries) {
  return (countries ?? []).map(applyThemesToCountry);
}

function themeTitle(theme) {
  const clean = String(theme).replace(/_/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function pairKey(a, b) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function getPairExampleWord(themeEntry, idA, idB) {
  const words = [];
  themeEntry.wordsByToken.forEach((countryIds, token) => {
    if (countryIds.has(idA) && countryIds.has(idB)) {
      words.push({ token, score: countryIds.size });
    }
  });
  words.sort((a, b) => b.score - a.score || a.token.localeCompare(b.token));
  return words[0]?.token ?? themeEntry.exampleWord;
}

function buildHopeRing(ids, byId) {
  const ordered = [...ids].sort((a, b) => byId.get(a).lon - byId.get(b).lon);
  if (ordered.length < 2) return [];
  const edges = [];
  for (let i = 0; i < ordered.length; i++) {
    const fromId = ordered[i];
    const toId = ordered[(i + 1) % ordered.length];
    if (fromId === toId) continue;
    edges.push({
      id: `hope:${pairKey(fromId, toId)}:${i}`,
      theme: "hope",
      fromId,
      toId,
      color: THEME_COLORS.hope,
      participantIds: ordered,
      countryCount: ordered.length,
      exampleWord: "HOPE",
      minOpacity: 0.5,
      maxOpacity: 1,
      thickness: 0.2,
      renderOrder: 30,
    });
  }
  return edges;
}

export function buildThemeNetwork(countries) {
  const withThemes = applyThemesToCountries(countries);
  const byId = new Map(withThemes.map((country) => [country.id, country]));
  const themeMap = new Map();

  withThemes.forEach((country) => {
    (country.words ?? []).forEach((word) => {
      const theme = inferWordTheme(word, country);
      if (!VALID_THEMES.has(theme)) return;

      if (!themeMap.has(theme)) {
        themeMap.set(theme, {
          theme,
          color: THEME_COLORS[theme],
          countryIds: new Set(),
          wordsByToken: new Map(),
        });
      }
      const entry = themeMap.get(theme);
      entry.countryIds.add(country.id);

      const token = String(word.t ?? "").toUpperCase();
      if (!entry.wordsByToken.has(token)) entry.wordsByToken.set(token, new Set());
      entry.wordsByToken.get(token).add(country.id);
    });
  });

  const themeEntries = Array.from(themeMap.values()).map((entry) => {
    const wordGroups = Array.from(entry.wordsByToken.entries())
      .map(([word, countryIds]) => ({
        word,
        countryIds: Array.from(countryIds),
      }))
      .sort((a, b) => b.countryIds.length - a.countryIds.length || a.word.localeCompare(b.word));
    const exampleWord = wordGroups[0]?.word ?? "";
    return {
      ...entry,
      title: themeTitle(entry.theme),
      countryIds: Array.from(entry.countryIds),
      wordGroups,
      exampleWord,
      countryCount: entry.countryIds.size,
    };
  });

  const byTheme = new Map(themeEntries.map((entry) => [entry.theme, entry]));
  const nonHopeEdges = [];

  themeEntries
    .filter((entry) => entry.theme !== "hope" && entry.countryIds.length > 1)
    .forEach((entry) => {
      for (let i = 0; i < entry.countryIds.length - 1; i++) {
        for (let j = i + 1; j < entry.countryIds.length; j++) {
          const fromId = entry.countryIds[i];
          const toId = entry.countryIds[j];
          nonHopeEdges.push({
            id: `${entry.theme}:${pairKey(fromId, toId)}`,
            theme: entry.theme,
            fromId,
            toId,
            color: entry.color,
            participantIds: entry.countryIds,
            countryCount: entry.countryIds.length,
            exampleWord: getPairExampleWord(entry, fromId, toId),
            minOpacity: 0.15,
            maxOpacity: 0.9,
            thickness: 0.12,
            renderOrder: 12,
          });
        }
      }
    });

  const hopeIds = byTheme.get("hope")?.countryIds ?? withThemes.map((country) => country.id);
  const hopeEdges = buildHopeRing(hopeIds, byId);
  const edges = [...nonHopeEdges, ...hopeEdges];

  return {
    countries: withThemes,
    themes: themeEntries,
    themesByKey: byTheme,
    edges,
    byId,
  };
}

export function buildThreadMesh(edge, getCoords) {
  const from = getCoords(edge.fromId);
  const to = getCoords(edge.toId);
  if (!from || !to) return null;

  const chordLength = from.distanceTo(to);
  const baseRadius = from.length();
  const peak = 0.15 * chordLength;
  const control = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(baseRadius + peak);
  const curve = new THREE.QuadraticBezierCurve3(from, control, to);
  const geom = new THREE.TubeGeometry(curve, 36, edge.thickness, 8, false);
  const mat = new THREE.MeshBasicMaterial({
    color: edge.color,
    transparent: true,
    opacity: edge.minOpacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = edge.renderOrder;
  mesh.userData = {
    type: "theme-thread",
    threadId: edge.id,
    theme: edge.theme,
    edge,
  };
  return mesh;
}
