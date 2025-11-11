import json
from apps.muxd.latency import Pairer

def test_pair_simple():
    p = Pairer('a','b')
    p.add({"ts_aligned_ns": 10, "kv":{"stage":"a"}})
    p.add({"ts_aligned_ns": 12, "kv":{"stage":"b"}})
    out = p.pairs()
    assert len(out)==1
    assert abs(out[0]['lat_ms'] - 0.002) < 1e-9
