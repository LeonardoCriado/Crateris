"""CSV -> serie regular [(fecha_iso, valor)]. Gaps o frecuencia
irregular = error explícito, nunca fechas inventadas."""
import csv
from datetime import date, datetime, timedelta

DAY = timedelta(days=1)
HOUR = timedelta(hours=1)


def _parse(s: str, freq: str):
    s = s.strip()
    if freq == "M":
        return date.fromisoformat(s + "-01" if len(s) == 7 else s)
    dt = datetime.fromisoformat(s)
    return dt.date() if freq == "D" else dt


def _next(d, freq: str):
    if freq == "M":  # mismo día del mes siguiente
        y, m = d.year + (d.month == 12), d.month % 12 + 1
        return d.replace(year=y, month=m)
    return d + (DAY if freq == "D" else HOUR)


def to_series(cfg: dict, raw_path: str) -> list:
    dc, vc, freq = cfg["date_col"], cfg["value_col"], cfg["freq"]
    if freq not in ("D", "H", "M"):
        raise ValueError(f"dataset {cfg['id']}: freq {freq!r} no soportada")
    rows = []
    with open(raw_path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            try:
                rows.append((_parse(row[dc], freq), float(row[vc])))
            except (KeyError, ValueError) as e:
                raise ValueError(
                    f"dataset {cfg['id']}: fila inválida {row!r} ({e})") from e
    if not rows:
        raise ValueError(f"dataset {cfg['id']}: serie vacía")
    rows.sort()
    out, expected = [], rows[0][0]
    for d, v in rows:  # ponytail: gap-fill no implementado; todo gap es error
        if d != expected:
            raise ValueError(
                f"dataset {cfg['id']}: gap en {expected} (falta punto)")
        out.append((d.isoformat(), v))
        expected = _next(d, freq)
    return out
