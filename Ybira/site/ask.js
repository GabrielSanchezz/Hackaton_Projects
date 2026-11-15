"use strict";

(() => {
  const panel = $("ask-panel");
  const form = $("ask-form");
  const questionInput = $("ask-question");
  const submit = $("ask-submit");
  const status = $("ask-status");
  const messages = $("ask-messages");
  const mapContext = $("ask-map-context");
  const useArea = $("ask-use-area");
  const areaName = $("ask-area-name");
  const mapButton = $("ask-map");
  let area = null;
  let lastTurn = null;

  function updateArea(next) {
    area = next ?? null;
    mapContext.hidden = !area;
    mapButton.hidden = !area;
    areaName.textContent = area ? (area.name || "Census area " + area.id) : "";
  }

  function openAssessment() {
    window.openYbira("residents", false);
    const destination = !$("plant").hidden ? $("assessment-title")
      : !$("result").hidden ? $("result").querySelector("h3") : $("description");
    destination?.focus({ preventScroll: true });
    destination?.scrollIntoView({ block: "center" });
  }

  function message(speaker, text, meta) {
    const item = document.createElement("li");
    item.className = "ask-message";
    item.dataset.speaker = speaker;
    const author = document.createElement("strong");
    author.textContent = speaker === "user" ? "You" : "Ask Ybirá";
    const body = document.createElement("p");
    body.textContent = text;
    item.append(author);
    if (meta) {
      const context = document.createElement("div");
      context.className = "ask-message-meta";
      context.textContent = meta;
      item.append(context);
    }
    item.append(body);
    return item;
  }

  function appendSources(item, sources) {
    if (!Array.isArray(sources)) return;
    const list = document.createElement("ul");
    list.setAttribute("aria-label", "Sources");
    for (const source of sources) {
      if (typeof source?.url !== "string" || typeof source.title !== "string" || !source.title.trim()) continue;
      let url;
      try {
        url = new URL(source.url, location.href);
      } catch {
        continue;
      }
      if (url.protocol !== "https:" && !(url.protocol === "http:" && url.origin === location.origin)) continue;
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title;
      const entry = document.createElement("li");
      entry.append(link);
      list.append(entry);
    }
    if (list.childElementCount) item.append(list);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const question = questionInput.value.trim();
    if (!question) {
      status.textContent = "Enter a question.";
      questionInput.focus();
      return;
    }

    const context = useArea.checked ? area : null;
    const areaId = context?.id;
    const previousQuestion = lastTurn?.areaId === areaId ? lastTurn?.question : undefined;
    const userMessage = message("user", question, context ? (context.name || "Census area " + areaId) : "");
    messages.append(userMessage);
    submit.disabled = true;
    status.textContent = "Looking up sources…";

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, areaId, previousQuestion }),
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error("Ask Ybirá request failed.");
      const data = await response.json();
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Missing answer.");
      const reply = message("assistant", data.answer, data.mode === "fallback" ? "Source summary" : "");
      appendSources(reply, data.sources);
      if (data.action === "assess-sidewalk") {
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = "Open sidewalk assessment";
        action.addEventListener("click", openAssessment);
        reply.append(action);
      }
      messages.append(reply);
      lastTurn = { question, areaId };
      if (questionInput.value.trim() === question) questionInput.value = "";
      status.textContent = "";
    } catch {
      userMessage.remove();
      status.textContent = "Ask Ybirá couldn’t answer right now. Try again in a moment.";
    } finally {
      submit.disabled = false;
    }
  });

  for (const suggestion of panel.querySelectorAll("[data-ask-question]")) {
    suggestion.addEventListener("click", () => {
      questionInput.value = suggestion.dataset.askQuestion;
      questionInput.focus();
    });
  }

  mapButton.addEventListener("click", () => {
    panel.open = true;
    useArea.checked = true;
    if (!questionInput.value.trim()) questionInput.value = "Why is this area a planting priority, and what should I check on a visit?";
    questionInput.focus();
  });
  $("map").addEventListener("areachange", event => updateArea(event.detail));
  updateArea(selected);

  // Shareable map links restore the same public area, without restoring chat text.
  const sharedArea = new URLSearchParams(location.search).get("area");
  if (sectorIndicators.has(sharedArea) || districtIndicators.has(sharedArea)) {
    selectArea(sharedArea, sectorIndicators.has(sharedArea) ? "sector" : "district", true);
    tab(true);
  }
})();
