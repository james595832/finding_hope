import fs from 'fs';

const file = fs.readFileSync('src/data/fallbackCountries.js', 'utf8');

// Dictionary of rich, specific contexts for keywords
const contextMap = {
  "CARNIVAL": "Street festivals return with massive cultural celebrations, providing economic relief.",
  "CORRUPTION": "Ongoing public investigations are severely testing the population's trust in institutional governance.",
  "AMAZON": "Global scrutiny intensifies as vital ecosystem protections face aggressive legislative rollbacks.",
  "INEQUALITY": "The widening wealth gap in major cities is driving deep civic unrest and calls for systemic reform.",
  "FAVELA": "Community-led initiatives are sparking localized economic growth despite municipal neglect.",
  "SOY": "Agricultural export booms are driving massive economic gains, but at extreme environmental costs.",
  "MINING": "Extractive industries face severe backlash following recent environmental and indigenous rights violations.",
  "URBAN": "Rapid metropolitan expansion is stretching city infrastructure to an absolute breaking point.",
  "VOTE": "A highly polarized upcoming election has the population deeply divided on the country's future.",
  "RAIN": "Unprecedented seasonal flooding has displaced thousands and destroyed crucial agricultural yields.",
  "VERDE": "A new wave of green technology investments is providing a glimmer of hope for sustainable jobs.",
  "PROTESTS": "Citizens continue to take to the streets, demanding immediate accountability from state leaders.",
  "SANCTIONS": "Heavy international economic restrictions are crippling daily commerce and inflating living costs.",
  "WOMEN": "A fierce, grassroots feminist movement is challenging decades of systemic patriarchal oppression.",
  "INTERNET": "State-mandated connectivity blackouts are being used to suppress civic coordination and free speech.",
  "EXECUTION": "A brutal surge in state-sponsored capital punishment has drawn severe international condemnation.",
  "POVERTY": "Crushing economic conditions are forcing millions below the poverty line with no safety net.",
  "WATER": "Severe regional droughts are sparking desperate conflicts over access to basic clean water reserves.",
  "RESISTANCE": "Underground civic networks are maintaining a quiet but unbroken defiance against the regime.",
  "OIL": "Fluctuating global energy markets are creating massive instability in the national revenue streams.",
  "DRONES": "Relentless aerial bombardments continue to decimate civilian infrastructure and power grids.",
  "FRONTLINE": "Heavy casualty reports from the eastern regions are casting a grim shadow over the national mood.",
  "AID": "International relief packages are the only thing preventing total economic collapse in battered regions.",
  "ALLIES": "Diplomatic support from western partners remains crucial for sustaining the long-term defense effort.",
  "FATIGUE": "The sheer duration of the ongoing conflict is beginning to wear down public resilience and morale.",
  "WINTER": "Looming energy shortages are raising fears of a catastrophic humanitarian crisis as temperatures drop.",
  "DEFENSE": "Military mobilization efforts have completely reshaped daily life and civic priorities.",
  "REBUILD": "Early reconstruction efforts in liberated zones are providing a desperately needed sense of future.",
  "HOUSING": "A severe shortage of affordable homes is locking an entire generation out of property ownership.",
  "STRIKES": "Coordinated labor walkouts across major transport sectors are bringing the economy to a standstill.",
  "NHS": "Chronic underfunding has pushed the national healthcare system to the brink of total operational collapse.",
  "BREXIT": "The lingering economic friction from leaving the trade union continues to choke small business growth.",
  "ROYALS": "Ongoing institutional drama within the monarchy is distracting from urgent domestic policy crises.",
  "MIGRATION": "Record numbers of displaced people arriving at the borders are severely testing national infrastructure.",
  "INFLATION": "The skyrocketing cost of basic groceries and energy is wiping out middle-class savings.",
  "HUSTLE": "The informal gig economy has become the only viable survival mechanism for millions of unemployed youth.",
  "NAIRA": "The rapid devaluation of the national currency has erased billions in purchasing power overnight.",
  "INSURGENCY": "Ongoing regional militant violence continues to displace rural communities and disrupt farming.",
  "YOUTH": "A massive, digitally-native young population is growing increasingly frustrated with aging leadership.",
  "CLIMATE": "Historic heatwaves and erratic weather patterns are forcing a massive rethink of national energy policies.",
  "ENERGY": "The frantic pivot away from fossil fuels is creating both massive economic pain and new green opportunities.",
  "FAR RIGHT": "A sudden surge in populist nationalism is fracturing the traditional political consensus.",
  "PENSIONS": "Controversial reforms to the retirement age have sparked some of the largest civic riots in a decade.",
  "TECH": "A booming domestic startup sector is attempting to rival Silicon Valley in AI and green innovation.",
  "DEBT": "Crippling national loan obligations are forcing the government into deeply unpopular austerity measures.",
  "CENSORSHIP": "Strict new digital speech laws are successfully stifling public dissent and independent journalism.",
  "YEN": "The historic weakness of the currency is driving up import costs but creating a massive tourism boom.",
  "AGING": "A rapidly shrinking workforce is forcing a massive societal shift towards automation and AI integration.",
  "CARTELS": "Ongoing territorial violence between organized crime syndicates continues to paralyze entire regions.",
  "BORDERS": "Intense militarization and shifting immigration policies are creating a continuous humanitarian crisis.",
  "DROUGHT": "Consecutive years of failed rains have decimated crop yields and threatened regional food security.",
  "AI": "Rapid integration of artificial intelligence is fundamentally reshaping the national technology sector.",
  "HOPE": "Despite overwhelming systemic challenges, community solidarity remains remarkably unbroken."
};

let updated = file.replace(/context:\s*"this is why the topic of ([a-z\s]+) is heavily shaping the current civic mood here\."/gi, (match, word) => {
  const upperWord = word.trim().toUpperCase();
  if (contextMap[upperWord]) {
    return `context: "${contextMap[upperWord]}"`;
  }
  // Generic fallback if not in dictionary but makes it sound specific
  return `context: "The ongoing dialogue around ${word.toLowerCase()} continues to heavily dictate the national agenda and civic mood."`;
});

// For any remaining generic ones, let's inject a slightly better string
fs.writeFileSync('src/data/fallbackCountries.js', updated);
console.log("Updated fallback data contexts!");
