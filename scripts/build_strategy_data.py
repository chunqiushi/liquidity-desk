#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
读取另一台电脑同步来的期货策略真实文件，生成 lib/strategy-data.ts。

源文件（来自 \\\\DESKTOP-CNF0I9C\\v2t_logs，自动同步到本机 SOURCE 目录）：
  - equity_curve.csv     列: 时间,权益,收益额,收益率%
  - trades_record.csv    列: 时间,品种,方向,手数,价格,ATR,类型,原因(含|盈亏+180)
  - positions_history.json  { update_time, positions: { 品种: {direction,lots,entry_price,stop_loss,take_profit,atr,...} }, count }

用法:
  python scripts/build_strategy_data.py [--src DIR]

DIR 优先级: 命令行 --src > 环境变量 STRATEGY_SRC > 默认 G:/sync/v2t_logs
生成的 TS 会覆盖 lib/strategy-data.ts（SAMPLE=false）。
"""
import os
import sys
import csv
import json
import re
import argparse

PROJECT = r"G:/工作台/liquidity-desk"
OUT_TS = os.path.join(PROJECT, "lib", "strategy-data.ts")
DEFAULT_DIR = r"G:/sync/v2t_logs"
BASE_EQUITY = 1_000_000.0  # equity_curve 起始权益（元）

# 各品种每手合约乘数（元 / 手 / 价格点），用于估算净敞口。取常见主力合约，未知默认 10。
MULT = {
    # 上期所 SHFE
    "ag": 15, "ao": 20, "ni": 1, "pb": 5, "sn": 1, "ss": 5, "cu": 5, "al": 5,
    "zn": 5, "rb": 10, "hc": 10, "au": 1000, "bu": 10, "fu": 10, "ru": 10, "sp": 10,
    # 大商所 DCE
    "i": 100, "j": 100, "jm": 60, "l": 5, "p": 10, "v": 5, "y": 10, "b": 10, "c": 10,
    "cs": 10, "pp": 5, "eg": 10, "eb": 5, "a": 10, "m": 10, "pg": 20, "lh": 16, "jd": 10,
    # 郑商所 CZCE
    "AP": 10, "MA": 10, "FG": 20, "RM": 10, "SA": 20, "SR": 10, "TA": 5, "UR": 20,
    "OI": 10, "CF": 5, "PF": 5, "SF": 5, "SM": 5, "ZC": 100, "CJ": 5, "PK": 10, "PX": 5,
    "SH": 5, "RS": 10, "LR": 20, "JR": 20,
    # 上海能源 INE
    "sc": 1000, "lu": 10, "nr": 10, "bc": 5,
    # 中金所 CFFEX
    "IF": 300, "IC": 200, "IH": 300, "IM": 200, "T": 10000, "TF": 10000, "TS": 20000, "TL": 10000,
}


def prod_code(symbol: str) -> str:
    """CZCE.AP701 -> AP ; DCE.i2701 -> i ; SHFE.ag2608 -> ag"""
    if "." in symbol:
        symbol = symbol.split(".")[-1]
    return re.sub(r"\d+$", "", symbol)


def mult_of(symbol: str) -> float:
    return float(MULT.get(prod_code(symbol), 10))


def find_source(arg):
    if arg:
        if os.path.isdir(arg):
            return arg
        raise SystemExit(f"--src 目录不存在: {arg}")
    env = os.environ.get("STRATEGY_SRC")
    if env and os.path.isdir(env):
        return env
    if os.path.isdir(DEFAULT_DIR):
        return DEFAULT_DIR
    raise SystemExit(f"未找到策略源目录。请传 --src 或把文件放到 {DEFAULT_DIR}。")


def read_equity(path):
    nav = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            t = (row.get("时间") or "").strip()
            eq = (row.get("权益") or "").strip()
            if not t or not eq:
                continue
            date = t.split("T")[0].split(" ")[0]
            try:
                nav.append({"date": date, "nav": float(eq) / BASE_EQUITY})
            except ValueError:
                continue
    if not nav:
        raise SystemExit("equity_curve.csv 未解析到任何净值点")
    return nav


def read_trades(path, limit=400):
    rows = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            t = (row.get("时间") or "").strip()
            sym = (row.get("品种") or "").strip()
            if not t or not sym:
                continue
            date = t.split(" ")[0]
            direction = (row.get("方向") or "").strip()
            side = "long" if direction == "多" else "short"
            try:
                price = float((row.get("价格") or "0").strip())
                qty = int(float((row.get("手数") or "0").strip()))
            except ValueError:
                continue
            reason = row.get("原因") or ""
            m = re.search(r"盈亏\s*([+-]?\d+(?:\.\d+)?)", reason)
            pnl = float(m.group(1)) if m else 0.0
            rows.append({
                "date": date,
                "symbol": sym,
                "side": side,
                "entry": price,
                "exit": price,
                "qty": qty,
                "pnl": pnl,
                "pnlPct": pnl / BASE_EQUITY * 100.0,
                "tag": reason.split("|")[0].strip() or (reason.strip()),
            })
    return rows[-limit:]


def _num(v, default=0.0):
    """Coerce possibly-null/missing/blank numeric field to float safely.

    Source positions_history.json may carry null for stop_loss/take_profit/atr
    (e.g. a position without a protective order), which would otherwise crash
    float(p.get("take_profit", 0)) because the key EXISTS with a None value.
    """
    if v is None or v == "":
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _int(v, default=0):
    return int(_num(v, default))


def read_positions(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    positions = []
    for sym, p in (data.get("positions") or {}).items():
        direction = (p.get("direction") or "").strip()
        positions.append({
            "symbol": sym,
            "net": "long" if direction == "多" else "short",
            "qty": _int(p.get("lots", 0)),
            "avg": _num(p.get("entry_price", 0)),
            "sl": _num(p.get("stop_loss", 0)),
            "tp": _num(p.get("take_profit", 0)),
            "atr": _num(p.get("atr", 0)),
        })
    return positions, data.get("update_time", "")


def compute_metrics(nav, trades, positions):
    vals = [d["nav"] for d in nav]
    last = vals[-1]
    first = vals[0]
    cum = last - first
    inception = nav[0]["date"]
    asof = nav[-1]["date"]
    days = max(1, (parse_date(asof) - parse_date(inception)).days)
    ann = (pow(1 + cum, 365.0 / days) - 1) if cum > -1 else -1

    rmax = -1e9
    maxdd = 0.0
    for v in vals:
        rmax = max(rmax, v)
        maxdd = min(maxdd, v / rmax - 1)

    rets = [nav[i]["nav"] / nav[i - 1]["nav"] - 1 for i in range(1, len(nav))]
    mean = sum(rets) / len(rets) if rets else 0
    var = sum((r - mean) ** 2 for r in rets) / len(rets) if rets else 0
    std = var ** 0.5 or 1e-9
    sharpe = (mean / std) * (252 ** 0.5)

    wins = [t for t in trades if t["pnl"] > 0]
    win_rate = (len(wins) / len(trades)) if trades else 0

    # 净敞口（估算，元）
    long_notional = sum(p["qty"] * p["avg"] * mult_of(p["symbol"]) for p in positions if p["net"] == "long")
    short_notional = sum(p["qty"] * p["avg"] * mult_of(p["symbol"]) for p in positions if p["net"] == "short")
    equity = last * BASE_EQUITY
    net_exp = (long_notional - short_notional) / equity * 100.0 if equity else 0
    return {
        "cum": cum, "ann": ann, "maxdd": maxdd, "sharpe": sharpe,
        "win_rate": win_rate, "n_trades": len(trades),
        "net_exp": net_exp, "equity": equity, "last": last,
        "asof": asof, "inception": inception,
        "n_long": sum(1 for p in positions if p["net"] == "long"),
        "n_short": sum(1 for p in positions if p["net"] == "short"),
    }


def parse_date(s):
    from datetime import date
    y, m, d = s.split("-")[:3]
    return date(int(y), int(m), int(d))


def parse_signal(tail_path):
    """解析策略运行日志（strategy_stdout.log）末次状态输出，提取多空信号等。
    返回 dict 或 None。样例行：
      [INFO] 状态 | 权益:1045129 可用:893191 回撤:0.0%
        4H信号 | 多34 空3 中22 共59 | SNR分布: 0-3=13 3-6=6 6-10=9 10-20=19 20+=12
        市场 | Bull_Trend_Process 资金使用率:15%(实际34%) 止损ATR倍:4.5
        持仓 | CZCE.CF701(多1手@17070|T+0) ...
    """
    if not tail_path or not os.path.exists(tail_path):
        return None
    with open(tail_path, "rb") as f:
        raw = f.read()
    text = raw.decode("utf-8", errors="replace")
    i = text.rfind("[INFO] 状态")
    if i < 0:
        return None
    # 从含 [INFO] 状态 的整行开始（时间戳在同一行、位于其前），向后取 2500 字符
    line_start = text.rfind("\n", 0, i) + 1
    block = text[line_start : line_start + 2500]

    def g(pat):
        m = re.search(pat, block)
        return m.group(1) if m else None

    # 4H信号 行：多34 空3 中22 共59（锚定整行，避免持仓行的 多1手 干扰）
    sig = re.search(r"4H信号\s*\|\s*多(\d+)\s*空(\d+)\s*中(\d+)\s*共(\d+)", block)
    long_ = sig.group(1) if sig else None
    short_ = sig.group(2) if sig else None
    neutral = sig.group(3) if sig else None
    total = sig.group(4) if sig else None
    market = g(r"市场\s*\|\s*(\w+)")
    cap = g(r"资金使用率[:：](\d+)%")
    actual = g(r"实际(\d+)%")
    atr = g(r"止损ATR[倍值]?[:：]?\s*([\d.]+)")
    equity = g(r"权益[:：](\d+)")
    avail = g(r"可用[:：](\d+)")
    dd = g(r"回撤[:：]([\d.]+)%")
    snr = g(r"SNR分布[:：]\s*(.+)")
    if snr:
        snr = snr.strip()
    ts = re.search(r"\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]", block)
    asof = ts.group(1) if ts else ""
    if not (long_ and short_ and neutral and total):
        return None
    return {
        "long": int(long_),
        "short": int(short_),
        "neutral": int(neutral),
        "total": int(total),
        "market": market or "",
        "capitalUsage": int(cap) if cap else 0,
        "actualUsage": int(actual) if actual else 0,
        "stopAtr": float(atr) if atr else 0,
        "equity": int(equity) if equity else 0,
        "available": int(avail) if avail else 0,
        "drawdown": float(dd) if dd else 0,
        "snr": snr or "",
        "asOf": asof,
    }


def j(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(float(v)) if isinstance(v, float) else str(v)
    if v is None:
        return "null"
    s = str(v).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{s}"'


def emit_nav(nav):
    return "\n".join(f"    {{ date: {j(d['date'])}, nav: {j(d['nav'])} }}," for d in nav)


def emit_trades(trades):
    out = []
    for t in trades:
        side = '"long"' if t["side"] == "long" else '"short"'
        out.append(
            "    { "
            f"date: {j(t['date'])}, symbol: {j(t['symbol'])}, side: {side}, "
            f"entry: {j(t['entry'])}, exit: {j(t['exit'])}, qty: {j(t['qty'])}, "
            f"pnl: {j(t['pnl'])}, pnlPct: {j(t['pnlPct'])}, tag: {j(t['tag'])} "
            "},"
        )
    return "\n".join(out)


def emit_positions(pos):
    out = []
    for p in pos:
        net = '"long"' if p["net"] == "long" else '"short"'
        out.append(
            "    { "
            f"symbol: {j(p['symbol'])}, net: {net}, qty: {j(p['qty'])}, "
            f"avg: {j(p['avg'])}, sl: {j(p['sl'])}, tp: {j(p['tp'])}, atr: {j(p['atr'])} "
            "},"
        )
    return "\n".join(out)


def emit_signal(signal):
    if not signal:
        return (
            "export interface StrategySignal {\n"
            "  long: number; short: number; neutral: number; total: number;\n"
            "  market: string; capitalUsage: number; actualUsage: number; stopAtr: number;\n"
            "  equity: number; available: number; drawdown: number; snr: string; asOf: string;\n"
            "}\n\n"
            "export const SIGNAL: StrategySignal | null = null;\n"
        )
    keys = [
        "long", "short", "neutral", "total", "market", "capitalUsage",
        "actualUsage", "stopAtr", "equity", "available", "drawdown", "snr", "asOf",
    ]
    body = ",\n  ".join(f"{k}: {j(signal[k])}" for k in keys)
    return (
        "export interface StrategySignal {\n"
        "  long: number; short: number; neutral: number; total: number;\n"
        "  market: string; capitalUsage: number; actualUsage: number; stopAtr: number;\n"
        "  equity: number; available: number; drawdown: number; snr: string; asOf: string;\n"
        "}\n\n"
        f"export const SIGNAL: StrategySignal | null = {{\n  {body}\n}};\n"
    )


def build(nav, trades, positions, metrics, update_time, signal=None):
    m = metrics
    pct = lambda v: f"{v*100:+.2f}%"
    # 持仓概览（取品种代码）
    pos_codes = [prod_code(p["symbol"]) for p in positions]
    pos_overview = "、".join(
        f"{c}({'多' if p['net']=='long' else '空'})" for c, p in zip(pos_codes, positions)
    ) or "无"

    analysis = {
        "market": (
            f"策略自 {m['inception']} 至 {m['asof']} 运行，采用多周期趋势跟踪（以 m15 信号为主）。"
            f"当前持仓 {len(positions)} 个（多 {m['n_long']} / 空 {m['n_short']}）：{pos_overview}。"
        ),
        "performance": (
            f"区间累计净值 {pct(m['cum'])}，最大回撤 {pct(m['maxdd'])}，年化约 {pct(m['ann'])}，"
            f"夏普约 {m['sharpe']:.2f}；共成交 {m['n_trades']} 笔（近 400 笔样本），胜率 {m['win_rate']*100:.0f}%。"
            f"截至 {m['asof']}，单位净值 {m['last']:.4f}（起始 1.0000）。"
        ),
        "risk": (
            f"当前净敞口约 {m['net_exp']:.0f}%（按合约乘数估算）。持仓为趋势单且均设 ATR 止损"
            f"（如 {pos_overview}），多空相抵后整体方向偏{m['n_long']>=m['n_short'] and '多' or '空'}。"
            f"若商品整体回撤将同步拖累净值，需关注持仓品种波动率与节假日后跳空风险。"
        ),
        "outlook": (
            "策略为纯趋势跟踪、无主观判断，后续表现取决于商品是否延续趋势。"
            "持仓由多周期信号与 ATR 止损驱动，信号反转或触及止损即自动离场；"
            "需关注持仓品种的波动率与外盘跳空风险。"
        ),
    }

    out = []
    out.append("// ===================================================================")
    out.append("// 期货策略净值 / 逐笔 / 持仓 / 市场分析 数据模块（真实数据自动生成）")
    out.append("// -------------------------------------------------------------------")
    out.append("// 由 scripts/build_strategy_data.py 依据另一台电脑同步的")
    out.append("// equity_curve.csv / trades_record.csv / positions_history.json 生成。")
    out.append("// 手工编辑将被下次刷新覆盖。")
    out.append("// ===================================================================")
    out.append("")
    out.append("export const SAMPLE = false;")
    out.append("")
    out.append("export interface NavPoint { date: string; nav: number; }")
    out.append("")
    out.append('export interface Trade { date: string; symbol: string; side: "long" | "short";')
    out.append("  entry: number; exit: number; qty: number; pnl: number; pnlPct: number; tag: string; }")
    out.append("")
    out.append('export interface Position { symbol: string; net: "long" | "short";')
    out.append("  qty: number; avg: number; sl: number; tp: number; atr: number; }")
    out.append("")
    out.append("export interface StrategyAnalysis { market: string; performance: string; risk: string; outlook: string; }")
    out.append("")
    out.append("export interface StrategyMeta {")
    out.append('  name: string; asOf: string; inception: string; baseNav: number;')
    out.append('  benchmark: string; currency: string; initialCapitalWan: number;')
    out.append('  source: string; netExposurePct: number; updateTime: string;')
    out.append("}")
    out.append("")
    out.append("export interface StrategyData {")
    out.append("  meta: StrategyMeta; nav: NavPoint[]; trades: Trade[];")
    out.append("  positions: Position[]; analysis: StrategyAnalysis;")
    out.append("}")
    out.append("")
    out.append(emit_signal(signal))
    out.append("")
    out.append("export const STRATEGY: StrategyData = {")
    out.append("  meta: {")
    out.append('    name: "V2T 商品 CTA 趋势策略",')
    out.append(f"    asOf: {j(m['asof'])},")
    out.append(f"    inception: {j(m['inception'])},")
    out.append("    baseNav: 1.0,")
    out.append('    benchmark: "南华商品指数",')
    out.append('    currency: "CNY",')
    out.append("    initialCapitalWan: 100,")
    out.append('    source: "另一台电脑 v2t_logs 实时同步",')
    out.append(f"    netExposurePct: {j(round(m['net_exp'], 1))},")
    out.append(f"    updateTime: {j(update_time)},")
    out.append("  },")
    out.append("")
    out.append("  nav: [")
    out.append(emit_nav(nav))
    out.append("  ],")
    out.append("")
    out.append("  trades: [")
    out.append(emit_trades(trades))
    out.append("  ],")
    out.append("")
    out.append("  positions: [")
    out.append(emit_positions(positions))
    out.append("  ],")
    out.append("")
    out.append("  analysis: {")
    out.append(f"    market: {j(analysis['market'])},")
    out.append(f"    performance: {j(analysis['performance'])},")
    out.append(f"    risk: {j(analysis['risk'])},")
    out.append(f"    outlook: {j(analysis['outlook'])},")
    out.append("  },")
    out.append("};")
    out.append("")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=None)
    args = ap.parse_args()
    src = find_source(args.src)
    print(f"[build_strategy_data] source dir: {src}")

    nav = read_equity(os.path.join(src, "equity_curve.csv"))
    trades = read_trades(os.path.join(src, "trades_record.csv"))
    positions, update_time = read_positions(os.path.join(src, "positions_history.json"))
    metrics = compute_metrics(nav, trades, positions)
    signal = parse_signal(os.path.join(src, "strategy_stdout_tail.txt"))
    print(f"[build_strategy_data] nav={len(nav)} trades={len(trades)} positions={len(positions)} "
          f"cum={metrics['cum']*100:.2f}% maxdd={metrics['maxdd']*100:.2f}% sharpe={metrics['sharpe']:.2f}")
    if signal:
        print(f"[build_strategy_data] signal: 多{signal['long']} 空{signal['short']} 中{signal['neutral']} "
              f"市场={signal['market']} asOf={signal['asOf']}")
    else:
        print("[build_strategy_data] signal: 未找到 strategy_stdout_tail.txt 或末段状态块，SIGNAL=null")

    ts = build(nav, trades, positions, metrics, update_time, signal)
    with open(OUT_TS, "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"[build_strategy_data] wrote {OUT_TS} ({len(ts)} bytes)")


if __name__ == "__main__":
    main()
