"use strict";

// Width and bed thresholds: Manual Técnico de Arborização Urbana, Table 01.
// Automated branches: Chave Arborizar, Fig. 3 (UNESP, printed p. 35), steps 2–12 and 18–27.
function plantingBedLimits(total) {
  if (!Number.isFinite(total) || total < 1.9 || total === 2.8) return null;
  if (total < 2.1) return { minWidth: 0.6, minArea: 0.6, trunkLimit: 50 };
  if (total < 2.4) return { minWidth: 0.8, minArea: 0.8, trunkLimit: 70 };
  if (total < 2.8) return { minWidth: 1, minArea: 1.2, trunkLimit: 90 };
  return { minWidth: 1.4, minArea: 2, trunkLimit: 120 };
}

function plantingBedProblem(total, free, width, area) {
  if (width > total - free + 1e-6) return "The planting bed would take up the clear space reserved for pedestrians.";
  const limits = plantingBedLimits(total);
  if (!limits) return "The guide leaves this exact width unclear. Confirm the site with the city.";
  const { minWidth, minArea } = limits;
  if (width < minWidth || area < minArea) return `This bed is too small for planting under the guide. For this sidewalk, leave at least ${minWidth.toFixed(2)} m of bed width and ${minArea.toFixed(2)} m² of open soil.`;
  return "";
}

const treeRankingCriteria = [
  {
    compare: (a, b) => Number(b.stock !== null) - Number(a.stock !== null),
    reason: "The October 2026 nursery list recorded seedlings for this species. Options with no stock record rank lower.",
  },
  {
    compare: (a, b) => Number(b.established) - Number(a.established),
    reason: "The city's guide lists this as an established sidewalk tree. Established choices rank above potential ones when both have the same stock-record status.",
  },
  {
    compare: (a, b) => (b.stock ?? 0) - (a.stock ?? 0),
    reason: "Among options with the same status in the guide, this species ranks ahead of the next one because the October 2026 inventory listed more seedlings.",
  },
  {
    compare: (a, b) => a.scientific.localeCompare(b.scientific, "en"),
    reason: "The other ranking criteria tie, so scientific names decide the order.",
  },
];

function treeRankReason(trees, index) {
  const tree = trees[index];
  const previous = trees[index - 1];
  const next = trees[index + 1];
  const why = (a, b) => treeRankingCriteria.find(({ compare }) => compare(a, b))?.reason;
  const explanation = [];
  if (previous) {
    const criterion = treeRankingCriteria.findIndex(({ compare }) => compare(previous, tree));
    const behind = [
      "The previous option ranks higher because it has a nursery stock record.",
      "The previous option ranks higher because it is already an established sidewalk tree in the city guide.",
      "The previous option ranks higher because the nursery inventory recorded more seedlings for it.",
      "This follows the previous option in alphabetical order by scientific name.",
    ];
    if (behind[criterion]) explanation.push(behind[criterion]);
  }
  if (next) explanation.push(why(tree, next));
  return explanation.filter(Boolean).join(" ") || "This is the only species in the catalog that fits the conditions checked here.";
}

const wiredClearances = [
  { key: "poleDistance", label: "Utility pole", minimum: 3 },
  { key: "treeDistance", label: "Nearest tree", minimum: 5 },
  { key: "cornerDistance", label: "Street corner", minimum: 5 },
  { key: "lightDistance", label: "Streetlight", minimum: 5 },
  { key: "drivewayDistance", label: "Driveway or dropped curb", minimum: 1 },
  { key: "drainDistance", label: "Storm drain or inspection cover", minimum: 2 },
];

function treeSeparation(size) {
  if (size === "small") return 5;
  if (size === "medium") return 6.5;
  return 8.5;
}

function measured(value) {
  return value == null || value === "" ? NaN : Number(value);
}

function rankedTrees(catalog, code, trunkLimit, wired = false) {
  const candidates = catalog.filter(tree => tree.native && !tree.invasive && tree.codes.includes(code)
    && tree.trunk[1] <= trunkLimit && (wired ? tree.wiredTraits && tree.height[1] <= 5 : !tree.wiredOnly))
    .sort((a, b) => treeRankingCriteria.map(({ compare }) => compare(a, b)).find(Boolean) ?? 0);
  return candidates.slice(0, wired ? 3 : 4).map((tree, index) => ({
    ...tree, rankReason: wired && !index ? tree.wiredTraits.fit : treeRankReason(candidates, index),
  }));
}

function previewTrees(site, catalog) {
  const total = measured(site.total);
  const free = measured(site.free);
  const bedWidth = measured(site.bedWidth);
  const bedArea = measured(site.bedArea);
  const limits = plantingBedLimits(total);
  if (site.place !== "calcada" || !limits || !["Ausente", "Presente", "unknown"].includes(site.wires)) return [];
  if (site.tree === "Presente" || site.city === "other" || site.biome === "other") return [];
  if (Number.isFinite(free) && (free < 1.2 || free > total)) return [];
  if (Number.isFinite(bedWidth) && Number.isFinite(bedArea) && plantingBedProblem(total, free, bedWidth, bedArea)) return [];
  const wired = site.wires !== "Ausente";
  if (wired && total > 3) return [];
  if (site.wires === "Presente" && wiredClearanceIssues(site).length) return [];
  if (!wired && site.clearance === "0") return [];
  return rankedTrees(catalog, "P", limits.trunkLimit, wired);
}

function wiredClearanceIssues(site) {
  return wiredClearances.flatMap(({ key, label, minimum }) => {
    const limit = key === "treeDistance" ? treeSeparation(site.nearbyTreeSize) : minimum;
    const distance = measured(site[key]);
    return distance < limit ? [`${label}: ${distance.toFixed(2)} m measured, ${limit.toFixed(2)} m required. Move the planting point at least ${(limit - distance).toFixed(2)} m farther from this object.`] : [];
  });
}

function recommendWiredTrees(site, catalog) {
  const answer = (status, message, issues = [], trees = []) => ({ status, message, issues, trees });
  const total = measured(site.total);
  const free = measured(site.free);
  const width = measured(site.bedWidth);
  const area = measured(site.bedArea);
  if (!Number.isFinite(total)) return answer("pending", "Measure the full sidewalk width to continue.");
  if (total < 1.9) return answer("blocked", `São Paulo’s guide calls for a sidewalk at least 1.90 m wide. This spot is ${(1.9 - total).toFixed(2)} m short.`);
  if (site.city !== "sao-paulo" || site.biome !== "atlantic-forest") return answer("pending", "This species list covers the municipality of São Paulo in the Atlantic Forest. Ask your city which native trees and clearance rules apply here.");
  if (total > 3 || total === 2.8) return answer("pending", "This sidewalk width needs a site check with the city before choosing a tree under overhead wires.");
  if (site.tree === "Presente") return answer("blocked", "An existing tree occupies the planting spot. Choose another point.");
  if (site.tree !== "Ausente" || ![free, width, area].every(Number.isFinite)) return answer("pending", "Confirm the planting point, clear walking space and planting bed measurements.");
  if (free < 1.2) return answer("blocked", `Keep at least 1.20 m for walking. The clear path is ${(1.2 - free).toFixed(2)} m short.`);
  if (free > total) return answer("blocked", "The clear walking space must fit within the total sidewalk width.");
  const bedProblem = plantingBedProblem(total, free, width, area);
  if (bedProblem) {
    const { minWidth, minArea } = plantingBedLimits(total);
    const issues = [];
    if (width < minWidth) issues.push(`Planting bed width: ${(minWidth - width).toFixed(2)} m short.`);
    if (area < minArea) issues.push(`Open-soil area: ${(minArea - area).toFixed(2)} m² short.`);
    if (width > total - free + 1e-6) issues.push(`The planting bed encroaches ${(width - total + free).toFixed(2)} m into the clear walking space.`);
    return answer("blocked", bedProblem, issues);
  }
  const issues = wiredClearanceIssues(site);
  if (issues.length) return answer("blocked", "The planting point is too close to one or more objects.", issues);
  const attested = site.clearancesAttested === "on";
  if (!attested && (!site.nearbyTreeSize || wiredClearances.some(({ key }) => !Number.isFinite(measured(site[key]))))) {
    return answer("pending", "Check the remaining clearances or keep the tree shortlist for your site visit.");
  }
  const { trunkLimit } = plantingBedLimits(total);
  const trees = rankedTrees(catalog, "P", trunkLimit, true);
  return trees.length
    ? answer("candidate", "The spot passes the checks you provided. Before planting, have the city and electricity provider check the line, underground utilities and other obstacles, including larger trees nearby.", [], trees)
    : answer("pending", "The measurements pass, but the catalog has no verified native sidewalk tree with an adult height of 5 m or less for this spot.");
}

function recommendTrees(site, catalog) {
  const pending = (message) => ({ message, trees: [] });
  const total = measured(site.total);
  const free = measured(site.free);
  const bedWidth = measured(site.bedWidth);
  const bedArea = measured(site.bedArea);
  if (!site.place) return pending("Confirm the site type to continue.");
  if (site.place !== "calcada") return pending("This ranking covers sidewalks. Request a site assessment for this location.");
  if (site.wires === "Presente") return recommendWiredTrees(site, catalog);
  if (![total, free].every(Number.isFinite)) return pending("Enter the total sidewalk width and the clear space for pedestrians.");
  if (free > total) return pending("The clear walking space must fit within the total width. Check your measurements.");
  if (total < 1.9 || free < 1.2) return pending("These measurements are below the thresholds in the municipal planting guide.");
  if (site.tree !== "Ausente") return pending(site.tree === "Presente"
    ? "An existing tree occupies this point. Choose another point or request a site assessment."
    : "Confirm whether a tree already occupies the proposed planting point.");
  if (!["Presente", "Ausente"].includes(site.wires)) return pending("Confirm whether overhead wires are present.");
  if (![bedWidth, bedArea].every(Number.isFinite)) return pending("Enter the planned width and area of the planting bed.");
  const bedProblem = plantingBedProblem(total, free, bedWidth, bedArea);
  if (bedProblem) return pending(bedProblem);
  const { trunkLimit } = plantingBedLimits(total);
  if (site.clearance === "0") return pending("The point does not meet the minimum clearances in Table 03. Choose another point or request an assessment.");
  if (!["1", "2", "3"].includes(site.clearance)) return pending("Verify the clearance column from Table 03 before requesting a ranking.");

  const automatic = site.wires === "Ausente" && total < 2.4;
  let code = automatic ? "" : site.code;
  if (automatic) {
    if (site.clearance === "1") code = "P";
    else {
      if (!["yes", "no"].includes(site.setback) || !["cars", "bus"].includes(site.traffic)) {
        return pending("Confirm the frontage setback and whether the traffic lane carries predominantly cars or buses/heavy vehicles.");
      }
      const setback = site.setback === "yes";
      const columns = total < 2.1
        ? (setback ? ["G1", "G2", "M1", "M2"] : ["G1", "G3", "M3", "M4"])
        : (setback ? ["G4", "G5", "M5", "M6"] : ["G6", "G7", "M9", "M11"]);
      const index = (site.clearance === "3" ? 0 : 2) + (site.traffic === "cars" ? 1 : 0);
      code = columns[index];
    }
  } else if (!code) {
    return pending("This case needs a reviewed Chave Arborizar code. Ask the municipal team to assess the wiring or sidewalk layout.");
  }
  const minimumColumn = code === "P" ? 1 : /^M\d+$/.test(code) ? 2 : /^G\d+$/.test(code) ? 3 : Infinity;
  if (Number(site.clearance) < minimumColumn) return pending("The entered code requires a higher verified clearance column.");
  const trees = rankedTrees(catalog, code, trunkLimit);
  return trees.length
    ? { code, trees, message: `Candidate species for code ${code}. Final suitability and current stock require confirmation.` }
    : pending(`No locally native species in this catalog matches code ${code} and the confirmed dimensions.`);
}
