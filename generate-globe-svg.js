import fs from 'fs';
import fetch from 'node-fetch';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';

async function generate() {
  const res = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
  const world = await res.json();
  const countries = topojson.feature(world, world.objects.countries);

  // Set up an orthographic projection (globe from space)
  const projection = d3Geo.geoOrthographic()
    .scale(250)
    .translate([250, 250])
    .clipAngle(90)
    .rotate([-10, -20]); // Focus roughly on Atlantic/Europe/Africa to look nice

  const path = d3Geo.geoPath().projection(projection);

  // Generate SVG string
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">`;
  
  // Optional: A background circle for the ocean
  svg += `<path d="${path({type: "Sphere"})}" fill="#E8E4DB" />`;

  // Draw countries
  svg += `<path d="${path(countries)}" fill="#1E1C1A" />`;
  
  svg += `</svg>`;

  fs.writeFileSync('./public/curved-globe.svg', svg);
  console.log("SVG Generated!");
}

generate().catch(console.error);
