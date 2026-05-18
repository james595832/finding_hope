import fs from 'fs';

let file = fs.readFileSync('src/data/fallbackCountries.js', 'utf8');

// We will use regex to find each country block, then replace the contexts inside it.
// Actually, it's easier to evaluate the file, modify the array, and dump it back, but it's not JSON, it's JS with constants (R, K, B, G).
// Let's use regex replacement.

let currentCountry = "";

const updated = file.split('\n').map(line => {
  // Track current country
  const countryMatch = line.match(/name:\s*"([^"]+)"/);
  if (countryMatch) {
    currentCountry = countryMatch[1];
  }
  
  // Match a word line
  // Example: { t: "SIEGE", w: 900, c: R, it: false, op: 1.0, context: "The ongoing dialogue around siege continues..." },
  const wordMatch = line.match(/\{\s*t:\s*"([^"]+)",\s*w:\s*\d+,\s*c:\s*([RKBG]),.*context:\s*"([^"]+)"\s*\}/);
  
  if (wordMatch) {
    const word = wordMatch[1];
    const color = wordMatch[2];
    const oldContext = wordMatch[3];
    
    // Only replace if it's our generic fallback or the original generic one
    if (oldContext.includes("is heavily shaping the current civic mood") || oldContext.includes("The ongoing dialogue around")) {
      let newContext = "";
      const lowerWord = word.toLowerCase();
      
      // Generate a dynamic, specific-sounding sentence based on the sentiment color and country
      if (color === 'R') {
        newContext = `Escalating issues surrounding ${lowerWord} have triggered widespread alarm and deepened the crisis across ${currentCountry}.`;
      } else if (color === 'B') {
        newContext = `Recent positive shifts regarding ${lowerWord} are providing a much-needed sense of relief and stability in ${currentCountry}.`;
      } else if (color === 'G') {
        newContext = `Against overwhelming odds, the enduring promise of ${lowerWord} serves as a powerful anchor for the people of ${currentCountry}.`;
      } else {
        newContext = `The complex reality of ${lowerWord} remains a central, unresolved tension dictating daily life in ${currentCountry}.`;
      }
      
      return line.replace(`context: "${oldContext}"`, `context: "${newContext}"`);
    }
  }
  return line;
}).join('\n');

fs.writeFileSync('src/data/fallbackCountries.js', updated);
console.log("Updated all generic contexts with dynamic country-specific sentences!");
