#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
空转收益与实体收益分配 —— 数据对齐与双曲线计算管线

输入：
  lib/wind-raw.json            （Wind Alice 真实序列；china10y 字段可能为 null）
  lib/china10y-override.json   （可选；若提供则用其作为中债10Y，覆盖 wind-raw 中的 null）

对齐规则（严格按需求）：
  - 日频（美国10Y）：直接对齐到日历（交易日缺失处按时间线性插值补齐）
  - 月频（CPI、M2）：以各月月末为锚点，相邻锚点间按时间线性插值 -> 日频（即"当月内每日线性插值"）
  - 季频（GDP不变价当季同比）：以各季季末为锚点，相邻锚点间线性插值 -> 日频；
        再做"前置滞后70日"：gdp_lag[t] = gdp_daily[t - 70天]（非移动平均，避免前视偏差）

双曲线（单位：百分点）：
  实体收益 real[t]      = 中债10Y[t] - CPI_daily[t]
  空转收益 empty[t]     = M2_daily[t] - GDP_lag[t] - (美国10Y[t] - 中债10Y[t])
                        = M2_daily[t] - GDP_lag[t] - 中美利差[t]

输出：
  lib/empty-real-returns-series.ts  （供前端组件直接 import，静态打包）
"""
import json
import os
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH = os.path.join(ROOT, "lib", "wind-raw.json")
OVERRIDE_PATH = os.path.join(ROOT, "lib", "china10y-override.json")
OUT_PATH = os.path.join(ROOT, "lib", "empty-real-returns-series.ts")

WINDOW_START = datetime(2025, 1, 2)
WINDOW_END = datetime(2026, 10, 14)
GDP_LAG_DAYS = 70  # 前置滞后


def parse_date(s):
    s = str(s).strip()
    for fmt in ("%Y%m%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {s}")


def load_series(obj):
    dates = [parse_date(d) for d in obj["dates"]]
    vals = [float(v) for v in obj["values"]]
    assert len(dates) == len(vals), "日期与数值长度不一致"
    return list(zip(dates, vals))


def interp_daily(anchors, day):
    """在锚点序列(已按日期升序)上对给定 day 做时间加权线性插值；越界则夹取最近锚点。"""
    if not anchors:
        return None
    if day <= anchors[0][0]:
        return anchors[0][1]
    if day >= anchors[-1][0]:
        return anchors[-1][1]
    for i in range(len(anchors) - 1):
        d0, v0 = anchors[i]
        d1, v1 = anchors[i + 1]
        if d0 <= day <= d1:
            if d1 == d0:
                return v0
            frac = (day - d0).days / (d1 - d0).days
            return v0 + frac * (v1 - v0)
    return anchors[-1][1]


def daterange(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def main():
    raw = json.load(open(RAW_PATH, encoding="utf-8"))
    s = raw["series"]

    us10y = load_series(s["us10y"]) if s.get("us10y") else []
    cpi = load_series(s["cpi"]) if s.get("cpi") else []
    m2 = load_series(s["m2"]) if s.get("m2") else []
    gdp = load_series(s["gdp"]) if s.get("gdp") else []

    # 中债10Y：优先 override，其次 raw（可能为 null）
    china10y_anchors = None
    china10y_meta = None
    if os.path.exists(OVERRIDE_PATH):
        ov = json.load(open(OVERRIDE_PATH, encoding="utf-8"))
        if ov and ov.get("values"):
            china10y_anchors = load_series(ov)
            china10y_meta = {"source": ov.get("source", "override"), "code": ov.get("code", ""), "asOf": ov.get("asOf", "")}
    if china10y_anchors is None and s.get("china10y"):
        china10y_anchors = load_series(s["china10y"])
        china10y_meta = {"source": "Wind Alice", "code": s["china10y"].get("code", "S0059749"), "asOf": s["china10y"].get("asOf", "")}

    # 日频日历
    calendar = list(daterange(WINDOW_START, WINDOW_END))

    # 美国10Y 对齐到日历（交易日缺失处线性插值）
    us10y_d = {d: interp_daily(us10y, d) for d in calendar}

    # CPI / M2 月频 -> 日频（月末锚点插值）
    cpi_d = {d: interp_daily(cpi, d) for d in calendar}
    m2_d = {d: interp_daily(m2, d) for d in calendar}

    # GDP 季频 -> 日频；需覆盖滞后窗口，故扩展锚点范围（用已有锚点即可，起始 2024-03-31 足够）
    gdp_d = {d: interp_daily(gdp, d) for d in calendar}
    # 滞后70日
    gdp_lag = {}
    for d in calendar:
        src = d - timedelta(days=GDP_LAG_DAYS)
        gdp_lag[d] = gdp_d.get(src, interp_daily(gdp, src))

    china10y_present = china10y_anchors is not None
    china10y_d = {d: interp_daily(china10y_anchors, d) for d in calendar} if china10y_present else {}

    points = []
    for d in calendar:
        u = us10y_d[d]
        c = cpi_d[d]
        m = m2_d[d]
        g = gdp_lag[d]
        c10 = china10y_d.get(d) if china10y_present else None
        real = None
        empty = None
        spread = None
        if china10y_present and None not in (c10, u, c, m, g):
            spread = u - c10
            real = c10 - c
            empty = m - g - spread
        points.append({
            "date": d.strftime("%Y-%m-%d"),
            "real": round(real, 4) if real is not None else None,
            "empty": round(empty, 4) if empty is not None else None,
            "china10y": round(c10, 4) if c10 is not None else None,
            "us10y": round(u, 4) if u is not None else None,
            "cpi": round(c, 4) if c is not None else None,
            "m2": round(m, 4) if m is not None else None,
            "gdpLag": round(g, 4) if g is not None else None,
            "spread": round(spread, 4) if spread is not None else None,
        })

    meta = {
        "windowStart": WINDOW_START.strftime("%Y-%m-%d"),
        "windowEnd": WINDOW_END.strftime("%Y-%m-%d"),
        "gdpLagDays": GDP_LAG_DAYS,
        "china10yStatus": "present" if china10y_present else "missing",
        "china10yMeta": china10y_meta,
        "sources": {
            "us10y": {"name": s["us10y"]["name"], "code": s["us10y"]["code"], "source": "Wind Alice"},
            "cpi": {"name": s["cpi"]["name"], "code": s["cpi"]["code"], "source": "Wind Alice"},
            "m2": {"name": s["m2"]["name"], "code": s["m2"]["code"], "source": "Wind Alice"},
            "gdp": {"name": s["gdp"]["name"], "code": s["gdp"]["code"], "source": "Wind Alice"},
            "china10y": china10y_meta if china10y_present else {"source": "Wind Alice (S0059749)", "status": "权限受限+积分耗尽，未取得"},
        },
        "method": "日频直接对齐；月频(月末锚点)线性插值；季频(季末锚点)线性插值后前置滞后70日；实体收益=中债10Y-CPI；空转收益=M2-GDP_lag-中美利差",
    }

    out = {"meta": meta, "points": points}
    # 写 TS 模块，便于静态打包导入
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// 自动生成，请勿手工编辑。来源：scripts/build_empty_real_returns.py\n")
        f.write("export interface EmptyRealPoint {\n")
        f.write('  date: string;\n  real: number | null;\n  empty: number | null;\n  china10y: number | null;\n')
        f.write('  us10y: number | null;\n  cpi: number | null;\n  m2: number | null;\n  gdpLag: number | null;\n  spread: number | null;\n}\n')
        f.write("export interface EmptyRealMeta {\n  windowStart: string; windowEnd: string; gdpLagDays: number;\n")
        f.write('  china10yStatus: "present" | "missing"; china10yMeta: any; sources: any; method: string;\n}\n')
        f.write("export const EMPTY_REAL_META = " + json.dumps(meta, ensure_ascii=False, indent=2) + " as EmptyRealMeta;\n")
        f.write("export const EMPTY_REAL_POINTS: EmptyRealPoint[] = " + json.dumps(points, ensure_ascii=False) + ";\n")

    n = len(points)
    n_real = sum(1 for p in points if p["real"] is not None)
    print(f"OK 写入 {OUT_PATH}")
    print(f"窗口 {meta['windowStart']} ~ {meta['windowEnd']}  共 {n} 个日历日")
    print(f"中债10Y状态: {meta['china10yStatus']}  ->  有效双曲线点: {n_real}")


if __name__ == "__main__":
    main()
