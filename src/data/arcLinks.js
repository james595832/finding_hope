/** Great-arc pairs — sentiment threads across regions (only links where both ids exist). */
const PAIRS = [
  ["usa", "uk"],
  ["usa", "china"],
  ["france", "germany"],
  ["france", "uk"],
  ["japan", "south_korea"],
  ["japan", "australia"],
  ["india", "kenya"],
  ["india", "iran"],
  ["brazil", "mexico"],
  ["brazil", "argentina"],
  ["ukraine", "germany"],
  ["ukraine", "turkey"],
  ["russia", "china"],
  ["russia", "norway"],
  ["gaza", "iran"],
  ["sudan", "ethiopia"],
  ["nigeria", "kenya"],
  ["turkey", "germany"],
  ["sweden", "denmark"],
  ["australia", "new_zealand"],
  ["indonesia", "australia"],
  ["mexico", "usa"],
  ["norway", "sweden"],
  ["south_korea", "china"],
  ["ethiopia", "kenya"],
  ["turkey", "iran"],
];

export function buildArcLinks(countries) {
  const pick = (id) => countries.find((c) => c.id === id);
  return PAIRS.map(([a, b]) => {
    const A = pick(a);
    const B = pick(b);
    if (!A || !B) return null;
    return {
      startLat: A.lat,
      startLng: A.lon,
      endLat: B.lat,
      endLng: B.lon,
    };
  }).filter(Boolean);
}
