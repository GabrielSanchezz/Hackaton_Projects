"use strict";
const data = window.ybira;
const $ = (id) => document.getElementById(id);
const colors = ["#fff0b3", "#ffc46c", "#f68a43", "#db4834", "#9f2036"];
const fmt = (value) => value.toLocaleString("pt-BR", {maximumFractionDigits: 1});
const reference = "355030811000035";
let zoomed = false;
let selected = null;
function draw(pilot) {
  zoomed = pilot;
  const svg = $("map");
  $("map-title").textContent = pilot ? "Brasilândia" : "São Paulo";
  $("zoom").textContent = pilot ? "Voltar para São Paulo" : "Entrar na Brasilândia";
  svg.replaceChildren();
  for (const [index, record] of (pilot ? data.sectors : data.city).entries()) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", record.path);
    shape.setAttribute("class", "area");
    shape.setAttribute("fill", colors[record.band]);
    shape.dataset.index = index;
    const label = document.createElementNS(shape.namespaceURI, "title");
    label.textContent = record.label;
    shape.append(label);
    svg.append(shape);
  }
  const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  outline.setAttribute("class", "outline");
  outline.setAttribute("d", data.outlines[pilot ? 1 : 0]);
  svg.append(outline);
  if (pilot) showSector(selected ?? reference);
  else $("detail").textContent = "Clique no distrito destacado para visitar a Brasilândia.";
}
function showSector(id) {
  const index = data.sectors.findIndex((sector) => sector.id === id);
  if (index === -1) return;
  selected = id;
  const s = data.sectors[index];
  $("map").querySelector(".selected")?.classList.remove("selected");
  $("map").querySelector(`[data-index="${index}"]`).classList.add("selected");
  const facts = [s.label];
  if (s.without !== null) facts.push(`${fmt(s.without)} de ${fmt(s.total)} moradores avaliados em faces sem árvores`);
  if (s.race !== null) facts.push(`${fmt(s.race)}% de pessoas pretas ou pardas`);
  $("detail").textContent = facts.join(" · ");
}
$("map").addEventListener("click", (event) => {
  const target = event.target.closest("[data-index]");
  if (!target) return;
  const record = (zoomed ? data.sectors : data.city)[Number(target.dataset.index)];
  if (zoomed) showSector(record.id);
  else if (record.label.startsWith("Brasilândia")) draw(true);
  else $("detail").textContent = record.label;
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
const codes = [...new Set(data.catalog.flatMap((tree) => tree.codes))].sort((a,b) => a.localeCompare(b,"pt-BR",{numeric:true}));
for (const code of codes) $("codes").add(new Option(code, code));
for (const s of data.sectors.filter((s) => s.both).sort((a,b) => b.without-a.without).slice(0,3)) {
  const button = document.createElement("button");
  button.textContent = `${s.label} · ${fmt(s.without)} moradores em faces sem árvores`;
  button.onclick = () => { if (!zoomed) draw(true); showSector(s.id); };
  $("targets").append(button);
}
$("plant").addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(event.target);
  const total = Number(fields.get("total"));
  const free = Number(fields.get("free"));
  const code = fields.get("code");
  const result = $("result");
  if (free > total) result.textContent = "A faixa livre precisa caber na largura total. Confira as medidas.";
  else if (total < 1.9 || free < 1.2) result.textContent = "As medidas ficam abaixo da triagem do manual usado neste protótipo. Procure orientação pelo 156.";
  else if (!fields.get("wires") || !code) result.textContent = "Confirme a fiação e peça uma avaliação do ponto pela Chave Arborizar para definir as espécies candidatas.";
  else {
    const candidates = data.catalog.filter((tree) => tree.codes.includes(code) && tree.priority)
      .sort((a,b) => b.stock-a.stock).slice(0,2);
    result.textContent = candidates.length
      ? `Candidatas do catálogo para ${code}: ${candidates.map((s) => s.name).join(" e ")}. Vistoria e estoque a confirmar.`
      : `Nenhuma espécie prioritária do catálogo corresponde ao código ${code}. Consulte a equipe de arborização.`;
  }
});
draw(false);
