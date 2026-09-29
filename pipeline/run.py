"""Genera artefactos JSON + manifest. Stub en Task 1: sin modelo
(forecast vacío) para que la web se desarrolle contra el schema real."""
import argparse
import json
import os
from datetime import datetime, timezone

from pipeline import fetch, normalize, registry, schema

OUT = "web/data"


def build(cfg: dict, do_forecast: bool) -> dict:
    raw = fetch.download(cfg, os.path.join("data/raw", cfg["id"] + ".csv"))
    series = normalize.to_series(cfg, raw)
    history = [[d, v] for d, v in series]
    if do_forecast:
        from pipeline import evaluate, forecast  # lazy: evita cargar el modelo si no se usa
        out = forecast.predict(series, cfg["horizon"])
        fc, qs = out["forecast"], out["quantiles"]
        metrics = evaluate.backtest(series, cfg["horizon"])
    else:
        fc, qs, metrics = [], [], {}
    artifact = {
        "meta": {
            "dataset_id": cfg["id"],
            "name": cfg["name"],
            "description": cfg["description"],
            "source": cfg["source"],
            "freq": cfg["freq"],
            "horizon": cfg["horizon"],
            "model": "google/timesfm-3.0-pytorch" if do_forecast else None,
        },
        "history": history,
        "forecast": fc,
        "quantiles": qs,
        "metrics": metrics,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    schema.validate(artifact)
    return artifact


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default=None)
    ap.add_argument("--no-forecast", action="store_true")
    args = ap.parse_args()
    if args.dataset:
        cfgs = [registry.load(f"datasets/{args.dataset}.json")]
    else:
        cfgs = registry.list_all()
    os.makedirs(OUT, exist_ok=True)
    manifest = {"datasets": [], "generated_at": datetime.now(
        timezone.utc).isoformat()}
    for cfg in cfgs:
        art = build(cfg, do_forecast=not args.no_forecast)
        path = os.path.join(OUT, cfg["id"] + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(art, f)
        manifest["datasets"].append({
            "id": cfg["id"], "name": cfg["name"],
            "category": cfg["category"], "freq": cfg["freq"],
            "horizon": cfg["horizon"], "file": f"data/{cfg['id']}.json"})
    with open(os.path.join(OUT, "manifest.json"), "w",
              encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"artefactos: {len(manifest['datasets'])}")


if __name__ == "__main__":
    main()
