"use strict";

const data = window.ybira;
const $ = id => document.getElementById(id);
const map = $("map");
const colors = ["#ffe3a0", "#ffbe72", "#f48a4b", "#db5039", "#9f2036"];
const fmt = value => value.toLocaleString("en-US", { maximumFractionDigits: 1 });
const mapBounds = { width: 360, height: 350 };
const svgNS = "http://www.w3.org/2000/svg";
const pilotName = "Brasilândia";
const reference = "355030811000035";
const view = { x: 0, y: 0, k: 1 };
const pointers = new Map();
let dragging = false;
let suppressClick = false;
let selected = null;
const ratioLabels = ["<20%", "20–<40%", "40–<60%", "60–<80%", "80–100%"];
const ratios = [.2, .4, .6, .8];
const greens = ["#ebf3eb", "#bce0bd", "#77bb87", "#3f8f66", "#185941"];
const purples = ["#f0e9f3", "#d8bfdf", "#bc92c7", "#925e9c", "#673868"];
const layers = {
  heat: { label: "Average surface heat · Landsat 9 · Nov 29, 2025", bands: [33, 37, 41, 45], labels: ["<33 °C", "33–<37", "37–<41", "41–<45", "45+"], value: a => a.heat ? a.mean : null, palette: colors },
  peak: { label: "Hottest valid surface pixel · Landsat 9 · Nov 29, 2025", bands: [35, 40, 45, 50], labels: ["<35 °C", "35–<40", "40–<45", "45–<50", "50+"], value: a => a.heat ? a.max : null, palette: colors },
  priority: { label: "Planting priority · Higher score = earlier field visit", bands: [20, 40, 60, 80], labels: ["<20", "20–<40", "40–<60", "60–<80", "80–100"], value: a => a.priority, palette: colors },
  vegetation: { label: "Estimated vegetation cover · GeoSampa, imagery from 2017–18", bands: ratios, labels: ratioLabels, value: a => a.vegetation, palette: greens },
  income: { label: "Median monthly income of household heads with earnings · Census 2022", bands: [1000, 1500, 2000, 3000], labels: ["<R$1k", "1–<1.5k", "1.5–<2k", "2–<3k", "R$3k+"], value: a => a.income, palette: greens },
  equity: { label: "Share identifying as Black (Preta) or Brown (Parda) · Census 2022", bands: ratios, labels: ratioLabels, value: a => a.equity, palette: purples },
  exposure: { label: "Share of assessed residents on blocks without trees · Census 2022", bands: ratios, labels: ratioLabels, value: a => a.exposed, palette: colors },
};

function formatLayer(key, value) {
  if (!Number.isFinite(value)) return "Data unavailable";
  if (key === "heat" || key === "peak") return fmt(value) + " °C";
  if (key === "priority") return fmt(value) + "/100";
  if (key === "income") return "R$ " + fmt(value);
  return fmt(value * 100) + "%";
}

function setLayer(key, focus = false) {
  $("map-layer").value = key;
  const layer = layers[key];
  $("legend-title").textContent = layer.label;
  const legend = $("map-legend");
  legend.replaceChildren();
  for (const [index, label] of layer.labels.entries()) {
    const swatch = document.createElement("span");
    swatch.textContent = label;
    swatch.style.setProperty("--color", layer.palette[index]);
    legend.append(swatch);
  }
  for (const [id, shape] of sectorPaths) {
    const area = sectorIndicators.get(id);
    const value = layer.value(area);
    const band = layer.bands.filter(threshold => value >= threshold).length;
    shape.setAttribute("fill", Number.isFinite(value) ? layer.palette[band] : "#bac3c0");
    shape.firstElementChild.textContent = "Census area " + id + " · " + formatLayer(key, value);
  }
  for (const district of districts.children) {
    district.setAttribute("fill", key === "heat" ? district.dataset.heatColor : "#e4eae7");
  }
  if (focus && key !== "heat" && sectors.classList.contains("map-hidden")) focusPilot();
  if (selected && !sectors.classList.contains("map-hidden")) describeSelection(selected);
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function addShape(record, attrs) {
  const node = svg("path", { d: record.path, class: "area", "fill-rule": "evenodd", ...attrs });
  const info = svg("title");
  info.textContent = record.label.replace("Setor ", "Census area ");
  node.append(info);
  return node;
}

function townLabel(record) {
  return record.label.split(" · ")[0];
}

const districts = svg("g");
const sectors = svg("g", { class: "map-sectors" });
const districtLabels = svg("g", { class: "district-labels" });
const communityLabels = svg("g", { class: "community-labels" });
const pilotDistrict = data.city.find(record => townLabel(record) === pilotName);
const sectorPaths = new Map();

for (const record of data.city) {
  const isPilot = record === pilotDistrict;
  const heatColor = colors[record.band] ?? "#bac3c0";
  const attrs = { fill: heatColor, "data-heat-color": heatColor, "data-district": townLabel(record), "data-temperature": record.label.split(" · ")[1] ?? "" };
  const path = addShape(record, attrs);
  if (isPilot) path.classList.add("pilot-area");
  districts.append(path);
}
const outline = svg("path", { d: data.outlines[1], class: "outline" });
for (const record of data.sectors) {
  const path = addShape(record, { "data-sector": record.id });
  sectorPaths.set(record.id, path);
  sectors.append(path);
}
sectors.append(outline);
map.append(districts, sectors, districtLabels, communityLabels);

const pilotBox = districts.querySelector(".pilot-area").getBBox();
const rawBox = outline.getBBox();
const sx = pilotBox.width / rawBox.width;
const sy = pilotBox.height / rawBox.height;
const ox = pilotBox.x - rawBox.x * sx;
const oy = pilotBox.y - rawBox.y * sy;
sectors.setAttribute("transform", "matrix(" + [sx, 0, 0, sy, ox, oy].join(" ") + ")");

function makeLabel(parent, text, x, y) {
  const label = svg("text", { x, y, "text-anchor": "middle" });
  label.textContent = text;
  parent.append(label);
}

for (const district of districts.children) {
  const box = district.getBBox();
  makeLabel(districtLabels, district.dataset.district, box.x + box.width / 2, box.y + box.height / 2);
}

const communities = new Map();
for (const [id, path] of sectorPaths) {
  const name = window.ybiraOrganizationData[id]?.[9];
  if (!name || window.ybiraOrganizationData[id][6] <= 0) continue;
  const box = path.getBBox();
  const points = communities.get(name) ?? [];
  points.push([ox + (box.x + box.width / 2) * sx, oy + (box.y + box.height / 2) * sy]);
  communities.set(name, points);
}
for (const [name, points] of communities) {
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  makeLabel(communityLabels, name, x, y);
}

function spaceLabels(group, w, h) {
  if (group.classList.contains("map-hidden")) return;
  const placed = [];
  const labelHeight = 13 / view.k;
  for (const label of group.children) {
    const x = Number(label.getAttribute("x"));
    const y = Number(label.getAttribute("y"));
    const width = label.textContent.length * 6.5 / view.k;
    const bbox = [x - width / 2, x + width / 2, y - labelHeight, y + 2 / view.k];
    const offscreen = bbox[0] < view.x || bbox[1] > view.x + w || bbox[2] < view.y || bbox[3] > view.y + h;
    const overlap = placed.some(other => bbox[0] < other[1] && bbox[1] > other[0] && bbox[2] < other[3] && bbox[3] > other[2]);
    label.classList.toggle("map-hidden", offscreen || overlap);
    if (!offscreen && !overlap) placed.push(bbox);
  }
}

function renderMap() {
  const w = mapBounds.width / view.k;
  const h = mapBounds.height / view.k;
  view.x = Math.max(-10, Math.min(mapBounds.width + 10 - w, view.x));
  view.y = Math.max(-10, Math.min(mapBounds.height + 10 - h, view.y));
  map.setAttribute("viewBox", [view.x, view.y, w, h].join(" "));
  const seesPilot = view.x < pilotBox.x + pilotBox.width && view.x + w > pilotBox.x
    && view.y < pilotBox.y + pilotBox.height && view.y + h > pilotBox.y;
  const showSectors = view.k >= 4 && seesPilot;
  sectors.classList.toggle("map-hidden", !showSectors);
  districtLabels.classList.toggle("map-hidden", view.k < 2 || (showSectors && view.k >= 11));
  communityLabels.classList.toggle("map-hidden", !showSectors || view.k < 11);
  map.style.setProperty("--label-size", (11 / view.k) + "px");
  spaceLabels(districtLabels, w, h);
  spaceLabels(communityLabels, w, h);
  $("map-title").textContent = showSectors ? pilotName : "São Paulo";
  $("zoom").textContent = showSectors ? "Back to São Paulo" : "Explore Brasilândia";
  $("map-out").disabled = view.k <= 1;
  $("map-in").disabled = view.k >= 55;
}

function world(clientX, clientY) {
  return new DOMPoint(clientX, clientY).matrixTransform(map.getScreenCTM().inverse());
}

function zoomAt(factor, clientX, clientY) {
  const target = world(clientX, clientY);
  const next = Math.min(55, Math.max(1, view.k * factor));
  view.x = target.x - (target.x - view.x) * view.k / next;
  view.y = target.y - (target.y - view.y) * view.k / next;
  view.k = next;
  renderMap();
}

function stepZoom(factor) {
  const box = map.getBoundingClientRect();
  zoomAt(factor, box.x + box.width / 2, box.y + box.height / 2);
}

function focusArea(x, y, k) {
  view.k = k;
  view.x = x - mapBounds.width / (2 * k);
  view.y = y - mapBounds.height / (2 * k);
  renderMap();
}

function focusPilot() {
  focusArea(pilotBox.x + pilotBox.width / 2, pilotBox.y + pilotBox.height / 2, 8);
}

function describeSelection(id) {
  const area = sectorIndicators.get(id);
  const key = $("map-layer").value;
  $("detail").textContent = (area.community ? area.community + " · " : "") + "Census area " + id
    + " · " + formatLayer(key, layers[key].value(area));
}

function selectSector(id, center = false) {
  const shape = sectorPaths.get(id);
  if (!shape) return;
  sectorPaths.get(selected)?.classList.remove("selected");
  selected = id;
  shape.classList.add("selected");
  $("map-area").value = id;
  describeSelection(id);
  if (center) {
    const box = shape.getBBox();
    focusArea(ox + (box.x + box.width / 2) * sx, oy + (box.y + box.height / 2) * sy, Math.max(15, view.k));
  }
  map.dispatchEvent(new CustomEvent("sectorchange", { detail: id }));
}

function tab(org) {
  $("citizen").hidden = org;
  $("org").hidden = !org;
  $("org").parentElement.classList.toggle("organization-view", org);
  $("map-profile-link").hidden = !org;
  $("org-tab").setAttribute("aria-pressed", org);
  $("citizen-tab").setAttribute("aria-pressed", !org);
  if (org && !selected) {
    focusPilot();
    selectSector(priorityOrder[0]?.id ?? reference);
  } else if (org && sectors.classList.contains("map-hidden")) focusPilot();
  if (org) setLayer("priority");
}

$("citizen-tab").onclick = () => tab(false);
$("org-tab").onclick = () => tab(true);
$("zoom").onclick = () => {
  if (sectors.classList.contains("map-hidden")) {
    focusPilot();
    if (!selected) selectSector(reference);
  } else {
    focusArea(180, 175, 1);
    setLayer("heat");
    $("detail").textContent = "Choose a district or explore the Brasilândia pilot.";
  }
};
$("map-in").onclick = () => stepZoom(1.55);
$("map-out").onclick = () => stepZoom(1 / 1.55);

for (const id of [...sectorPaths.keys()].sort()) {
  const name = window.ybiraOrganizationData[id]?.[9];
  $("map-area").add(new Option((name ? name + " · " : "") + id, id));
}
$("map-area").onchange = event => selectSector(event.target.value, true);
$("map-layer").onchange = event => setLayer(event.target.value, true);

map.addEventListener("click", event => {
  if (suppressClick) return;
  const area = event.target.closest("[data-sector], [data-district]");
  if (!area) return;
  if (area.dataset.sector) selectSector(area.dataset.sector);
  else if (area.dataset.district === pilotName) {
    focusPilot();
    selectSector(selected ?? reference);
  } else {
    const display = $("map-layer").value === "heat" ? area.dataset.temperature.replace(",", ".") : "Sector data available in the Brasilândia pilot";
    $("detail").textContent = area.dataset.district + " · " + (display || "No temperature data");
  }
});
map.addEventListener("wheel", event => {
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
  zoomAt(Math.exp(-Math.max(-300, Math.min(300, delta)) * .0025), event.clientX, event.clientY);
}, { passive: false });

map.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  if (pointers.size === 0) {
    suppressClick = false;
    dragging = false;
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, target: event.target });
  event.target.setPointerCapture(event.pointerId);
  if (pointers.size > 1) dragging = true;
});

map.addEventListener("pointermove", event => {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const next = { ...previous, x: event.clientX, y: event.clientY };
  const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
  pointers.set(event.pointerId, next);
  if (other) {
    const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
    const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
    const from = world((previous.x + other.x) / 2, (previous.y + other.y) / 2);
    const to = world((next.x + other.x) / 2, (next.y + other.y) / 2);
    view.x += from.x - to.x;
    view.y += from.y - to.y;
    renderMap();
    if (oldDistance > 2) zoomAt(newDistance / oldDistance, (next.x + other.x) / 2, (next.y + other.y) / 2);
    return;
  }
  if (!dragging && Math.hypot(next.x - next.startX, next.y - next.startY) < 5) return;
  dragging = true;
  const from = world(previous.x, previous.y);
  const to = world(next.x, next.y);
  view.x += from.x - to.x;
  view.y += from.y - to.y;
  renderMap();
});

for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  map.addEventListener(type, event => {
    if (pointers.delete(event.pointerId)) suppressClick = dragging;
  });
}

map.addEventListener("keydown", event => {
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const move = moves[event.key];
  if (move) {
    view.x += move[0] * 25 / view.k;
    view.y += move[1] * 25 / view.k;
    renderMap();
  } else if (event.key === "+" || event.key === "=") stepZoom(1.55);
  else if (event.key === "-") stepZoom(1 / 1.55);
  else return;
  event.preventDefault();
});

$("detail").textContent = "Choose a district or explore the Brasilândia pilot.";
renderMap();
setLayer("heat");
