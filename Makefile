.PHONY: forecasts example checks

forecasts:
	python -m pipeline.run

example:
	python -m pipeline.run --dataset _example --no-forecast

checks:
	PYTHONPATH=. python tests/test_registry.py && PYTHONPATH=. python tests/test_fetch.py && PYTHONPATH=. python tests/test_normalize.py && PYTHONPATH=. python tests/test_schema.py
