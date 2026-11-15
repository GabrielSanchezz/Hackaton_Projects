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
const codes = [...new Set(data.catalog.flatMap((tree) => tree.codes))].sort((a,b) => a.localeCompare(b,"en-US",{numeric:true}));
for (const code of codes) $("codes").add(new Option(code, code));
for (const s of data.sectors.filter((s) => s.both).sort((a,b) => b.without-a.without).slice(0,3)) {
  const button = document.createElement("button");
  button.textContent = `${englishLabel(s.label)} · ${fmt(s.without)} residents on block faces with no trees`;
  button.onclick = () => { if (!zoomed) draw(true); showSector(s.id); };
  $("targets").append(button);
}
const plant = $("plant");
const intakeFields = ["place", "total", "free", "area", "wires", "tree"];
const field = (name) => plant.elements.namedItem(name);
function showMeasurements() {
  const place = field("place").value;
  $("sidewalk-fields").hidden = Boolean(place && place !== "calcada");
  $("space-field").hidden = !place || place === "calcada";
}
field("place").addEventListener("change", showMeasurements);

$("interpret").addEventListener("submit", async (event) => {
  event.preventDefault();
  const description = $("description").value.trim();
  const status = $("interpret-status");
  const button = $("interpret-button");
  if (!description) {
    status.textContent = "Write a short description of the site.";
    return;
  }
  const before = new Map(intakeFields.map((name) => [name, field(name).value]));
  button.disabled = true;
  status.textContent = "Reading your description...";
  let values;
  let automatic = false;
  try {
    if (location.protocol === "file:") throw Error("Sem servidor");
    const response = await fetch("/api/interpretar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
      signal: AbortSignal.timeout(11_000),
    });
    if (!response.ok) throw Error("IA indisponível");
    ({ fields: values } = await response.json());
    if (!values || typeof values !== "object") throw Error("Resposta inválida");
    automatic = true;
  } catch {
    values = interpretarLocal(description);
  } finally {
    button.disabled = false;
  }
  if ($("description").value.trim() !== description) {
    status.textContent = "The description changed. Click again to read the updated text.";
    return;
  }
  let count = 0;
  for (const name of intakeFields) {
    const input = field(name);
    if (input.value || input.value !== before.get(name) || values[name] == null) continue;
    input.value = String(values[name]);
    if (input.value) count++;
  }
  showMeasurements();
  const mode = automatic ? "Interpreted by Groq AI." : "AI is unavailable. Basic text matching was used.";
  status.textContent = count
    ? `${mode} Check the filled fields and add any missing information.`
    : `${mode} No blank fields were filled. Please review the form.`;
});

plant.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(event.target);
  const place = fields.get("place");
  const totalInput = fields.get("total");
  const freeInput = fields.get("free");
  const total = Number(totalInput);
  const free = Number(freeInput);
  const code = fields.get("code");
  const result = $("result");
  if (!place) result.textContent = "Confirm the site type to continue.";
  else if (place !== "calcada") result.textContent = "This version suggests species for sidewalks. Use the form details to request a site assessment for this location.";
  else if (!totalInput || !freeInput) result.textContent = "Enter the total sidewalk width and the clear space available for pedestrians.";
  else if (free > total) result.textContent = "The clear walking space must fit within the total width. Check your measurements.";
  else if (total < 1.9 || free < 1.2) result.textContent = "These measurements are below the thresholds in the planting guide. Contact São Paulo 156 for help.";
  else if (!fields.get("wires") || !code) result.textContent = "Confirm overhead wiring and request a site assessment using the Chave Arborizar to identify candidate species.";
  else {
    const candidates = data.catalog.filter((tree) => tree.codes.includes(code) && tree.priority)
      .sort((a,b) => b.stock-a.stock).slice(0,2);
    result.textContent = candidates.length
      ? `Catalog options for ${code}: ${candidates.map((s) => s.name).join(" and ")}. Site assessment and stock availability are pending.`
      : `No priority species in the catalog matches code ${code}. Contact the urban forestry team.`;
  }
});
draw(false);
