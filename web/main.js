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

function optionFor(a, hist) {
  const hx = hist.map((p) => p[0]);
  const fx = a.forecast.map((_, i) => `h+${i + 1}`);
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
  $("cards").innerHTML = ["mae", "rmse", "mape"].map((k) =>
    `<div class="card">${k.toUpperCase()}<b>${mt[k] != null ? Number(mt[k]).toFixed(3) : "—"}</b></div>`).join("");
  $("meta").textContent =
    `${a.meta.name} · fuente: ${a.meta.source.url} (${a.meta.source.license}) · ` +
    `modelo: ${a.meta.model || "pendiente"} · generado: ${a.generated_at} · ` +
    `Pesos TimesFM-3 bajo licencia no-comercial (solo portfolio).`;
}

load();
