"""TimesFM-2.5 (200M, univariado) en CPU. Solo para la comparativa v3 vs 2.5."""
import numpy as np

_M = None


def _get():
    global _M
    if _M is None:
        from timesfm import ForecastConfig, TimesFM_2p5_200M_torch
        _M = TimesFM_2p5_200M_torch.from_pretrained(
            "google/timesfm-2.5-200m-pytorch")
        _M.compile(ForecastConfig(max_horizon=128))
    return _M


def predict(series: list, horizon: int) -> dict:
    values = np.array([v for _, v in series[-512:]], dtype=np.float32)
    # ponytail: 2.5 exige largo múltiplo de 32; se rellena con el último
    # valor. Upgrade = máscara de padding nativa si el modelo la expone.
    pad = (-len(values)) % 32
    if pad:
        values = np.concatenate([values, np.full(pad, values[-1])])
    point, _ = _get().forecast(horizon, [values])
    return {"forecast": [float(x) for x in point[0]], "quantiles": []}
