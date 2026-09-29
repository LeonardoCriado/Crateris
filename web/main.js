/* Lee manifest.json + artefactos. Sin build. Las etiquetas del forecast
   son h+1..h+n (ponytail: para freq B caen en finde; el upgrade es
   proyectar fechas por calendario). */
const $ = (id) => document.getElementById(id);
const chart = echarts.init($("chart"));
const NEED = ["meta", "history", "forecast", "quantiles", "metrics", "generated_at"];
const valid = (a) => a && NEED.every((k) => k in a);

async function load() {
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
  const N = 400; // ponytail: recorte de render; upgrade = zoom/paginado
  const hist = a.history.slice(-N);
  const hx = hist.map((p) => p[0]);
  const fx = a.forecast.map((_, i) => `h+${i + 1}`);
  const q = a.quantiles;
  const pad = (vals) => [...new Array(hist.length - 1).fill(null), hist[hist.length - 1][1], ...vals];
  chart.setOption({
    animation: false, // headless/throttled rAF deja la animación a medias
    backgroundColor: "transparent",
    textStyle: { color: "#eee" },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: [...hx, ...fx] },
    yAxis: { type: "value", scale: true },
    series: [
      { name: "historia", type: "line", showSymbol: false, data: hist.map((p) => p[1]), color: "#7aa2f7" },
      { name: "q0.1", type: "line", showSymbol: false, lineStyle: { opacity: 0 }, stack: "b", data: [...new Array(hist.length).fill(null), ...q.map((r) => r[0])], color: "#888" },
      { name: "q0.9", type: "line", showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { opacity: 0.25 }, stack: "b", data: [...new Array(hist.length).fill(null), ...q.map((r) => r[8] - r[0])], color: "#888" },
      { name: "forecast", type: "line", showSymbol: false, data: pad(a.forecast), color: "#e0af68" },
    ],
  });
  const mt = a.metrics || {};
  $("cards").innerHTML = ["mae", "rmse", "mape"].map((k) =>
    `<div class="card">${k.toUpperCase()}<b>${mt[k] != null ? Number(mt[k]).toFixed(3) : "—"}</b></div>`).join("");
  $("meta").textContent =
    `${a.meta.name} · fuente: ${a.meta.source.url} (${a.meta.source.license}) · ` +
    `modelo: ${a.meta.model || "pendiente"} · generado: ${a.generated_at} · ` +
    `Pesos TimesFM-3 bajo licencia no-comercial (solo portfolio).`;
}

load();
