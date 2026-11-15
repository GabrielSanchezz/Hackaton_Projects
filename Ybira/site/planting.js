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
    },
    wires: {
      label: "Are there wires above the spot?",
      help: "Look up from ground level. Check for wires crossing or running along the planting spot. If you see a wire or are unsure what it carries, choose Yes or check later.",
      options: yesNo,
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
    },
    bedWidth: {
      label: "How wide is the patch of soil?",
      help: "Measure from one edge of the open soil to the other, across the sidewalk. Count only the patch where rain can soak in. Keep pavement and the clear walking space out of this measurement.",
      measure: true,
    },
    bedLength: {
      label: "How long is the patch of soil?",
      help: "Measure along the sidewalk, parallel to the street. If the patch is irregular, use the length of a rectangle that fits fully inside it, and use that rectangle's width for the previous answer. Ybirá multiplies the two measurements.",
      measure: true,
    },
    clearance: {
      label: "Which tree sizes have enough room around the spot?",
      help: "Start at the point where the new trunk would go. Measure along the ground to nearby objects. For a corner, use the point where the two property lines would meet. Choose the largest size for which every relevant distance in the guide is met. If a buried pipe or another distance is uncertain, choose “I’ll check later”.",
      options: [["1", "Only enough room for a small tree"], ["2", "Enough room for a medium tree"], ["3", "Enough room for a large tree"], ["0", "Too close even for a small tree"]],
      distances: true,
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

  function question(name) {
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
    control.value = answers[name] ?? "";
    control.required = step !== "review";
    const row = element("div", "", "answer-control");
    row.append(control);
    if (spec.measure) {
      const unit = element("span", "meters");
      unit.id = `unit-${name}`;
      row.append(unit);
    }
    block.append(heading, row, copy);
    return block;
  }

  function nextStep() {
    if (!answers.place) return "place";
    if (answers.place !== "calcada") return null;
    if (!answers.total) return "total";
    if (Number(answers.total) < 1.9) return null;
    if (answers.tree === "Presente") return null;
    if (!answers.wires) return "wires";
    const needsSiteVisit = answers.wires !== "Ausente" || Number(answers.total) >= 2.4;
    if (needsSiteVisit && !technicalMode) return "siteVisit";
    if (!answers.tree) return "tree";
    if (!answers.free) return "free";
    if (Number(answers.free) < 1.2 || Number(answers.free) > Number(answers.total)) return null;
    if (!answers.bedWidth) return "bedWidth";
    if (!answers.bedLength) return "bedLength";
    if (!answers.clearance) return "clearance";
    if (answers.clearance === "0") return null;
    if (needsSiteVisit) return answers.code ? null : "code";
    if (Number(answers.clearance) > 1) {
      if (!answers.setback) return "setback";
      if (!answers.traffic) return "traffic";
    }
    return null;
  }

  function showStep(target) {
    step = target;
    form.hidden = false;
    $("interpret").hidden = true;
    result.hidden = true;
    const content = $("assessment-fields");
    content.replaceChildren();
    $("assessment-title").textContent = target === "review" ? "Check what Ybirá understood" : "Tell us a little more";
    $("assessment-note").textContent = target === "review" ? "Correct anything that looks off before you continue." : "";
    for (const name of target === "review" ? extracted : [target]) content.append(question(name));
    $("assessment-skip").hidden = !["total", "free", "wires", "tree", "bedWidth", "bedLength", "clearance", "setback", "traffic"].includes(target);
    $("assessment-back").textContent = history.length ? "Back" : "Back to description";
    $("assessment-next").textContent = target === "code" ? "Find my trees" : "Continue";
    $("assessment-title").focus();
  }

  function finish(title, text, trees = [], provisional = false) {
    form.hidden = true;
    result.hidden = false;
    const heading = element("h3", title);
    heading.tabIndex = -1;
    result.replaceChildren(heading, element("p", text));
    if (trees.length) {
      const ranking = element("ol", "", "tree-ranking");
      for (const tree of trees) {
        const item = element("li");
        item.append(element("strong", tree.name));
        item.append(element("p", `${tree.height.join("–")} m tall when grown · Native to São Paulo`));
        const use = tree.established ? "Established choice for sidewalks." : "Listed as a possible sidewalk tree in the city’s guide.";
        const stock = tree.stock === null ? "Ask the nursery about availability." : `${tree.stock} seedlings in the October 2026 inventory.`;
        item.append(element("p", `${use} ${stock}`));
        ranking.append(item);
      }
      result.append(ranking);
      if (!provisional) result.append(element("p", "Confirm the planting spot and current seedling availability with the city."));
    }
    const actions = element("div", "", "form-actions");
    const back = element("button", "Review my answers", "text-button");
    back.type = "button";
    back.addEventListener("click", () => step ? showStep(step) : reset());
    const restart = element("button", "Start over", "text-button");
    restart.type = "button";
    restart.addEventListener("click", reset);
    actions.append(back, restart);
    result.append(link("Ask São Paulo 156 about a planting visit", city), actions);
    heading.focus();
  }

  function evaluate(site = answers) {
    const bedArea = (Math.round(Number(site.bedWidth) * 100) * Math.round(Number(site.bedLength) * 100)) / 10000;
    return recommendTrees({ ...site, bedArea }, catalog);
  }

  function proceed(target = nextStep()) {
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
      finish("Look for a wider spot", "The city’s guide calls for a sidewalk at least 1.90 m wide at the planting spot.");
      return;
    }
    if (answers.place === "calcada" && answers.tree === "Presente") {
      finish("Choose a different spot", "There is already a tree at this planting point.");
      return;
    }
    const assessment = evaluate();
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
    step = null;
    history = [];
    technicalMode = false;
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
      if (!questions[name].measure || !value.trim()) continue;
      const meters = value.trim().replace(",", ".");
      if (!/^\d+(?:\.\d{1,2})?$/.test(meters) || !Number.isFinite(Number(meters))) {
        const control = form.elements.namedItem(name);
        control.setCustomValidity("Enter meters, for example 1.30 or 1,30.");
        control.reportValidity();
        return;
      }
      updates[name] = meters;
    }
    if (step === "review" && updates.place && updates.place !== answers.place && updates.place !== "calcada") {
      updates.total = updates.free = "";
    }
    if (step !== "code" && Object.entries(updates).some(([name, value]) => answers[name] !== value)) delete answers.code;
    Object.assign(answers, updates);
    proceed();
  });

  $("assessment-back").addEventListener("click", () => {
    if (history.length) showStep(history.pop());
    else reset();
  });

  $("assessment-skip").addEventListener("click", () => {
    if (step === "clearance" && answers.wires === "Ausente" && Number(answers.total) < 2.4) {
      const assessment = evaluate({ ...answers, clearance: "1" });
      if (assessment.trees.length) {
        finish("Small trees to explore", "These are preliminary options. Check the distances to nearby objects before choosing a tree.", assessment.trees, true);
        return;
      }
    }
    finish("Come back when you have checked the spot", "This answer can change which trees fit here. You can review your answers or ask the city for help checking the site.");
  });
})();
