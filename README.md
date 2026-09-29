# Crateris 🏆 — ¿Puede un solo modelo fundacional pronosticar decenas de series?

Showcase bilingüe (ES/EN) que evalúa si **un solo modelo** puede pronosticar
eficientemente **103 series temporales** sin entrenamiento por serie, con
[TimesFM-3](https://github.com/google-research/timesfm) y
[TimesFM-2.5](https://huggingface.co/collections/google/timesfm-release-66e4be5fdb56e960c1e482a6)
de Google en zero-shot.

**Demo:** https://leonardocriado.github.io/Crateris/

Resultado headline: mediana de MAPE **4.01%** (v3) vs **5.23%** (v2.5),
59/99 victorias para v3, mejor caso 0.09% (CO₂ Mauna Loa).

## Datasets (103)

Clima (Open-Meteo), finanzas/energía/materias (DataHub), INDEC vía datos.gob.ar
(IPC, EMAE, salarios, ISAC, capacidad instalada) y 60+ series argentinas del
BCRA (inflación, dólar, reservas, tasas, depósitos, préstamos, agregados,
base monetaria). Ver `datasets/` (un JSON por serie) y `pipeline/sweep.py`
(barrido automático del catálogo BCRA).

## Pipeline

- `pipeline/run.py` — descarga, normaliza, pronostica (TimesFM-3 CPU),
  backtest MAE/RMSE/MAPE y exporta `web/data/*.json` + `manifest.json`.
- `pipeline/compare.py` — backtest con TimesFM-2.5 y `compare.json` (incluye
  forecasts v2.5 para el overlay).
- `pipeline/sweep.py` — descubre series BCRA válidas con tope por categoría.
- Formatos: CSV (`date_col`/`value_col`, `skip_lines`, `start_from`) o JSON
  del BCRA (`source.format: "bcra-json"`). Frecuencias `M/D/H/B`.
- Entornos: `.venv` (v3, `requirements.txt`), `.venv25` (v2.5,
  `requirements25.txt`). Verificación: `make checks`.

## Web (`web/`, estática sin build, ECharts por CDN)

Hero con KPIs calculados en vivo, benchmark con selector + buscador y fan chart
de 9 deciles, top 10 y bottom 5 con sparklines, comparativa v3 vs 2.5 (barras,
dot plot logarítmico, tabla con Δ pp), conclusión, metodología, licencias y
footer con fuentes. Temas oscuro/claro e idioma ES/EN persistidos.

## Licencias

- Pesos TimesFM-2.5: Apache-2.0 (uso comercial permitido).
- Pesos TimesFM-3: solo uso no-comercial.
- Verificar siempre la licencia del checkpoint exacto. Esto no es asesoramiento
  legal.

## Links oficiales de TimesFM

- Repo: https://github.com/google-research/timesfm
- Paper: https://arxiv.org/abs/2310.10688
- Blog TimesFM-3: https://research.google/blog/timesfm-3-a-zero-shot-foundation-model-for-multivariate-forecasting/
- Checkpoints: https://huggingface.co/collections/google/timesfm-release-66e4be5fdb56e960c1e482a6
- BigQuery ML: https://cloud.google.com/bigquery/docs/timesfm-model
