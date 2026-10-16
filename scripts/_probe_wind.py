#!/usr/bin/env python3
# 探针：用 Wind CLI 取各序列最新可用末点（范围 2024-01-01 ~ 2026-10-14）
import subprocess, json, sys

NODE = r"C:/Users/lv/.workbuddy/binaries/node/versions/22.22.2/node.exe"
CLI = r"C:/Users/lv/.agents/skills/wind-mcp-skill/scripts/cli.mjs"
CODES = {
    "us10y": "G0000891",
    "cpi":   "M0000612",
    "m2":    "M0001385",
    "gdp":   "M0039354",
}
BEGIN = "2024-01-01"
END = "2026-10-14"

def fetch(code):
    cmd = [NODE, CLI, "call", "economic_data", "query_economic_indicator_data",
           json.dumps({"question": code, "beginDate": BEGIN, "endDate": END})]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    out = p.stdout
    try:
        obj = json.loads(out)
        text = obj["content"][0]["text"]
        m = json.loads(text)
        metrics = m["metrics"][0]
        dates = metrics["date"]; values = metrics["value"]
        return dates, values, metrics["meta"].get("name", code)
    except Exception as e:
        return None, None, f"ERR {e} | raw={out[:200]}"

print("=== Wind 各序列末点 ===")
for name, code in CODES.items():
    dates, values, meta = fetch(code)
    if dates:
        print(f"  {name:6s} {code} n={len(dates):4d} first={dates[0]} last={dates[-1]} lastval={values[-1]}  ({meta})")
    else:
        print(f"  {name:6s} {code} -> {meta}")

# AKShare 中债10Y
print("\n=== AKShare bond_zh_us_rate 末点 ===")
try:
    import akshare as ak
    df = ak.bond_zh_us_rate()
    col = "中国国债收益率10年"
    if col in df.columns:
        sub = df[["日期", col]].dropna()
        print("  columns sample:", [c for c in df.columns][:8])
        print("  last rows:\n", sub.tail(4).to_string(index=False))
    else:
        print("  no col", col, "cols=", list(df.columns))
except Exception as e:
    print("  AKShare ERR:", repr(e)[:300])
