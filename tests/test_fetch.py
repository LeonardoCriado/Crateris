from pipeline.fetch import download

try:
    download({"id": "demo", "source": {"url": "bogus://no-existe"}}, "data/raw/demo.csv")
    raise AssertionError("debió fallar")
except RuntimeError as e:
    assert "demo" in str(e)
print("test_fetch OK")
