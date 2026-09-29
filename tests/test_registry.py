from pipeline.registry import load

cfg = load("datasets/_example.json")
assert cfg["id"] == "_example"
assert cfg["horizon"] > 0
assert cfg["covariates"] == []
print("test_registry OK")
