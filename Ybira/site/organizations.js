"use strict";

(() => {
  const profile = $("org-profile");
  const targets = $("targets");
  const missing = "Data unavailable";
  const categories = ["White · Branca", "Black · Preta", "Asian · Amarela", "Brown · Parda", "Indigenous · Indígena"];
  const currency = new Intl.NumberFormat("en", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const pct = value => fmt(value * 100) + "%";
  const temperature = value => fmt(value) + " °C";
  const areaName = area => area.name || "Census area " + area.id.slice(-3);
  const shortName = area => area.scale === "district" ? area.name : area.id.slice(-3);
  let current;
  const comparisons = new Map();
  let displayedScale;

  function el(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function metric(label, value, description) {
    const item = el("div", "", "org-metric");
    item.append(el("span", label), el("strong", value), el("small", description));
    return item;
  }

  function bar(label, value, detail, color) {
    const item = el("div", "", "org-bar");
    const text = el("div", "", "org-bar-label");
    text.append(el("span", label), el("strong", detail));
    const track = el("div", "", "org-bar-track");
    track.setAttribute("aria-hidden", "true");
    const fill = el("span");
    fill.style.width = Math.min(100, Math.max(0, value * 100)) + "%";
    fill.style.background = color;
    track.append(fill);
    item.append(text, track);
    return item;
  }

  function comparePanel(area) {
    const section = el("section", "", "org-compare");
    const pinned = comparisons.get(area.scale);
    if (pinned && pinned.id !== area.id) {
      section.append(el("h4", "Compare with " + areaName(pinned)));
      const table = el("table");
      const head = table.createTHead().insertRow();
      for (const title of ["Metric", shortName(area), shortName(pinned)]) {
        const cell = el("th", title);
        cell.scope = "col";
        head.append(cell);
      }
      const stats = [
        ["Priority score", x => x.priority == null ? "—" : fmt(x.priority) + "/100"],
        ["Avg. surface heat", x => x.heat ? temperature(x.mean) : "—"],
        ["Vegetation cover", x => x.vegetation === null ? "—" : pct(x.vegetation)],
        ["Median income", x => x.income === null ? "—" : currency.format(x.income)],
        ["Black and Brown population", x => x.equity === null ? "—" : pct(x.equity)],
        ["Residents aged 65+ (count)", x => x.olderCount === null ? "—" : fmt(x.olderCount)],
        ["Residents aged 65+ (share)", x => x.olderShare === null ? "—" : pct(x.olderShare)],
        ["Residents on blocks without trees", x => x.exposed === null ? "—" : pct(x.exposed)],
        ["Residents on blocks without trees (count)", x => x.exposed === null ? "—" : fmt(x.without)],
      ];
      const body = table.createTBody();
      for (const [metricName, get] of stats) {
        const row = body.insertRow();
        const cell = el("th", metricName);
        cell.scope = "row";
        row.append(cell, el("td", get(area)), el("td", get(pinned)));
      }
      section.append(table);
    }
    const button = el("button", pinned?.id === area.id ? "Clear comparison" : "Pin this area to compare", "text-button");
    button.type = "button";
    button.addEventListener("click", () => {
      if (pinned?.id === area.id) comparisons.delete(area.scale);
      else comparisons.set(area.scale, area);
      render(area);
      profile.querySelector(".org-compare button").focus();
    });
    section.append(button);
    if (pinned?.id === area.id) section.append(el("p", "Select another area from the list or the map.", "small"));
    return section;
  }

  function scoreChart(area) {
    const chart = el("section", "", "org-score");
    chart.append(el("h4", area.priority == null ? "Planting priority score" : "Planting priority · " + fmt(area.priority) + "/100"));
    if (!area.contributions) {
      chart.append(el("p", "A comparable score needs data for all five indicators.", "small"));
      return chart;
    }
    chart.append(el("p", "Higher contributions move the area up the field visit list.", "small"));
    for (const [i, factor] of priorityFactors.entries()) {
      const value = area.contributions[i];
      chart.append(bar(factor.label, value / factor.weight, fmt(value) + " / " + factor.weight + " pts", "#ad5035"));
    }
    return chart;
  }

  function render(area) {
    if (!area) return;
    const { id, scale } = area;
    const district = scale === "district";
    current = area;
    if (displayedScale !== scale) renderTargets(scale);
    $("visit-status").textContent = "";
    for (const button of targets.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.area === id));
    const heading = el("h3", areaName(area));
    heading.id = "profile-title";
    const metrics = el("div", "", "org-metrics");
    metrics.append(
      metric("Average surface heat", area.heat ? temperature(area.mean) : "—", "Satellite pixels inside the area"),
      metric("Hottest pixel", area.heat ? temperature(area.max) : "—", "Highest surface reading in this image"),
      metric("Potential exposure", area.exposed === null ? "—" : pct(area.exposed), "Residents on street blocks without trees"),
      metric("Vegetation cover", area.vegetation === null ? "—" : pct(area.vegetation), district ? "Share of district mapped as vegetation · 2020 indicator" : "Share of land mapped as vegetation · 2017–18 imagery"),
      metric("Median income", area.income === null ? "—" : currency.format(area.income), "Monthly income of household heads with earnings · 2022"),
      metric("Residents aged 65+", area.olderCount === null ? "—" : fmt(area.olderCount), area.olderShare === null ? "Census 2022 · share unavailable" : pct(area.olderShare) + " of residents · Census 2022"),
    );
    profile.replaceChildren(heading, el("p", (district ? "District " : "Census area ") + id + (area.population === null ? "" : " · " + fmt(area.population) + " residents (Census 2022)"), "small"), metrics);
    const coverage = area.sampled > 0 ? pct(area.pixels / area.sampled) + " valid pixels (" + area.pixels + "/" + area.sampled + ")" : "No sample";
    profile.append(el("p", "Nov 29, 2025 · Landsat 9 · " + coverage + ". Surface readings are a snapshot of roofs and ground.", "small"));
    if (!area.heat) profile.append(el("p", "Satellite coverage is too limited to show a comparable heat estimate.", "small"));
    profile.append(scoreChart(area));
    if (area.olderShare !== null) profile.append(bar("Residents aged 65+", area.olderShare, fmt(area.olderCount) + " people · " + pct(area.olderShare), "#775b8c"));

    if (area.exposed !== null) {
      profile.append(bar("Residents on blocks without trees", area.exposed, fmt(area.without) + " of " + fmt(area.assessed), "#b75736"));
    } else profile.append(el("p", "Street tree coverage data is unavailable for this area.", "small"));
    profile.append(el("p", "Potential exposure uses street trees as a proxy. The census figure describes block faces where residents live.", "small"));
    const distribution = el("section", "", "org-distribution");
    distribution.append(el("h4", "Race or color · Census 2022"));
    const colors = ["#477a68", "#775b8c", "#b17940", "#306379", "#89566d"];
    for (const [i, name] of categories.entries()) {
      const count = area.race[i];
      const hasData = count !== null && area.population > 0;
      const share = hasData ? count / area.population : 0;
      distribution.append(bar(name, share, hasData ? pct(share) : missing, colors[i]));
    }
    distribution.append(el("p", "Shares use the area’s total population. Some census counts may be suppressed.", "small"));
    profile.append(distribution, comparePanel(area));
  }

  function renderTargets(scale) {
    displayedScale = scale;
    const district = scale === "district";
    const top = (district ? districtPriorityOrder : priorityOrder).slice(0, 3);
    $("priority-heading").textContent = district ? "Top priority districts" : "Top priority census areas";
    targets.replaceChildren();
    for (const [index, area] of top.entries()) {
      const button = el("button");
      button.type = "button";
      button.dataset.area = area.id;
      button.setAttribute("aria-pressed", "false");
      button.append(
        el("strong", (index + 1) + ". " + areaName(area)),
        el("span", fmt(area.priority) + "/100 · " + temperature(area.mean) + " avg. · " + pct(area.vegetation) + " vegetation"),
      );
      button.addEventListener("click", () => selectArea(area.id, scale, true));
      targets.append(button);
    }
  }

  $("map").addEventListener("areachange", event => render(event.detail));
  $("assess-visit").addEventListener("click", () => {
    tab(false);
    $("description").focus();
  });
  $("copy-visit").addEventListener("click", async () => {
    if (!current) return;
    const lines = [
      "Ybirá field visit · São Paulo",
      areaName(current) + " · " + (current.scale === "district" ? "District " : "Census area ") + current.id,
      current.priority == null ? "Priority score unavailable." : "Planting priority: " + fmt(current.priority) + "/100.",
      current.heat ? "Landsat 9, Nov 29 2025: " + temperature(current.mean) + " average surface heat; " + temperature(current.max) + " hottest valid pixel." : "Surface heat has insufficient coverage.",
      current.exposed === null ? "Street tree data unavailable." : fmt(current.without) + " of " + fmt(current.assessed) + " residents were on block faces without trees (Census 2022).",
      current.olderShare === null ? "Age 65+ data unavailable." : fmt(current.olderCount) + " residents aged 65+ (" + pct(current.olderShare) + "; Census 2022).",
      "",
      "On site: identify a candidate spot; measure total sidewalk width, clear walking width and open soil; check overhead wires, nearby trees, utilities and clearances; confirm with the city before planting.",
      "Use the Ybirá sidewalk assessment: " + location.origin,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      $("visit-status").textContent = "Checklist copied.";
    } catch {
      const existing = profile.querySelector("textarea");
      existing?.remove();
      const text = el("textarea", "", "visit-checklist");
      text.value = lines.join("\n");
      text.rows = 7;
      text.readOnly = true;
      text.setAttribute("aria-label", "Field visit checklist");
      profile.append(text);
      text.select();
      $("visit-status").textContent = "Select and copy the checklist.";
    }
  });
})();
