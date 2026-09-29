"""CSV -> serie regular [(fecha_iso, valor)]. Gaps o frecuencia
irregular = error explícito, nunca fechas inventadas."""
import csv
import json
from datetime import date, datetime, timedelta

DAY = timedelta(days=1)
HOUR = timedelta(hours=1)


def _parse(s: str, freq: str):
    s = s.strip()
    if freq == "M":
        d = date.fromisoformat(s + "-01" if len(s) == 7 else s)
        return d.replace(day=1)  # BCRA trae fin de mes; normaliza a inicio
    dt = datetime.fromisoformat(s)
    return dt.date() if freq in ("D", "B") else dt


def _next(d, freq: str):
    if freq == "M":  # mismo día del mes siguiente
        y, m = d.year + (d.month == 12), d.month % 12 + 1
        return d.replace(year=y, month=m)
    step = DAY if freq in ("D", "B") else HOUR
    nxt = d + step
    if freq == "B":  # días hábiles: salta sábado/domingo
        while nxt.weekday() >= 5:
            nxt += DAY
    return nxt


def to_series(cfg: dict, raw_path: str) -> list:
    freq = cfg["freq"]
    if freq not in ("D", "H", "M", "B"):
        raise ValueError(f"dataset {cfg['id']}: freq {freq!r} no soportada")
    fmt = (cfg.get("source") or {}).get("format")
    if fmt == "bcra-json":
        with open(raw_path, encoding="utf-8") as f:
            detalle = json.load(f)["results"][0]["detalle"]
        rows = [(_parse(d["fecha"], freq), float(d["valor"]))
                for d in detalle]
    else:
        dc, vc = cfg["date_col"], cfg["value_col"]
        rows = []
        with open(raw_path, newline="", encoding="utf-8-sig") as f:
            for _ in range(cfg.get("skip_lines", 0)):
                next(f, None)
            for row in csv.DictReader(f):
                try:
                    rows.append((_parse(row[dc], freq), float(row[vc])))
                except (KeyError, ValueError) as e:
                    raise ValueError(
                        f"dataset {cfg['id']}: fila inválida {row!r} ({e})") from e
    if not rows:
        raise ValueError(f"dataset {cfg['id']}: serie vacía")
    rows.sort()
    if freq == "B":
        # ponytail: los feriados (días hábiles faltantes) pasan; validar
        # calendario por país es el upgrade. Solo se exige orden y no-finde.
        seen = set()
        for d, v in rows:
            if d.weekday() >= 5:
                raise ValueError(
                    f"dataset {cfg['id']}: fecha en finde {d}")
            if d in seen:
                raise ValueError(
                    f"dataset {cfg['id']}: fecha duplicada {d}")
            seen.add(d)
        return [(d.isoformat(), v) for d, v in rows]
    out, expected = [], rows[0][0]
    for d, v in rows:  # ponytail: gap-fill no implementado; todo gap es error
        if d != expected:
            raise ValueError(
                f"dataset {cfg['id']}: gap en {expected} (falta punto)")
        out.append((d.isoformat(), v))
        expected = _next(d, freq)
    return out
