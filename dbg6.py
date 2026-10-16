import urllib.request, json, ssl
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def em(secid):
    url=f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f57,f58,f43,f170,f171&ut=fa5fd1943c7edeb9c3d9c9b9a9a9a9a9&fltt=2&inv=1"
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://quote.eastmoney.com/"})
    try:
        j=json.loads(urllib.request.urlopen(req, timeout=15, context=ctx).read().decode("utf-8"))
        d=j.get("data") or {}
        return d.get("f58"), d.get("f43"), d.get("f170")
    except Exception as e:
        return f"ERR {e}"
for s in ["119.USDCNY","119.USDCNH","102.USDCNY","119.USDCNY.CFX"]:
    print(s, "->", em(s))
