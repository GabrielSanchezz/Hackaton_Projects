"use strict";

const data = window.ybira;
const $ = id => document.getElementById(id);
const map = $("map");
const colors = ["#46ad57", "#a6cc51", "#f5d449", "#f78f43", "#df4646"];
const priorityColors = ["#f7e9cd", "#f8ca85", "#f6a460", "#e56c51", "#aa3551"];
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
let pilotMode = false;
let lastSector = reference;
let lastDistrict;
const ratioLabels = ["<20%", "20–<40%", "40–<60%", "60–<80%", "80–100%"];
const ratios = [.2, .4, .6, .8];
const greens = ["#ebf3eb", "#bce0bd", "#77bb87", "#3f8f66", "#185941"];
const purples = ["#f0e9f3", "#d8bfdf", "#bc92c7", "#925e9c", "#673868"];
const layers = {
  heat: { label: "Average surface heat · Landsat 9 · Nov 29, 2025", bands: [33, 37, 41, 45], labels: ["<33 °C", "33–<37", "37–<41", "41–<45", "45+"], value: a => a.heat ? a.mean : null, palette: colors },
  peak: { label: "Hottest valid surface pixel · Landsat 9 · Nov 29, 2025", bands: [35, 40, 45, 50], labels: ["<35 °C", "35–<40", "40–<45", "45–<50", "50+"], value: a => a.heat ? a.max : null, palette: colors },
  priority: { label: "Planting priority · Higher score = earlier field visit", bands: [20, 40, 60, 80], labels: ["<20", "20–<40", "40–<60", "60–<80", "80–100"], value: a => a.priority, palette: priorityColors },
  vegetation: { label: "Estimated vegetation cover · GeoSampa, imagery from 2017–18", bands: ratios, labels: ratioLabels, value: a => a.vegetation, palette: greens },
  income: { label: "Median monthly income of household heads with earnings · Census 2022", bands: [1000, 1500, 2000, 3000], labels: ["<R$1k", "1–<1.5k", "1.5–<2k", "2–<3k", "R$3k+"], value: a => a.income, palette: greens },
  equity: { label: "Share identifying as Black (Preta) or Brown (Parda) · Census 2022", bands: ratios, labels: ratioLabels, value: a => a.equity, palette: purples },
  exposure: { label: "Share of assessed residents on blocks without trees · Census 2022", bands: ratios, labels: ratioLabels, value: a => a.exposed, palette: colors },
  olderShare: { label: "Percentage of residents aged 65 or older · Census 2022", bands: [.05, .1, .15, .2], labels: ["<5%", "5–<10%", "10–<15%", "15–<20%", "20%+"], value: a => a.olderShare, palette: purples },
  olderCount: { label: "Number of residents aged 65 or older · Census 2022", bands: [5000, 10000, 20000, 30000], labels: ["<5,000", "5–<10k", "10–<20k", "20–<30k", "30k+"], value: a => a.olderCount, palette: purples },
};
const olderSectorBands = { bands: [25, 50, 100, 200], labels: ["<25", "25–<50", "50–<100", "100–<200", "200+"] };

function formatLayer(key, value) {
  if (!Number.isFinite(value)) return "Data unavailable";
  if (key === "heat" || key === "peak") return fmt(value) + " °C";
  if (key === "priority") return fmt(value) + "/100";
  if (key === "income") return "R$ " + fmt(value);
  if (key === "olderCount") return fmt(value) + " people";
  return fmt(value * 100) + "%";
}

function setLayer(key) {
  $("map-layer").value = key;
  const layer = key === "olderCount" && pilotMode ? { ...layers[key], ...olderSectorBands } : layers[key];
  const cityVegetation = "Vegetation cover · Rede Nossa São Paulo, 2020 indicator";
  $("legend-title").textContent = key === "priority" ? layer.label + (pilotMode ? " · Brasilândia census areas" : " · São Paulo districts")
    : key === "vegetation" && !pilotMode ? cityVegetation : layer.label;
  const legend = $("map-legend");
  legend.replaceChildren();
  for (const [index, label] of layer.labels.entries()) {
    const swatch = document.createElement("span");
    swatch.textContent = label;
    swatch.style.setProperty("--color", layer.palette[index]);
    legend.append(swatch);
  }
  function colorArea(shape, area, muted = false) {
    const value = layer.value(area);
    const band = layer.bands.filter(threshold => value >= threshold).length;
    shape.setAttribute("fill", muted ? "#e4eae7" : Number.isFinite(value) ? layer.palette[band] : "#bac3c0");
    shape.firstElementChild.textContent = (area.name ?? "Census area " + area.id) + " · " + formatLayer(key, value);
  }
  for (const [id, shape] of sectorPaths) colorArea(shape, sectorIndicators.get(id));
  for (const [id, shape] of districtPaths) colorArea(shape, districtIndicators.get(id), pilotMode);
  if (selected) describeSelection(selected);
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
const sectorPaths = new Map();
const districtPaths = new Map();
const nameKey = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const districtIds = new Map([...districtIndicators.values()].map(area => [nameKey(area.name), area.id]));
const pilotId = districtIds.get(nameKey(pilotName));

for (const record of data.city) {
  const id = districtIds.get(nameKey(townLabel(record)));
  const attrs = { "data-district": id };
  const path = addShape(record, attrs);
  if (id === pilotId) path.classList.add("pilot-area");
  districtPaths.set(id, path);
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
  makeLabel(districtLabels, districtIndicators.get(district.dataset.district).name, box.x + box.width / 2, box.y + box.height / 2);
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
  const showSectors = pilotMode && seesPilot;
  sectors.classList.toggle("map-hidden", !showSectors);
  districtLabels.classList.toggle("map-hidden", view.k < 2 || (showSectors && view.k >= 11));
  communityLabels.classList.toggle("map-hidden", !showSectors || view.k < 11);
  map.style.setProperty("--label-size", (11 / view.k) + "px");
  spaceLabels(districtLabels, w, h);
  spaceLabels(communityLabels, w, h);
  $("map-title").textContent = pilotMode ? pilotName : "São Paulo";
  $("zoom").textContent = pilotMode ? "Back to São Paulo" : "Explore Brasilândia";
  $("map-out").disabled = view.k <= (pilotMode ? 4 : 1);
  $("map-in").disabled = view.k >= 55;
}

function world(clientX, clientY) {
  return new DOMPoint(clientX, clientY).matrixTransform(map.getScreenCTM().inverse());
}

function zoomAt(factor, clientX, clientY) {
  const target = world(clientX, clientY);
  const next = Math.min(55, Math.max(pilotMode ? 4 : 1, view.k * factor));
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

function describeSelection(area) {
  const key = $("map-layer").value;
  const label = area.scale === "district" ? area.name + " district"
    : (area.name ? area.name + " · " : "") + "Census area " + area.id;
  let value = formatLayer(key, layers[key].value(area));
  if (key === "olderCount" && area.olderShare !== null) value += " · " + formatLayer("olderShare", area.olderShare);
  if (key === "olderShare" && area.olderCount !== null) value += " · " + formatLayer("olderCount", area.olderCount);
  $("detail").textContent = label + " · " + value;
}

function selectArea(id, scale, center = false) {
  const isSector = scale === "sector";
  const shape = (isSector ? sectorPaths : districtPaths).get(id);
  if (!shape) return;
  map.querySelector(".selected")?.classList.remove("selected");
  const switched = pilotMode !== isSector;
  pilotMode = isSector;
  selected = (isSector ? sectorIndicators : districtIndicators).get(id);
  shape.classList.add("selected");
  $("map-sector-control").hidden = !isSector;
  if (isSector) {
    lastSector = id;
    $("map-district").value = pilotId;
    $("map-area").value = id;
  } else {
    lastDistrict = id;
    $("map-district").value = id;
    $("map-area").value = "";
  }
  if (switched) {
    if (isSector) focusArea(pilotBox.x + pilotBox.width / 2, pilotBox.y + pilotBox.height / 2, 8);
    else focusArea(180, 175, 1);
    setLayer($("map-layer").value);
  }
  describeSelection(selected);
  if (center) {
    const box = shape.getBBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (isSector) focusArea(ox + x * sx, oy + y * sy, Math.max(15, view.k));
    else focusArea(x, y, Math.min(10, 165 / Math.max(box.width, box.height)));
  }
  map.dispatchEvent(new CustomEvent("areachange", { detail: selected }));
}

function tab(org) {
  $("citizen").hidden = org;
  $("org").hidden = !org;
  $("org").parentElement.classList.toggle("organization-view", org);
  $("map-profile-link").hidden = !org;
  $("org-tab").setAttribute("aria-pressed", org);
  $("citizen-tab").setAttribute("aria-pressed", !org);
  if (org && !selected) selectArea(districtPriorityOrder[0]?.id ?? pilotId, "district");
  if (org) setLayer("priority");
}

$("zoom").onclick = () => {
  if (pilotMode) selectArea(lastDistrict ?? pilotId, "district");
  else selectArea(lastSector, "sector");
};
$("map-in").onclick = () => stepZoom(1.55);
$("map-out").onclick = () => stepZoom(1 / 1.55);

for (const id of [...sectorPaths.keys()].sort()) {
  const name = window.ybiraOrganizationData[id]?.[9];
  $("map-area").add(new Option((name ? name + " · " : "") + id, id));
}
for (const area of [...districtIndicators.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
  $("map-district").add(new Option(area.name, area.id));
}
$("map-area").onchange = event => selectArea(event.target.value, "sector", true);
$("map-district").onchange = event => selectArea(event.target.value, "district", true);
$("map-layer").onchange = event => setLayer(event.target.value);

map.addEventListener("click", event => {
  if (suppressClick) return;
  const area = event.target.closest("[data-sector], [data-district]");
  if (!area) return;
  if (area.dataset.sector) selectArea(area.dataset.sector, "sector");
  else selectArea(area.dataset.district, "district");
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
