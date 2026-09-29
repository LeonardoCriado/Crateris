"""Métricas + backtest: entrena sobre todo menos los últimos `horizon`
puntos, pronostica y compara contra lo observado."""


def _check(a: list, b: list) -> None:
    if not a or len(a) != len(b):
        raise ValueError("mae/rmse/mape: listas vacías o de distinto largo")


def mae(actual: list, predicted: list) -> float:
    _check(actual, predicted)
    return sum(abs(x - y) for x, y in zip(actual, predicted)) / len(actual)


def rmse(actual: list, predicted: list) -> float:
    _check(actual, predicted)
    return (sum((x - y) ** 2 for x, y in zip(actual, predicted))
            / len(actual)) ** 0.5


def mape(actual: list, predicted: list) -> float | None:
    _check(actual, predicted)
    if any(x == 0 for x in actual):
        return None  # MAPE indefinido con ceros; la web muestra "—"
    return sum(abs((x - y) / x) for x, y in zip(actual, predicted)) \
        / len(actual) * 100


def backtest(series: list, horizon: int, predict=None) -> dict:
    from pipeline.forecast import predict as default_predict
    predict = predict or default_predict
    train = series[:-horizon]
    actual = [v for _, v in series[-horizon:]]
    out = predict(train, horizon)
    fc = out["forecast"]
    return {"mae": mae(actual, fc), "rmse": rmse(actual, fc),
            "mape": mape(actual, fc)}
