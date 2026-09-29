from pipeline.evaluate import mae, rmse, mape

assert abs(mae([1.0, 2.0, 3.0], [1.0, 2.0, 4.0]) - 1 / 3) < 1e-9
assert abs(rmse([1.0, 3.0], [1.0, 3.0])) < 1e-9
assert abs(mape([100.0, 200.0], [110.0, 180.0]) - 10.0) < 1e-9
print("test_evaluate OK")
