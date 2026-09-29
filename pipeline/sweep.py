"""Barre el catálogo BCRA y genera datasets/<id>.json para las series
limpias, con tope por categoría para mantener diversidad.
Uso: python -m pipeline.sweep [--apply]
Sin --apply solo reporta candidatas."""
import json
import os
import sys
import unicodedata
import urllib.request

from pipeline.normalize import to_series

CATALOG = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias?limit=1000&offset={off}"
VAR = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/{v}"
PER_CAT = 8       # sondeadas por categoría
KEEP_CAT = 5      # generadas por categoría como máximo
MIN_LEN = {"M": 60, "B": 250}
CUTOFF = "2026-01-01"  # última fecha mínima aceptada


def get(url: str):
    return json.load(urllib.request.urlopen(url, timeout=40))


def slug(desc: str) -> str:
    ascii_ = unicodedata.normalize("NFKD", desc).encode(
        "ascii", "ignore").decode()
    keep = "".join(c.lower() if c.isalnum() else "_" for c in ascii_[:40])
    return "_".join(keep.split("_"))[:32].strip("_") or "serie"


YA_EXISTEN = {1, 5, 7, 22, 23, 24, 27, 107}  # idVariables ya en datasets/


def main() -> None:
    apply = "--apply" in sys.argv
    allrs = []
    for off in (0, 1000):
        allrs += get(CATALOG.format(off=off))["results"]
    kept, skipped = {}, []
    cats = {}
    for r in allrs:
        cats.setdefault(r.get("categoria"), []).append(r)
    for cat, rs in sorted(cats.items()):
        if cat in ("Depósitos por tipo de titular",
                   "Préstamos por tipo de titular"):
            continue  # ya cubiertos; diversidad primero
        n = 0
        for r in rs:
            if n >= PER_CAT:
                break
            per = r.get("periodicidad")
            freq = {"M": "M", "D": "B"}.get(per)
            if not freq or (r.get("ultFechaInformada") or "") < CUTOFF:
                continue
            n += 1
            v = r["idVariable"]
            if v in YA_EXISTEN:
                continue
            try:
                det = get(VAR.format(v=v))["results"][0]["detalle"]
                tmp = f"/tmp/sweep_{v}.json"
                json.dump({"results": [{"detalle": det}]},
                          open(tmp, "w"))
                s = to_series({"id": str(v), "freq": freq,
                               "source": {"format": "bcra-json"}}, tmp)
                if len(s) < MIN_LEN[freq]:
                    raise ValueError("muy corta")
            except Exception as e:  # noqa: BLE001 - sondeo, se reporta
                skipped.append((v, str(e)[:60]))
                continue
            if len(kept.get(cat, [])) >= KEEP_CAT:
                continue
            did = f"ar_{v}_{slug(r['descripcion'])}"
            kept.setdefault(cat, []).append(
                (did, v, r["descripcion"].strip(), freq, len(s), s[-1][0]))
            if apply:
                cfg = {
                    "id": did, "name": r["descripcion"].strip()[:80],
                    "description": f"{r['descripcion'].strip()} API del BCRA.",
                    "category": "argentina",
                    "source": {"url": VAR.format(v=v),
                               "license": "BCRA (uso público)",
                               "format": "bcra-json"},
                    "freq": freq, "horizon": 12 if freq == "M" else 28,
                    "covariates": []}
                os.makedirs("datasets", exist_ok=True)
                json.dump(cfg, open(f"datasets/{did}.json", "w"),
                          indent=2, ensure_ascii=False)
    print(f"categorías: {len(cats)} | generadas: "
          f"{sum(len(v) for v in kept.values())} | "
          f"descartadas: {len(skipped)}")
    for cat, lst in kept.items():
        print(f"== {cat}")
        for did, v, desc, freq, n, last in lst:
            print(f"  {v} {did} [{freq}x{n} fin={last}] {desc[:60]}")


if __name__ == "__main__":
    main()
