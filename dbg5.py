import urllib.request, json, ssl
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
# East Money forex board (market 119) — list all, find CNY pairs
url="https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=200&fid=f3&fs=m:119&fields=f12,f13,f14,f2,f3,f4"
req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://quote.eastmoney.com/"})
try:
    j=json.loads(urllib.request.urlopen(req, timeout=20, context=ctx).read().decode("utf-8"))
    items=j.get("data",{}).get("diff",[]) or []
    print("total forex items:", len(items))
    cny=[x for x in items if "CNY" in x.get("f12","") or "人民币" in x.get("f14","")]
    for x in cny[:12]:
        print(x.get("f12"), x.get("f14"), "price=", x.get("f2"), "chg%=", x.get("f3"))
except Exception as e:
    print("ERR", type(e).__name__, str(e)[:100])
