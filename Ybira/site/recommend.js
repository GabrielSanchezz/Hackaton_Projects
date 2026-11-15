"use strict";

// Width and bed thresholds: Manual Técnico de Arborização Urbana, Table 01.
// Automated branches: Chave Arborizar, Fig. 3 (UNESP, printed p. 35), steps 2–12 and 18–27.
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
  if (bedWidth > total - free + 1e-6) return pending("The planting bed would take up the clear space reserved for pedestrians.");
  if (total === 2.8) return pending("The published width bands leave 2.80 m ambiguous. Confirm the site with the municipal team.");
  const [minWidth, minArea, trunkLimit] = total < 2.1 ? [0.6, 0.6, 50]
    : total < 2.4 ? [0.8, 0.8, 70] : total < 2.8 ? [1, 1.2, 90] : [1.4, 2, 120];
  if (bedWidth < minWidth || bedArea < minArea) return pending(`The guide calls for a bed at least ${minWidth} m wide with ${minArea} m² of permeable area for this sidewalk width.`);
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
    .sort((a, b) => Number(b.stock !== null) - Number(a.stock !== null)
      || Number(b.established) - Number(a.established)
      || (b.stock ?? 0) - (a.stock ?? 0)
      || a.scientific.localeCompare(b.scientific))
    .slice(0, 4);
  return trees.length
    ? { code, trees, message: `Candidate species for code ${code}. Final suitability and current stock require confirmation.` }
    : pending(`No locally native species in this catalog matches code ${code} and the confirmed dimensions.`);
}
