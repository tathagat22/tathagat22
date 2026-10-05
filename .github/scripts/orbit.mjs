// Renders dist/orbit.svg: public repos orbiting a star.
// Inner orbit = most recently pushed. Planet size = repo size. Color = language.
import { mkdirSync, writeFileSync } from "node:fs";

const USER = "tathagat22";
const MAX_PLANETS = 8;
const W = 900, H = 400, CX = W / 2, CY = 190;

const LANG_COLORS = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572a5", Rust: "#dea584",
  Swift: "#f05138", Go: "#00add8", HTML: "#e34c26", CSS: "#663399", Shell: "#89e051",
};

const headers = { Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner&sort=pushed`, { headers });
if (!res.ok) throw new Error(`GitHub API ${res.status}`);

const repos = (await res.json())
  .filter((r) => !r.fork && !r.archived && r.name !== USER)
  .slice(0, MAX_PLANETS);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Deterministic starfield so the SVG only changes when the repos do.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 90 }, () => {
  const x = (rand() * W).toFixed(1), y = (rand() * H).toFixed(1);
  const r = (rand() * 1.1 + 0.3).toFixed(2), d = (rand() * 4 + 2).toFixed(1);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#e5e7eb"><animate attributeName="opacity" values="0.15;0.8;0.15" dur="${d}s" repeatCount="indefinite"/></circle>`;
});

const TILT = 0.36; // ellipse squash for a tilted-plane look
const orbits = [];
const planets = [];
repos.forEach((repo, i) => {
  const rx = 95 + i * 44;
  const ry = rx * TILT;
  const period = (14 * Math.pow(1.35, i)).toFixed(1);
  const radius = Math.min(11, 3.5 + Math.log10(repo.size + 10) * 1.6).toFixed(1);
  const color = LANG_COLORS[repo.language] ?? "#9ca3af";
  const path = `M ${CX + rx} ${CY} A ${rx} ${ry} 0 1 1 ${CX - rx} ${CY} A ${rx} ${ry} 0 1 1 ${CX + rx} ${CY}`;
  const begin = (-(i * 0.37 % 1) * period).toFixed(1); // spread starting angles

  orbits.push(`<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry.toFixed(1)}" stroke="#1f2937" stroke-width="1" fill="none"/>`);
  planets.push(`<g>
    <animateMotion dur="${period}s" begin="${begin}s" repeatCount="indefinite" path="${path}"/>
    <circle r="${(radius * 2.2).toFixed(1)}" fill="${color}" opacity="0.15"/>
    <circle r="${radius}" fill="${color}"/>
    <text x="${(+radius + 6).toFixed(1)}" y="4" font-size="11" fill="#9ca3af">${esc(repo.name)}</text>
  </g>`);
});

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Menlo, Consolas, 'Courier New', monospace">
  <defs>
    <radialGradient id="sun"><stop offset="0" stop-color="#fef3c7"/><stop offset="0.45" stop-color="#fbbf24"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="14" fill="#0b0f17"/>
  ${stars.join("\n  ")}
  ${orbits.join("\n  ")}
  <circle cx="${CX}" cy="${CY}" r="46" fill="url(#sun)"><animate attributeName="r" values="44;50;44" dur="5s" repeatCount="indefinite"/></circle>
  <circle cx="${CX}" cy="${CY}" r="13" fill="#fef3c7"/>
  ${planets.join("\n  ")}
  <text x="${CX}" y="${H - 18}" text-anchor="middle" font-size="11" letter-spacing="2" fill="#4b5563">REPOS IN ORBIT · CLOSER = PUSHED MORE RECENTLY · UPDATED DAILY</text>
</svg>
`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/orbit.svg", svg);
console.log(`orbit.svg: ${repos.map((r) => r.name).join(", ")}`);
