/* Crateris showcase. Static, no build. ES default, EN toggle.
   Stats computed live from data/manifest.json + data/compare.json.
   Forecast dates projected in UTC (ponytail: freq B labels may land on
   weekends; the upgrade is calendar-aware projection). */
const $ = (id) => document.getElementById(id);
const NEED = ["meta", "history", "forecast", "quantiles", "metrics", "generated_at"];
const valid = (a) => a && NEED.every((k) => k in a);
const pretty = (s) => String(s).replaceAll("_", " ");
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (v) => v != null ? v.toFixed(2) + "%" : "—";
const num = (v) => v != null ? Number(v).toFixed(3) : "—";

const I18N = {
es: {
  "nav.skip": "Saltar al benchmark", "nav.theme": "Cambiar tema", "nav.themeLabel": "Tema",
  "nav.data": "Datos al",
  "hero.eyebrow": "Showcase de investigación ML",
  "hero.h1": "¿Puede un solo modelo fundacional pronosticar decenas de series temporales sin entrenamiento por serie?",
  "hero.sub": "Un benchmark empírico de los modelos fundacionales TimesFM de Google sobre series temporales reales.",
  "hero.cta1": "Explorar el benchmark ↓", "hero.cta2": "Ver en GitHub ↗",
  "kpi.series": "Series evaluadas", "kpi.avg": "Mediana MAPE · TimesFM-3",
  "kpi.wins": "Series con MAPE <10%", "kpi.train": "Entrenamiento por serie",
  "about.p": "Crateris evalúa si un único modelo fundacional preentrenado puede pronosticar muchas series temporales nunca vistas sin entrenar un modelo separado para cada serie.",
  "about.details": "¿Cómo funciona el pronóstico zero-shot?",
  "about.body": "<p>El modelo se pre-entrenó con miles de millones de puntos de series de todos los dominios, y pronostica una serie nueva <b>sin entrenarse en ella</b> — como un LLM que responde sin fine-tuning. La diferencia con <b>ARIMA</b> (estadística clásica: se ajusta un modelo por serie, asume linealidad y necesita historia suficiente) y con <b>Prophet</b> de Meta (modelo aditivo de tendencia + estacionalidad + feriados, también ajustado por serie y con configuración manual) es que acá hay <b>un solo modelo para todo</b>, a cambio de ser menos interpretable y más conservador en rupturas.</p>",
  "bench.h2": "Benchmark", "bench.series": "Serie", "bench.filter": "Filtro",
  "bench.searchPh": "buscar serie…", "bench.searchAria": "Filtrar series",
  "bench.chartAria": "Serie histórica con pronóstico e intervalo de predicción",
  "fact.series": "Serie", "fact.freq": "Frecuencia", "fact.hist": "Puntos de historia",
  "fact.horizon": "Horizonte de pronóstico", "fact.backtest": "Horizonte de backtest",
  "freq.M": "Mensual", "freq.D": "Diaria", "freq.H": "Horaria", "freq.B": "Días hábiles",
  "legend.hist": "Historia", "legend.fc": "Pronóstico", "legend.band": "Intervalo",
  "legend.fc25": "Pronóstico v2.5",
  "cmp.avg3": "Mediana MAPE · v3", "cmp.avg25": "Mediana MAPE · v2.5",
  "cmp.wins": "Victorias v3", "cmp.nomape": "Sin MAPE",
  "cmp.dotsAria": "Distribución de errores por serie",
  "cmp.colSeries": "Serie", "cmp.cap": "MAPE por serie, mismo backtest, cero tuning",
  "top.h2": "Series con mejor desempeño",
  "top.sub": "Top 10 por MAPE. Elegí una serie para verla en el benchmark.",
  "top.inspect": "Inspeccionar ↑", "top.noMape": "sin MAPE",
  "worst.h2": "Series con peor desempeño",
  "worst.sub": "Bottom 5 por MAPE: donde el modelo sufre.",
  "learn.h2": "¿Qué aprendimos?", "learn.resultH": "El resultado", "learn.compareH": "La comparación",
  "learn.tradeH": "Los trade-offs",
  "learn.t1": "Menos modelos individuales que mantener", "learn.t2": "Menos configuración manual",
  "learn.t3": "Múltiples frecuencias directo de caja", "learn.t4": "Menor interpretabilidad",
  "learn.t5": "Peor reacción ante rupturas", "learn.t6": "Mayor costo computacional por forecast",
  "method.h2": "Metodología", "method.sum": "Cómo se producen los números",
  "method.backtest": "Backtest", "method.backtestD": "Entrena con todo menos los últimos N puntos, pronostica y compara con lo observado (N = horizonte publicado).",
  "method.horizon": "Horizonte", "method.horizonD": "12 pasos mensual, 28 días hábiles diario, 24 horas horario.",
  "method.context": "Contexto", "method.contextD": "Truncado a los 512 puntos más recientes por serie.",
  "method.inference": "Inferencia", "method.inferenceD": "CPU local, sin GPUs, sin entrenamiento por serie.",
  "lic.h2": "Licencias",
  "lic.v25": "Los parámetros del modelo de TimesFM-2.5 —los archivos necesarios para ejecutarlo— están publicados bajo licencia Apache 2.0, que permite su uso, modificación y distribución, incluso con fines comerciales.",
  "lic.v3t": "Licencia no-comercial",
  "lic.v3": "Los pesos de TimesFM-3 tienen una licencia de Google solo para uso no-comercial.",
  "lic.disclaimer": "Disclaimer: esto no es asesoramiento legal. Antes de producción, verificá la licencia del checkpoint exacto que descargues, porque el código y los pesos pueden tener licencias distintas.",
  "concl.h2": "Conclusión",
  "foot.sourcesH": "Fuentes.",
  "foot.sources": "Clima: Open-Meteo Archive API (CC-BY-4.0). Finanzas, energía y materias primas: DataHub Core (ODC-PDDL). Series argentinas: API de Estadísticas del BCRA (uso público). INDEC vía datos.gob.ar (CC-BY-4.0).",
  "foot.built": "Sin backend, sin paso de build.", "foot.code": "código y datos en",
  "foot.linksH": "Enlaces oficiales de TimesFM.",
  "foot.links": "Repositorio, paper, blog de investigación y checkpoints:",
  "meta.title": "Crateris — ¿Puede un solo modelo fundacional pronosticar decenas de series temporales?",
  "meta.desc": "Crateris es un benchmark empírico de los modelos fundacionales TimesFM de Google sobre más de 100 series temporales reales. Pronóstico zero-shot con backtesting.",
  "unavailable": "Serie no disponible", "noSeries": "Sin series disponibles",
  "help.mae": "Error absoluto medio: promedio de los errores en las mismas unidades de la serie. Menor es mejor.",
  "help.rmse": "Raíz del error cuadrático medio: como el MAE pero penaliza más los errores grandes.",
  "help.mape": "Error porcentual absoluto medio, en %. Ojo: se distorsiona si la serie pasa por cero.",
},
en: {
  "nav.skip": "Skip to benchmark", "nav.theme": "Toggle color theme", "nav.themeLabel": "Theme",
  "nav.data": "Data as of",
  "hero.eyebrow": "ML research showcase",
  "hero.h1": "Can one foundation model forecast dozens of time series without per-series training?",
  "hero.sub": "An empirical benchmark of Google's TimesFM foundation models across real-world time series.",
  "hero.cta1": "Explore the benchmark ↓", "hero.cta2": "View on GitHub ↗",
  "kpi.series": "Series evaluated", "kpi.avg": "Median MAPE · TimesFM-3",
  "kpi.wins": "Series with MAPE <10%", "kpi.train": "Per-series training",
  "about.p": "Crateris tests whether a single pretrained foundation model can forecast many previously unseen time series without training a separate model for each series.",
  "about.details": "How does zero-shot forecasting work?",
  "about.body": "<p>The model was pretrained on billions of time-series points from every domain, and forecasts a new series <b>without training on it</b> — like an LLM answering without fine-tuning. Unlike <b>ARIMA</b> (classical statistics: one fitted model per series, assumes linearity, needs enough history) and Meta's <b>Prophet</b> (additive trend + seasonality + holidays model, also fitted per series with manual setup), here there is <b>a single model for everything</b>, at the cost of lower interpretability and more conservative behavior on breaks.</p>",
  "bench.h2": "Benchmark", "bench.series": "Series", "bench.filter": "Filter",
  "bench.searchPh": "search series…", "bench.searchAria": "Filter series",
  "bench.chartAria": "Historical series with forecast and prediction interval",
  "fact.series": "Series", "fact.freq": "Frequency", "fact.hist": "History points",
  "fact.horizon": "Forecast horizon", "fact.backtest": "Backtest horizon",
  "freq.M": "Monthly", "freq.D": "Daily", "freq.H": "Hourly", "freq.B": "Business-daily",
  "legend.hist": "Historical", "legend.fc": "Forecast", "legend.band": "Prediction interval",
  "legend.fc25": "Forecast v2.5",
  "cmp.avg3": "Median MAPE · v3", "cmp.avg25": "Median MAPE · v2.5",
  "cmp.wins": "v3 wins", "cmp.nomape": "No MAPE",
  "cmp.dotsAria": "Error distribution per series",
  "cmp.colSeries": "Series", "cmp.cap": "Per-series MAPE, same backtest, zero tuning",
  "top.h2": "Best-performing series",
  "top.sub": "Top 10 by MAPE. Select any series to inspect it in the benchmark above.",
  "top.inspect": "Inspect ↑", "top.noMape": "no MAPE",
  "worst.h2": "Worst-performing series",
  "worst.sub": "Bottom 5 by MAPE: where the model struggles.",
  "learn.h2": "What did we learn?", "learn.resultH": "The result", "learn.compareH": "The comparison",
  "learn.tradeH": "The trade-offs",
  "learn.t1": "Fewer individual models to maintain", "learn.t2": "Less manual configuration",
  "learn.t3": "Multiple frequencies out of the box", "learn.t4": "Lower interpretability",
  "learn.t5": "Weaker reaction to regime breaks", "learn.t6": "Higher compute cost per forecast",
  "method.h2": "Methodology", "method.sum": "How the numbers are produced",
  "method.backtest": "Backtest", "method.backtestD": "Train on all but the last N points, forecast, compare against observed values (N = published horizon).",
  "method.horizon": "Horizon", "method.horizonD": "12 steps monthly, 28 business days daily, 24 hours hourly.",
  "method.context": "Context", "method.contextD": "Truncated to the most recent 512 points per series.",
  "method.inference": "Inference", "method.inferenceD": "Local CPU, no GPUs, no per-series training.",
  "lic.h2": "Licenses",
  "lic.v25": "The TimesFM-2.5 model parameters —the files needed to run it— are published under the Apache 2.0 license, which allows use, modification and distribution, even for commercial purposes.",
  "lic.v3t": "Non-commercial license",
  "lic.v3": "The weights of TimesFM-3 carry a Google license for non-commercial use only.",
  "lic.disclaimer": "Disclaimer: this is not legal advice. Before production, verify the license of the exact checkpoint you download, as code and weights may carry different licenses.",
  "concl.h2": "Conclusion",
  "foot.sourcesH": "Sources.",
  "foot.sources": "Weather: Open-Meteo Archive API (CC-BY-4.0). Finance, energy and commodities: DataHub Core (ODC-PDDL). Argentine series: BCRA Statistics API (public use). INDEC via datos.gob.ar (CC-BY-4.0).",
  "foot.built": "No backend, no build step.", "foot.code": "code and data at",
  "foot.linksH": "Official TimesFM links.",
  "foot.links": "Repository, paper, research blog and checkpoints:",
  "meta.title": "Crateris — Can one foundation model forecast dozens of time series?",
  "meta.desc": "Crateris is an empirical benchmark of Google's TimesFM foundation models across 100+ real-world time series. Zero-shot forecasting with backtesting.",
  "unavailable": "Series unavailable", "noSeries": "No series available",
  "help.mae": "Mean absolute error: average error in series units. Lower is better.",
  "help.rmse": "Root mean squared error: like MAE but penalizes large errors more.",
  "help.mape": "Mean absolute percentage error. Unreliable near zero.",
}};
let LANG = "es";
const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

const CONCL = {
es: [
  "Un único modelo pudo pronosticar <b>{N} series sin entrenamiento específico para ninguna de ellas</b>, alcanzando una <b>mediana de MAPE de {MED3}%</b> y un mejor caso de <b>{BEST}%</b>.",
  "Usamos la mediana como métrica central porque unas pocas series con quiebres estructurales —con errores de hasta <b>{MAX}%</b>— distorsionan fuertemente el promedio. Esto también muestra uno de los principales límites del enfoque: los modelos fundacionales pueden ser robustos en muchas series, pero tienen dificultades frente a cambios abruptos en el comportamiento de una serie.",
  "Frente a enfoques tradicionales como ARIMA o Prophet, la principal ventaja observada es <b>operativa</b>: un único modelo permite cubrir múltiples series y frecuencias sin mantener un modelo independiente ni configurar manualmente la estacionalidad para cada caso. Además, el forecast incluye intervalos de predicción de forma nativa.",
  "El trade-off es claro: <b>menor interpretabilidad, peor comportamiento ante rupturas estructurales y mayor costo computacional por forecast</b>. A medida que aumenta el número de series, parte de ese costo puede amortizarse al reutilizar el mismo modelo y pipeline.",
  "<h3>TimesFM-3 vs TimesFM-2.5</h3>",
  "Sobre las <b>{BOTH} series comparables</b>, evaluamos TimesFM-3 y TimesFM-2.5 bajo las mismas condiciones: <b>mismo backtest y cero tuning específico por serie</b>.",
  "TimesFM-3 obtuvo un MAPE menor en <b>{W3} de las {BOTH} series</b>, frente a {W25} para TimesFM-2.5. La <b>mediana de MAPE fue {MED3}% para TimesFM-3 frente a {MED25}% para TimesFM-2.5</b>.",
  "La mejora existe, pero no es uniforme: <b>TimesFM-3 supera a TimesFM-2.5 en la mayoría de las series evaluadas, pero el modelo nuevo no domina en todos los casos</b>.",
],
en: [
  "<b>Did we answer the question?</b> Yes: <b>one model forecast {N} series with zero per-series training</b>, at {MED3}% median MAPE and a best case of {BEST}%. Median —not mean— because a few broken series (up to 445%) skew the average. Against ARIMA/Prophet the advantages are operational: zero models to maintain (just one), zero stationarity assumptions, zero manual seasonality configuration, multiple frequencies out of the box and quantile bands included. The cost: lower interpretability, weaker reaction to breaks and more compute per forecast (amortized at scale).",
  "I ran both Google time-series foundation models on the same {BOTH} comparable series, same backtest, zero tuning: <b>TimesFM-3 wins {W3}–{W25} with {MED3}% vs {MED25}% median MAPE</b>. Newer does not crush older.",
]};

let current = null, currentFile = null;
const sparks = [];
let cmpChart = null, cmpDots = null, cmpStats = null, cmpData = null,
  manifestData = null, cmpRowsCache = null;
const rankData = [];

const css = (name) => getComputedStyle(document.documentElement)
  .getPropertyValue(name).trim();

let HOLIDAYS = new Set();
async function loadHolidays() {
  try {
    const all = await Promise.all([2026, 2027, 2028].map((y) =>
      fetch(`https://api.argentinadatos.com/v1/feriados/${y}`).then((r) => r.json())));
    all.flat().forEach((f) => f.fecha && HOLIDAYS.add(f.fecha));
  } catch { /* sin feriados: solo fines de semana */ }
}

function projectDates(last, freq, n) {
  const iso = last.length === 7 ? last + "-01" : last;
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z"
    : /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z");
  const out = [];
  for (let i = 0; i < n; i++) {
    if (freq === "M") d.setUTCMonth(d.getUTCMonth() + 1);
    else if (freq === "H") d.setUTCHours(d.getUTCHours() + 1);
    else d.setUTCDate(d.getUTCDate() + 1);
    if (freq === "B") {
      let guard = 0;
      while ((d.getUTCDay() === 0 || d.getUTCDay() === 6 ||
              HOLIDAYS.has(d.toISOString().slice(0, 10))) && guard++ < 10)
        d.setUTCDate(d.getUTCDate() + 1);
    }
    out.push(d.toISOString().slice(0, freq === "H" ? 13 : 10) +
      (freq === "H" ? ":00" : ""));
  }
  return out;
}

function seriesFor(a, hist) {
  const last = hist[hist.length - 1][1];
  const blanks = new Array(hist.length).fill(null);
  const pad = [...new Array(hist.length - 1).fill(null), last, ...a.forecast];
  const q = a.quantiles;
  const bands = [];
  for (let i = 0; i < 8; i++) {
    const edge = Math.min(i, 7 - i);
    bands.push({ data: [...blanks, ...q.map((r) => r[i + 1] - r[i])],
      opacity: [0.08, 0.13, 0.19, 0.26][edge] });
  }
  return { pad, bands };
}

function tipFmt(ps) {
  let s = `<b>${ps[0].axisValue}</b>`;
  ps.forEach((p) => {
    if ((p.seriesName === t("legend.hist") || p.seriesName === t("legend.fc") ||
         p.seriesName === t("legend.fc25")) && p.value != null)
      s += `<br/>${p.marker} ${p.seriesName}: <b>${p.value}</b>`;
  });
  return s;
}

function optionFor(a, hist, framed, keep, fc25) {
  const h = a.forecast.length;
  const hx = hist.map((p) => p[0]);
  const fx = projectDates(hx[hx.length - 1], a.meta.freq, h);
  const { pad, bands } = seriesFor(a, hist);
  const init = keep || { start: 0, end: 100 };
  const zoom = framed
    ? [{ type: "inside", xAxisIndex: 0, ...init }]
    : [{ type: "inside", xAxisIndex: 0 },
       { type: "slider", xAxisIndex: 0 }];
  return {
    animation: false,
    backgroundColor: "transparent",
    textStyle: { color: css("--text"), fontFamily: "system-ui, sans-serif" },
    tooltip: { trigger: "axis", formatter: tipFmt },
    legend: { textStyle: { color: css("--muted") }, top: 0 },
    grid: { left: 56, right: 16, top: 36, bottom: 64 },
    xAxis: { type: "category", data: [...hx, ...fx],
      axisLabel: { color: css("--muted"), hideOverlap: true },
      splitLine: { lineStyle: { color: css("--grid") } } },
    yAxis: { type: "value", scale: true,
      splitLine: { lineStyle: { color: css("--grid") } } },
    dataZoom: zoom,
    series: [
      { name: t("legend.hist"), type: "line", showSymbol: false,
        data: hist.map((p) => p[1]), color: css("--hist") },
      ...bands.map((b, i) => ({
        name: t("legend.band"), type: "line", showSymbol: false,
        lineStyle: { opacity: 0 }, stack: "fan",
        areaStyle: { opacity: i === 0 ? 0 : b.opacity },
        data: i === 0 ? [...new Array(hist.length).fill(null),
          ...a.quantiles.map((r) => r[0])] : b.data,
        color: css("--muted") })),
      { name: t("legend.fc"), type: "line", showSymbol: false,
        data: pad, color: css("--fc"), lineStyle: { width: 2 } },
      ...(fc25 && fc25.length === h ? [{
        name: t("legend.fc25"), type: "line", showSymbol: false,
        data: [...new Array(hist.length - 1).fill(null),
          hist[hist.length - 1][1], ...fc25],
        color: "#8a8a8a", lineStyle: { width: 1.5, type: "dashed" } }] : []),
    ],
  };
}

function sparkOption(a) {
  const h = a.forecast.length;
  const hist = a.history.slice(-2 * h);
  const hx = hist.map((p) => p[0]);
  const fx = projectDates(hx[hx.length - 1], a.meta.freq, h);
  const { pad } = seriesFor(a, hist);
  return {
    animation: false, backgroundColor: "transparent",
    xAxis: { type: "category", data: [...hx, ...fx], show: false },
    yAxis: { type: "value", scale: true, show: false },
    grid: { left: 2, right: 2, top: 2, bottom: 2 },
    series: [
      { type: "line", showSymbol: false, data: hist.map((p) => p[1]),
        color: css("--hist"), lineStyle: { width: 1.5 } },
      { type: "line", showSymbol: false, data: pad, color: css("--fc"),
        lineStyle: { width: 1.5 } },
    ],
  };
}

function keepZoom(chart) {
  try {
    const dz = chart.getOption().dataZoom[0];
    return { start: dz.start, end: dz.end };
  } catch { return null; }
}

function renderAll() {
  if (current) window.__main.setOption(optionFor(
    current.a, current.hist, false, keepZoom(window.__main), current.fc25));
  sparks.forEach(({ chart, a }) => chart.setOption(sparkOption(a)));
  if (cmpChart && cmpStats) cmpChart.setOption(cmpBarOption(cmpStats));
  if (cmpDots && cmpRowsCache) cmpDots.setOption(cmpDotOption(cmpRowsCache));
}

function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) =>
    el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) =>
    el.setAttribute("placeholder", t(el.dataset.i18nPh)));
  document.querySelectorAll("[data-i18n-content]").forEach((el) =>
    el.setAttribute("content", t(el.dataset.i18nContent)));
  document.title = t("meta.title");
  $("lang").textContent = LANG === "es" ? "EN" : "ES";
  if (manifestData && manifestData.generated_at) $("data-date").textContent =
    `· ${t("nav.data")} ${manifestData.generated_at.slice(0, 10)}`;
  if (currentFile) show(currentFile);
  buildRanking();
  buildCompare();
  buildMethod();
}

function setLang(l) {
  LANG = l;
  try { localStorage.setItem("crateris-lang", l); } catch {}
  applyI18n();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("theme").setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  try { localStorage.setItem("crateris-theme", theme); } catch {}
  renderAll();
}

function kpi(el, value, label) {
  const d = document.createElement("div");
  d.className = "kpi";
  d.innerHTML = `<div class="v">${value}</div><div class="l">${label}</div>`;
  $(el).appendChild(d);
}

async function show(file) {
  currentFile = file;
  $("unavailable").textContent = "";
  let a;
  try {
    a = await (await fetch(file)).json();
  } catch { return void ($("unavailable").textContent = t("unavailable")); }
  if (!valid(a)) return void ($("unavailable").textContent = t("unavailable"));
  const row = cmpData ? cmpData.datasets.find((d) => d.id === a.meta.dataset_id) : null;
  const fc25 = row && row.v25_fc && row.v25_fc.length === a.forecast.length ? row.v25_fc : null;
  current = { a, hist: a.history.slice(-2000), fc25 };
  window.__main.setOption(optionFor(a, current.hist, false, null, fc25), true);
  const mt = a.metrics || {};
  const facts = [
    [t("fact.series"), pretty(a.meta.name), ""],
    [t("fact.freq"), t("freq." + a.meta.freq) || a.meta.freq, ""],
    [t("fact.hist"), current.hist.length, ""],
    [t("fact.horizon"), `${a.forecast.length} steps`, ""],
    [t("fact.backtest"), `${a.forecast.length} steps`, ""],
    ["MAPE", mt.mape != null ? mt.mape.toFixed(2) + "%" : "—", t("help.mape")],
    ["MAE", num(mt.mae), t("help.mae")],
    ["RMSE", num(mt.rmse), t("help.rmse")],
  ];
  $("facts").innerHTML = facts.map(([k, w, h]) =>
    `<div class="fact"><div class="k">${k}</div>` +
    `<div class="w"${h ? ` title="${h}"` : ""}>${w}</div></div>`).join("");
  $("meta").textContent =
    `Source: ${a.meta.source.url} (${a.meta.source.license}) · ` +
    `Model: ${a.meta.model || "pending"} · Generated: ${a.generated_at} · ` +
    `TimesFM-3 weights under non-commercial license (showcase only).`;
}

function buildList(elId, items) {
  const rank = $(elId);
  rank.innerHTML = "";
  const jobs = items.map(async (d) => {
    let a;
    try {
      a = await (await fetch(d.file)).json();
    } catch { return null; }
    return valid(a) ? { d, a } : null;
  });
  return Promise.all(jobs).then((res) => {
    let i = 0;
    res.forEach((r) => {
      if (!r) return;
      i++;
      const { d, a } = r;
      const mt = a.metrics || {};
      const sec = document.createElement("section");
      sec.className = "item";
      sec.innerHTML =
        `<div><h3>#${i} ${pretty(a.meta.name)}<span class="badge">${mt.mape != null ? "MAPE " + Number(mt.mape).toFixed(2) + "%" : t("top.noMape")}</span></h3>` +
        `<p class="meta">MAE ${num(mt.mae)} · RMSE ${num(mt.rmse)} · ${t("freq." + a.meta.freq) || ""} · ${a.forecast.length} steps</p>` +
        `<button class="btn open" data-file="${d.file}">${t("top.inspect")}</button></div>` +
        `<div class="spark" role="img" aria-label="${pretty(a.meta.name)}"></div>`;
      rank.appendChild(sec);
      const chart = echarts.init(sec.querySelector(".spark"));
      sparks.push({ chart, a });
      chart.setOption(sparkOption(a));
    });
    rank.querySelectorAll(".open").forEach((b) => {
      b.onclick = () => {
        $("ds").value = b.dataset.file;
        show(b.dataset.file);
        $("benchmark").scrollIntoView({ behavior: "smooth" });
      };
    });
    return i;
  });
}

function buildRanking() {
  const rank = $("ranking");
  rank.innerHTML = "";
  const worst = $("ranking-worst");
  if (worst) worst.innerHTML = "";
  sparks.length = 0;
  if (!manifestData) return Promise.resolve();
  const top = manifestData.datasets
    .filter((d) => d.file)
    .sort((x, y) => (x.mape ?? Infinity) - (y.mape ?? Infinity))
    .slice(0, 10);
  const bad = [...manifestData.datasets]
    .filter((d) => d.file && d.mape != null)
    .sort((x, y) => y.mape - x.mape)
    .slice(0, 5);
  return buildList("ranking", top).then((n) =>
    buildList("ranking-worst", bad).then((m) => {
      if (!n && !m) $("unavailable").textContent = t("noSeries");
    }));
}

function fiveNum(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return s[lo] + (s[lo + 1] - s[lo] || 0) * (i - lo);
  };
  const q1 = q(0.25), med = q(0.5), q3 = q(0.75);
  const iqr = q3 - q1;
  const lo = s.find((v) => v >= q1 - 1.5 * iqr);
  const hi = [...s].reverse().find((v) => v <= q3 + 1.5 * iqr);
  return { box: [lo, q1, med, q3, hi],
    out: s.filter((v) => v < lo || v > hi) };
}

function cmpDotOption(rows) {
  const c = { text: css("--text"), accent: css("--accent"), grid: css("--grid") };
  const vals = (k) => rows.map((d) => d[k].mape).filter((v) => v != null);
  const b3 = fiveNum(vals("v3")), b25 = fiveNum(vals("v25"));
  const jit = (arr, x) => arr.map((v, i) =>
    ({ value: [x + (i % 2 ? 0.08 : -0.08), +v.toFixed(2)] }));
  return {
    animation: false, backgroundColor: "transparent",
    textStyle: { color: c.text },
    tooltip: { trigger: "item", formatter: (p) =>
      p.value.length === 5
        ? `${p.seriesName}<br/>min ${p.value[0]}% · Q1 ${p.value[1]}% · med ${p.value[2]}% · Q3 ${p.value[3]}% · max ${p.value[4]}%`
        : `${p.seriesName}: <b>${p.value[1]}%</b>` },
    grid: { left: 8, right: 16, top: 30, bottom: 28, containLabel: true },
    legend: { textStyle: { color: c.text }, top: 0 },
    xAxis: { type: "category", data: ["TimesFM-3", "TimesFM-2.5"],
      axisLabel: { color: c.text } },
    yAxis: { type: "log",
      splitLine: { lineStyle: { color: c.grid } } },
    series: [
      { name: "MAPE distribution", type: "boxplot",
        data: [b3.box, b25.box],
        itemStyle: { color: "transparent", borderColor: c.accent, borderWidth: 2 } },
      { name: "v3", type: "scatter", symbolSize: 5,
        data: jit(vals("v3"), 0), color: c.accent },
      { name: "v2.5", type: "scatter", symbolSize: 5,
        data: jit(vals("v25"), 1), color: "#8a8a8a" },
      { name: "outlier", type: "scatter", symbolSize: 7,
        data: [...b3.out.map((v) => ({ value: [0, +v.toFixed(2)] })),
               ...b25.out.map((v) => ({ value: [1, +v.toFixed(2)] }))],
        color: "#e05252" },
    ],
  };
}

function cmpBarOption(st) {
  const c = { text: css("--text"), accent: css("--accent"), grid: css("--grid") };
  return {
    animation: false, backgroundColor: "transparent",
    textStyle: { color: c.text },
    tooltip: { trigger: "axis", formatter: (ps) =>
      `${ps[0].name}: <b>${ps[0].value}%</b>` },
    grid: { left: 8, right: 8, top: 8, bottom: 28, containLabel: true },
    xAxis: { type: "category", data: ["TimesFM-3", "TimesFM-2.5"],
      axisLabel: { color: c.text } },
    yAxis: { type: "value", name: "median MAPE %",
      splitLine: { lineStyle: { color: c.grid } } },
    series: [{ type: "bar", barWidth: "38%",
      data: [{ value: st.avg3, itemStyle: { color: c.accent } },
             { value: st.avg25, itemStyle: { color: "#8a8a8a" } }],
      label: { show: true, formatter: "{c}%", color: c.text } }],
  };
}

let cmpSort = { key: "v3", dir: 1 };

function buildCompareTable() {
  if (!cmpRowsCache) return;
  const val = (d) => cmpSort.key === "diff"
    ? (d.v3.mape != null && d.v25.mape != null ? d.v3.mape - d.v25.mape : null)
    : (d[cmpSort.key].mape ?? null);
  const rows = [...cmpRowsCache].sort((x, y) => {
    const a = val(x), b = val(y);
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * cmpSort.dir;
  });
  const arrow = (k) => cmpSort.key === k ? (cmpSort.dir > 0 ? " ▲" : " ▼") : "";
  let html = `<table class="cmp"><caption style="text-align:left;color:var(--muted);padding-bottom:.4rem">${t("cmp.cap")}</caption><tr><th scope="col">${t("cmp.colSeries")}</th>` +
    `<th scope="col"><button class="linklike" data-sort="v3">v3 MAPE${arrow("v3")}</button></th>` +
    `<th scope="col"><button class="linklike" data-sort="v25">2.5 MAPE${arrow("v25")}</button></th>` +
    `<th scope="col"><button class="linklike" data-sort="diff">Δ pp (v3−v2.5)${arrow("diff")}</button></th></tr>`;
  for (const d of rows) {
    const diff = d.v3.mape != null && d.v25.mape != null ? d.v3.mape - d.v25.mape : null;
    const w = (d.v25.mape ?? Infinity) < (d.v3.mape ?? Infinity) ? "v25" : "v3";
    const ds = diff == null ? "—" : (diff > 0 ? "+" : "") + diff.toFixed(2);
    html += `<tr><td>${pretty(d.name)}</td>` +
      `<td class="${w === "v3" ? "win" : ""}">${pct(d.v3.mape)}</td>` +
      `<td class="${w === "v25" ? "win" : ""}">${pct(d.v25.mape)}</td>` +
      `<td class="${w === "v3" ? "win" : ""}">${ds}</td></tr>`;
  }
  $("compare-table").innerHTML = html + "</table>";
  $("compare-table").querySelectorAll("[data-sort]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.sort;
      cmpSort = cmpSort.key === k ? { key: k, dir: -cmpSort.dir } : { key: k, dir: 1 };
      buildCompareTable();
    };
  });
}

function buildCompare() {
  $("kpis").innerHTML = "";
  $("cmp-kpis").innerHTML = "";
  if (!cmpData || !cmpData.datasets || !cmpData.datasets.length) return;
  const both = cmpData.datasets.filter(
    (d) => d.v3.mape != null && d.v25.mape != null);
  if (!both.length) return;
  const wins = both.filter((d) => d.v3.mape <= d.v25.mape).length;
  const u10 = both.filter((d) => d.v3.mape < 10).length;
  const med3 = median(both.map((d) => d.v3.mape));
  const med25 = median(both.map((d) => d.v25.mape));
  cmpStats = { avg3: +med3.toFixed(2), avg25: +med25.toFixed(2) };
  kpi("kpis", cmpData.datasets.length, t("kpi.series"));
  kpi("kpis", med3.toFixed(2) + "%", t("kpi.avg"));
  kpi("kpis", Math.round(100 * u10 / both.length) + "%", t("kpi.wins"));
  kpi("kpis", "0", t("kpi.train"));
  kpi("cmp-kpis", med3.toFixed(2) + "%", t("cmp.avg3"));
  kpi("cmp-kpis", med25.toFixed(2) + "%", t("cmp.avg25"));
  kpi("cmp-kpis", `${wins} / ${both.length}`, t("cmp.wins"));
  kpi("cmp-kpis", cmpData.datasets.length - both.length, t("cmp.nomape"));
  if (!cmpChart) cmpChart = echarts.init($("cmp-visual"));
  cmpChart.setOption(cmpBarOption(cmpStats));
  const rows = [...cmpData.datasets].sort(
    (x, y) => (x.v3.mape ?? Infinity) - (y.v3.mape ?? Infinity));
  cmpRowsCache = rows;
  if (!cmpDots) cmpDots = echarts.init($("cmp-dots"));
  cmpDots.setOption(cmpDotOption(rows));
  buildCompareTable();
  // Learn + conclusion paragraphs (dynamic numbers).
  const best = Math.min(...both.map((d) => d.v3.mape));
  const worst = Math.max(...both.map((d) => d.v3.mape));
  const o = { N: cmpData.datasets.length, BOTH: both.length,
    W3: wins, W25: both.length - wins, MED3: med3.toFixed(2),
    MED25: med25.toFixed(2), BEST: best.toFixed(2),
    MAX: worst >= 100 ? Math.round(worst) : worst.toFixed(1) };
  $("learn-result").textContent = fmt(LANG === "es"
    ? "Un solo modelo pronosticó {N} series con cero entrenamiento por serie. Mediana de MAPE {MED3}%, mejor caso {BEST}%. La estacionalidad fuerte pronostica bien; las rupturas de régimen no."
    : "One model forecast {N} series with zero per-series training. Median MAPE {MED3}%, best case {BEST}%. Strong seasonality forecasts well; regime breaks do not.", o);
  $("learn-compare").textContent = fmt(LANG === "es"
    ? "TimesFM-3 le gana a 2.5 {W3}–{W25} en MAPE, mediana {MED3}% vs {MED25}%. Lo nuevo no aplasta a lo anterior."
    : "TimesFM-3 beats 2.5 {W3}–{W25} on MAPE, {MED3}% vs {MED25}% median. Newer does not crush older.", o);
  $("conclusion-body").innerHTML = CONCL[LANG].map((p) =>
    `<p>${fmt(p, o)}</p>`).join("");
}

function buildMethod() {
  const steps = LANG === "es"
    ? ["DATOS", "SERIES", "PRONÓSTICO ZERO-SHOT", "BACKTEST", "MÉTRICAS", "COMPARACIÓN"]
    : ["DATA", "SERIES", "ZERO-SHOT FORECAST", "BACKTEST", "METRICS", "MODEL COMPARISON"];
  $("pipe").innerHTML = steps.map((s) => `<li>${s}</li>`).join("<li aria-hidden='true'>→</li>");
  const defs = [
    [t("method.backtest"), t("method.backtestD")],
    [t("method.horizon"), t("method.horizonD")],
    [t("method.context"), t("method.contextD")],
    ["MAE", t("help.mae")], ["RMSE", t("help.rmse")], ["MAPE", t("help.mape")],
    [t("method.inference"), t("method.inferenceD")],
  ];
  $("defs").innerHTML = defs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("") +
    (manifestData ? `<dt>${LANG === "es" ? "Cobertura" : "Coverage"}</dt><dd>${manifestData.datasets.length} artifacts · ${cmpData ? cmpData.datasets.length : 0} compared</dd>` : "");
}

async function load() {
  try { LANG = localStorage.getItem("crateris-lang") || "es"; } catch {}
  let saved = "dark";
  try { saved = localStorage.getItem("crateris-theme") || "dark"; } catch {}
  document.documentElement.dataset.theme = saved;
  $("theme").onclick = () => setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  $("theme").setAttribute("aria-pressed", saved === "dark" ? "true" : "false");
  $("lang").onclick = () => setLang(LANG === "es" ? "en" : "es");
  window.__main = echarts.init($("chart"));

  const m = await (await fetch("data/manifest.json")).json();
  manifestData = m;
  if (m.generated_at) $("data-date").textContent =
    `· ${t("nav.data")} ${m.generated_at.slice(0, 10)}`;
  try {
    cmpData = await (await fetch("data/compare.json")).json();
  } catch { cmpData = null; }
  await loadHolidays();
  applyI18n();
  const sel = $("ds");
  const groups = {};
  m.datasets.forEach((d) => { (groups[d.theme || d.category] ||= []).push(d); });
  Object.entries(groups).forEach(([cat, ds]) => {
    const g = document.createElement("optgroup");
    g.label = cat;
    ds.forEach((d) => {
      const o = document.createElement("option");
      o.value = d.file; o.textContent = pretty(d.name); g.appendChild(o);
    });
    sel.appendChild(g);
  });
  sel.onchange = () => show(sel.value);
  const q = $("q");
  if (q) q.oninput = () => {
    const s = q.value.toLowerCase();
    sel.querySelectorAll("optgroup").forEach((g) => {
      let n = 0;
      g.querySelectorAll("option").forEach((o) => {
        const hit = (o.textContent + " " + g.label).toLowerCase().includes(s);
        o.hidden = !hit;
        if (hit) n++;
      });
      g.hidden = n === 0;
    });
  };
  if (m.datasets.length) await show(m.datasets[0].file);
  buildRanking();
  buildCompare();
  buildMethod();
}

load();
