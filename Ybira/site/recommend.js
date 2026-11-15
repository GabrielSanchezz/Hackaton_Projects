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

function recommendTrees(site, catalog) {
  const pending = (message) => ({ message, trees: [] });
  const measure = (value) => value == null || value === "" ? NaN : Number(value);
  const total = measure(site.total);
  const free = measure(site.free);
  const bedWidth = measure(site.bedWidth);
  const bedArea = measure(site.bedArea);
  if (!site.place) return pending("Confirm the site type to continue.");
  if (site.place !== "calcada") return pending("This ranking covers sidewalks. Request a site assessment for this location.");
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
  const trees = catalog.filter((tree) => tree.native && tree.codes.includes(code) && tree.trunk[1] <= trunkLimit)
    .sort((a, b) => treeRankingCriteria.map(({ compare }) => compare(a, b)).find(Boolean) ?? 0);
  return trees.length
    ? { code, trees: trees.slice(0, 4).map((tree, index) => ({ ...tree, rankReason: treeRankReason(trees, index) })), message: `Candidate species for code ${code}. Final suitability and current stock require confirmation.` }
    : pending(`No locally native species in this catalog matches code ${code} and the confirmed dimensions.`);
}
