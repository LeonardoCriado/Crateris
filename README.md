# Crateris — forecasts zero-shot con TimesFM-3

Web interactiva que muestra pronósticos de series temporales públicas
generados con [TimesFM-3](https://github.com/google-research/timesfm)
de Google, sin entrenar por serie.

**Demo:** https://leonardocriado.github.io/Crateris/

## Datasets (65)

Clima (temperatura horaria Berlín y Buenos Aires, Open-Meteo), CO₂ Mauna Loa,
oro, gas natural, Brent, bonos EEUU 10Y, VIX (DataHub), IPC UK (DataHub),
actividad e inflación INDEC (datos.gob.ar) y 50+ series argentinas del
BCRA (inflación, dólar, reservas, tasas, depósitos, préstamos, agregados).

## Cómo agregar un dataset

1. Crear `datasets/<id>.json` (ver `datasets/brent_daily.json` de ejemplo).
2. `python -m pipeline.run --dataset <id>` (requiere `pip install -r requirements.txt`).
3. Verificar `make checks` y pushear: la web lo lista sola vía `manifest.json`.

Fuentes: solo URLs públicas sin API key, con licencia que permita
redistribución. Formatos: CSV (`date_col`/`value_col`) o JSON del BCRA
(`source.format: "bcra-json"`).

## Arquitectura

`pipeline/` (Python stdlib + `timesfm[torch]` en CPU) genera `web/data/*.json`
+ `manifest.json`. `web/` es estática sin build (ECharts por CDN) y se publica
a GitHub Pages con Actions. Detalles en
`docs/superpowers/specs/2026-09-29-timesfm-forecasts-web-design.md`.

## Licencia de los pesos

TimesFM-3 se distribuye bajo licencia **no-comercial**. Este repo es un
showcase/portfolio; no usar los forecasts en producción comercial.
