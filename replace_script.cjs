const fs = require('fs');

let content = fs.readFileSync('src/SentimentGlobe.jsx', 'utf8');

// 1. Rename "threads" state value to "indicator" (only inside viewMode context)
content = content.replace(/viewMode === "threads"/g, 'viewMode === "indicator"');
content = content.replace(/viewMode !== "threads"/g, 'viewMode !== "indicator"');
content = content.replace(/viewModeRef\.current === "threads"/g, 'viewModeRef.current === "indicator"');
content = content.replace(/viewModeRef\.current !== "threads"/g, 'viewModeRef.current !== "indicator"');

// 2. Change the toggle label and description
content = content.replace(
  '{ id: "threads", label: "Threads", title: "Theme threads connect countries that share emotional language. Hover and click lines to inspect the network." }',
  '{ id: "indicator", label: "Indicator", title: "Indicator view shows native spikes where height is based on the hope vs turmoil polarity and colour reflects sentiment." }'
);

// 3. Change legend indicator text at the bottom left
content = content.replace(
  'Threads = shared themes',
  'Indicator = polarity (turmoil vs hope)'
);

// 4. Disable actual thread arc generation inside rebuildThreadMeshes
content = content.replace(
  'if (viewMode !== "indicator" || !globe) return;',
  'return; // Disable static thread generation based on user feedback'
);

// 5. Hide or remove the selectedTheme panel logic. 
content = content.replace(
  '{selectedTheme && viewMode === "indicator" && (',
  '{false && selectedTheme && viewMode === "indicator" && ('
);

// 6. Fix the tooltip mapping for threads since we have no threads now
content = content.replace(
  '{viewMode === "indicator" && threadTooltip && (',
  '{false && viewMode === "indicator" && threadTooltip && ('
);

fs.writeFileSync('src/SentimentGlobe.jsx', content);

// Now AboutProject.jsx
let aboutContent = fs.readFileSync('src/AboutProject.jsx', 'utf8');
aboutContent = aboutContent.replace(
  /<strong style={{ fontWeight: 600 }}>Threads view<\/strong>[\s\S]*?about hope, not about traffic between countries\./g,
  '<strong style={{ fontWeight: 600 }}>Indicator view</strong> — a small toggle at the bottom-left switches to <em>Indicator</em>. In this view, we remove the default hope-reserve floor. Spikes emerge showing true polarity: tall heights represent hope, while short, compressed heights indicate turmoil. Colour maps directly to raw sentiment.'
);
fs.writeFileSync('src/AboutProject.jsx', aboutContent);
console.log('Replacements complete');
