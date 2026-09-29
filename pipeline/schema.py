"""Contrato pipeline<->web. history/forecast: pares [fecha_iso, valor];
quantiles: matriz [horizonte x 9 deciles 0.1..0.9]."""

ARTIFACT_KEYS = {"meta", "history", "forecast", "quantiles",
                 "metrics", "generated_at"}


def validate(artifact: dict) -> None:
    if not isinstance(artifact, dict):
        raise ValueError("artefacto inválido: no es un objeto")
    missing = ARTIFACT_KEYS - set(artifact)
    if missing:
        raise ValueError(f"artefacto inválido: faltan {sorted(missing)}")
