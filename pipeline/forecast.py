"""TimesFM-3 en CPU. Import perezoso: no requiere el peso para
--no-forecast ni para los checks. Contexto truncado a últimos 512 puntos."""
import numpy as np

_FORECASTER = None


def _get():
    global _FORECASTER
    if _FORECASTER is None:
        from timesfm3 import ModelConfig, TimesFM3Evaluator
        _FORECASTER = TimesFM3Evaluator(ModelConfig(
            checkpoint_path="google/timesfm-3.0-pytorch",
            per_core_batch_size=32, device="cpu"))
    return _FORECASTER


def predict(series: list, horizon: int) -> dict:
    values = np.array([v for _, v in series[-512:]], dtype=np.float32)
    outs = list(_get().predict_batch([values], horizon=horizon,
                                     return_quantiles=True))
    o = outs[0]
    return {"forecast": [float(x) for x in o.forecast],
            "quantiles": [[float(q) for q in row] for row in o.quantiles]}
