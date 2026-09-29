"""Descarga la fuente a data/raw/ (stdlib urllib; acepta path local)."""
import os
import shutil
import urllib.request


def download(cfg: dict, dest: str) -> str:
    url = cfg["source"]["url"]
    did = cfg["id"]
    parent = os.path.dirname(dest)
    if parent:
        os.makedirs(parent, exist_ok=True)
    try:
        if os.path.exists(url):  # fixture local u offline
            shutil.copyfile(url, dest)
            return dest
        with urllib.request.urlopen(url, timeout=60) as r, \
                open(dest, "wb") as f:
            shutil.copyfileobj(r, f)
        return dest
    except Exception as e:
        raise RuntimeError(
            f"dataset {did}: no se pudo descargar {url} ({e})") from e
