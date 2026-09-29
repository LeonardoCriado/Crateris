/* Lee manifest.json + artefactos. Sin build. Las etiquetas del forecast
   son h+1..h+n (ponytail: para freq B caen en finde; el upgrade es
   proyectar fechas por calendario). */
const $ = (id) => document.getElementById(id);
const chart = echarts.init($("chart"));
const NEED = ["meta", "history", "forecast", "quantiles", "metrics", "generated_at"];
const valid = (a) => a && NEED.every((k) => k in a);
let current = null;

const css = (name) => getComputedStyle(document.documentElement)
  .getPropertyValue(name).trim();

/* Proyecta fechas reales desde el último dato según frecuencia.
   B salta fines de semana (ponytail: feriados no contemplados, igual que
   en el pipeline). */
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

function optionFor(a, hist) {
  const hx = hist.map((p) => p[0]);
  const fx = projectDates(hx[hx.length - 1], a.meta.freq, a.forecast.length);
  const q = a.quantiles;
  const pad = (vals) => [...new Array(hist.length - 1).fill(null),
    hist[hist.length - 1][1], ...vals];
  const blanks = new Array(hist.length).fill(null);
  return {
    animation: false, // headless/throttled rAF deja la animación a medias
    backgroundColor: "transparent",
    textStyle: { color: css("--text") },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: [...hx, ...fx],
      splitLine: { lineStyle: { color: css("--grid") } } },
    yAxis: { type: "value", scale: true,
      splitLine: { lineStyle: { color: css("--grid") } } },
    dataZoom: [{ type: "inside", xAxisIndex: 0 }, { type: "slider", xAxisIndex: 0 }],
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

function render() {
  if (current) chart.setOption(optionFor(current.a, current.hist), true);
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("crateris-theme", t); } catch {}
  render();
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
  m.datasets.forEach((d) => { (groups[d.category] ||= []).push(d); });
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
}

async function show(file) {
  $("unavailable").textContent = "";
  let a;
  try {
    a = await (await fetch(file)).json();
  } catch { return void ($("unavailable").textContent = "dataset no disponible"); }
  if (!valid(a)) return void ($("unavailable").textContent = "dataset no disponible");
  const N = 2000; // dataZoom recorta la vista; se carga más historia
  current = { a, hist: a.history.slice(-N) };
  render();
  const mt = a.metrics || {};
  const HELP = {
    mae: "MAE — error absoluto medio: promedio de los errores en las mismas unidades de la serie. Menor es mejor.",
    rmse: "RMSE — raíz del error cuadrático medio: como el MAE pero penaliza más los errores grandes.",
    mape: "MAPE — error porcentual absoluto medio, en %. Ojo: se distorsiona si la serie pasa por cero.",
  };
  $("cards").innerHTML = ["mae", "rmse", "mape"].map((k) =>
    `<div class="card" title="${HELP[k]}">${k.toUpperCase()}<b>${mt[k] != null ? Number(mt[k]).toFixed(3) : "—"}</b></div>`).join("");
  $("meta").textContent =
    `${a.meta.name} · fuente: ${a.meta.source.url} (${a.meta.source.license}) · ` +
    `modelo: ${a.meta.model || "pendiente"} · generado: ${a.generated_at} · ` +
    `Pesos TimesFM-3 bajo licencia no-comercial (solo portfolio).`;
}

load();
