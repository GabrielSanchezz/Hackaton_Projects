"use strict";

(() => {
  const workspace = $("workspace");
  const keys = ["home", "chat", "residents", "map", "organizations", "about", "how"];
  const views = { home: $("home-view"), chat: $("chat-view"), about: $("about-view"), how: $("how-view") };
  const aliases = { "map-stage": "map", "ask-panel": "chat", citizen: "residents", org: "organizations", "profile-title": "organizations" };
  const workViews = ["residents", "map", "organizations"];
  const house = districtIds.get(nameKey("Vila Mariana"));
  const answers = $("ask-question");
  const rose = ["#e44f54", "#f2aa28", "#86be51", "#419c56", "#27826a"];
  let current;
  $("ranking-slot").append($("targets"));
  const styles = ["Surface heat", "Vegetation deficit", "Lower income", "Racial equity", "Street tree deficit"];

  function el(tag, value, className) {
    const node = document.createElement(tag);
    if (value !== null && value !== undefined) node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function icon(name, className = "icon") {
    const img = svg("svg", { class: className, "aria-hidden": "true" });
    img.append(svg("use", { href: "identity.svg#" + name }));
    return img;
  }

  function pill(name) {
    const cell = el("span", null, "pill-icon");
    cell.append(icon(name));
    return cell;
  }

  function stat(label, value, glyph) {
    const card = el("div", null, "kpi");
    const title = el("div", null, "kpi-data");
    title.append(el("small", label), el("strong", value));
    card.append(pill(glyph), title);
    return card;
  }

  function ring(value, caption, palette, weights) {
    let offset = 0;
    const colors = weights.map((weight, i) => {
      const start = offset;
      offset += weight;
      return palette[i] + " " + start + "% " + offset + "%";
    });
    colors.push("#e8f0e9 " + offset + "% 100%");
    const chart = el("div", null, "score-ring");
    chart.style.setProperty("--donut", "conic-gradient(" + colors.join(",") + ")");
    const copy = el("div");
    copy.append(el("strong", value));
    if (caption) copy.append(el("small", caption));
    chart.append(copy);
    return chart;
  }

  function score(area) {
    const container = $("score-overview");
    const points = area?.contributions;
    if (!points) {
      container.replaceChildren(el("p", "Priority data unavailable for this area.", "small"));
      return;
    }
    const pair = el("div", null, "score-overview-grid");
    const labels = el("ul", null, "score-key");
    points.forEach((value, i) => {
      const row = el("li");
      const dot = el("span", null, "score-dot");
      dot.style.setProperty("--dot", rose[i]);
      row.append(dot, el("span", styles[i]), el("strong", fmt(value)));
      labels.append(row);
    });
    pair.append(ring(fmt(area.priority), "of 100", rose, points), labels);
    container.replaceChildren(el("p", area.name ?? area.id, "small score-location"), pair);
  }

  function resident(area) {
    const panel = $("resident-overview");
    if (!area) {
      panel.replaceChildren(el("p", "Select a district or census area on the map.", "panel dashboard-card"));
      return;
    }
    const cards = el("div", null, "resident-metrics");
    const address = el("div", null, "panel dashboard-card area-identifier");
    const location = el("div");
    location.append(el("small", area.scale === "district" ? "District" : "Census area"), el("p", area.name ?? area.id));
    address.append(pill("pin"), location);
    const heat = el("section", null, "panel dashboard-card");
    const heatHeading = el("h2", "Surface heat");
    heatHeading.prepend(icon("temperature"));
    heat.append(heatHeading, el("strong", area.heat ? fmt(area.mean) + " °C" : "—"), el("small", "Landsat · Nov 29, 2025"));

    const shade = el("section", null, "panel dashboard-card");
    const shadeHeading = el("h2", "Vegetation");
    shadeHeading.prepend(icon("leaf"));
    shade.append(shadeHeading, ring(area.vegetation == null ? "—" : fmt(area.vegetation * 100) + "%", "", ["#4daf4b"], [100 * (area.vegetation ?? 0)]));
    cards.append(heat, shade);

    const species = el("section", null, "panel dashboard-card");
    const speciesHeading = el("h2", "Explore native trees");
    speciesHeading.prepend(icon("leaf"));
    const previews = el("div", null, "species-teasers");
    const names = ["Carobinha", "Ipê-amarelo", "Tingui-preto"];
    const options = names.map(name => window.ybiraCatalog.find(tree => tree.name === name)).filter(Boolean);
    for (const tree of options) {
      const link = el("a");
      link.href = "#citizen";
      link.addEventListener("click", event => {
        event.preventDefault();
        open("residents", false);
        $("citizen").scrollIntoView({ block: "start" });
      });
      const image = el("img");
      const photo = window.ybiraTreePhotos[tree.scientific];
      if (photo?.url) {
        image.src = photo.url;
        image.alt = tree.name;
        image.loading = "lazy";
        image.onerror = () => image.remove();
        link.append(image);
      }
      link.append(el("span", tree.name));
      previews.append(link);
    }
    species.append(speciesHeading, previews, el("small", "Examples from the catalog. Check your sidewalk for a recommendation.", "small"));
    panel.replaceChildren(address, cards, species);
  }

  function update(area) {
    if (!workViews.includes(current)) return;
    const district = area?.scale !== "sector";
    const title = district ? "District ranking" : "Census area ranking";
    $("ranking-card-title").textContent = title;
    if (current === "organizations") {
      $("dashboard-kpis").replaceChildren(
        stat(district ? "Districts covered" : "Pilot census areas", district ? fmt(districtIndicators.size) : fmt(sectorIndicators.size), "pin"),
        stat("Surface heat", area?.heat ? fmt(area.mean) + " °C" : "—", "temperature"),
        stat("Vegetation cover", area?.vegetation == null ? "—" : fmt(area.vegetation * 100) + "%", "leaf"),
        stat("Priority score", area?.priority == null ? "—" : fmt(area.priority) + "/100", "chart"),
      );
      score(area);
    } else resident(area);
  }

  function route() {
    const hash = location.hash.slice(1);
    const area = new URLSearchParams(location.search).get("area");
    if (area && (!hash || hash === "map-stage")) return "organizations";
    return keys.includes(hash) ? hash : aliases[hash] ?? "home";
  }

  function open(view, scroll = true) {
    if (!keys.includes(view)) return;
    const before = current;
    current = view;
    const isWorkspace = workViews.includes(view);
    for (const [key, element] of Object.entries(views)) element.hidden = key !== view;
    workspace.hidden = !isWorkspace;
    document.body.classList.add("site-ready");
    for (const link of document.querySelectorAll("[data-view]")) {
      if (link.closest("nav") && link.dataset.view === view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (isWorkspace) {
      const isOrg = view === "organizations";
      $("organization-overview").hidden = !isOrg;
      $("resident-overview").hidden = isOrg;
      $("export-view").hidden = !isOrg;
      $("sidewalk-shortcut").hidden = isOrg;
      $("side-title").textContent = isOrg ? "NGOs & Government" : "Residents";
      $("side-icon").replaceChildren(icon(isOrg ? "building" : "home"));
      $("workspace-title").replaceChildren();
      const label = isOrg ? ["Planting ", "planning dashboard"] : view === "map" ? ["Explore São ", "Paulo’s heat map"] : ["Explore your ", "neighborhood"];
      $("workspace-title").append(document.createTextNode(label[0]), el("span", label[1], "leaf-underline"));
      $("workspace-intro").textContent = isOrg ? "Prioritize planting and plan field visits across São Paulo." : "Compare surface heat and vegetation across São Paulo.";
      $("dashboard-kpis").replaceChildren();
      if (view === "map") {
        tab(false);
        $("citizen").hidden = true;
        if (before !== view) setLayer("heat");
      } else tab(isOrg);
      if (!selected && !isOrg && house) selectArea(house, "district");
      update(selected);
    }
    if (view === "chat") $("ask-panel").open = true;
    if (scroll && before !== view) window.scrollTo(0, 0);
  }

  window.openYbira = (view, scroll = true) => {
    history.pushState(null, "", "#" + view);
    open(view, scroll);
  };
  for (const link of document.querySelectorAll("[data-view]")) {
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      event.preventDefault();
      window.openYbira(link.dataset.view);
    });
  }

  $("sidewalk-shortcut").onclick = event => {
    event.preventDefault();
    window.openYbira("residents", false);
    $("citizen").scrollIntoView({ block: "start" });
  };
  $("ask-map").addEventListener("click", () => {
    window.openYbira("chat");
    answers.focus();
  });
  $("export-view").addEventListener("click", () => {
    if (!selected) return;
    const fields = ["id", "name", "scale", "mean", "max", "vegetation", "income", "olderCount", "priority"];
    const values = fields.map(key => '"' + String(selected[key] ?? "").replace(/"/g, '""') + '"');
    const text = "\uFEFF" + fields.join(",") + "\r\n" + values.join(",") + "\r\n";
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const download = el("a");
    download.href = url;
    download.download = "ybira-" + selected.id + ".csv";
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  window.addEventListener("hashchange", () => {
    if (location.hash === "#profile-title" && current === "organizations") return;
    open(route());
  });
  window.addEventListener("popstate", () => open(route()));
  $("map").addEventListener("areachange", event => update(event.detail));
  $("heat-preview").replaceChildren(...data.city.map(record => svg("path", {
    d: record.path, fill: colors[record.band] ?? "#bac3c0", stroke: "#fff", "stroke-width": "1.3",
  })));
  open(route(), false);
})();

