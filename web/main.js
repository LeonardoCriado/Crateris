/* Ranking top-10 por MAPE: un gráfico por dataset, encuadre inicial
   50% historia / 50% forecast (dataZoom inside para explorar).
   Sin build. Fechas del forecast proyectadas en UTC (ponytail: para
   freq B caen en finde; el upgrade es proyectar por calendario). */
const $ = (id) => document.getElementById(id);
const NEED = ["meta", "history", "forecast", "quantiles", "metrics", "generated_at"];
const valid = (a) => a && NEED.every((k) => k in a);
const charts = []; // {chart, a, hist} para re-render por tema

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

function optionFor(a, hist) {
  const h = a.forecast.length;
  const hx = hist.map((p) => p[0]);
  const fx = projectDates(hx[hx.length - 1], a.meta.freq, h);
  const q = a.quantiles;
  const pad = (vals) => [...new Array(hist.length - 1).fill(null),
    hist[hist.length - 1][1], ...vals];
  const blanks = new Array(hist.length).fill(null);
  const L = hist.length + h;
  const start = Math.max(0, (L - 2 * h) / L * 100); // 50/50 historia/forecast
  return {
    animation: false,
    backgroundColor: "transparent",
    textStyle: { color: css("--text") },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: [...hx, ...fx],
      splitLine: { lineStyle: { color: css("--grid") } } },
    yAxis: { type: "value", scale: true,
      splitLine: { lineStyle: { color: css("--grid") } } },
    dataZoom: [{ type: "inside", xAxisIndex: 0, start, end: 100 }],
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

function renderAll() {
  charts.forEach(({ chart, a, hist }) =>
    chart.setOption(optionFor(a, hist), true));
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("crateris-theme", t); } catch {}
  renderAll();
}

async function load() {
  let saved = "dark";
  try { saved = localStorage.getItem("crateris-theme") || "dark"; } catch {}
  document.documentElement.dataset.theme = saved;
  $("theme").onclick = () => setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  const m = await (await fetch("data/manifest.json")).json();
  const top = m.datasets
    .filter((d) => d.mape != null)
    .sort((x, y) => x.mape - y.mape)
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
    const hist = a.history.slice(-6 * h); // contexto para el zoom
    const sec = document.createElement("section");
    sec.className = "item";
    const mt = a.metrics || {};
    sec.innerHTML =
      `<h3>#${i} ${a.meta.name}<span class="badge">MAPE ${Number(mt.mape).toFixed(2)}%</span></h3>` +
      `<div class="chart" id="c-${a.meta.dataset_id}"></div>` +
      `<p class="meta">MAE ${Number(mt.mae).toFixed(3)} · RMSE ${Number(mt.rmse).toFixed(3)} · ` +
      `fuente: ${a.meta.source.url} (${a.meta.source.license}) · modelo: ${a.meta.model}</p>`;
    rank.appendChild(sec);
    const chart = echarts.init(sec.querySelector(".chart"));
    charts.push({ chart, a, hist });
    chart.setOption(optionFor(a, hist));
  }
  if (!i) $("unavailable").textContent = "sin datasets disponibles";
}

load();
