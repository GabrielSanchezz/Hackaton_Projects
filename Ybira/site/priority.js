"use strict";

const sectorIndicators = new Map(Object.entries(window.ybiraOrganizationData).map(([id, values]) => {
  const [mean, max, pixels, sampled, without, assessed, population, race, income, community, vegetation] = values;
  const heat = pixels >= 5 && pixels / sampled >= .8;
  const exposed = Number.isFinite(without) && assessed > 0 ? without / assessed : null;
  const equity = population > 0 && race[1] !== null && race[3] !== null ? (race[1] + race[3]) / population : null;
  return [id, { id, mean, max, pixels, sampled, without, assessed, population, race, income, community, vegetation, exposed, heat, equity }];
}));

const scoredSectors = [...sectorIndicators.values()].filter(area =>
  area.heat && [area.exposed, area.vegetation, area.income, area.equity].every(Number.isFinite) && area.income > 0,
);

function percentile(area, key, reverse = false) {
  const n = scoredSectors.length;
  if (n <= 1) return .5;
  const value = area[key];
  const stronger = scoredSectors.filter(row => reverse ? row[key] > value : row[key] < value).length;
  const ties = scoredSectors.filter(row => row[key] === value).length;
  return (stronger + (ties - 1) / 2) / (n - 1);
}

const priorityFactors = [
  { label: "Surface heat", weight: 30, value: area => percentile(area, "mean") },
  { label: "Lack of vegetation cover", weight: 25, value: area => 1 - area.vegetation },
  { label: "Lower household-head income", weight: 15, value: area => percentile(area, "income", true) },
  { label: "Black and Brown population share", weight: 15, value: area => area.equity },
  { label: "Residents on blocks without trees", weight: 15, value: area => area.exposed },
];

for (const area of scoredSectors) {
  area.contributions = priorityFactors.map(factor => factor.weight * factor.value(area));
  area.priority = area.contributions.reduce((sum, value) => sum + value, 0);
}

const priorityOrder = [...scoredSectors].sort((a, b) => b.priority - a.priority || b.mean - a.mean || a.id.localeCompare(b.id));
