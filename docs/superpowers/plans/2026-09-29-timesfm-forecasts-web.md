# TimesFM Forecasts Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en GitHub Pages una web estática que muestre forecasts TimesFM-3 de 8–10 series públicas, generados por un pipeline Python local en CPU.

**Architecture:** Pipeline (`pipeline/`) lee un registry YAML (`datasets/`), descarga, normaliza, pronostica con TimesFM-3 en CPU, evalúa con backtest y exporta JSON con schema fijo + `manifest.json`. Web (`web/`, Vite + ECharts) solo lee ese contrato. Sin backend.

**Tech Stack:** Python 3.14 stdlib + `timesfm[torch]` (CPU) + pandas; Node 26, Vite, ECharts; GitHub Actions → Pages.

**Spec:** `docs/superpowers/specs/2026-09-29-timesfm-forecasts-web-design.md`

## Global Constraints

- Repo branches: una rama `ft/<tema>` por task, merge a `main` al aprobar.
- AGENTS.md (ponytail lazy mode) rige todo el código: stdlib antes que dependencias, mínimos archivos posibles, sin abstracciones no pedidas.
- Checks: UN check ejecutable por lógica no trivial, estilo `assert`, sin frameworks ni fixtures; se corre con `python <archivo>` y falla si la lógica rompe.
- Pesos TimesFM-3 bajo licencia no-comercial: consignar en web y README, nunca uso comercial.
- venv con stdlib (`python3 -m venv`), no hay `uv` en la máquina.
- Node 26.8.2 / npm 11.19.1 disponibles.
- Artefactos versionados en `web/public/data/`; `data/raw/` es cache local ignorado por git.

## Review Focus

- Fuente pública que cambió de formato o cayó → el pipeline debe fallar con mensaje que nombre el dataset y la causa, nunca con traceback crudo.
- Serie con gaps o frecuencia irregular → normalizar o rechazar explícitamente, jamás pronosticar sobre fechas inventadas en silencio.
- JSON de artefacto que no cumple el schema → la web debe mostrar "dataset no disponible" en vez de página rota.
- `manifest.json` desactualizado respecto a `web/public/data/` → el build debe fallar, no publicar una lista rota.
- Re-correr `make forecasts` dos veces con la misma entrada → artefactos idénticos salvo `generated_at` (reproducibilidad).

---

### Task 1: Pipeline base — registry, fetch, normalize, schema

Rama: `ft/pipeline-base`. Sin modelo todavía; deja el contrato JSON y los checks listos.

**Files:**
- Create: `pipeline/registry.py`, `pipeline/fetch.py`, `pipeline/normalize.py`, `pipeline/schema.py`, `Makefile`
- Create: `datasets/_example.yaml`
- Create: `tests/test_registry.py`, `tests/test_fetch.py`, `tests/test_normalize.py`, `tests/test_schema.py` (plain asserts, run `python tests/test_x.py`)
- Modify: `.gitignore` (agregar `data/raw/`, `.venv/`, `web/dist/`, `web/node_modules/`)

**Interfaces:**
- Consumes: nada (primera task).
- Produces (usan Tasks 2–4, nombres exactos):
  - `registry.load(path: str) -> dict` — parsea el YAML del dataset a dict con claves `id, name, description, source{url, license}, date_col, value_col, freq, horizon, covariates`.
  - `fetch.download(cfg: dict, dest: str) -> str` — descarga URL a `dest`, retorna path; falla con `RuntimeError("dataset <id>: <causa>")` si HTTP ≠ 200.
  - `normalize.to_series(cfg: dict, raw_path: str) -> list[tuple[str, float]]` — retorna lista `(fecha_iso, valor)` con frecuencia regular validada; gaps → `ValueError("dataset <id>: gap en <fecha>")`.
  - `schema.ARTIFACT_KEYS = {"meta","history","forecast","quantiles","metrics","generated_at"}` y `schema.validate(artifact: dict) -> None` (levanta `ValueError` si falta clave).
  - `make forecasts` → corre `python -m pipeline.run` (existe desde esta task como stub que procesa registry+fetch+normalize y exporta artefactos con `forecast: []`, para que la Task 4 pueda desarrollarse en paralelo contra el schema real).

- [ ] **Step 1: Escribir los checks que fallan**

```python
# tests/test_fetch.py
from pipeline.fetch import download
try:
    download({"id": "demo", "source": {"url": "bogus://no-existe"}}, "data/raw/demo.csv")
    raise AssertionError("debió fallar")
except RuntimeError as e:
    assert "demo" in str(e)
```

```python
# tests/test_normalize.py (caso feliz + gap)
from pipeline.normalize import to_series
cfg = {"id": "demo", "freq": "D", "date_col": "d", "value_col": "v"}
rows = to_series(cfg, "tests/fixtures/demo.csv")  # 3 filas diarias 2024-01-01..03
assert [d for d, _ in rows] == ["2024-01-01", "2024-01-02", "2024-01-03"]
try:
    to_series(cfg, "tests/fixtures/gapped.csv")  # falta 2024-01-02
    raise AssertionError("debió fallar")
except ValueError as e:
    assert "gap" in str(e)
```

```python
# tests/test_schema.py
from pipeline.schema import validate
validate({"meta": {}, "history": [], "forecast": [], "quantiles": [], "metrics": {}, "generated_at": "x"})
try:
    validate({"meta": {}})
    raise AssertionError("debió fallar")
except ValueError:
    pass
```

- [ ] **Step 2: Correrlos y verlos fallar**

Run: `python tests/test_normalize.py && python tests/test_schema.py && python tests/test_registry.py`
Expected: FAIL (`ModuleNotFoundError: pipeline` o archivo inexistente).

- [ ] **Step 3: Implementar `registry.py`, `fetch.py`, `normalize.py`, `schema.py`, `pipeline/run.py` (stub), `datasets/_example.yaml`, `Makefile`, `.gitignore`**

YAML con `yaml` de stdlib no existe → usar dict literal en `_example.yaml` no sirve; decisión: registry en **JSON** (`datasets/<id>.json`) para no agregar dependencia PyYAML. (Si el ejecutor prefiere YAML + dependencia, debe justificarlo contra AGENTS.md.) `fetch` con `urllib`, CSV con `csv`. `normalize` valida regularidad por `freq` en `{"D","H","M"}`; `ponytail:` gap-fill no implementado — cualquier gap es error, upgrade = imputación declarada por dataset.

- [ ] **Step 4: Correr checks + stub end-to-end**

Run: `python tests/test_registry.py && python tests/test_fetch.py && python tests/test_normalize.py && python tests/test_schema.py && make forecasts`
Expected: los 4 PASS silenciosos; `make forecasts` genera `web/public/data/_example.json` + `manifest.json` válido.

- [ ] **Step 5: Commit en la rama**

```bash
git checkout -b ft/pipeline-base
git add pipeline datasets Makefile tests .gitignore web/public/data/_example.json web/public/data/manifest.json tests/fixtures/demo.csv tests/fixtures/gapped.csv
git commit -m "feat: pipeline base con registry, normalize y schema"
```

### Task 2: Forecast TimesFM-3 (CPU) + backtest + export real

Rama: `ft/forecast`. Requiere descarga del checkpoint (~GB); solo se corre local.

**Files:**
- Create: `pipeline/forecast.py`, `pipeline/evaluate.py`
- Modify: `pipeline/run.py` (stub → real), `requirements.txt` (create: `timesfm[torch]`, pandas, numpy)
- Create: `tests/test_evaluate.py`

**Interfaces:**
- Consumes: `registry.load`, `normalize.to_series`, `schema.validate` (Task 1, sin cambios).
- Produces:
  - `forecast.predict(series: list[tuple[str, float]], horizon: int) -> dict{forecast: list[float], quantiles: list[list[float]]}` — mediana + 9 deciles 0.1–0.9, `device="cpu"`, contexto truncado a últimos 512 puntos (`ponytail:` truncado simple; upgrade = ventana deslizante).
  - `evaluate.mae(actual: list[float], predicted: list[float]) -> float` más
  - `evaluate.backtest(series, horizon) -> dict{mae: float, rmse: float, mape: float}` — entrena sobre todo menos últimos `horizon`, pronostica y compara.
  - `run.py` real escribe artefacto completo + `generated_at` ISO + `meta{model: "google/timesfm-3.0-pytorch", timesfm_version, dataset_id}`.

- [ ] **Step 1: Escribir el check de evaluate (no requiere modelo)**

```python
# tests/test_evaluate.py
from pipeline.evaluate import mae
assert abs(mae([1.0, 2.0, 3.0], [1.0, 2.0, 4.0]) - 1/3) < 1e-9
```

- [ ] **Step 2: Verlo fallar**

Run: `python tests/test_evaluate.py`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implementar `forecast.py`, `evaluate.py`, `run.py` real, `requirements.txt`**

`forecast.py` carga el modelo una vez (singleton de módulo). Import de `timesfm3` dentro de la función para que `run.py --no-forecast` y los checks no necesiten el peso.

- [ ] **Step 4: Verificar check + smoke test con serie sintética**

Run: `python tests/test_evaluate.py && python -m pipeline.run --dataset _example --no-forecast`
Expected: PASS; el segundo comando regenera el artefacto stub sin tocar el modelo.

- [ ] **Step 5: Commit**

```bash
git checkout -b ft/forecast
git add pipeline requirements.txt tests/test_evaluate.py
git commit -m "feat: forecast TimesFM-3 CPU con backtest MAE/RMSE/MAPE"
```

### Task 3: Datasets semilla (8–10) + artefactos

Rama: `ft/datasets`. Curaduría + corrida real del modelo en CPU local.

**Files:**
- Create: `datasets/<id>.json` (8–10) + artefactos generados en `web/public/data/`
- Modify: `web/public/data/manifest.json`

**Interfaces:**
- Consumes: `make forecasts` (Tasks 1–2).
- Produces: `manifest.json = {"datasets": [{id, name, category, freq, horizon, file}], "generated_at"}` exacto; la Task 4 lo lee tal cual.

- [ ] **Step 1: Crear 2 datasets JSON y validar que cargan**

Run: `python -c "from pipeline.registry import load; print(load('datasets/<id>.json')['id'])"` por cada uno.
Expected: imprime el id sin errores.

- [ ] **Step 2: Correr pipeline completo y revisar artefactos**

Run: `make forecasts && python -c "from pipeline.schema import validate; import json,glob; [validate(json.load(open(f))) for f in glob.glob('web/public/data/*.json') if 'manifest' not in f]; print('OK')"`
Expected: `OK` + forecasts no vacíos en cada artefacto.

- [ ] **Step 3: Completar hasta 8–10 datasets y repetir Step 2, más check de reproducibilidad**

Run: `make forecasts && cp web/public/data/manifest.json /tmp/m1.json && make forecasts && python -c "
import json
a = json.load(open('/tmp/m1.json')); b = json.load(open('web/public/data/manifest.json'))
a.pop('generated_at', None); b.pop('generated_at', None)
assert a == b, 'artefactos no reproducibles'
print('REPRO OK')"`
Expected: `REPRO OK` (idéntico salvo `generated_at`).

- [ ] **Step 4: Commit (incluye artefactos, son el contenido publicado)**

```bash
git checkout -b ft/datasets
git add datasets web/public/data
git commit -m "feat: 8-10 datasets semilla con forecasts TimesFM-3"
```

### Task 4: Web estática (Vite + ECharts)

Rama: `ft/web`. Solo lee `web/public/data/`; si el pipeline cambia el schema, esta task falla y se adapta (el schema manda).

**Files:**
- Create: `web/package.json`, `web/index.html`, `web/src/main.js` (un solo archivo; más archivos solo si ECharts lo exige), `web/scripts/check-manifest.js` (prebuild: falla si el manifest lista un archivo ausente en `public/data/`)
- Usa: `web/public/data/*.json` (Tasks 1–3, solo lectura)

**Interfaces:**
- Consumes: `manifest.json` y artefactos con `ARTIFACT_KEYS` (Task 1).
- Produces: `web/dist/` buildeable con `npm run build`; página con selector, gráfico historia+forecast+banda cuantiles, tarjetas métricas y metadata (fuente, licencia, `generated_at`, modelo + aviso no-comercial).

- [ ] **Step 1: Build mínimo que lista datasets del manifest**

Run: `cd web && npm install && npm run build && ls dist/index.html`
Expected: `dist/index.html` existe y nombra los ids del manifest. El `prebuild` corre `check-manifest.js`: si falta un archivo listado, el build falla con el id ausente.

- [ ] **Step 2: Gráfico + métricas + metadata** (verificar en `npm run dev` a ojo; check = build pasa y `dist/data` ausente porque los JSON ya están en `public/`)

Run: `cd web && npm run build`
Expected: BUILD exitoso, sin errores de consola por dataset con schema válido; dataset inválido muestra "no disponible".

- [ ] **Step 3: Commit**

```bash
git checkout -b ft/web
git add web/package.json web/index.html web/src/main.js web/scripts/check-manifest.js
git commit -m "feat: web estatica con selector y forecast ECharts"
```

### Task 5: Deploy a GitHub Pages + README

Rama: `ft/pages`. Cierra el loop showcase.

**Files:**
- Create: `.github/workflows/pages.yml` (build `web/` + publish `dist/` a Pages)
- Modify: `README.md` (create si no existe: qué es, demo link, licencia no-comercial TimesFM-3, cómo agregar dataset)

- [ ] **Step 1: Workflow + README**

- [ ] **Step 2: Verificar workflow válido**

Run: `python -c "import yaml" 2>/dev/null || echo "sin yaml: revisión manual"` + push de la rama y lectura del run en GitHub.
Expected: run verde y sitio servido en `https://leonardocriado.github.io/Crateris/`.

- [ ] **Step 3: Commit**

```bash
git checkout -b ft/pages
git add .github/workflows/pages.yml README.md
git commit -m "chore: deploy a GitHub Pages y README"
```

## Scope Check

El spec trae dos subsistemas (pipeline + web) pero el contrato JSON los desacopla y cada task entrega software testeable solo; un solo plan con 5 tasks es proporcional. Covariables, CI de regeneración, backend on-demand y LoRA quedan fuera (sección 8 del spec).
