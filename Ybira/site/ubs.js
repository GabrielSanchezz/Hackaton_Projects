"use strict";

(() => {
  const toggle = $("ubs-toggle");
  const panel = $("ubs-panel");
  const picker = $("ubs-select");
  const details = $("ubs-details");
  const directions = $("ubs-directions");
  const layer = svg("g", { class: "map-hidden", "aria-hidden": "true" });
  map.append(layer);

  const facilities = window.ybiraClinicData;

  // Coordinates of the pilot outline in WGS84. Apply the same outline transform as the census sectors.
  const west = -46.71550388;
  const south = -23.48136555;
  const east = -46.66351132;
  const north = -23.41518085;
  const project = (lon, lat) => [
    pilotBox.x + ((lon - west) / (east - west)) * pilotBox.width,
    pilotBox.y + ((north - lat) / (north - south)) * pilotBox.height,
  ];
  const unproject = (x, y) => [
    west + ((x - pilotBox.x) / pilotBox.width) * (east - west),
    north - ((y - pilotBox.y) / pilotBox.height) * (north - south),
  ];
  const sites = facilities.map(([name, address, lon, lat, inDistrict], id) => {
    const [x, y] = project(lon, lat);
    const marker = svg("g", { class: "ubs-marker", transform: "translate(" + x + " " + y + ")", "data-clinic": id });
    const hit = svg("circle", { class: "ubs-hit" });
    const icon = svg("circle", { class: "ubs-icon" });
    const cross = svg("path", { class: "ubs-cross" });
    const title = svg("title");
    title.textContent = name;
    marker.append(title, hit, icon, cross);
    layer.append(marker);
    return { id, name, address, lon, lat, inDistrict, x, y, marker, hit, icon, cross };
  });

  let activeSite = null;
  function sectorCenter() {
    if (selected?.scale !== "sector") return null;
    const shape = sectorPaths.get(selected.id);
    if (!shape) return null;
    const box = shape.getBBox();
    return unproject(ox + (box.x + box.width / 2) * sx, oy + (box.y + box.height / 2) * sy);
  }

  function distanceMeters(site, center) {
    const radians = degrees => degrees * Math.PI / 180;
    const dx = radians(site.lon - center[0]) * Math.cos(radians((site.lat + center[1]) / 2));
    const dy = radians(site.lat - center[1]);
    return Math.hypot(dx, dy) * 6371000;
  }

  function showClinic(site, centerOnMap = false) {
    activeSite?.marker.classList.remove("ubs-selected");
    activeSite = site ?? null;
    picker.value = activeSite?.id ?? "";
    directions.hidden = !activeSite;
    if (!activeSite) {
      details.textContent = "Select a blue marker or choose a clinic. Use it as a starting point to check shade, sidewalk access and room for planting.";
      return;
    }
    activeSite.marker.classList.add("ubs-selected");
    const center = sectorCenter();
    const meters = center ? distanceMeters(activeSite, center) : null;
    const proximity = meters < 50 ? "under 50 m" : meters < 1000 ? Math.round(meters / 10) * 10 + " m" : fmt(meters / 1000) + " km";
    const distance = center ? " Approx. " + proximity + " in a straight line from the sector’s map center." : "";
    details.textContent = activeSite.name + " · " + activeSite.address + (activeSite.inDistrict ? "" : " · Near the district boundary") + "." + distance;
    directions.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(activeSite.lat + "," + activeSite.lon);
    if (centerOnMap) focusArea(activeSite.x, activeSite.y, Math.max(15, view.k));
  }

  function updateList() {
    const center = sectorCenter();
    const ordered = [...sites].sort((a, b) => center ? distanceMeters(a, center) - distanceMeters(b, center) : a.name.localeCompare(b.name, "pt-BR"));
    picker.replaceChildren(new Option(center ? "Choose a clinic · closest first" : "Select a clinic", ""));
    for (const site of ordered) picker.add(new Option(site.name, site.id));
    showClinic(activeSite);
  }

  function renderMarkers() {
    const shown = toggle.checked && pilotMode;
    layer.classList.toggle("map-hidden", !shown);
    panel.hidden = !shown;
    if (!shown) return;
    const screenScale = map.getScreenCTM()?.a;
    if (!(screenScale > 0)) return;
    const size = 1 / screenScale;
    for (const site of sites) {
      site.hit.setAttribute("r", 15 * size);
      site.icon.setAttribute("r", 7 * size);
      const arm = 3 * size;
      site.cross.setAttribute("d", "M " + (-arm) + " 0 H " + arm + " M 0 " + (-arm) + " V " + arm);
    }
  }

  toggle.addEventListener("change", () => {
    if (toggle.checked && !pilotMode) selectArea(lastSector, "sector");
    updateList();
    renderMarkers();
  });
  picker.addEventListener("change", () => showClinic(picker.value === "" ? null : sites[Number(picker.value)], true));
  map.addEventListener("click", event => {
    const marker = event.target.closest("[data-clinic]");
    if (marker && !suppressClick) showClinic(sites[Number(marker.dataset.clinic)]);
  });
  map.addEventListener("areachange", () => {
    if (!pilotMode) toggle.checked = false;
    if (toggle.checked) updateList();
    renderMarkers();
  });
  new MutationObserver(renderMarkers).observe(map, { attributeFilter: ["viewBox"] });
  new ResizeObserver(renderMarkers).observe(map);
})();
