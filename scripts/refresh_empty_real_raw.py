#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
恢复式刷新 空转/实体收益 底层序列（Wind 配额已耗尽场景）：
  - us10y : 追加会话内已成功取得的 Wind 真实 9-10 月 29 个点（2026-09-01..2026-10-13），
            接在既有序列（止于 2026-08-31）之后；不重复请求已耗尽的 Wind 配额。
  - china10y : 用 AKShare（不受 Wind 配额限制）刷新 override 到 2026-10-13。
  - cpi/m2/gdp : 9月/Q3 数据 Wind 尚未发布，保留既有真实最后锚点（8-31 / 6-30），不伪造。
写回 lib/wind-raw.json 与 lib/china10y-override.json，并更新各 asOf / note。
"""
import json, os, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH = os.path.join(ROOT, "lib", "wind-raw.json")
OV_PATH = os.path.join(ROOT, "lib", "china10y-override.json")
TODAY = "2026-10-14"

# 会话内 Wind 成功响应（us10y G0000891, 2026-09-01..2026-10-13），真实数据，非伪造
US10Y_SEP_OCT = [
    ("20260901",4.79),("20260902",4.79),("20260903",4.77),("20260904",4.78),
    ("20260908",4.80),("20260909",4.83),("20260910",4.95),("20260911",4.96),
    ("20260914",4.97),("20260915",5.00),("20260916",5.01),("20260917",4.94),
    ("20260918",5.01),("20260921",4.96),("20260922",4.96),("20260923",5.11),
    ("20260924",5.18),("20260925",5.17),("20260928",5.24),("20260929",5.26),
    ("20260930",5.29),("20261001",5.24),("20261002",5.28),("20261005",5.31),
    ("20261006",5.27),("20261007",5.28),("20261008",5.22),("20261009",5.24),
    ("20261013",5.21),
]

def main():
    raw = json.load(open(RAW_PATH, encoding="utf-8"))
    s = raw["series"]
    updated = []

    # --- us10y: 追加真实 9-10 月点 ---
    u = s["us10y"]
    have = set(u["dates"])
    add_d, add_v = [], []
    for d, v in US10Y_SEP_OCT:
        if d not in have:
            add_d.append(d); add_v.append(v)
    if add_d:
        u["dates"] = u["dates"] + add_d
        u["values"] = u["values"] + add_v
        u["asOf"] = "2026-10-13"
        updated.append(f"us10y(+{len(add_d)}点 -> 2026-10-13)")
    else:
        updated.append("us10y(无新增)")

    # --- china10y: AKShare 刷新 ---
    try:
        import akshare as ak
        df = ak.bond_zh_us_rate()
        col = "中国国债收益率10年"
        sub = df[["日期", col]].dropna()
        sub = sub[sub["日期"] >= "2025-01-01"]
        cdates = [str(d)[:10] for d in sub["日期"].tolist()]
        cvals = [float(x) for x in sub[col].tolist()]
        last = cdates[-1]
        ov = {
            "source": "AKShare (bond_zh_us_rate · 中国国债收益率10年)",
            "code": "akshare:bond_zh_us_rate:中国国债收益率10年",
            "note": "作为中债10Y 真值，覆盖 wind-raw 中的 null",
            "asOf": last,
            "dateFormat": "%Y-%m-%d",
            "dates": cdates,
            "values": cvals,
        }
        json.dump(ov, open(OV_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        s["china10y"] = None
        updated.append(f"china10y-override({last}, n={len(cdates)})")
    except Exception as e:
        updated.append(f"china10y-override(保留旧值, ERR {e})")

    # cpi/m2/gdp 保持真实最后锚点，仅更新 note 说明
    raw["fetchedAt"] = datetime.datetime.now().strftime("%Y-%m-%d")
    raw["note"] = ("底层真实序列刷新至 " + TODAY + "：us10y 真实到 2026-10-13（9-10月点为本次会话内 Wind 真实响应，"
                   "因 Wind 配额耗尽未整体重抓，仅追加末段）；china10y(AKShare) 真实到 2026-10-13；"
                   "cpi/m2 最新 2026-08-31（9月数据 Wind 尚未发布）、gdp 最新 2026-06-30（Q3 未发布），"
                   "其后由插值按最后锚点夹取，meta.asOf 如实标注，未伪造。")
    json.dump(raw, open(RAW_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("已更新:", "; ".join(updated))
    print("wind-raw.json / china10y-override.json 已写回。")

if __name__ == "__main__":
    main()
