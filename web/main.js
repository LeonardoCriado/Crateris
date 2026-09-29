/* General con selector + ranking top-10 por MAPE (encuadre inicial
   50% historia / 50% forecast, dataZoom inside para explorar).
   Sin build. Fechas del forecast proyectadas en UTC (ponytail: para
   freq B caen en finde; el upgrade es proyectar por calendario). */
const $ = (id) => document.getElementById(id);
const NEED = ["meta", "history", "forecast", "quantiles", "metrics", "generated_at"];
const valid = (a) => a && NEED.every((k) => k in a);
const mainChart = echarts.init($("chart"));
const charts = []; // ranking: {chart, a, hist} para re-render por tema
let current = null;

const css = (name) => getComputedStyle(document.documentElement)
  .getPropertyValue(name).trim();

function projectDates(last, freq, n) {
  const iso = last.length === 7 ? last + "-01" : last;
  // Todo en UTC: los setters locales derivan el día según el TZ del browser.
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z"
    : /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z");
  const out = [];
  for (let i = 0; i < n; i++) {
    if (freq === "M") d.setUTCMonth(d.getUTCMonth() + 1);
    else if (freq === "H") d.setUTCHours(d.getUTCHours() + 1);
    else d.setUTCDate(d.getUTCDate() + 1);
    if (freq === "B") while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
      d.setUTCDate(d.getUTCDate() + 1);
    out.push(d.toISOString().slice(0, freq === "H" ? 13 : 10) +
      (freq === "H" ? ":00" : ""));
  }
  return out;
}

// framed=true: vista completa inicial (ranking). false: vista completa (general).
// keep={start,end}: conserva el zoom actual (cambio de tema).
function optionFor(a, hist, framed, keep) {
  const h = a.forecast.length;
  const hx = hist.map((p) => p[0]);
  const fx = projectDates(hx[hx.length - 1], a.meta.freq, h);
  const q = a.quantiles;
  const pad = (vals) => [...new Array(hist.length - 1).fill(null),
    hist[hist.length - 1][1], ...vals];
  const blanks = new Array(hist.length).fill(null);
  const init = keep || { start: 0, end: 100 }; // zoom-out máximo inicial
  const zoom = framed
    ? [{ type: "inside", xAxisIndex: 0, ...init }]
    : [{ type: "inside", xAxisIndex: 0 },
       { type: "slider", xAxisIndex: 0 }];
  return {
    animation: false,
    backgroundColor: "transparent",
    textStyle: { color: css("--text") },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: [...hx, ...fx],
      splitLine: { lineStyle: { color: css("--grid") } } },
    yAxis: { type: "value", scale: true,
      splitLine: { lineStyle: { color: css("--grid") } } },
    dataZoom: zoom,
    series: [
      { name: "historia", type: "line", showSymbol: false,
        data: hist.map((p) => p[1]), color: css("--hist") },
      { name: "q0.1", type: "line", showSymbol: false,
        lineStyle: { opacity: 0 }, stack: "b",
        data: [...blanks, ...q.map((r) => r[0])], color: css("--muted") },
      { name: "q0.9", type: "line", showSymbol: false,
        lineStyle: { opacity: 0 }, areaStyle: { opacity: 0.25 }, stack: "b",
        data: [...blanks, ...q.map((r) => r[8] - r[0])], color: css("--muted") },
      { name: "forecast", type: "line", showSymbol: false,
        data: pad(a.forecast), color: css("--fc") },
    ],
  };
}

const HELP = {
  mae: "MAE — error absoluto medio: promedio de los errores en las mismas unidades de la serie. Menor es mejor.",
  rmse: "RMSE — raíz del error cuadrático medio: como el MAE pero penaliza más los errores grandes.",
  mape: "MAPE — error porcentual absoluto medio, en %. Ojo: se distorsiona si la serie pasa por cero.",
};

function keepZoom(chart) {
  try {
    const dz = chart.getOption().dataZoom[0];
    return { start: dz.start, end: dz.end };
  } catch { return null; }
}

function renderAll() {
  // conserva el zoom/filtros del usuario al cambiar tema
  if (current) mainChart.setOption(optionFor(
    current.a, current.hist, false, keepZoom(mainChart)));
  charts.forEach(({ chart, a, hist }) =>
    chart.setOption(optionFor(a, hist, true, keepZoom(chart))));
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("crateris-theme", t); } catch {}
  renderAll();
}

async function show(file) {
  $("unavailable").textContent = "";
  let a;
  try {
    a = await (await fetch(file)).json();
  } catch { return void ($("unavailable").textContent = "dataset no disponible"); }
  if (!valid(a)) return void ($("unavailable").textContent = "dataset no disponible");
  current = { a, hist: a.history.slice(-2000) };
  mainChart.setOption(optionFor(a, current.hist, false), true);
  const mt = a.metrics || {};
  $("cards").innerHTML = ["mae", "rmse", "mape"].map((k) =>
    `<div class="card" title="${HELP[k]}">${k.toUpperCase()}<b>${mt[k] != null ? Number(mt[k]).toFixed(3) : "—"}</b></div>`).join("");
  $("meta").textContent =
    `${a.meta.name} · fuente: ${a.meta.source.url} (${a.meta.source.license}) · ` +
    `modelo: ${a.meta.model || "pendiente"} · generado: ${a.generated_at} · ` +
    `Pesos TimesFM-3 bajo licencia no-comercial (solo portfolio).`;
}

async function load() {
  let saved = "dark";
  try { saved = localStorage.getItem("crateris-theme") || "dark"; } catch {}
  document.documentElement.dataset.theme = saved;
  $("theme").onclick = () => setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  const m = await (await fetch("data/manifest.json")).json();
  const sel = $("ds");
  const groups = {};
  m.datasets.forEach((d) => { (groups[d.theme || d.category] ||= []).push(d); });
  Object.entries(groups).forEach(([cat, ds]) => {
    const g = document.createElement("optgroup");
    g.label = cat;
    ds.forEach((d) => {
      const o = document.createElement("option");
      o.value = d.file; o.textContent = d.name; g.appendChild(o);
    });
    sel.appendChild(g);
  });
  sel.onchange = () => show(sel.value);
  if (m.datasets.length) show(m.datasets[0].file);
  const top = m.datasets
    .filter((d) => d.file)
    .sort((x, y) => (x.mape ?? Infinity) - (y.mape ?? Infinity))
    .slice(0, 10);
  const rank = $("ranking");
  let i = 0;
  for (const d of top) {
    let a;
    try {
      a = await (await fetch(d.file)).json();
    } catch { continue; }
    if (!valid(a)) continue;
    i++;
    const h = a.forecast.length;
    const hist = a.history.slice(-6 * h);
    const sec = document.createElement("section");
    sec.className = "item";
    const mt = a.metrics || {};
    sec.innerHTML =
      `<h3>#${i} ${a.meta.name}<span class="badge">${mt.mape != null ? "MAPE " + Number(mt.mape).toFixed(2) + "%" : "sin MAPE"}</span></h3>` +
      `<div class="chart" id="c-${a.meta.dataset_id}"></div>` +
      `<p class="meta">MAE ${Number(mt.mae).toFixed(3)} · RMSE ${Number(mt.rmse).toFixed(3)} · ` +
      `fuente: ${a.meta.source.url} (${a.meta.source.license}) · modelo: ${a.meta.model}</p>`;
    rank.appendChild(sec);
    const chart = echarts.init(sec.querySelector(".chart"));
    charts.push({ chart, a, hist });
    chart.setOption(optionFor(a, hist, true));
  }
  if (!i) $("unavailable").textContent = "sin datasets disponibles";
  await renderCompare();
}

async function renderCompare() {
  let c;
  try {
    c = await (await fetch("data/compare.json")).json();
  } catch { return; } // comparativa aún no generada
  if (!c.datasets || !c.datasets.length) return;
  $("cmp-title").style.display = "";
  const rows = [...c.datasets].sort(
    (x, y) => (x.v3.mape ?? Infinity) - (y.v3.mape ?? Infinity));
  const div = $("compare");
  const pct = (v) => v != null ? v.toFixed(2) + "%" : "—";
  let html = `<table class="cmp"><tr><th>Dataset</th><th>v3 MAPE</th>` +
    `<th>2.5 MAPE</th><th>Mejor</th></tr>`;
  for (const d of rows) {
    const w = (d.v25.mape ?? Infinity) < (d.v3.mape ?? Infinity) ? "v25" : "v3";
    html += `<tr><td>${d.name}</td>` +
      `<td class="${w === "v3" ? "win" : ""}">${pct(d.v3.mape)}</td>` +
      `<td class="${w === "v25" ? "win" : ""}">${pct(d.v25.mape)}</td>` +
      `<td>${w}</td></tr>`;
  }
  div.innerHTML = html + "</table>";
}

load();
