from pipeline.schema import validate

validate({"meta": {}, "history": [], "forecast": [], "quantiles": [], "metrics": {}, "generated_at": "x"})
try:
    validate({"meta": {}})
    raise AssertionError("debió fallar")
except ValueError:
    pass
print("test_schema OK")
