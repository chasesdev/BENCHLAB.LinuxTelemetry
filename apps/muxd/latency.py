from collections import deque

WINDOW_NS = 2_000_000_000  # pair within 2s

class Pairer:
    def __init__(self, a="ingress", b="encoded"):
        self.a, self.b = a, b
        self.bufA, self.bufB = deque(), deque()

    def add(self, rec):
        stage = rec.get("kv",{}).get("stage")
        if stage == self.a:
            self.bufA.append(rec)
        elif stage == self.b:
            self.bufB.append(rec)

    def pairs(self):
        out=[]
        while self.bufA and self.bufB:
            A=self.bufA[0]; B=self.bufB[0]
            ta=A["ts_aligned_ns"]; tb=B["ts_aligned_ns"]
            if tb < ta and (ta - tb) > WINDOW_NS:
                self.bufB.popleft(); continue
            if ta < tb and (tb - ta) > WINDOW_NS:
                self.bufA.popleft(); continue
            self.bufA.popleft(); self.bufB.popleft()
            out.append({
              "t_ns": ta,
              "lat_ms": (tb - ta)/1e6,
              "pair": (self.a, self.b)
            })
        return out
