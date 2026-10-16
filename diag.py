import akshare as ak, urllib.request, ssl, csv, io, time
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
print("=== bond_china_yield reliability (3 tries) ===")
for i in range(3):
    try:
        df=ak.bond_china_yield(start_date="20260101", end_date="20260929")
        g=df[df["曲线名称"].astype(str).str.contains("国债")]
        if len(g):
            print(f"  try{i}: OK gov rows={len(g)} 10Y={g.sort_values('日期').iloc[-1]['10年']}")
        else:
            print(f"  try{i}: 0 gov rows (names: {df['曲线名称'].unique()[:3]})")
    except Exception as e:
        print(f"  try{i}: ERR {type(e).__name__}: {str(e)[:70]}")
    time.sleep(2)
print("=== FRED with backoff (CPIAUCSL) ===")
for sid in ["CPIAUCSL","GDP","UNRATE"]:
    try:
        url=f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}"
        req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
        rows=list(csv.reader(io.StringIO(urllib.request.urlopen(req,timeout=25,context=ctx).read().decode("utf-8","ignore"))))
        vals=[r for r in rows[1:] if len(r)>=2 and r[1].strip() not in ("",".")]
        print(f"  {sid}: OK {len(vals)} pts last={vals[-1]}")
    except Exception as e:
        print(f"  {sid}: ERR {type(e).__name__}: {str(e)[:70]}")
    time.sleep(2)
