"use strict";
const data = window.ybira;
const $ = (id) => document.getElementById(id);
const colors = ["#fff0b3", "#ffc46c", "#f68a43", "#db4834", "#9f2036"];
const fmt = (value) => value.toLocaleString("en-US", {maximumFractionDigits: 1});
const englishLabel = (label) => label.replace(/^Setor /, "Census area ").replace(/(\d),(\d+) °C$/, "$1.$2 °C");
const reference = "355030811000035";
let zoomed = false;
let selected = null;
function draw(pilot) {
  zoomed = pilot;
  const svg = $("map");
  $("map-title").textContent = pilot ? "Brasilândia" : "São Paulo";
  $("zoom").textContent = pilot ? "Back to São Paulo" : "Explore Brasilândia";
  svg.replaceChildren();
  for (const [index, record] of (pilot ? data.sectors : data.city).entries()) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", record.path);
    shape.setAttribute("class", "area");
    shape.setAttribute("fill", colors[record.band]);
    shape.dataset.index = index;
    const label = document.createElementNS(shape.namespaceURI, "title");
    label.textContent = englishLabel(record.label);
    shape.append(label);
    svg.append(shape);
  }
  const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  outline.setAttribute("class", "outline");
  outline.setAttribute("d", data.outlines[pilot ? 1 : 0]);
  svg.append(outline);
  if (pilot) showSector(selected ?? reference);
  else $("detail").textContent = "Click the highlighted district to explore Brasilândia.";
}
function showSector(id) {
  const index = data.sectors.findIndex((sector) => sector.id === id);
  if (index === -1) return;
  selected = id;
  const s = data.sectors[index];
  $("map").querySelector(".selected")?.classList.remove("selected");
  $("map").querySelector(`[data-index="${index}"]`).classList.add("selected");
  const facts = [englishLabel(s.label)];
  if (s.without !== null) facts.push(`${fmt(s.without)} of ${fmt(s.total)} surveyed residents live on block faces with no trees`);
  if (s.race !== null) facts.push(`${fmt(s.race)}% of residents identified as Black (Preta) or Brown (Parda) in the census`);
  $("detail").textContent = facts.join(" · ");
}
$("map").addEventListener("click", (event) => {
  const target = event.target.closest("[data-index]");
  if (!target) return;
  const record = (zoomed ? data.sectors : data.city)[Number(target.dataset.index)];
  if (zoomed) showSector(record.id);
  else if (record.label.startsWith("Brasilândia")) draw(true);
  else $("detail").textContent = englishLabel(record.label);
});
$("zoom").addEventListener("click", () => draw(!zoomed));
function tab(org) {
  $("citizen").hidden = org;
  $("org").hidden = !org;
  $("org-tab").setAttribute("aria-pressed", org);
  $("citizen-tab").setAttribute("aria-pressed", !org);
  if (org && !zoomed) draw(true);
}
$("citizen-tab").onclick = () => tab(false);
$("org-tab").onclick = () => tab(true);
for (const s of data.sectors.filter((s) => s.both).sort((a,b) => b.without-a.without).slice(0,3)) {
  const button = document.createElement("button");
  button.textContent = `${englishLabel(s.label)} · ${fmt(s.without)} residents on block faces with no trees`;
  button.onclick = () => { if (!zoomed) draw(true); showSector(s.id); };
  $("targets").append(button);
}
draw(false);
