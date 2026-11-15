"use strict";

(() => {
  const form = $("plant");
  const description = $("description");
  const status = $("interpret-status");
  const result = $("result");
  const catalog = window.ybiraCatalog;
  const codes = [...new Set(catalog.flatMap((tree) => tree.codes))]
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const guide = "https://drive.prefeitura.sp.gov.br/cidade/secretarias/subprefeituras/upload/se/MARBOURB.pdf#page=27";
  const city = "https://prefeitura.sp.gov.br/web/meio_ambiente/w/parques/284396";
  const sizeGuide = "Adult-height examples from the city guide: small, dwarf ipê 3–5 m; medium, pitanga 6–12 m; large, grumixama 10–15 m. The ranges overlap by species.";
  const yesNo = [["Presente", "Yes"], ["Ausente", "No"]];
  const questions = {
    place: {
      label: "Where do you want to plant?",
      help: "Pick Sidewalk for the paved walking area between the street and the properties. Choose another option if the spot is inside a property or in a public square.",
      options: [["calcada", "On a sidewalk"], ["praca", "In a public square"], ["quintal", "In a yard"], ["terreno", "On a plot of land"], ["rua", "In the street"], ["outro", "Somewhere else"]],
    },
    total: {
      label: "How wide is the whole sidewalk?",
      help: "At the spot you picked, stretch a tape across the sidewalk from the property line to the inner edge of the curb. Leave out the curb itself. Enter meters. For example, 200 cm is 2.00 m.",
      measure: true,
      minimum: "City guide minimum: 1.90 m total, excluding the curb.",
    },
    wires: {
      label: "Are there wires above the spot?",
      help: "Look up from ground level. Check for wires crossing or running along the planting spot. If you see a wire or are unsure what it carries, choose Yes or check later.",
      options: [...yesNo, ["unknown", "Not sure yet"]],
    },
    city: {
      label: "Which municipality is this sidewalk in?",
      help: "São Paulo means the municipality itself. Select another municipality if the sidewalk is elsewhere in the state.",
      options: [["sao-paulo", "São Paulo, SP"], ["other", "Another municipality"]],
      defaultValue: "sao-paulo",
    },
    biome: {
      label: "Which biome is the planting site in?",
      help: "The native tree list used here covers São Paulo’s Atlantic Forest context. Choose another option if you are outside that context.",
      options: [["atlantic-forest", "Atlantic Forest"], ["other", "Another biome or not sure"]],
      defaultValue: "atlantic-forest",
    },
    nearbyTreeSize: {
      label: "How big is the nearest tree when fully grown?",
      help: "If you know its species, use its adult size from the guide. If you have checked that there is no tree within 8.50 m, choose Unsure / no tree within 8.50 m and enter 8.50 m for the distance.",
      minimum: sizeGuide,
      options: [["small", "Small"], ["medium", "Medium"], ["large", "Large"], ["unknown", "Unsure / no tree within 8.50 m"]],
    },
    tree: {
      label: "Is there already a tree right where you want to plant?",
      help: "Look at the exact spot where the new trunk would go. A tree nearby will be checked separately when you review distances.",
      options: yesNo,
    },
    free: {
      label: "How much room will people have to walk?",
      help: "Find the narrowest part beside the planned planting bed. Measure across the clear walking space, from the edge of the bed to the nearest wall, pole, step or other obstacle. The guide calls for at least 1.20 m.",
      measure: true,
      minimum: "City guide minimum: 1.20 m of clear walking space.",
    },
    bedWidth: {
      label: "How wide is the patch of soil?",
      help: "Follow the Width arrow. Measure the open soil across the sidewalk, from the curb side toward the walking path.",
      measure: true,
    },
    bedLength: {
      label: "How long is the patch of soil?",
      help: "Follow the Length arrow. Measure the open soil along the sidewalk, parallel to the curb. If the bed is irregular, measure a rectangle that fits inside it.",
      measure: true,
    },
    clearance: {
      label: "Which tree sizes have enough room around the spot?",
      help: "Start at the point where the new trunk would go. Measure along the ground to nearby objects. For a corner, use the point where the two property lines would meet. Choose the largest size for which every relevant distance in the guide is met. If a buried pipe or another distance is uncertain, choose “I’ll check later”.",
      options: [["1", "Only enough room for a small tree"], ["2", "Enough room for a medium tree"], ["3", "Enough room for a large tree"], ["0", "Too close even for a small tree"]],
      distances: true,
      minimum: sizeGuide,
    },
    setback: {
      label: "Is the building set back from the sidewalk?",
      help: "Look at the property facing the planting spot. Choose Yes if there is a gap between the building itself and the front property line, such as a front garden or driveway. A fence can be on that line.",
      options: [["yes", "Yes"], ["no", "No"]],
    },
    traffic: {
      label: "What usually passes in the lane next to the curb?",
      help: "Check the lane next to the planting spot. Pick Buses and heavy vehicles if it carries a bus corridor or regular heavy vehicles. Otherwise, pick Mostly cars.",
      options: [["cars", "Mostly cars"], ["bus", "Buses and heavy vehicles"]],
    },
    code: {
      label: "Code checked by the municipal planting team",
      help: "Enter the Chave Arborizar code if the city or a qualified field team has already checked the site. This is only needed for the cases the guided tool cannot assess on its own.",
      options: codes.map((code) => [code, code]),
    },
  };
  const measuringHelp = {
    poleDistance: "Measure to the base of the nearest utility pole.",
    treeDistance: "Measure to the nearest tree trunk. The guide requires more space if the existing tree is larger.",
    cornerDistance: "Measure to the point where the two property lines would meet at the corner.",
    lightDistance: "Measure to the base of the nearest streetlight pole. If it shares the utility pole, enter the same distance.",
    drivewayDistance: "Measure to the nearest edge of the driveway ramp or dropped curb.",
    drainDistance: "Measure to the nearest edge of a storm drain or inspection cover.",
  };
  for (const { key, label, minimum } of wiredClearances) {
    questions[key] = {
      label: "Distance to " + label.toLowerCase(),
      help: measuringHelp[key] + " Start at the spot where the new trunk would go. Measure along the ground. If the object is farther away, enter a distance you can confirm.",
      measure: true,
      minimum: key === "treeDistance" ? undefined : `Minimum: ${minimum.toFixed(2)} m.`,
    };
  }
  // Municipal planting guide, Table 03. Columns contain distances in meters.
  const distances = [
    ["Street corner", 5, 5, 5],
    ["Poles", 2, 3, 3],
    ["Fire hydrants", 1, 2, 3],
    ["Underground utilities", 1, 2, 2],
    ["Street furniture", 2, 2, 3],
    ["Underground galleries", 1, 1, 1],
    ["Drain openings and inspection covers", 2, 2, 2],
    ["Dropped curbs, crosswalk edges, curb drains and building entrances", 1, 1, 2],
    ["Transformers", 3, 4, 5],
    ["Trees of the same size class", 5, 8, 12],
  ];
  let answers = {};
  let extracted = [];
  let step;
  let history = [];
  let technicalMode = false;
  let fullReview = false;
  let wiredChecksReviewed = false;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function link(text, url) {
    const anchor = element("a", text);
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    return anchor;
  }

  function distanceGuide(container) {
    const list = element("ul", "", "distance-list");
    for (const [name, small, medium, large] of distances) {
      list.append(element("li", `${name} · ${small} / ${medium} / ${large} m`));
    }
    container.append(
      element("p", "Minimum distances for small / medium / large trees"),
      list,
      element("p", "Keep signs visible. If a nearby tree is a different size, average the two tree distances. For example, a small tree near a large one needs (5 + 12) ÷ 2 = 8.5 m."),
      link("See the city’s guide and full list", guide),
    );
  }

  function question(name, required = step !== "review") {
    const spec = questions[name];
    const block = element("div", "", "assessment-field");
    const heading = element("div", "", "question-heading");
    const label = element("label", spec.label);
    label.htmlFor = `answer-${name}`;
    const guideWrap = element("span", "", "field-guide");
    const toggle = element("button", "?", "help-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-label", `Help: ${spec.label}`);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", `help-${name}`);
    const copy = element("div", "", "help-copy");
    copy.id = `help-${name}`;
    copy.hidden = true;
    copy.append(element("p", spec.help));
    if (spec.distances) distanceGuide(copy);
    guideWrap.append(toggle);
    heading.append(label, guideWrap);

    // Hover previews the same content. Clicking pins it open for touch and keyboard.
    let pinned = false;
    let hovering = false;
    const showHelp = (open) => {
      copy.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => {
      pinned = !pinned;
      showHelp(pinned);
    });
    toggle.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      hovering = true;
      showHelp(true);
    });
    block.addEventListener("pointerleave", () => {
      hovering = false;
      if (!pinned) showHelp(false);
    });
    block.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || copy.hidden) return;
      pinned = false;
      showHelp(false);
      if (!hovering || copy.contains(document.activeElement)) toggle.focus();
    });

    const control = element(spec.measure ? "input" : "select");
    control.name = name;
    control.id = label.htmlFor;
    if (spec.measure) {
      control.inputMode = "decimal";
      control.setAttribute("aria-describedby", `unit-${name}`);
      control.addEventListener("input", () => control.setCustomValidity(""));
    } else {
      control.add(new Option("Choose an answer", ""));
      for (const [value, label] of spec.options) control.add(new Option(label, value));
    }
    control.value = answers[name] ?? spec.defaultValue ?? "";
    control.required = required;
    const row = element("div", "", "answer-control");
    row.append(control);
    if (spec.measure) {
      const unit = element("span", "meters");
      unit.id = `unit-${name}`;
      row.append(unit);
    }
    const limits = plantingBedLimits(Number(answers.total));
    const minimum = name === "bedWidth" && limits ? `Minimum width: ${limits.minWidth.toFixed(2)} m.`
      : name === "treeDistance" ? "Minimum: 5.00 m for a small neighbor; up to 8.50 m for a larger or unknown tree." : spec.minimum;
    block.append(heading);
    if (minimum) {
      const hint = element("p", minimum, "small measurement-minimum");
      hint.id = `minimum-${name}`;
      control.setAttribute("aria-describedby", spec.measure ? `unit-${name} ${hint.id}` : hint.id);
      block.append(hint);
    }
    block.append(row, copy);
    return block;
  }

  function plantingBedDiagram() {
    const diagram = element("div", "", "bed-diagram");
    diagram.setAttribute("role", "img");
    diagram.setAttribute("aria-label", "View from above. The soil bed sits between the curb and the walking space. Length runs along the curb. Width runs from the curb side toward the walking space.");
    const bed = element("div", "", "diagram-bed");
    bed.append(element("span", "Open soil", "diagram-soil"), element("span", "↔ Length", "diagram-length"), element("span", "↕ Width", "diagram-width"));
    diagram.append(element("div", "Street", "diagram-street"), element("div", "Curb", "diagram-curb"), bed, element("div", "Clear walking space", "diagram-walk"));
    return diagram;
  }

  function meters(value) {
    const decimal = value.trim().replace(",", ".");
    return /^\d+(?:\.\d{1,2})?$/.test(decimal) && Number.isFinite(Number(decimal)) ? decimal : null;
  }

  function plantingBedArea(width, length) {
    return (Math.round(Number(width) * 100) * Math.round(Number(length) * 100)) / 10000;
  }

  function showBedMeasurements(container) {
    const total = Number(answers.total);
    const free = Number(answers.free);
    const limits = plantingBedLimits(total);
    const rule = limits
      ? `City guide minimum: ${limits.minWidth.toFixed(2)} m wide and ${limits.minArea.toFixed(2)} m² of open soil.`
      : "Ask the city to confirm the minimum for this sidewalk width.";
    const info = element("p", rule, "small measurement-minimum");
    const explanation = element("p", "Area is width × length. Count only open soil. A bed below either minimum is too small for planting.", "small");
    const width = question("bedWidth");
    const length = question("bedLength");
    const feedback = element("p", "", "bed-area-feedback");
    feedback.setAttribute("aria-live", "polite");
    container.append(info, plantingBedDiagram(), width, length, explanation, feedback);
    function updateArea() {
      const measuredWidth = meters(form.elements.bedWidth.value);
      const measuredLength = meters(form.elements.bedLength.value);
      feedback.replaceChildren();
      if (measuredWidth === null || measuredLength === null) return;
      const area = plantingBedArea(measuredWidth, measuredLength);
      const problem = plantingBedProblem(total, free, Number(measuredWidth), area);
      const formatted = area.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      feedback.append(element("strong", `Your open soil: ${formatted} m². `), document.createTextNode(problem || "Your measurements meet these size requirements."));
      feedback.classList.toggle("bed-area-problem", Boolean(problem));
    }
    width.addEventListener("input", updateArea);
    length.addEventListener("input", updateArea);
    updateArea();
  }

  function nextStep() {
    if (answers.place && answers.place !== "calcada") return null;
    if (answers.total && Number(answers.total) < 1.9) return null;
    if (answers.tree === "Presente") return null;
    if (!answers.place || !answers.total || !answers.wires) return "quick";
    if (!fullReview && previewTrees({ ...answers, bedArea: plantingBedArea(answers.bedWidth, answers.bedLength) }, catalog).length) return "preview";
    if (answers.wires === "unknown") return "wires";
    const wired = answers.wires === "Presente";
    if (wired) {
      if (!answers.city || !answers.biome) return "wiredLocation";
      if (answers.city !== "sao-paulo" || answers.biome !== "atlantic-forest" || Number(answers.total) > 3 || Number(answers.total) === 2.8) return null;
    }
    const needsSiteVisit = !wired && Number(answers.total) >= 2.4;
    if (needsSiteVisit && !technicalMode) return "siteVisit";
    if (!answers.tree) return "tree";
    if (!answers.free) return "free";
    if (Number(answers.free) < 1.2 || Number(answers.free) > Number(answers.total)) return null;
    if (!answers.bedWidth || !answers.bedLength) return "bed";
    const area = plantingBedArea(answers.bedWidth, answers.bedLength);
    if (plantingBedProblem(Number(answers.total), Number(answers.free), Number(answers.bedWidth), area)) return null;
    if (wired) return wiredChecksReviewed ? null : "wiredClearances";
    if (!answers.clearance) return "clearance";
    if (answers.clearance === "0") return null;
    if (needsSiteVisit) return answers.code ? null : "code";
    if (Number(answers.clearance) > 1) {
      if (!answers.setback) return "setback";
      if (!answers.traffic) return "traffic";
    }
    return null;
  }

  function showWiredChecks(content) {
    const checklist = element("ul", "", "distance-list");
    for (const { key, label, minimum } of wiredClearances) {
      const distance = key === "treeDistance" ? "5 m to a small tree, 6.5 m to a medium tree, 8.5 m to a large or unknown tree" : minimum + " m";
      checklist.append(element("li", `${label} · ${distance}`));
    }

    const attestation = element("label", "", "assessment-confirm");
    const checked = element("input");
    checked.type = "checkbox";
    checked.name = "clearancesAttested";
    checked.checked = answers.clearancesAttested === "on";
    attestation.append(checked, element("span", "I checked these distances from the planting point and all meet the listed minimums."));

    const measurements = element("details", "", "ranking-source");
    measurements.append(element("summary", "Enter any distances you want to check"));
    measurements.open = wiredClearances.some(({ key }) => Boolean(answers[key]));
    const nearby = question("nearbyTreeSize", false);
    const tree = question("treeDistance", false);
    const updateTreeMinimum = () => {
      const size = nearby.querySelector("select").value;
      tree.querySelector(".measurement-minimum").textContent = `Minimum: ${treeSeparation(size).toFixed(2)} m.`;
    };
    nearby.addEventListener("change", updateTreeMinimum);
    updateTreeMinimum();
    for (const { key, label } of wiredClearances) {
      const obstacle = element("details", "", "ranking-source");
      obstacle.append(element("summary", label));
      if (key === "treeDistance") obstacle.append(nearby, tree);
      else obstacle.append(question(key, false));
      obstacle.open = Boolean(answers[key]);
      measurements.append(obstacle);
    }
    content.append(checklist, attestation, measurements);
  }

  function showStep(target) {
    step = target;
    form.hidden = false;
    $("interpret").hidden = true;
    result.hidden = true;
    const content = $("assessment-fields");
    content.replaceChildren();
    $("assessment-title").textContent = target === "review" ? "Check what Ybirá understood"
      : target === "quick" ? "Find trees for this sidewalk"
        : target === "bed" ? "Measure the planting bed" : target === "wiredClearances" ? "Are there any obstacles too close?"
        : target === "wiredLocation" ? "Confirm the planting location" : "Tell us a little more";
    $("assessment-note").textContent = target === "review" ? "Correct anything that looks off before you continue."
      : target === "wiredClearances" ? "Use these minimums only for small trees under wires. Measure from where the trunk would go." : "";
    if (target === "bed") showBedMeasurements(content);
    else if (target === "quick") {
      if (!answers.place) content.append(question("place"));
      content.append(question("total"), question("wires"));
    }
    else if (target === "wiredLocation") content.append(question("city"), question("biome"));
    else if (target === "wiredClearances") showWiredChecks(content);
    else for (const name of target === "review" ? extracted : [target]) content.append(question(name));
    $("assessment-skip").hidden = !["free", "wires", "tree", "bed", "clearance", "setback", "traffic", "wiredClearances"].includes(target);
    $("assessment-back").textContent = history.length ? "Back" : "Back to description";
    $("assessment-next").textContent = target === "quick" ? "See possible trees" : target === "wiredClearances" ? "Review these checks" : target === "code" ? "Find my trees" : "Continue";
    $("assessment-skip").textContent = "I’ll check later";
    $("assessment-title").focus();
  }

  function finish(title, text, trees = [], provisional = false, issues = []) {
    form.hidden = true;
    result.hidden = false;
    const heading = element("h3", title);
    heading.tabIndex = -1;
    result.replaceChildren(heading, element("p", text));
    if (issues.length) {
      const list = element("ul");
      for (const issue of issues) list.append(element("li", issue));
      result.append(list);
    }
    if (trees.length) {
      const ranking = element("ol", "", "tree-ranking");
      for (const tree of trees) {
        const item = element("li");
        item.append(element("h4", tree.name));
        item.append(element("p", `${tree.scientific} · ${tree.height.join("–")} m tall when grown · Native to São Paulo`));
        const photo = window.ybiraTreePhotos[tree.scientific];
        if (photo) {
          const figure = element("figure", "", "tree-photo");
          const image = element("img");
          image.alt = `Reference photo of ${tree.name} (${tree.scientific})`;
          image.loading = "lazy";
          image.src = photo.url;
          const caption = element("figcaption");
          caption.append(link(photo.credit, photo.source), document.createTextNode(" · "), link(photo.license, photo.terms));
          image.addEventListener("error", () => image.replaceWith(link("Open the reference photo", photo.source)));
          figure.append(image, caption);
          item.append(figure);
        }
        const use = tree.established ? "Established choice for sidewalks." : "Listed as a possible sidewalk tree in the city’s guide.";
        const stock = tree.stock === null ? "Ask the nursery about availability." : `${tree.stock} seedlings in the October 2026 inventory.`;
        item.append(element("p", `${use} ${stock}`));
        item.append(element("p", tree.rankReason, "tree-rank-reason"));
        if (tree.wiredTraits) {
          const traits = element("ul", "", "small");
          for (const key of ["roots", "heat", "fruit", "wildlife"]) traits.append(element("li", tree.wiredTraits[key]));
          item.append(traits, link("See the municipal species entry", tree.wiredTraits.source));
        }
        ranking.append(item);
      }
      result.append(ranking);
      if (!provisional) result.append(element("p", "Confirm the planting spot and current seedling availability with the city."));
    }
    if (!trees.length) {
      const options = element("ul");
      for (const idea of [
        "Plant a small native tree inside the property, in a setback, garden or yard with enough room.",
        "Grow a native climbing plant on a sunny wall or facade.",
        "Ask the city about an approved planting bed in the parking lane next to the curb.",
      ]) options.append(element("li", idea));
      result.append(element("h4", "Other ways to add shade"), options);
    }
    result.append(element("p", "Rules are based on São Paulo’s Urban Forestry Technical Manual. Confirm local rules and any required authorization with your municipality.", "small"));
    const actions = element("div", "", "form-actions");
    const back = element("button", "Review my answers", "text-button");
    back.type = "button";
    back.addEventListener("click", () => step ? showStep(step) : reset());
    const restart = element("button", "Start over", "text-button");
    restart.type = "button";
    restart.addEventListener("click", reset);
    actions.append(back, restart);
    if (answers.city !== "other") result.append(link("Ask São Paulo 156 about a planting visit", city));
    result.append(actions);
    heading.focus();
  }

  function evaluate(site = answers) {
    const bedArea = plantingBedArea(site.bedWidth, site.bedLength);
    return recommendTrees({ ...site, bedArea }, catalog);
  }

  function showPreview() {
    const trees = previewTrees({ ...answers, bedArea: plantingBedArea(answers.bedWidth, answers.bedLength) }, catalog);
    if (!trees.length) return false;
    const unknown = answers.wires === "unknown";
    const summary = unknown
      ? "These options use the smaller height limit because overhead wires are still uncertain. Confirm the wires and check the sidewalk before choosing a tree."
      : "These trees are a starting point. Check the walking space, planting bed and nearby obstacles before choosing one.";
    finish("Possible trees for your sidewalk", summary, trees, true);
    const more = element("button", "Check planting conditions");
    more.type = "button";
    more.addEventListener("click", () => {
      fullReview = true;
      wiredChecksReviewed = false;
      proceed();
    });
    result.querySelector(".form-actions").prepend(more);
    return true;
  }

  function proceed(target = nextStep()) {
    if (target === "preview") {
      showPreview();
      return;
    }
    if (target === "siteVisit") {
      finish("This spot needs a site visit", "Wires or a wider sidewalk can change which trees fit. Ask the city to check the spot before choosing a tree.");
      const technical = element("details", "", "ranking-source");
      const open = element("button", "Enter a checked code");
      open.type = "button";
      open.addEventListener("click", () => {
        technicalMode = true;
        proceed();
      });
      technical.append(element("summary", "I already had the site checked"), open);
      result.append(technical);
      return;
    }
    if (target) {
      if (step) history.push(step);
      showStep(target);
      return;
    }
    if (answers.place === "calcada" && Number(answers.total) < 1.9) {
      finish("Do not plant on this sidewalk", `São Paulo’s guide calls for at least 1.90 m at the planting spot. This sidewalk is ${(1.9 - Number(answers.total)).toFixed(2)} m short and must leave 1.20 m clear for walking.`);
      return;
    }
    if (answers.place === "calcada" && answers.tree === "Presente") {
      finish("Choose a different spot", "There is already a tree at this planting point.");
      return;
    }
    const assessment = evaluate();
    if (answers.place === "calcada" && answers.wires === "Presente") {
      if (assessment.status === "pending" && wiredChecksReviewed && showPreview()) return;
      const titles = {
        candidate: "Small-tree planting may be possible (up to 5 m)",
        blocked: "Do not plant at this spot",
        pending: "Get this spot checked before planting",
      };
      finish(titles[assessment.status], assessment.message, assessment.trees, true, assessment.issues);
      return;
    }
    if (assessment.trees.length) {
      finish("Trees to consider for your sidewalk", "These trees fit the measurements and distances you confirmed.", assessment.trees);
      return;
    }
    const message = assessment.message.replace(/ matches code [A-Z]\d* and the confirmed dimensions/i, " fits the confirmed conditions");
    finish("Check this planting spot", message);
  }

  function reset() {
    form.hidden = true;
    result.hidden = true;
    $("interpret").hidden = false;
    status.textContent = "";
    description.focus();
  }

  function start(values) {
    answers = {};
    for (const name of ["place", "total", "free", "wires", "tree"]) {
      if (values[name] != null) answers[name] = String(values[name]);
    }
    extracted = Object.keys(answers);
    if (!extracted.length) answers.place = "calcada";
    step = null;
    history = [];
    technicalMode = false;
    fullReview = false;
    wiredChecksReviewed = false;
    proceed(extracted.length ? "review" : nextStep());
  }

  $("manual-start").addEventListener("click", () => start({}));
  $("interpret").addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = description.value.trim();
    if (!text) return;
    const button = $("interpret-button");
    const manual = $("manual-start");
    button.disabled = manual.disabled = true;
    status.textContent = "Reading your description…";
    let values;
    try {
      if (location.protocol === "file:") throw Error("Offline");
      const response = await fetch("/api/interpretar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
        signal: AbortSignal.timeout(11_000),
      });
      if (!response.ok) throw Error("Unavailable");
      ({ fields: values } = await response.json());
      if (!values || typeof values !== "object") throw Error("Invalid response");
    } catch {
      values = interpretarLocal(text);
    } finally {
      button.disabled = manual.disabled = false;
    }
    if (description.value.trim() !== text) {
      status.textContent = "Your description changed. Read the new version to continue.";
      return;
    }
    status.textContent = "";
    start(values);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updates = Object.fromEntries(new FormData(form));
    for (const [name, value] of Object.entries(updates)) {
      if (!questions[name]?.measure || !value.trim()) continue;
      const measurement = meters(value);
      if (measurement === null) {
        const control = form.elements.namedItem(name);
        for (let details = control.closest("details"); details; details = details.parentElement.closest("details")) details.open = true;
        control.setCustomValidity("Enter meters, for example 1.30 or 1,30.");
        control.reportValidity();
        return;
      }
      updates[name] = measurement;
    }
    if (step === "review" && updates.place && updates.place !== answers.place && updates.place !== "calcada") {
      updates.total = updates.free = "";
    }
    if (step !== "code" && Object.entries(updates).some(([name, value]) => answers[name] !== value)) delete answers.code;
    if (["quick", "review"].includes(step) && ["place", "total", "wires"].some(name => Object.hasOwn(updates, name) && updates[name] !== answers[name])) fullReview = false;
    if (step === "wiredClearances") {
      wiredChecksReviewed = true;
      delete answers.clearancesAttested;
    } else if (["place", "total", "wires", "city", "biome", "tree", "free", "bedWidth", "bedLength"]
      .some(name => Object.hasOwn(updates, name) && updates[name] !== answers[name])) {
      wiredChecksReviewed = false;
      for (const { key } of wiredClearances) delete answers[key];
      delete answers.nearbyTreeSize;
      delete answers.clearancesAttested;
    }
    Object.assign(answers, updates);
    proceed();
  });

  $("assessment-back").addEventListener("click", () => {
    if (history.length) showStep(history.pop());
    else reset();
  });

  $("assessment-skip").addEventListener("click", () => {
    if (showPreview()) return;
    finish("Come back when you have checked the spot", "This answer can change which trees fit here. You can review your answers or ask the city for help checking the site.");
  });
})();
