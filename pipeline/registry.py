"""Lee el registry: un JSON por dataset en datasets/ (sin dependencias)."""
import glob
import json
import os

REQUIRED = ("id", "name", "description", "source", "freq", "horizon")
PER_FORMAT = {"bcra-json": (), None: ("date_col", "value_col")}


def load(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    missing = [k for k in REQUIRED if k not in cfg]
    fmt = (cfg.get("source") or {}).get("format")
    missing += [k for k in PER_FORMAT.get(fmt, PER_FORMAT[None])
                if k not in cfg]
    if missing:
        raise ValueError(f"registry {path}: faltan claves {missing}")
    cfg.setdefault("covariates", [])
    cfg.setdefault("category", "general")
    cfg.setdefault("theme", None)
    cfg.setdefault("skip_lines", 0)
    return cfg


def list_all(directory: str = "datasets") -> list:
    """Todos los datasets salvo los que empiezan con _ (solo dev)."""
    cfgs = []
    for p in sorted(glob.glob(os.path.join(directory, "*.json"))):
        if os.path.basename(p).startswith("_"):
            continue
        cfgs.append(load(p))
    return cfgs
