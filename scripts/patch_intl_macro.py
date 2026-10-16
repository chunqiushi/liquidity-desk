#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一次性补数脚本（World Bank 版）
=====================================================================
为 6 个非中经济体（EUR/JPY/HKD/CHF/GBP/AUD）用 World Bank WDI 公开 API
补充**真实**的 CPI 通胀 / GDP 增速 / 失业率（年度，2000–2025），
并保留各自已有的 10Y 国债收益率（FRED，真实）。

背景：原 fetch_real_data.py 的 intl_macro_monitor() 出于「不虚构」原则，
只给非美国家拉了 10Y 收益率，导致全球宏观仪表盘里除中国外都只有一条国债线。
但 World Bank WDI 对所有经济体（含 EU 欧元区聚合码、HK）的 CPI 通胀
(FP.CPI.TOTL.ZG) / GDP 增速 (NY.GDP.MKTP.KD.ZG) / 失业率 (SL.UEM.TOTL.ZS)
均更新到 2025，真实且一致（年度）。本脚本补齐这部分，使各国同样展示
「一系列经济数据」（与中国的同款 MacroResearchChart）。

USD 已用 FRED 真实 CPI/GDP/失业 + 10Y，保持不变（更细的月/季频）。

仅修改 lib/data/realdata.json 的 intlMacro 字段，其它数据原样保留。

用法：python3 scripts/patch_intl_macro.py
"""

import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "lib", "data", "realdata.json")

# 经济体代码 -> World Bank ISO 码（EU 为欧元区聚合码，HK 为香港）
ISO = {"EUR": "EU", "JPY": "JP", "HKD": "HK", "CHF": "CH", "GBP": "GB", "AUD": "AU"}
# 经济体中文名（用于 name 字段）
NAME = {"EUR": "欧元区", "JPY": "日本", "HKD": "香港", "CHF": "瑞士", "GBP": "英国", "AUD": "澳大利亚"}

# 指标配置：(WorldBank indicator, 基础名, short, color)
# 语义化配色：CPI=红、GDP=绿、失业率=品红，与 10Y 各国主色区分。
IND = {
    "cpi":   ("FP.CPI.TOTL.ZG",    "CPI 通胀（年率）", "CPI通胀", "#C0392B"),
    "gdp":   ("NY.GDP.MKTP.KD.ZG", "GDP 增速（年率）", "GDP增速", "#27AE60"),
    "unemp": ("SL.UEM.TOTL.ZS",    "失业率",           "失业率",  "#B5179E"),
}
HIST_START, HIST_END = 2000, 2025
SRC = "World Bank WDI"


def wb_rows(iso: str, ind: str):
    url = (
        f"https://api.worldbank.org/v2/country/{iso}/indicator/{ind}"
        f"?format=json&per_page=100&date={HIST_START}:{HIST_END}"
    )
    with urllib.request.urlopen(url, timeout=40) as r:
        payload = json.load(r)
    if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
        return []
    rows = [
        (int(x["date"]), round(float(x["value"]), 3))
        for x in payload[1]
        if x.get("value") is not None
    ]
    rows.sort()
    return rows


def make_entry(code: str, kind: str, cfg, rows):
    _ind_code, base_name, short, color = cfg
    eco_name = NAME[code]
    latest_year, latest_v = rows[-1]
    prev_v = rows[-2][1] if len(rows) >= 2 else None
    history = [{"date": str(y), "v": round(v, 3)} for y, v in rows]
    return {
        "key": kind,
        "name": f"{eco_name} {base_name}",
        "short": short,
        "color": color,
        "unit": "%",
        "actual": round(latest_v, 3),
        "previous": round(prev_v, 3) if prev_v is not None else None,
        "expected": None,
        "period": str(latest_year),
        "asOf": str(latest_year),
        "source": SRC,
        "history": history,
        "isReal": True,
    }


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    im = data.setdefault("intlMacro", {})

    for code, iso in ISO.items():
        arr = im.get(code, [])
        # 保留现有 10Y 国债收益率条目（FRED，真实），缺失则补空
        yield_entries = [e for e in arr if e.get("key") == "yield_10y"]
        new_arr = []
        for kind, cfg in IND.items():
            rows = wb_rows(iso, cfg[0])
            if not rows:
                print(f"  [WARN] {code} {kind} 无数据，跳过", file=sys.stderr)
                continue
            new_arr.append(make_entry(code, kind, cfg, rows))
            print(f"  {code} {kind:5s}: {rows[-1][0]}={rows[-1][1]}  (n={len(rows)})")
        # 顺序：CPI, GDP, 失业率, 10Y（与 USD 一致：宏观在前，国债在后）
        im[code] = new_arr + yield_entries

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("done ->", JSON_PATH)


if __name__ == "__main__":
    main()
