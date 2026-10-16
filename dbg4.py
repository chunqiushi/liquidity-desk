import akshare as ak, urllib.request, json, ssl, time
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
# 1) repo 1y range
try:
    df=ak.repo_rate_hist(start_date="20250929", end_date="20260929")
    print("repo 1y rows:", len(df), "latest:", df.sort_values('date').iloc[-1].to_dict())
except Exception as e: print("repo 1y ERR", type(e).__name__, str(e)[:60])
# 2) bond_china_yield retry x3
for i in range(3):
    try:
        df=ak.bond_china_yield(start_date="20260101", end_date="20260929")
        g=df[df["曲线名称"].astype(str).str.contains("国债")]
        if len(g):
            print(f"bond retry{i} gov rows:", len(g), "10Y:", g.sort_values('日期').iloc[-1]['10年']); break
        else:
            print(f"bond retry{i}: 0 gov rows; names sample:", df['曲线名称'].unique()[:3])
    except Exception as e:
        print(f"bond retry{i} ERR", type(e).__name__, str(e)[:50]); time.sleep(2)
# 3) Tencent fx for CNY pairs
try:
    url="https://qt.gtimg.cn/q=fx_usdcny,fx_usdcnh,fx_eurcny,fx_jpycny,fx_gbpcny"
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://stockapp.finance.qq.com/"})
    t=urllib.request.urlopen(req, timeout=15, context=ctx).read().decode("gbk","ignore")
    print("TENCENT FX:", t[:300])
except Exception as e:
    print("TENCENT FX ERR", e)
