import urllib.request, ssl, csv, io
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
for sid in ["DEXUSEU","DEXJPUS","DEXUSUK","DEXSZUS","DEXUSAL","DEXHKUS","DEXCHUS"]:
    try:
        url=f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}"
        req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
        rows=list(csv.reader(io.StringIO(urllib.request.urlopen(req,timeout=20,context=ctx).read().decode("utf-8","ignore"))))
        vals=[r for r in rows[1:] if len(r)>=2 and r[1].strip() not in ("",".")]
        last=vals[-1] if vals else None
        print(f"[OK] {sid}: {len(vals)} pts, latest {last}")
    except Exception as e:
        print(f"[FAIL] {sid}: {type(e).__name__}: {str(e)[:60]}")
