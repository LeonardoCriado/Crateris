/* Crateris showcase. Static, no build. Stats computed live from
   data/manifest.json + data/compare.json — never hardcoded.
   Forecast dates projected in UTC (ponytail: freq B labels may land on
   weekends; the upgrade is calendar-aware projection). */
const $ = (id) => document.getElementById(id);
const NEED = ["meta", "history", "forecast", "quantiles", "metrics", "generated_at"];
const valid = (a) => a && NEED.every((k) => k in a);
const FREQ = { M: "Monthly", D: "Daily", H: "Hourly", B: "Business-daily" };
const HELP = {
  mae: "Mean absolute error: average error in series units. Lower is better.",
  rmse: "Root mean squared error: like MAE but penalizes large errors more.",
  mape: "Mean absolute percentage error. Unreliable near zero.",
};
let current = null;
const sparks = [];
let cmpChart = null, cmpStats = null;

const css = (name) => getComputedStyle(document.documentElement)
  .getPropertyValue(name).trim();

function projectDates(last, freq, n) {
  const iso = last.length === 7 ? last + "-01" : last;
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

function seriesFor(a, hist) {
  const h = a.forecast.length;
  const last = hist[hist.length - 1][1];
  const blanks = new Array(hist.length).fill(null);
  const pad = [...new Array(hist.length - 1).fill(null), last, ...a.forecast];
  const q = a.quantiles;
  return { pad, ql: [...blanks, ...q.map((r) => r[0])],
    qu: [...blanks, ...q.map((r) => r[8] - r[0])] };
}

function tipFmt(ps) {
  let s = `<b>${ps[0].axisValue}</b>`;
  ps.forEach((p) => {
    if ((p.seriesName === "Historical" || p.seriesName === "Forecast") &&
        p.value != null)
      s += `<br/>${p.marker} ${p.seriesName}: <b>${p.value}</b>`;
  });
  return s;
}

// framed: ranking zoom start; full: main chart with slider.
function optionFor(a, hist, framed, keep) {
  const h = a.forecast.length;
  const hx = hist.map((p) => p[0]);
  const fx = projectDates(hx[hx.length - 1], a.meta.freq, h);
  const { pad, ql, qu } = seriesFor(a, hist);
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
      { name: "Historical", type: "line", showSymbol: false,
        data: hist.map((p) => p[1]), color: css("--hist") },
      { name: "Prediction interval", type: "line", showSymbol: false,
        lineStyle: { opacity: 0 }, stack: "b", data: ql, color: css("--muted") },
      { name: "Prediction interval", type: "line", showSymbol: false,
        lineStyle: { opacity: 0 }, areaStyle: { opacity: 0.25 }, stack: "b",
        data: qu, color: css("--muted") },
      { name: "Forecast", type: "line", showSymbol: false,
        data: pad, color: css("--fc"), lineStyle: { width: 2 } },
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

function themeColors() {
  return { text: css("--text"), accent: css("--accent"),
    grid: css("--grid") };
}

function renderAll() {
  if (current) window.__main.setOption(optionFor(
    current.a, current.hist, false, keepZoom(window.__main)));
  sparks.forEach(({ chart, a }) => chart.setOption(sparkOption(a)));
  if (cmpChart && cmpStats) cmpChart.setOption(cmpBarOption(cmpStats));
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  const btn = $("theme");
  btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
  try { localStorage.setItem("crateris-theme", t); } catch {}
  renderAll();
}

const pretty = (s) => String(s).replaceAll("_", " ");
const pct = (v) => v != null ? v.toFixed(2) + "%" : "—";
const num = (v) => v != null ? Number(v).toFixed(3) : "—";

function kpi(el, value, label) {
  const d = document.createElement("div");
  d.className = "kpi";
  d.innerHTML = `<div class="v">${value}</div><div class="l">${label}</div>`;
  $(el).appendChild(d);
}

async function show(file) {
  $("unavailable").textContent = "";
  let a;
  try {
    a = await (await fetch(file)).json();
  } catch { return void ($("unavailable").textContent = "Series unavailable"); }
  if (!valid(a)) return void ($("unavailable").textContent = "Series unavailable");
  current = { a, hist: a.history.slice(-2000) };
  window.__main.setOption(optionFor(a, current.hist, false), true);
  const mt = a.metrics || {};
  const facts = [
    ["Dataset", pretty(a.meta.name), ""],
    ["Frequency", FREQ[a.meta.freq] || a.meta.freq, ""],
    ["History points", current.hist.length, ""],
    ["Forecast horizon", `${a.forecast.length} steps`, ""],
    ["Backtest horizon", `${a.forecast.length} steps`, ""],
    ["MAPE", mt.mape != null ? mt.mape.toFixed(2) + "%" : "—", HELP.mape],
    ["MAE", num(mt.mae), HELP.mae],
    ["RMSE", num(mt.rmse), HELP.rmse],
  ];
  $("facts").innerHTML = facts.map(([k, w, t]) =>
    `<div class="fact"><div class="k">${k}</div>` +
    `<div class="w"${t ? ` title="${t}"` : ""}>${w}</div></div>`).join("");
  $("meta").textContent =
    `Source: ${a.meta.source.url} (${a.meta.source.license}) · ` +
    `Model: ${a.meta.model || "pending"} · Generated: ${a.generated_at} · ` +
    `TimesFM-3 weights under non-commercial license (showcase only).`;
}

function cmpBarOption(st) {
  const c = themeColors();
  return {
    animation: false, backgroundColor: "transparent",
    textStyle: { color: c.text },
    tooltip: { trigger: "axis", formatter: (ps) =>
      `${ps[0].name}: <b>${ps[0].value}%</b>` },
    grid: { left: 8, right: 8, top: 8, bottom: 28, containLabel: true },
    xAxis: { type: "category", data: ["TimesFM-3", "TimesFM-2.5"],
      axisLabel: { color: c.text } },
    yAxis: { type: "value", name: "avg MAPE %",
      splitLine: { lineStyle: { color: c.grid } } },
    series: [{ type: "bar", barWidth: "38%",
      data: [{ value: st.avg3, itemStyle: { color: c.accent } },
             { value: st.avg25, itemStyle: { color: "#8a8a8a" } }],
      label: { show: true, formatter: "{c}%", color: c.text } }],
  };
}

async function load() {
  let saved = "dark";
  try { saved = localStorage.getItem("crateris-theme") || "dark"; } catch {}
  document.documentElement.dataset.theme = saved;
  $("theme").onclick = () => setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  $("theme").setAttribute("aria-pressed", saved === "dark" ? "true" : "false");
  window.__main = echarts.init($("chart"));

  const m = await (await fetch("data/manifest.json")).json();
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
  if (m.datasets.length) await show(m.datasets[0].file);

  // Top 10 by MAPE with sparklines.
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
    const mt = a.metrics || {};
    const sec = document.createElement("section");
    sec.className = "item";
    sec.innerHTML =
      `<div><h3>#${i} ${a.meta.name}<span class="badge">${mt.mape != null ? "MAPE " + Number(mt.mape).toFixed(2) + "%" : "no MAPE"}</span></h3>` +
      `<p class="meta">MAE ${num(mt.mae)} · RMSE ${num(mt.rmse)} · ${FREQ[a.meta.freq] || ""} · ${a.forecast.length} steps</p>` +
      `<button class="btn open" data-file="${d.file}">Inspect ↑</button></div>` +
      `<div class="spark" role="img" aria-label="Mini chart for ${a.meta.name}"></div>`;
    rank.appendChild(sec);
    const chart = echarts.init(sec.querySelector(".spark"));
    sparks.push({ chart, a });
    chart.setOption(sparkOption(a));
  }
  rank.querySelectorAll(".open").forEach((b) => {
    b.onclick = () => {
      sel.value = b.dataset.file;
      show(b.dataset.file);
      $("benchmark").scrollIntoView({ behavior: "smooth" });
    };
  });
  if (!i) $("unavailable").textContent = "No series available";

  // Comparison (dynamic from compare.json).
  try {
    const c = await (await fetch("data/compare.json")).json();
    const both = c.datasets.filter(
      (d) => d.v3.mape != null && d.v25.mape != null);
    if (both.length) {
      const wins = both.filter((d) => d.v3.mape <= d.v25.mape).length;
      const avg3 = both.reduce((s, d) => s + d.v3.mape, 0) / both.length;
      const avg25 = both.reduce((s, d) => s + d.v25.mape, 0) / both.length;
      cmpStats = { avg3: +avg3.toFixed(2), avg25: +avg25.toFixed(2) };
      kpi("kpis", c.datasets.length, "Series evaluated");
      kpi("kpis", avg3.toFixed(2) + "%", "Average MAPE · TimesFM-3");
      kpi("kpis", `${wins} / ${both.length}`, "TimesFM-3 wins");
      kpi("kpis", "0", "Per-series training");
      kpi("cmp-kpis", avg3.toFixed(2) + "%", "Avg MAPE · v3");
      kpi("cmp-kpis", avg25.toFixed(2) + "%", "Avg MAPE · v2.5");
      kpi("cmp-kpis", `${wins} / ${both.length}`, "v3 wins");
      kpi("cmp-kpis", c.datasets.length - both.length, "Without MAPE");
      cmpChart = echarts.init($("cmp-visual"));
      cmpChart.setOption(cmpBarOption(cmpStats));
      const rows = [...c.datasets].sort(
        (x, y) => (x.v3.mape ?? Infinity) - (y.v3.mape ?? Infinity));
      let html = `<table class="cmp"><caption style="text-align:left;color:var(--muted);padding-bottom:.4rem">Per-series MAPE, same backtest, zero tuning</caption><tr><th scope="col">Series</th><th scope="col">v3 MAPE</th>` +
        `<th scope="col">2.5 MAPE</th><th scope="col">Better</th></tr>`;
      for (const d of rows) {
        const w = (d.v25.mape ?? Infinity) < (d.v3.mape ?? Infinity) ? "v25" : "v3";
        html += `<tr><td>${pretty(d.name)}</td>` +
          `<td class="${w === "v3" ? "win" : ""}">${pct(d.v3.mape)}</td>` +
          `<td class="${w === "v25" ? "win" : ""}">${pct(d.v25.mape)}</td>` +
          `<td>${w}</td></tr>`;
      }
      $("compare").innerHTML = html + "</table>";
      $("learn-result").textContent =
        `One model forecast ${c.datasets.length} series with zero per-series training. ` +
        `Average MAPE ${avg3.toFixed(2)}%, best case ${Math.min(...both.map((d) => d.v3.mape)).toFixed(2)}%. ` +
        `Strong seasonality forecasts well; regime breaks do not.`;
      $("learn-compare").textContent =
        `TimesFM-3 beats 2.5 ${wins}–${both.length - wins} on MAPE, ` +
        `${avg3.toFixed(2)}% vs ${avg25.toFixed(2)}% on average. Newer does not crush older.`;
      $("method-coverage").textContent =
        `${m.datasets.length} artifacts published · ${c.datasets.length} series compared across both models.`;
    }
  } catch { /* compare.json missing: sections stay empty */ }
}

load();
