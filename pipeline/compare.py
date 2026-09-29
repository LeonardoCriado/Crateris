"""Comparativa v3 vs 2.5: backtest con ambos modelos y exporta
web/data/compare.json {datasets: [{id, name, v3:{...}, v25:{...}}]}."""
import json
import os
from datetime import datetime, timezone

from pipeline import evaluate, fetch, forecast25, normalize, registry

OUT = "web/data/compare.json"


def pct(v):
    return f"{v:.2f}%" if v is not None else "—"


def main() -> None:
    rows = []
    for cfg in registry.list_all():
        raw = os.path.join("data/raw", cfg["id"] + ".csv")
        if not os.path.exists(raw):
            raw = fetch.download(cfg, raw)
        series = normalize.to_series(cfg, raw)
        art = json.load(open(os.path.join("web/data", cfg["id"] + ".json")))
        v25 = evaluate.backtest(series, cfg["horizon"],
                                predict=forecast25.predict)
        full25 = forecast25.predict(series, cfg["horizon"])["forecast"]
        rows.append({"id": cfg["id"], "name": cfg["name"],
                     "v3": art["metrics"], "v25": v25, "v25_fc": full25})
        print(f"{cfg['id']}: v3={pct(art['metrics']['mape'])} "
              f"v25={pct(v25['mape'])}", flush=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"models": [
            {"id": "v3", "label": "TimesFM-3 (330M)"},
            {"id": "v25", "label": "TimesFM-2.5 (200M)"}],
            "datasets": rows,
            "generated_at": datetime.now(timezone.utc).isoformat()},
            f, indent=2)
    print(f"comparativa: {len(rows)}")


if __name__ == "__main__":
    main()
