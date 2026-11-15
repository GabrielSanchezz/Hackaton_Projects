"use strict";

function indicators(source, scale) {
  return new Map(Object.entries(source).map(([id, values]) => {
    const [mean, max, pixels, sampled, without, assessed, population, race, income, name, vegetation] = values;
    const heat = pixels >= 5 && pixels / sampled >= .8;
    const exposed = Number.isFinite(without) && assessed > 0 ? without / assessed : null;
    const equity = population > 0 && race[1] !== null && race[3] !== null ? (race[1] + race[3]) / population : null;
    const olderCount = window.ybiraAge65[id] ?? null;
    const olderShare = olderCount !== null && population > 0 ? olderCount / population : null;
    return [id, { id, scale, mean, max, pixels, sampled, without, assessed, population, race, income, name, vegetation, exposed, heat, equity, olderCount, olderShare }];
  }));
}

const sectorIndicators = indicators(window.ybiraOrganizationData, "sector");
const districtIndicators = indicators(window.ybiraDistrictData, "district");

function percentile(area, rows, key, reverse = false) {
  const n = rows.length;
  if (n <= 1) return .5;
  const value = area[key];
  const stronger = rows.filter(row => reverse ? row[key] > value : row[key] < value).length;
  const ties = rows.filter(row => row[key] === value).length;
  return (stronger + (ties - 1) / 2) / (n - 1);
}

const priorityFactors = [
  { label: "Surface heat", weight: 30, value: (area, rows) => percentile(area, rows, "mean") },
  { label: "Lack of vegetation cover", weight: 25, value: area => 1 - area.vegetation },
  { label: "Lower household-head income", weight: 15, value: (area, rows) => percentile(area, rows, "income", true) },
  { label: "Black and mixed-race population share", weight: 15, value: area => area.equity },
  { label: "Residents on blocks without trees", weight: 15, value: area => area.exposed },
];

function rankAreas(indicatorMap) {
  const eligible = [...indicatorMap.values()].filter(area =>
    area.heat && [area.exposed, area.vegetation, area.income, area.equity].every(Number.isFinite) && area.income > 0,
  );
  for (const area of eligible) {
    area.contributions = priorityFactors.map(factor => factor.weight * factor.value(area, eligible));
    area.priority = area.contributions.reduce((sum, value) => sum + value, 0);
  }
  return eligible.sort((a, b) => b.priority - a.priority || b.mean - a.mean || a.id.localeCompare(b.id));
}

const priorityOrder = rankAreas(sectorIndicators);
const districtPriorityOrder = rankAreas(districtIndicators);

window.ybiraPriority = { sectorIndicators, districtIndicators, priorityOrder, districtPriorityOrder, priorityFactors };
