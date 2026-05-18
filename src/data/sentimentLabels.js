/** One-line editorial read for the panel — public language, not clinical scales. */
export function primarySentimentStripLabel(valence, arousal) {
  const v = Number(valence) || 0;
  const a = Number(arousal) || 0;
  if (v >= 0.45 && a < 0.4) return "CALM";
  if (v >= 0.35) return "HOPEFUL";
  if (v >= 0.08 && a < 0.38) return "STABLE";
  if (v < -0.55 && a >= 0.65) return "SEVERE";
  if (v < -0.28 && a >= 0.52) return "ANXIOUS";
  if (v < -0.18 && a >= 0.62) return "TURBULENT";
  if (v < -0.12) return "TENSE";
  if (a >= 0.68) return "VOLATILE";
  return "SOMBER";
}
