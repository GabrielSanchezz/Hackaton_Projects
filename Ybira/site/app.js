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
const catalog = window.ybiraCatalog;
const codes = [...new Set(catalog.flatMap((tree) => tree.codes))].sort((a,b) => a.localeCompare(b,"en-US",{numeric:true}));
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
  $("sidewalk-checks").hidden = Boolean(place && place !== "calcada");
  $("space-field").hidden = !place || place === "calcada";
}
field("place").addEventListener("change", showMeasurements);
plant.addEventListener("input", () => $("result").replaceChildren());

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
  if (count) $("result").replaceChildren();
  const mode = automatic ? "Interpreted by Groq AI." : "AI is unavailable. Basic text matching was used.";
  status.textContent = count
    ? `${mode} Check the filled fields and add any missing information.`
    : `${mode} No blank fields were filled. Please review the form.`;
});

plant.addEventListener("submit", (event) => {
  event.preventDefault();
  const assessment = recommendTrees(Object.fromEntries(new FormData(plant)), catalog);
  const result = $("result");
  result.textContent = assessment.message;
  if (!assessment.trees.length) return;
  const ranking = document.createElement("ol");
  ranking.className = "tree-ranking";
  for (const tree of assessment.trees) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = tree.name;
    const facts = document.createElement("p");
    const stock = tree.stock === null ? "Stock unconfirmed" : `${tree.stock} seedlings listed on Oct 27, 2026`;
    facts.textContent = `${tree.scientific} · ${tree.height.join("–")} m adult height · ${stock}`;
    const reason = document.createElement("p");
    const use = tree.established ? "Established sidewalk species" : "Potential sidewalk species in the manual";
    reason.textContent = `Matches ${assessment.code} and the trunk-size limit · Native to São Paulo · ${use}.`;
    item.append(name, facts, reason);
    ranking.append(item);
  }
  result.append(ranking);
});
draw(false);
