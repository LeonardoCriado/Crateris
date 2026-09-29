from pipeline.normalize import to_series

cfg = {"id": "demo", "freq": "D", "date_col": "d", "value_col": "v"}
rows = to_series(cfg, "tests/fixtures/demo.csv")  # 3 filas diarias 2024-01-01..03
assert [d for d, _ in rows] == ["2024-01-01", "2024-01-02", "2024-01-03"]
assert [v for _, v in rows] == [10.0, 11.0, 12.5]
try:
    to_series(cfg, "tests/fixtures/gapped.csv")  # falta 2024-01-02
    raise AssertionError("debió fallar")
except ValueError as e:
    assert "gap" in str(e)
print("test_normalize OK")
