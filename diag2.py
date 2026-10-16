import akshare as ak, urllib.request, ssl, json, time
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
# 1) social financing correct name
names=[n for n in dir(ak) if 'social' in n.lower() or 'financing' in n.lower() or '社融' in n]
print("social financing fns:", names)
# 2) bond_china_yield in context (after macro), capture shape
try:
    _=ak.macro_china_cpi()
    df=ak.bond_china_yield(start_date="20260901", end_date="20260929")
    print("bond_china_yield ctx cols:", list(df.columns)[:6])
    print("unique 曲线名称:", df["曲线名称"].unique()[:5] if "曲线名称" in df.columns else "NO 曲线名称 col")
    g=df[df["曲线名称"].astype(str).str.contains("国债")]
    print("gov rows:", len(g))
except Exception as e:
    print("bond ctx ERR:", type(e).__name__, str(e)[:120])
# 3) East Money China Treasury yield curve API
url=("https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BOND_CURVE"
     "&columns=ALL&filter=(MATURE_SUBTYPE=%22CN_CGB%22)")
try:
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://yield.eastmoney.com/"})
    j=json.loads(urllib.request.urlopen(req,timeout=20,context=ctx).read().decode("utf-8","ignore"))
    print("EM curve keys:", list(j.keys()), "data len:", len(j.get("data",{}).get("list",[]) or j.get("result",{}).get("data",[]) or []))
except Exception as e:
    print("EM curve ERR:", type(e).__name__, str(e)[:120])
