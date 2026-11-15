"use strict";
function interpretarLocal(description) {
  const t = description.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/\b(no|without) overhead (?:wires|wiring)\b/g, "sem fiacao")
    .replace(/\b(?:with overhead (?:wires|wiring)|overhead wires above)\b/g, "com fiacao")
    .replace(/\b(?:an existing tree|already has a tree)\b/g, "arvore existente")
    .replace(/\b(?:no existing tree|no trees?)\b/g, "sem arvore")
    .replace(/\b(?:public square|plaza)\b/g, "praca")
    .replace(/\bsidewalk\b/g, "calcada")
    .replace(/\bstreet\b/g, "rua")
    .replace(/\b(?:backyard|yard)\b/g, "quintal")
    .replace(/\b(?:vacant lot|plot)\b/g, "terreno")
    .replace(/\bclear (?:walking space|pedestrian width)\b/g, "faixa livre")
    .replace(/\bsquare meters?\b/g, "m2")
    .replace(/\bmeters?\b/g, "metros")
    .replace(/\b(?:one|two|three|four|five)\b/g, (word) => ({one:"1",two:"2",three:"3",four:"4",five:"5"})[word]);
  const sites = [
    ["calcada", /\b(calcada|passeio publico)\b/],
    ["praca", /\bpraca\b/],
    ["quintal", /\bquintal\b/],
    ["terreno", /\bterreno\b/],
    ["rua", /\brua\b/],
  ];
  const declared = sites.filter(([, pattern]) => pattern.test(t)).map(([type]) => type);
  const specific = declared.filter((type) => type !== "rua");
  const place = specific.length === 1 ? specific[0] : specific.length === 0 && declared.length === 1 ? declared[0] : null;
  const clauses = t.split(/[.;!?\n]|,\s+/).filter(Boolean);
  const words = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5 };
  const findMeasure = (source, pattern) => {
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1) return null;
    const [, raw, unit] = matches[0];
    const value = words[raw] ?? Number(raw.replace(",", "."));
    if (!Number.isFinite(value)) return null;
    return unit === "cm" || unit.startsWith("centimetro") ? value / 100 : value;
  };
  const units = "(\\d+(?:[.,]\\d+)?|um|uma|dois|duas|tres|quatro|cinco)\\s*(centimetros?|cm|metros?|m)(?![²2]|\\s+quadrados?)\\b";
  const pattern = new RegExp("\\b" + units, "g");
  const freeLines = clauses.filter((line) => /faixa livre|livre para|para pedestres/.test(line));
  const sidewalkLines = clauses.filter((line) => /calcada|passeio|largura total/.test(line) && !/faixa livre|livre para|para pedestres|poste|arvore/.test(line));
  const free = place === "calcada" ? findMeasure(freeLines.join(";"), pattern) : null;
  const total = place === "calcada" ? findMeasure(sidewalkLines.join(";"), pattern) : null;
  const area = findMeasure(t, /\b(\d+(?:[.,]\d+)?)\s*(m²|m2|metros? quadrados?)(?!\w)/g);
  function status(no, yes) {
    const absent = no.test(t);
    const present = yes.test(t.replace(no, " "));
    return absent === present ? null : absent ? "Ausente" : "Presente";
  }
  const wires = status(/\b(?:sem|nao ha|nao tem)\s+(?:fios?|fiacao|rede aerea)\b/g, /\b(?:tem|ha|com)\s+(?:fios?|fiacao|rede aerea)\b|\bfios? em cima\b/);
  const tree = status(/\b(?:sem|nao ha|nao tem)\s+arvores?\b/g, /\b(?:ja tem|tem|ha)\s+(?:uma\s+)?arvore\b|\barvore existente\b/);
  return { place, total, free, area, wires, tree };
}
