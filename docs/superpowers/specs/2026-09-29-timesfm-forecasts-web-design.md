# Diseño: Web interactiva de forecasts con TimesFM-3

Fecha: 2026-09-29 | Estado: aprobado por el autor | Repo: LeonardoCriado/Crateris

## 1. Objetivo y éxito

Web interactiva (showcase/portfolio) donde se elige un dataset público de series
temporales y se visualiza el pronóstico hacia adelante generado con TimesFM-3
de Google, zero-shot. Éxito = 8–10 series curadas de dominios variados,
forecasts visibles con intervalos, métricas de backtest, publicada en GitHub Pages.

Supuestos: partimos de repo vacío; datasets públicos gratuitos y redistribuibles;
pronóstico zero-shot sin entrenamiento por serie.

## 2. Decisiones arquitectónicas

- **Estático + registry (elegido)** sobre híbrido con backend y on-demand en free-tier.
- Motivos: GH Pages es 100% estático (sin backend posible); la placa local
  (AMD RX 580 Polaris, sin CUDA/ROCm útil) obliga a inferencia en CPU, viable
  porque TimesFM-3 (~330M, PyTorch) corre en CPU en segundos por serie;
  el tráfico de un showcase no justifica GPU paga.
- **Precarga sí o sí en v1**: el pipeline genera artefactos JSON, la web solo los lee.
  Lo on-demand queda para una fase futura con backend (fuera de este spec).
- Las "fuentes que mejoren inferencias" encajan como **covariables nativas de
  TimesFM-3** (past-only y past-future); el registry ya prevé declararlas aunque
  v1 no use ninguna.

## 3. Componentes y layout del repo

```
datasets/      un YAML por dataset (fuente, URL, serie, frecuencia, horizonte,
               covariables opcionales)
pipeline/      Python: download → normalize → forecast (TimesFM-3 CPU)
               → evaluate → export JSON
web/           sitio estático Vite + ECharts, lee manifest.json
docs/          specs y decisiones (este archivo)
data/          cache local de descargas (no versionado salvo muestras)
```

Contrato pipeline↔web: `web/public/data/<id>.json` con schema
`{meta, history[], forecast[], quantiles, metrics, generated_at}` más
`manifest.json` con la lista. La web nunca toca Python/modelo; el pipeline
nunca toca HTML. Agregar dataset = YAML + `make forecasts` + push. Escala a
100+ series sin cambios (a futuro, job de CI que regenere).

## 4. Datasets iniciales (8–10, curados, dominios variados)

Energía (demanda horaria), clima (temperatura diaria), finanzas (índice diario),
transporte (pasajeros mensuales), retail (ventas), salud (casos). Fuentes con URL
fija descargable sin API key (statsmodels, UCI ML, datos abiertos ENTSO-E/NOAA
donde aplique). Cada YAML declara: id, nombre, descripción, fuente + URL +
licencia, columnas, frecuencia, horizonte, covariables (vacío en v1).
Regla: solo fuentes cuya licencia permita redistribución.

## 5. Pipeline

- `uv` + venv, `timesfm[torch]` en CPU.
- Etapas: fetch (cache `data/raw/`) → normalize (serie regular, fechas ISO,
  gaps documentados por dataset) → forecast (contexto ≤512, horizonte por
  frecuencia: 30 diario, 24 horario, 12 mensual; mediana + cuantiles 0.1–0.9)
  → evaluate (backtest últimos N puntos: MAE, RMSE, MAPE) → export.
- Reproducible: `make forecasts`; cada artefacto registra seed, versión de
  librerías y checkpoint del modelo.

## 6. Web

Vite + ECharts. Una página: selector por dataset/categoría, gráfico
historia + forecast con banda de cuantiles, tarjetas de métricas y metadata
(fuente, licencia, fecha de generación, versión del modelo). Renderiza lo que
liste `manifest.json` (agregar datasets no toca código). Build `dist/` publicado
a Pages con GitHub Actions.

## 7. Calidad, errores, límites

- Validaciones: serie no vacía, frecuencia regular, fallo explícito si una
  fuente cambió de formato (checksum opcional en YAML).
- Tests: unitarios de normalizador y schema de artefactos; dataset sintético
  como smoke test sin descargar el modelo.
- Límites declarados en la web: pesos TimesFM-3 con licencia **no-comercial**
  (solo portfolio, no producción); forecasts zero-shot sin tuning; datos no en
  vivo (refresco = re-correr pipeline, fecha visible).

## 8. Fuera de alcance v1

Backend on-demand, refresco automático/CI, covariables reales, tuning/LoRA,
comparación entre modelos, autenticación o multiusuario.
