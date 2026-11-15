import "./map-environment.js";
import "../age-data.js";
import "../district-data.js";
import "../organization-data.js";
import "../priority.js";
import "../data.js";
import "../clinic-data.js";

export const mapSource = {
  id: "map",
  title: "Ybirá · public São Paulo map and planting score",
  url: "https://ybira-eosin.vercel.app/#map-stage",
};
const clinicSource = {
  id: "clinics",
  title: "GeoSampa · São Paulo public health facility locations",
  url: "https://novogeosampa.prefeitura.sp.gov.br/",
};
const bounds = { west: -46.71550388, south: -23.48136555, east: -46.66351132, north: -23.41518085 };
const round = (value, scale = 1) => Number.isFinite(value) ? Math.round(value * scale * 100) / 100 : null;
const wordMatch = (text, word) => (" " + text + " ").includes(" " + word + " ");

export function normalize(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function shapesById(data) {
  return new Map(data.sectors.map(sector => [sector.id, sector.path]));
}

function box(path) {
  const x = [], y = [];
  for (const [, px, py] of path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)) {
    x.push(Number(px));
    y.push(Number(py));
  }
  return [Math.min(...x), Math.min(...y), Math.max(...x), Math.max(...y)];
}

const mapData = {
  ...window.ybiraPriority,
  clinics: window.ybiraClinicData,
  paths: shapesById(window.ybira),
  pilotBox: box(window.ybira.outlines[1]),
};

function getClinicList(area, map) {
  const path = map.paths.get(area.id);
  if (!path) return [];
  const [x1, y1, x2, y2] = box(path);
  const [left, top, right, bottom] = map.pilotBox;
  const x = bounds.west + (((x1 + x2) / 2 - left) / (right - left)) * (bounds.east - bounds.west);
  const y = bounds.north - (((y1 + y2) / 2 - top) / (bottom - top)) * (bounds.north - bounds.south);
  const degrees = Math.PI / 180;
  return map.clinics.map(([name, address, lon, lat, insidePilotDistrict]) => {
    const dx = (lon - x) * Math.cos((lat + y) / 2 * degrees);
    const km = Math.hypot(dx, lat - y) * degrees * 6371;
    return { name, address, insidePilotDistrict, approximateStraightLineKm: round(km) };
  }).sort((a, b) => a.approximateStraightLineKm - b.approximateStraightLineKm).slice(0, 4);
}

function lookupAreas(question, fromMap, map) {
  const q = normalize(question);
  const ids = new Set(q.match(/\b\d{9}(?:\d{6})?\b/g) ?? []);
  const exact = [...ids].map(id => map.sectorIndicators.get(id) ?? map.districtIndicators.get(id)).filter(Boolean);
  const specific = [...map.sectorIndicators.values()].filter(area => area.name && wordMatch(q, normalize(area.name)));
  const communities = new Map();
  for (const area of specific) {
    const name = normalize(area.name);
    if (!communities.has(name)) communities.set(name, []);
    communities.get(name).push(area);
  }
  const resolved = [];
  const ambiguous = [];
  for (const group of communities.values()) {
    if (group.length === 1) resolved.push(group[0]);
    else {
      const selected = group.find(area => area.id === fromMap);
      if (selected) resolved.push(selected);
      else ambiguous.push({ name: group[0].name, censusAreaIds: group.map(area => area.id).slice(0, 8) });
    }
  }
  const named = [...map.districtIndicators.values()]
    .filter(area => {
      const name = normalize(area.name);
      if (!wordMatch(q, name)) return false;
      if (["se", "luz", "socorro", "saude", "republica"].includes(name)) {
        return ["em ", "no ", "na ", "de ", "da ", "do ", "distrito ", "district ", "in ", "of ", "vs "]
          .some(prefix => wordMatch(q, prefix + name)) || q === name;
      }
      return true;
    })
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length);
  const districts = named.filter(area => !named.some(other => other !== area && other.name.length > area.name.length
    && wordMatch(normalize(other.name), normalize(area.name)) && !wordMatch(q.replace(normalize(other.name), ""), normalize(area.name))));
  const index = area => q.indexOf(ids.has(area.id) ? area.id : normalize(area.name ?? ""));
  const areas = [...new Map([...exact, ...resolved, ...districts].map(area => [area.id, area])).values()]
    .sort((a, b) => index(a) - index(b)).slice(0, 3);
  const unmatchedIds = [...ids].filter(id => !map.sectorIndicators.has(id) && !map.districtIndicators.has(id));
  return { areas, ambiguous, unmatchedIds };
}

function profile(area, map) {
  const ranking = area.scale === "sector" ? map.priorityOrder : map.districtPriorityOrder;
  const index = ranking.findIndex(row => row.id === area.id);
  return {
    id: area.id,
    name: area.name ?? "Census area " + area.id,
    scale: area.scale,
    population: area.population,
    averageSurfaceTemperatureC: area.heat ? round(area.mean) : null,
    hottestSurfacePixelC: area.heat ? round(area.max) : null,
    surfaceImage: "Landsat 9 on 2025-11-29; ground and roof surface, not air temperature",
    validPixelCoveragePercent: area.sampled > 0 ? round(area.pixels / area.sampled, 100) : null,
    vegetationPercent: round(area.vegetation, 100),
    vegetationBasis: area.scale === "sector" ? "GeoSampa mapped vegetation, 2017–18 imagery" : "Rede Nossa São Paulo published 2020 indicator",
    medianMonthlyIncomeBRL: area.income,
    incomeBasis: "Median for household heads with earnings (Census 2022); not per capita",
    blackAndBrownPercent: round(area.equity, 100),
    raceCountsWhiteBlackAsianBrownIndigenous: area.race,
    withoutStreetTreesCount: area.exposed === null ? null : area.without,
    assessedForStreetTrees: area.assessed,
    withoutStreetTreesPercent: round(area.exposed, 100),
    residents65PlusCount: area.olderCount,
    residents65PlusPercent: round(area.olderShare, 100),
    priorityScore: round(area.priority),
    rank: index >= 0 ? index + 1 : null,
    rankedCount: ranking.length,
    priorityContributions: area.contributions?.map((points, i) => ({
      factor: map.priorityFactors[i].label, points: round(points), maximumPoints: map.priorityFactors[i].weight,
    })) ?? [],
  };
}

function compactRanking(rows) {
  return rows.slice(0, 4).map(area => ({
    id: area.id, name: area.name ?? "Census area " + area.id, priorityScore: round(area.priority),
  }));
}

export function areaContext(question, areaId, previousQuestion) {
  const map = mapData;
  const explicit = lookupAreas(question, areaId, map);
  const selected = map.sectorIndicators.get(areaId) ?? map.districtIndicators.get(areaId);
  const q = normalize(question);
  const localMarkers = /\b(ubs|bairro|distrito|setor|district|census|mapa|map|vegetacao|vegetation|temperatura|temperature|percentual|percentage|renda|income|idosos|idosas|older|idade|race|raca|score|calor|heat|mirangoaba|ranking|prioridade|priority)\b/;
  const refersHere = /\b(aqui|here|la|ali|neste|nesta|nesse|nessa|this area|this district|this sector|selecionad[oa]|selected|desse setor|dessa area|da area|do setor|do distrito|desse distrito|no mapa)\b/.test(q);
  const isLocal = Boolean(explicit.areas.length || explicit.ambiguous.length || explicit.unmatchedIds.length || localMarkers.test(q) || /\b(65 anos|65 plus|sem arvores)\b/.test(q));
  const followsUp = /^(e|and|e para|what about|how about)\b/.test(q) && q.split(" ").length <= 12;
  if (!isLocal && !followsUp) return [];
  const earlier = previousQuestion && (followsUp || isLocal) ? lookupAreas(previousQuestion, areaId, map) : { areas: [] };
  const unrecognizedPlace = !explicit.areas.length && !refersHere && (
    /\b(?:score|pontuacao|heat|calor|income|renda|temperatura(?: de superficie)?|temperature|vegetacao|vegetation|arvores|trees|populacao|population) (?:em|no|na|da|do|de|in|of|for) (?!superficie\b|surface\b|plantio\b|prioridade\b|ar\b|air\b|calor\b|risco\b)\w/.test(q)
    || /\b(?:rio de janeiro|osasco|guarulhos|campinas|belo horizonte|curitiba|porto alegre|sao bernardo|santo andre)\b/.test(q)
  );
  const unresolved = explicit.unmatchedIds.length > 0 || unrecognizedPlace;
  const contextAreas = [...explicit.areas];
  if (!contextAreas.length && !unresolved && followsUp) contextAreas.push(...earlier.areas);
  if (explicit.areas.length === 1 && /\b(compare|comparar|comparacao|versus|vs|com o selecionado|selected|aqui)\b/.test(q)) {
    const second = earlier.areas.find(area => area.id !== explicit.areas[0].id) ?? selected;
    if (second && second.id !== explicit.areas[0].id) contextAreas.push(second);
  }
  if (!contextAreas.length && !unresolved && !explicit.ambiguous.length && selected && (refersHere || isLocal)) contextAreas.push(selected);
  if (!contextAreas.length && !isLocal) return [];
  const contextual = {
    selectedArea: selected ? { id: selected.id, name: selected.name, scale: selected.scale } : null,
    areas: contextAreas.slice(0, 3).map(area => profile(area, map)),
    ambiguousCommunityNames: explicit.ambiguous,
    unmatchedAreaIds: explicit.unmatchedIds,
    requestedPlaceUnavailable: unrecognizedPlace,
    notes: "Areas are official São Paulo districts or the Brasilândia pilot census sectors. City districts and pilot sectors are scored within their own scale; compare numerical scores only within the same scale. If the user names an unsupported place, say its data is unavailable. Older residents and clinics are contextual layers, outside the score. All score contributions are computed by the app.",
  };
  const [first, second] = contextual.areas;
  if (first?.scale === second?.scale && first?.priorityScore != null && second?.priorityScore != null) {
    contextual.comparison = {
      first: first.name,
      second: second.name,
      differenceInPriorityPoints: round(first.priorityScore - second.priorityScore),
      differenceByFactor: first.priorityContributions.map(({ factor, points }, i) => ({
        factor, firstMinusSecondPoints: round(points - second.priorityContributions[i].points),
      })).sort((a, b) => Math.abs(b.firstMinusSecondPoints) - Math.abs(a.firstMinusSecondPoints)),
    };
  }
  if (/\b(ranking|rank|prioritario|prioritarios|prioritarias|priority|pontuacao|score|prioridade|primeiro|highest)\b/.test(q)) {
    contextual.priorityLeaders = (contextAreas[0]?.scale === "sector" || /\b(setores|census areas)\b/.test(q))
      ? { scale: "sector", leaders: compactRanking(map.priorityOrder) }
      : { scale: "district", leaders: compactRanking(map.districtPriorityOrder) };
  }
  const url = contextAreas.length === 1 ? "https://ybira-eosin.vercel.app/?area=" + contextAreas[0].id + "#map-stage" : mapSource.url;
  const items = [{ ...mapSource, url, text: JSON.stringify(contextual), details: contextual }];
  if (/\b(ubs|clinic|clinics|posto|postos|unidade|visita|vistoria|visit|walk|shade|sombra|hospital)\b/.test(q)) {
    const localSector = contextAreas.find(area => area.scale === "sector");
    const pilotDistrict = contextAreas.some(area => area.name === "Brasilândia");
    if (localSector || pilotDistrict) {
      const closest = localSector ? getClinicList(localSector, map) : [];
      const places = localSector ? closest : map.clinics.slice(0, 8).map(([name, address]) => ({ name, address }));
      items.push({ ...clinicSource, text: JSON.stringify({
        scope: "Mapped clinics in and around the Brasilândia pilot. No citywide clinic proximity estimates. Straight-line distance is approximate and does not describe walking routes or identify the responsible catchment.",
        sectorId: localSector?.id ?? null, places,
      }) });
    }
  }
  return items;
}
