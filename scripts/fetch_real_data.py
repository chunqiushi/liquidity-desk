# -*- coding: utf-8 -*-
"""
fetch_real_data.py — build-time real-data fetcher for liquidity-desk.
Pulls authoritative, current data from FREE public sources and writes:
  lib/data/realdata.json    — real series / points / curves / fx levels / indices / lhb / futures
  lib/data/provenance.json  — per-series source / asOf / fetchedAt / status
Any fetch failure is recorded in provenance and the key omitted; the TS loader
falls back to the existing mock for missing keys so the build never breaks.
Sources:
  China macro (CPI/PPI/GDP/PMI/M2) : NBS via akshare
  China gov bond curve / 10Y       : ChinaBond via akshare.bond_china_yield (retry)
  DR007 / R007 (repo fixing)       : CFETS via akshare.repo_rate_hist (monthly chunks)
  US / EU / JP / GB govt yields     : U.S. Treasury + FRED (no-key graph CSV)
  SOFR                             : FRED (SOFR)
  FX (8 currencies vs USD)         : FRED (DEXUSEU/DEXJPUS/DEXUSUK/DEXSZUS/DEXUSAL/DEXHKUS/DEXCHUS)
  Equity indices                   : East Money push2
  LHB (龙虎榜)                      : East Money via akshare.stock_lhb_detail_em
  Futures main contracts           : Sina via akshare.futures_main_sina
  US macro                         : BEA/BLS via akshare.macro_usa_*
  Intl macro (non-US)              : World Bank WDI (CPI/GDP/unemployment, annual)
"""
import akshare as ak
import pandas as pd, numpy as np, json, time, datetime, ssl, urllib.request, io, csv, calendar, sys

AS_OF = "2026-09-29"
A = AS_OF.replace("-", "")
OUT_DIR = "lib/data"
HIST_START = "20240101"

provenance = {}
realdata = {"meta": {"asOf": AS_OF, "fetchedAt": "", "generator": "fetch_real_data.py"},
            "series": {}, "points": {}, "curves": {}, "fx": {"levels": {}, "asOf": AS_OF, "source": "FRED"},
            "indices": {}, "lhb": {"date": None, "rows": []}, "futures": {"rows": []}}

# last-good cache: reuse previous successful run's real values for any key that
# fails this run, so a transient source outage never silently falls back to mock.
try:
    PRIOR = json.load(open(f"{OUT_DIR}/realdata.json", encoding="utf-8"))
except Exception:
    PRIOR = None

def _is_valid_point(p):
    return isinstance(p, dict) and p.get("v") is not None and fnum(p.get("v")) is not None

def _is_valid_series(s):
    return isinstance(s, list) and len(s) > 0 and all(_is_valid_point(x) for x in s[:1])

def reuse_prior(name):
    if not PRIOR:
        return False
    if name == "CN_curve" and "CN" in PRIOR.get("curves", {}) and _is_valid_series(PRIOR["curves"]["CN"].get("points", [])):
        realdata["curves"]["CN"] = PRIOR["curves"]["CN"]
        if "CN_10Y" in PRIOR.get("series", {}) and _is_valid_series(PRIOR["series"]["CN_10Y"]):
            realdata["series"]["CN_10Y"] = PRIOR["series"]["CN_10Y"]
            realdata["points"]["CN_10Y"] = {"date": PRIOR["curves"]["CN"]["date"],
                                            "v": next((p["v"] for p in PRIOR["curves"]["CN"]["points"] if p["tenor"] == "10Y"), None),
                                            "unit": "%", "source": "ChinaBond via akshare (cached)"}
        return True
    if name.startswith("FX_") and name[3:] in PRIOR.get("fx", {}).get("levels", {}) and _is_valid_series(PRIOR["fx"]["levels"][name[3:]]):
        realdata["fx"]["levels"][name[3:]] = PRIOR["fx"]["levels"][name[3:]]
        return True
    for ns in ("points", "series", "curves"):
        if name in PRIOR.get(ns, {}) and PRIOR[ns][name] and (_is_valid_point(PRIOR[ns][name]) if ns == "points" else _is_valid_series(PRIOR[ns][name]) if ns == "series" else _is_valid_series(PRIOR[ns][name].get("points", []))):
            realdata[ns][name] = PRIOR[ns][name]
            return True
    return False

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def log(name, status, src="", note=""):
    provenance[name] = {"status": status, "source": src, "asOf": AS_OF, "note": str(note)}
    print(f"[{status:>7}] {name:22} {src} {note}")

def safe(name, src, fn, retries=3):
    for _ in range(retries):
        try:
            v = fn()
            if v is None or (hasattr(v,"shape") and len(v)==0):
                time.sleep(1.2); continue
            log(name, "OK", src); return v
        except Exception as e:
            time.sleep(1.5)
    log(name, "FAIL", src, "all retries failed"); return None

def fnum(x):
    """安全转 float；缺失/NaN/inf → None（避免 JSON 写出非法 NaN）。"""
    try:
        if x is None: return None
        v = float(x)
        if v != v or v in (float("inf"), float("-inf")): return None
        return v
    except Exception:
        return None

def em_json(url, ref="https://quote.eastmoney.com/"):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":ref})
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return json.loads(r.read().decode("utf-8","ignore"))

def fred_graph_csv(series_id, tries=6):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
            txt = urllib.request.urlopen(req, timeout=25, context=ctx).read().decode("utf-8","ignore")
            rows = list(csv.reader(io.StringIO(txt)))
            out = []
            for r in rows[1:]:
                if len(r) >= 2 and r[1].strip() not in ("", "."):
                    try: out.append({"date": r[0], "v": float(r[1])})
                    except: pass
            if out:
                return out
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                time.sleep(3.0 * (attempt + 1)); continue
            else:
                break
        except Exception:
            time.sleep(1.5)
    return None

def fred_series(sid):
    time.sleep(0.8)  # pace requests to avoid FRED 429 after many rapid calls
    return fred_graph_csv(sid)

# ----------------------------------------------------------------------------
# 1) China macro points (NBS via akshare)
# ----------------------------------------------------------------------------
def cn_macro():
    def put(code, date, v, unit, source):
        v = fnum(v)
        if v is None:  # 列缺失/非法 → 跳过该点（不写 NaN）
            log(code, "FAIL", source, "value missing/invalid"); return
        realdata["points"][code] = {"date": str(date), "v": v, "unit": unit, "source": source}
        provenance[code] = {"status":"OK","source":source,"asOf": AS_OF}
    try:
        df = ak.macro_china_cpi(); r = df.iloc[0]
        put("CN_CPI_YOY", r["月份"], r["全国-同比增长"], "%", "NBS via akshare")
        put("CN_CPI_MOM", r["月份"], r["全国-环比增长"], "%", "NBS via akshare")
    except Exception as e: log("CN_CPI", "FAIL", "akshare.macro_china_cpi", e)
    for fn_name, code, col in [
        ("macro_china_ppi","CN_PPI_YOY","当月同比增长"),
        ("macro_china_gdp","CN_GDP_YOY","国内生产总值-同比增长"),
        ("macro_china_pmi","CN_PMI_MFG","制造业-指数"),
        ("macro_china_pmi","CN_PMI_SVC","非制造业-指数"),
        ("macro_china_money_supply","CN_M2_YOY","货币和准货币(M2)-同比增长"),
        ("macro_china_money_supply","CN_M1_YOY","货币(M1)-同比增长"),
        ("macro_china_money_supply","CN_M0_YOY","流通中的现金(M0)-同比增长")]:
        try:
            f = getattr(ak, fn_name); df = f(); r = df.iloc[0]
            date = r.get("月份", r.get("季度", ""))
            put(code, date, r.get(col), "%" if "同比" in col else "index", "NBS/PBC via akshare")
        except Exception as e: log(code, "FAIL", fn_name, e)
    for fn_name, code in [("macro_china_fx_reserves_yearly","CN_FXRES")]:
        try:
            f = getattr(ak, fn_name); df = f(); r = df.iloc[0]
            col = [c for c in df.columns if "同比" in c or "金额" in c or "规模" in c]
            if col:
                put(code, r.get("月份", r.get("时间","")), r[col[0]], "—", "PBC via akshare")
        except Exception as e: log(code, "FAIL", fn_name, e)
cn_macro()

# ----------------------------------------------------------------------------
# 2) China government-bond yield curve + 10Y history (ChinaBond via akshare, retry)
# ----------------------------------------------------------------------------
def cn_curve():
    g = None
    for attempt in range(8):
        try:
            d = ak.bond_china_yield(start_date=HIST_START, end_date=A)
            if d is not None and len(d):
                sub = d[d["曲线名称"].astype(str).str.contains("国债")]
                if len(sub):
                    g = sub; break
        except Exception:
            pass
        time.sleep(2)
    if g is None:
        # fallback to verified real ChinaBond seed (avoids dropping to mock on throttle)
        try:
            seed = json.load(open(f"{OUT_DIR}/cn_curve_seed.json", encoding="utf-8"))
            realdata["curves"]["CN"] = {"date": seed["date"], "points": seed["points"]}
            if seed.get("series"):
                realdata["series"]["CN_10Y"] = seed["series"]
            realdata["points"]["CN_10Y"] = {"date": seed["date"],
                "v": next((p["v"] for p in seed["points"] if p["tenor"] == "10Y"), None),
                "unit": "%", "source": "ChinaBond via akshare (seeded)"}
            provenance["CN_curve"] = {"status":"OK (seeded)","source":"ChinaBond via akshare (seed fallback)",
                                       "asOf": seed["date"], "note":"live fetch throttled; used verified seed"}
            return
        except Exception:
            pass
        log("CN_curve", "FAIL", "ChinaBond", "retries exhausted (no 国债 sheet)"); return
    g = g.sort_values("日期")
    ten_map = {"3月":"3M","6月":"6M","1年":"1Y","3年":"3Y","5年":"5Y","7年":"7Y","10年":"10Y","30年":"30Y"}
    latest = g.iloc[-1]
    pts = [{"tenor": t, "v": float(latest[c])} for c,t in ten_map.items() if c in g.columns and pd.notna(latest[c])]
    realdata["curves"]["CN"] = {"date": str(latest["日期"]), "points": pts}
    realdata["series"]["CN_10Y"] = [{"date": str(r["日期"]), "v": float(r["10年"])} for _,r in g.iterrows() if pd.notna(r["10年"])]
    realdata["points"]["CN_10Y"] = {"date": str(latest["日期"]), "v": float(latest["10年"]), "unit": "%", "source": "ChinaBond via akshare"}
    provenance["CN_curve"] = {"status":"OK","source":"ChinaBond via akshare","asOf": str(latest["日期"])}


cn_curve()
# ----------------------------------------------------------------------------
# 3) Money market: DR007 (FDR007) / R007 (FR007) — monthly chunks (akshare quirk)
# ----------------------------------------------------------------------------
def money_market():
    chunks = []
    y, m = 2024, 1
    while (y, m) <= (2026, 9):
        ld = calendar.monthrange(y, m)[1]
        sd, ed = f"{y}{m:02d}01", f"{y}{m:02d}{ld}"
        try:
            d = ak.repo_rate_hist(start_date=sd, end_date=ed)
            if d is not None and len(d): chunks.append(d)
        except Exception: pass
        if m == 12: y, m = y+1, 1
        else: m += 1
    if not chunks:
        log("CN_DR007", "FAIL", "akshare.repo_rate_hist", "no chunks"); return
    df = pd.concat(chunks).drop_duplicates("date").sort_values("date")
    for col, code in [("FDR007","CN_DR007"),("FR007","CN_R007"),("FDR001","CN_DR001"),("FR001","CN_R001")]:
        if col in df.columns:
            s = [{"date": str(r["date"]), "v": float(r[col])} for _,r in df.iterrows() if pd.notna(r[col])]
            if s:
                realdata["series"][code] = s
                realdata["points"][code] = {"date": s[-1]["date"], "v": s[-1]["v"], "unit": "%", "source": "CFETS fixing via akshare"}
    provenance["CN_DR007"] = {"status": ("OK" if "CN_DR007" in realdata["series"] else "EMPTY"), "source":"CFETS fixing via akshare","asOf": AS_OF}
    # Shibor 3M (CN) via akshare macro_china_shibor_all (column "3M-定价")
    try:
        sh = ak.macro_china_shibor_all()
        if sh is not None and len(sh) and "3M-定价" in sh.columns:
            sd = sh[sh["3M-定价"].notna()]
            s3 = [{"date": str(r["日期"]), "v": float(r["3M-定价"])} for _, r in sd.iterrows() if pd.notna(r["3M-定价"])]
            if s3:
                realdata["series"]["CN_SHIBOR_3M"] = s3
                realdata["points"]["CN_SHIBOR_3M"] = {"date": s3[-1]["date"], "v": s3[-1]["v"], "unit": "%", "source": "Shibor via akshare"}
                provenance["CN_SHIBOR_3M"] = {"status": "OK", "source": "Shibor (NIFC) via akshare", "asOf": AS_OF}
            else:
                provenance["CN_SHIBOR_3M"] = {"status": "FAIL", "source": "akshare.macro_china_shibor_all", "asOf": AS_OF, "note": "no valid 3M values"}
        else:
            provenance["CN_SHIBOR_3M"] = {"status": "FAIL", "source": "akshare.macro_china_shibor_all", "asOf": AS_OF, "note": "missing 3M-定价 column"}
    except Exception as e:
        provenance["CN_SHIBOR_3M"] = {"status": "FAIL", "source": "akshare.macro_china_shibor_all", "asOf": AS_OF, "note": str(e)[:120]}
money_market()

# ----------------------------------------------------------------------------
# 3.5) US liquidity / balance sheet (FRED daily)
#      EFFR (DFF), IORB, ON RRP (RRPONTSYD), reserves (WRESBAL),
#      TGA (WTREGEN), Fed total assets (WALCL).
#      FRED balance-sheet series are in Millions of USD → convert to $bn (/1000).
#      ON RRP (RRPONTSYD) is reported in $bn in this dataset (residual facility,
#      drained post-balance-sheet runoff; quarter-end spikes visible).
# ----------------------------------------------------------------------------
def us_liquidity():
    def fetch_scaled(sid, code, scale, unit, src_label, note=""):
        s = safe(code, src_label, lambda s=sid: fred_series(sid))
        if not s:
            return
        sc = [{"date": x["date"], "v": round(float(x["v"]) * scale, 4)} for x in s if fnum(x["v"]) is not None]
        if not sc:
            log(code, "FAIL", src_label, "empty after scale"); return
        realdata["series"][code] = sc
        realdata["points"][code] = {"date": sc[-1]["date"], "v": sc[-1]["v"], "unit": unit, "source": src_label}
        if note:
            provenance[code] = {"status": "OK", "source": src_label, "asOf": AS_OF, "note": note}
    fetch_scaled("DFF", "US_EFFR", 1.0, "%", "FRED:DFF")
    fetch_scaled("IORB", "US_IORB", 1.0, "%", "FRED:IORB")
    fetch_scaled("RRPONTSYD", "US_ON_RRP", 1.0, "$bn", "FRED:RRPONTSYD",
                 "reported $bn; residual facility drained post-runoff, quarter-end spikes")
    fetch_scaled("WRESBAL", "US_RESERVES", 1/1000.0, "$bn", "FRED:WRESBAL", "converted from FRED millions")
    fetch_scaled("WTREGEN", "US_TGA", 1/1000.0, "$bn", "FRED:WTREGEN", "converted from FRED millions")
    fetch_scaled("WALCL", "US_FED_ASSETS", 1/1000.0, "$bn", "FRED:WALCL", "converted from FRED millions")
    ok = [c for c in ["US_EFFR", "US_IORB", "US_ON_RRP", "US_RESERVES", "US_TGA", "US_FED_ASSETS"] if c in realdata["points"]]
    provenance["US_LIQ"] = {"status": ("OK" if ok else "EMPTY"), "source": "FRED", "asOf": AS_OF, "note": f"{len(ok)}/6 series"}
us_liquidity()

# ----------------------------------------------------------------------------
# 4) US Treasury curve (Treasury.gov) + US/EU/JP/GB yields + SOFR (FRED)
# ----------------------------------------------------------------------------
def us_treasury():
    try:
        url = (f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/"
               f"daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve"
               f"&field_tdr_date_value={AS_OF}&page&_format=csv")
        txt = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"}), timeout=25, context=ctx).read().decode("utf-8","ignore")
        rows = list(csv.reader(io.StringIO(txt)))
        hi = next((i for i,r in enumerate(rows) if r and "10 Yr" in r), None)
        if hi is not None:
            hdr, r = rows[hi], rows[hi+1]
            ten_map = {"1 Mo":"1M","2 Mo":"2M","3 Mo":"3M","4 Mo":"4M","6 Mo":"6M","1 Yr":"1Y","2 Yr":"2Y","3 Yr":"3Y","5 Yr":"5Y","7 Yr":"7Y","10 Yr":"10Y","20 Yr":"20Y","30 Yr":"30Y"}
            pts = []
            for c,t in ten_map.items():
                if c in hdr:
                    try: pts.append({"tenor": t, "v": float(r[hdr.index(c)])})
                    except: pass
            realdata["curves"]["US"] = {"date": r[0], "points": pts}
            provenance["US_curve"] = {"status":"OK","source":"U.S. Treasury","asOf": r[0]}
    except Exception as e:
        log("US_curve", "FAIL", "home.treasury.gov", e)
    for sid, code, tenor in [("DGS10","US_10Y","10Y"),("SOFR","US_SOFR","—"),("DGS2","US_2Y","2Y"),("DGS30","US_30Y","30Y"),
                              ("IRLTLT01DEM156N","EU_10Y","10Y"),("IRLTLT01JPM156N","JP_10Y","10Y"),("IRLTLT01GBM156N","GB_10Y","10Y"),
                              ("IRLTLT01HKM156N","HK_10Y","10Y"),("IRLTLT01CHM156N","CH_10Y","10Y"),("IRLTLT01AUM156N","AU_10Y","10Y")]:
        s = safe(code, f"FRED:{sid}", lambda s=sid: fred_series(sid))
        if s:
            realdata["series"][code] = s
            realdata["points"][code] = {"date": s[-1]["date"], "v": s[-1]["v"], "unit": "%", "source": "FRED"}
            # build single-point curve for countries where only 10Y is fetched (not US: full curve from Treasury)
            if code in ("EU_10Y","JP_10Y","GB_10Y","HK_10Y","CH_10Y","AU_10Y"):
                realdata["curves"][code[:2]] = {"date": s[-1]["date"], "points": [{"tenor": "10Y", "v": s[-1]["v"]}]}
us_treasury()

# ----------------------------------------------------------------------------
# 5) FX levels for 8 currencies vs USD (FRED, no key). level = 100/(USD per unit)
# ----------------------------------------------------------------------------
def fx_levels():
    fred_map = {"EUR":"DEXUSEU","JPY":"DEXJPUS","GBP":"DEXUSUK","CHF":"DEXSZUS","AUD":"DEXUSAL","HKD":"DEXHKUS","CNY":"DEXCHUS"}
    for cur, sid in fred_map.items():
        s = safe(f"FX_{cur}", f"FRED:{sid}", lambda s=sid: fred_graph_csv(sid))
        if s:
            # level = 100 / (USD per unit of cur); USD numeraire = 100
            realdata["fx"]["levels"][cur] = [{"date": x["date"], "level": round(100.0/x["v"], 6)} for x in s if x["v"]]
    realdata["fx"]["levels"]["USD"] = [{"date": "2026-09-25", "level": 100.0}]
    ok = [c for c in fred_map if c in realdata["fx"]["levels"]]
    provenance["FX"] = {"status": ("OK" if ok else "EMPTY"), "source":"FRED","asOf": AS_OF, "note": f"{len(ok)}/7 currencies"}
fx_levels()

# ----------------------------------------------------------------------------
# 6) Equity index basket (East Money push2)
# ----------------------------------------------------------------------------
def indices():
    basket = {"000001":("1.000001","上证指数"),"399001":("0.399001","深证成指"),"399006":("0.399006","创业板指"),
              "000300":("1.000300","沪深300"),"000016":("1.000016","上证50"),"HSI":("100.HSI","恒生指数"),
              "SPX":("100.SPX","标普500"),"IXIC":("100.IXIC","纳斯达克"),"N225":("100.N225","日经225"),"DAX":("100.DAX","德国DAX")}
    out = {}
    for key,(secid,name) in basket.items():
        try:
            j = em_json(f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f57,f58,f43,f171")
            d = j.get("data") or {}
            f43, f171 = d.get("f43"), d.get("f171")
            if f43 is None: continue
            last = float(f43)/100.0
            prev = (float(f43)-float(f171))/100.0 if f171 is not None else None
            chg = (f171/(f43-f171)*100.0) if (f171 is not None and (f43-f171)!=0) else None
            out[key] = {"name": name, "last": round(last,2), "chgPct": (round(chg,2) if chg is not None else None), "source": "East Money"}
        except: pass
    realdata["indices"] = out
    provenance["INDICES"] = {"status": ("OK" if out else "EMPTY"), "source":"East Money","asOf": AS_OF, "note": f"{len(out)} indices"}
indices()

# ----------------------------------------------------------------------------
# 7) LHB (East Money, range)
# ----------------------------------------------------------------------------
def lhb():
    try:
        df = ak.stock_lhb_detail_em(start_date="20260922", end_date=A)
        if df is not None and len(df):
            rows = [{k:(str(r[k]) if not isinstance(r[k],(int,float)) else r[k]) for k in df.columns} for _,r in df.iterrows()]
            realdata["lhb"] = {"date": A, "rows": rows}
            provenance["LHB"] = {"status":"OK","source":"East Money LHB","asOf": A, "note": f"{len(rows)} rows"}
            return
    except Exception as e:
        pass
    provenance["LHB"] = {"status":"FAIL","source":"akshare.stock_lhb_detail_em","asOf": AS_OF}
lhb()

# ----------------------------------------------------------------------------
# 8) Futures main contracts (Sina via akshare)
# ----------------------------------------------------------------------------
def futures():
    syms = {"RB0":"螺纹钢","CU0":"沪铜","AU0":"沪金","AG0":"沪银","M0":"豆粕","I0":"铁矿石","TA0":"PTA","FU0":"燃油","HC0":"热卷","ZN0":"沪锌"}
    rows = []
    for sym, name in syms.items():
        try:
            df = ak.futures_main_sina(symbol=sym)
            if df is not None and len(df) and "收盘价" in df.columns:
                c = df["收盘价"].dropna()
                last = float(c.iloc[-1]); prev = float(c.iloc[-2]) if len(c)>1 else None
                chg = ((last-prev)/prev*100) if prev else None
                rows.append({"symbol": sym, "name": name, "last": round(last,2), "chgPct": (round(chg,2) if chg else None), "source": "Sina futures"})
        except: pass
    realdata["futures"] = {"rows": rows}
    provenance["FUTURES"] = {"status": ("OK" if rows else "EMPTY"), "source":"Sina via akshare","asOf": AS_OF, "note": f"{len(rows)} contracts"}
futures()

# ----------------------------------------------------------------------------
# 9) Intl macro (US via FRED — reliable no-key source)
# ----------------------------------------------------------------------------
def intl_macro():
    s = safe("US_CPI_YOY", "FRED:CPIAUCSL", lambda: fred_series("CPIAUCSL"))
    if s and len(s) >= 13:
        yoy = (s[-1]["v"]/s[-13]["v"] - 1) * 100
        realdata["points"]["US_CPI_YOY"] = {"date": s[-1]["date"], "v": round(yoy,2), "unit": "%", "source": "FRED CPIAUCSL"}
        h = []
        for i in range(len(s)-1, 0, -1):
            if i-12 >= 0 and s[i-12].get("v"):
                try: h.append({"date": s[i]["date"], "v": round((s[i]["v"]/s[i-12]["v"]-1)*100, 2)})
                except Exception: pass
        h = h[::-1][-12:]
        if h: realdata["series"]["US_CPI_YOY"] = h
    g = safe("US_GDP_YOY", "FRED:GDP", lambda: fred_series("GDP"))
    if g and len(g) >= 5:
        yoy = (g[-1]["v"]/g[-5]["v"] - 1) * 100
        realdata["points"]["US_GDP_YOY"] = {"date": g[-1]["date"], "v": round(yoy,2), "unit": "%", "source": "FRED GDP"}
        h = []
        for i in range(len(g)-1, 4, -1):
            if g[i-4].get("v"):
                try: h.append({"date": g[i]["date"], "v": round((g[i]["v"]/g[i-4]["v"]-1)*100, 2)})
                except Exception: pass
        h = h[::-1][-8:]
        if h: realdata["series"]["US_GDP_YOY"] = h
    u = safe("US_UNEMP", "FRED:UNRATE", lambda: fred_series("UNRATE"))
    if u:
        realdata["points"]["US_UNEMP"] = {"date": u[-1]["date"], "v": round(u[-1]["v"],2), "unit": "%", "source": "FRED UNRATE"}
        h = [{"date": x["date"], "v": round(x["v"],2)} for x in u[-12:]]
        if h: realdata["series"]["US_UNEMP"] = h
intl_macro()

# ----------------------------------------------------------------------------
# 9.5) Structured China macro monitor (real, current NBS releases)
#      Each entry: actual / previous / expected(consensus if any) / asOf / history
# ----------------------------------------------------------------------------
def cn_macro_monitor():
    out = {}
    def report(fn_name, code, name, short, unit, color, col, datecol, source):
        try:
            f = getattr(ak, fn_name); df = f()
            if df is None or len(df) == 0: return
            df = df[df[col].notna()]
            if len(df) == 0: return
            last = df.iloc[0]
            actual = fnum(last[col]); prev = fnum(df.iloc[1][col]) if len(df) > 1 else None
            d = str(last.get(datecol, ""))
            hist = [{"date": str(r.get(datecol, "")), "v": fnum(r[col])}
                    for _, r in df.iterrows() if fnum(r[col]) is not None][:24]
            out[code] = {"key": code, "name": name, "short": short, "color": color, "unit": unit,
                         "actual": actual, "previous": prev, "expected": None, "period": d, "asOf": d,
                         "source": source, "history": hist, "isReal": True}
        except Exception as e:
            log(code, "FAIL", fn_name, e)
    # CPI / PPI come from the *monthly* functions (current through 2026); the
    # *_yearly report functions lag ~12m so we deliberately avoid them here.
    report("macro_china_cpi", "cpi", "CPI 同比", "CPI", "%", "#C0392B", "全国-同比增长", "月份", "NBS via akshare")
    report("macro_china_ppi", "ppi", "PPI 同比", "PPI", "%", "#7F8C8D", "当月同比增长", "月份", "NBS/PBC via akshare")
    report("macro_china_gdp", "gdp", "GDP 同比", "GDP", "%", "#2E86C1", "国内生产总值-同比增长", "季度", "NBS via akshare")
    report("macro_china_pmi", "pmi_mfg", "制造业PMI", "PMI制", "index", "#B5179E", "制造业-指数", "月份", "NBS/PBC via akshare")
    report("macro_china_pmi", "pmi_svc", "非制造业PMI", "PMI服", "index", "#3FA34D", "非制造业-指数", "月份", "NBS/PBC via akshare")
    report("macro_china_money_supply", "m2", "M2 同比", "M2", "%", "#E8743B", "货币和准货币(M2)-同比增长", "月份", "NBS/PBC via akshare")
    report("macro_china_money_supply", "m1", "M1 同比", "M1", "%", "#E1A100", "货币(M1)-同比增长", "月份", "NBS/PBC via akshare")
    report("macro_china_money_supply", "m0", "M0 同比", "M0", "%", "#16A085", "流通中的现金(M0)-同比增长", "月份", "NBS/PBC via akshare")
    realdata["cnMacro"] = out
    provenance["CN_MACRO"] = {"status": ("OK" if out else "EMPTY"), "source": "NBS via akshare",
                              "asOf": AS_OF, "note": f"{len(out)} indicators"}

# ----------------------------------------------------------------------------
# 9.6) Structured Intl macro monitor
#      US: real CPI/GDP/Unemployment (from section 9 FRED) + 10Y.
#      Non-US economies (EUR/JPY/HKD/CHF/GBP/AUD): real CPI inflation / GDP growth /
#      unemployment from World Bank WDI (free, no-key, updated to 2025, covers every
#      economy incl. EU aggregate & HK) + real 10Y government yield (FRED/Treasury).
#      We never fabricate — every indicator shown is a real published figure.
#      Indicator colors are SEMANTIC (CPI red / Unemployment magenta / GDP green /
#      10Y = country color), so the China-style "series of economic data" appears for
#      every covered economy instead of a single bond line.
# ----------------------------------------------------------------------------
def intl_macro_monitor():
    out = {}
    def usa_point(code, name, short, unit, color, series_key):
        pt = realdata["points"].get(code)
        if not pt:
            log("US_" + code, "FAIL", "FRED point missing", code); return
        ser = realdata["series"].get(series_key, [])
        hist = [{"date": x["date"], "v": fnum(x["v"])} for x in ser if fnum(x["v"]) is not None]
        actual = fnum(pt["v"]); prev = (hist[-2]["v"] if len(hist) >= 2 else None)
        d = str(pt.get("date", AS_OF))
        out.setdefault("USD", []).append({"key": code, "name": name, "short": short, "color": color,
            "unit": unit, "actual": actual, "previous": prev, "expected": None, "period": d, "asOf": d,
            "source": "FRED", "history": hist, "isReal": True})
    usa_point("US_CPI_YOY", "CPI 同比", "CPI", "%", "#C0392B", "US_CPI_YOY")
    usa_point("US_GDP_YOY", "GDP 同比", "GDP", "%", "#2E86C1", "US_GDP_YOY")
    usa_point("US_UNEMP", "失业率", "失业率", "%", "#B5179E", "US_UNEMP")

    # Real macro for non-US economies — World Bank WDI (free, no-key, updated to 2025,
    # covers every economy incl. EU aggregate & HK). CPI inflation (FP.CPI.TOTL.ZG) /
    # GDP growth (NY.GDP.MKTP.KD.ZG) / unemployment (SL.UEM.TOTL.ZS), annual 2000–2025.
    # We never fabricate: these are real published figures.
    META = {"USD": ("美国", "#1F4E79"), "EUR": ("欧元区", "#E8743B"), "JPY": ("日本", "#3FA34D"),
            "HKD": ("香港", "#2E86C1"), "CHF": ("瑞士", "#E1A100"), "GBP": ("英国", "#8E44AD"),
            "AUS": ("澳大利亚", "#16A085")}
    YMAP = {"USD": "US_10Y", "EUR": "EU_10Y", "JPY": "JP_10Y", "HKD": "HK_10Y",
            "CHF": "CH_10Y", "GBP": "GB_10Y", "AUD": "AU_10Y"}
    WB_ISO = {"EUR": "EU", "JPY": "JP", "HKD": "HK", "CHF": "CH", "GBP": "GB", "AUD": "AU"}
    WB_IND = {
        "cpi":   ("FP.CPI.TOTL.ZG",    "CPI 通胀（年率）", "CPI通胀", "#C0392B"),
        "gdp":   ("NY.GDP.MKTP.KD.ZG", "GDP 增速（年率）", "GDP增速", "#27AE60"),
        "unemp": ("SL.UEM.TOTL.ZS",    "失业率",           "失业率",  "#B5179E"),
    }
    WB_START, WB_END = 2000, 2025

    def wb_rows(iso, ind):
        url = (f"https://api.worldbank.org/v2/country/{iso}/indicator/{ind}"
               f"?format=json&per_page=100&date={WB_START}:{WB_END}")
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                payload = json.load(r)
        except Exception as ex:
            log("WB_" + iso + "_" + ind, "FAIL", str(ex)); return []
        if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
            return []
        rows = [(int(x["date"]), fnum(x["value"])) for x in payload[1] if fnum(x["value"]) is not None]
        rows.sort()
        return rows

    for code, iso in WB_ISO.items():
        name = META[code][0]
        for kind, cfg in WB_IND.items():
            ind_code, base_name, short, color = cfg
            rows = wb_rows(iso, ind_code)
            if not rows:
                continue
            latest_year, latest_v = rows[-1]
            prev_v = rows[-2][1] if len(rows) >= 2 else None
            hist = [{"date": str(y), "v": round(v, 3)} for y, v in rows]
            out.setdefault(code, []).append({
                "key": kind, "name": name + " " + base_name, "short": short, "color": color,
                "unit": "%", "actual": round(latest_v, 3),
                "previous": (round(prev_v, 3) if prev_v is not None else None),
                "expected": None, "period": str(latest_year), "asOf": str(latest_year),
                "source": "World Bank WDI", "history": hist, "isReal": True})
        # 10Y government yield (always attempt; reuse already-fetched point)
        pid = YMAP.get(code)
        pt = realdata["points"].get(pid) if pid else None
        isr = bool(pt) and provenance.get(pid, {}).get("status", "").startswith("OK")
        out.setdefault(code, []).append({
            "key": "yield_10y", "name": name + " 10Y 国债收益率", "short": "10Y", "color": color, "unit": "%",
            "actual": (round(pt["v"], 3) if pt else None), "previous": None, "expected": None,
            "period": (pt.get("date") if pt else AS_OF), "asOf": (pt.get("date") if pt else AS_OF),
            "source": (pt.get("source") if pt else "n/a"),
            "history": [{"date": x["date"], "v": x["v"]} for x in (realdata["series"].get(pid, []) or [])[-24:]],
            "isReal": isr})
    realdata["intlMacro"] = out
    n = sum(len(v) for v in out.values())
    provenance["INTL_MACRO"] = {"status": ("OK" if out else "EMPTY"), "source": "akshare/FRED",
                                "asOf": AS_OF, "note": f"{n} points across {len(out)} economies"}

cn_macro_monitor()
intl_macro_monitor()

# ----------------------------------------------------------------------------
# 10) Last-good cache fallback: rescue any failed key from the previous run
# ----------------------------------------------------------------------------
for name, prov in list(provenance.items()):
    if prov.get("status") == "FAIL":
        if reuse_prior(name):
            provenance[name]["status"] = "OK (cached)"
            provenance[name]["note"] = "reused from prior successful run (source temporarily unavailable)"

# ----------------------------------------------------------------------------
# 11) Trim long series to a recent window so the bundled JSON stays small
#     (latest 130 points ≈ enough for a 6-month daily chart + the current value)
# ----------------------------------------------------------------------------
TRIM = 130
for code in list(realdata["series"].keys()):
    s = realdata["series"][code]
    if isinstance(s, list) and len(s) > TRIM:
        realdata["series"][code] = s[-TRIM:]
for cur, lv in list(realdata["fx"]["levels"].items()):
    if isinstance(lv, list) and len(lv) > TRIM:
        realdata["fx"]["levels"][cur] = lv[-TRIM:]

realdata["meta"]["fetchedAt"] = datetime.datetime.now().isoformat(timespec="seconds")

def _clean(o):
    if isinstance(o, float):
        if o != o or o in (float("inf"), float("-inf")): return None
        return o
    if isinstance(o, dict): return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list): return [_clean(v) for v in o]
    return o
realdata = _clean(realdata)
provenance = _clean(provenance)

with open(f"{OUT_DIR}/realdata.json","w",encoding="utf-8") as f:
    json.dump(realdata, f, ensure_ascii=False, indent=1, default=str, allow_nan=False)
with open(f"{OUT_DIR}/provenance.json","w",encoding="utf-8") as f:
    json.dump(provenance, f, ensure_ascii=False, indent=1, allow_nan=False)
print("\n=== DONE ===")
print("series:", list(realdata["series"].keys()))
print("points:", list(realdata["points"].keys()))
print("curves:", list(realdata["curves"].keys()))
print("fx levels:", list(realdata["fx"]["levels"].keys()))
print("indices:", len(realdata["indices"]), "lhb:", len(realdata["lhb"]["rows"]), "futures:", len(realdata["futures"]["rows"]))
