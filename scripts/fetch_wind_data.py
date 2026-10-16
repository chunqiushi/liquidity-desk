#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_wind_data.py — 用 Wind MCP (wind-mcp-skill cli.mjs) 拉取「免费源覆盖不到」的
货币市场/政策利率序列，并合并进 lib/data/realdata.json (series / points) 与
lib/data/provenance.json。

设计原则（与全站真实化主线一致）：
- Wind 作为「优先数据源」用于这些缺口；已存在的 FRED/akshare 序列不动。
- 任何失败（AUTH/RATE/网络/无结果）的序列**保留原样**，由一个独立的 provenance
  项记录状态，绝不伪造或降级覆盖。
- 只写 series / points / provenance，不触碰 curves/fx/indices/lhb/futures/...。

站点内部 key 与 Wind EDB code 的映射（来源：万得 Wind 金融数据服务）：
  EU_ESTR      M0341913  欧元区 ESTR（欧洲央行，日）
  JP_TONA      M0341928  东京隔夜平均利率 TONAR（日本央行，日）
  GB_SONIA     M0341927  英镑隔夜指数均值 SONIA（英格兰银行，日）
  CH_SARON     M0341924  瑞士法郎 SARON（瑞士证券交易所，日）
  AU_CASH      M0000178  澳大利亚隔夜利率/现金利率（澳洲联储，日）
  CN_REPO_7D   M0041371  中国 7天逆回购利率（人民银行，日）
  CN_MLF       M0329545  中国 MLF 1年（人民银行，日）
  CNH_HIBOR_3M M0062941  CNH HIBOR 3个月（Wind，日）
  CN_LPR_1Y    M0096870  中国 LPR 1年（全国银行间同业拆借中心，日）
  CN_LPR_5Y    M0331299  中国 LPR 5年（全国银行间同业拆借中心，日）
"""
import json
import os
import subprocess
import sys

CLI_DIR = r"C:/Users/lv/.agents/skills/wind-mcp-skill"
CLI = os.path.join(CLI_DIR, "scripts", "cli.mjs")
NODE = r"C:/Users/lv/.workbuddy/binaries/node/versions/22.22.2/node.exe"

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REALDATA = os.path.join(ROOT, "lib", "data", "realdata.json")
PROVENANCE = os.path.join(ROOT, "lib", "data", "provenance.json")

BEGIN = "2026-04-01"
END = "2026-09-30"
MAX_POINTS = 130

# site_key -> (wind_code, display_name, unit)
SERIES = {
    "EU_ESTR":      ("M0341913", "欧元短期利率(ESTR)", "%"),
    "JP_TONA":      ("M0341928", "东京隔夜平均利率(TONAR)", "%"),
    "GB_SONIA":     ("M0341927", "英镑隔夜指数均值(SONIA)", "%"),
    "CH_SARON":     ("M0341924", "瑞士法郎SARON", "%"),
    # 澳大利亚：M0000178(隔夜利率) 在 Wind 中数据止于 2026-03-18（已停更），
    # 改用每日更新的货币市场目标利率 G1600268（账户积分恢复后重跑本脚本即生效）。
    "AU_CASH":      ("G1600268", "澳大利亚:货币市场目标利率", "%"),
    "CN_REPO_7D":   ("M0041371", "中国:逆回购利率:7天", "%"),
    # 中国 MLF：Wind 在 PBoC 2024-2025 改革后无续更序列（日度 M0329545 止于 2025-02-25，
    # 月度 M5543249 亦空），属真实数据缺口，保持 Mock 并显式标注，不下钻伪造。
    "CNH_HIBOR_3M": ("M0062941", "CNH HIBOR:3个月", "%"),
    "CN_LPR_1Y":    ("M0096870", "中国:贷款市场报价利率(LPR):1年", "%"),
    "CN_LPR_5Y":    ("M0331299", "中国:贷款市场报价利率(LPR):5年", "%"),
}


def run_query(wind_code: str):
    """调用 cli.mjs 取一个指标的时间序列，返回 (date_list, value_list, meta) 或 (None, None, None)。"""
    params = json.dumps({
        "question": wind_code,
        "beginDate": BEGIN,
        "endDate": END,
    }, ensure_ascii=False)
    try:
        proc = subprocess.run(
            [NODE, CLI, "call", "economic_data", "query_economic_indicator_data", params],
            cwd=CLI_DIR,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except Exception as e:  # noqa: BLE001
        print(f"  [ERR] {wind_code} subprocess failed: {e}", file=sys.stderr)
        return None, None, None

    out = (proc.stdout or "").strip()
    if not out:
        print(f"  [ERR] {wind_code} empty stdout; stderr={proc.stderr[:200]}", file=sys.stderr)
        return None, None, None

    try:
        envelope = json.loads(out)
    except Exception:
        print(f"  [ERR] {wind_code} stdout not JSON: {out[:200]}", file=sys.stderr)
        return None, None, None

    # 失败信封
    if isinstance(envelope, dict) and envelope.get("ok") is False:
        print(f"  [ERR] {wind_code} envelope error: {envelope.get('code')} {envelope.get('message')}", file=sys.stderr)
        return None, None, None

    try:
        text = envelope["content"][0]["text"]
        payload = json.loads(text)
        metrics = payload.get("metrics") or []
        if not metrics:
            print(f"  [ERR] {wind_code} no metrics", file=sys.stderr)
            return None, None, None
        m = metrics[0]
        meta = m.get("meta", {})
        dates = m.get("date", [])
        values = m.get("value", [])
        return dates, values, meta
    except Exception as e:  # noqa: BLE001
        print(f"  [ERR] {wind_code} parse failed: {e}; payload={out[:200]}", file=sys.stderr)
        return None, None, None


def norm_date(s: str) -> str:
    """'20260928' -> '2026-09-28'；已是 ISO 则原样返回。"""
    s = str(s).strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"
    return s


def main():
    if not os.path.exists(REALDATA):
        print(f"FATAL: {REALDATA} not found", file=sys.stderr)
        sys.exit(1)

    with open(REALDATA, "r", encoding="utf-8") as f:
        rd = json.load(f)
    with open(PROVENANCE, "r", encoding="utf-8") as f:
        prov = json.load(f)

    series = rd.setdefault("series", {})
    points = rd.setdefault("points", {})

    ok_count = 0
    for key, (wind_code, name, unit) in SERIES.items():
        print(f"→ {key} (Wind {wind_code}) ...", end=" ", flush=True)
        dates, values, meta = run_query(wind_code)
        if not dates or not values:
            prov[key] = {
                "status": "FAIL",
                "source": f"Wind:{wind_code}",
                "asOf": rd.get("meta", {}).get("asOf", END),
                "note": f"Wind query failed; {name} 保持 Mock。",
            }
            print("FAIL (kept mock)")
            continue

        paired = [(norm_date(d), float(v)) for d, v in zip(dates, values) if v is not None]
        paired.sort(key=lambda x: x[0])
        if len(paired) > MAX_POINTS:
            paired = paired[-MAX_POINTS:]

        series[key] = [{"date": d, "v": v} for d, v in paired]
        last_d, last_v = paired[-1]
        points[key] = {"date": last_d, "v": last_v, "unit": unit, "source": f"Wind:{wind_code}"}
        prov[key] = {
            "status": "OK",
            "source": f"Wind:{wind_code}",
            "asOf": last_d,
            "note": f"{name} · 万得 Wind 金融数据服务",
        }
        ok_count += 1
        print(f"OK  n={len(paired)} last={last_d} {last_v}")

    with open(REALDATA, "w", encoding="utf-8") as f:
        json.dump(rd, f, ensure_ascii=False, indent=1)
    with open(PROVENANCE, "w", encoding="utf-8") as f:
        json.dump(prov, f, ensure_ascii=False, indent=1)

    print(f"\nDONE: {ok_count}/{len(SERIES)} series fetched from Wind. realdata.json + provenance.json updated.")


if __name__ == "__main__":
    main()
