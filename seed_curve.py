import akshare as ak, json
df = ak.bond_china_yield(start_date="20260901", end_date="20260929")
g = df[df["曲线名称"].astype(str).str.contains("国债")].sort_values("日期")
latest = g.iloc[-1]
ten_map = {"3月":"3M","6月":"6M","1年":"1Y","3年":"3Y","5年":"5Y","7年":"7Y","10年":"10Y","30年":"30Y"}
pts = [{"tenor": t, "v": float(latest[c])} for c,t in ten_map.items() if c in g.columns and __import__("pandas").notna(latest[c])]
series = [{"date": str(r["日期"]), "v": float(r["10年"])} for _,r in g.iterrows() if __import__("pandas").notna(r["10年"])]
seed = {"date": str(latest["日期"]), "points": pts, "series": series,
        "source": "ChinaBond via akshare", "note": "verified real China govt-bond curve; used as fallback when live fetch is throttled"}
json.dump(seed, open("lib/data/cn_curve_seed.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("seeded CN curve date", seed["date"], "points", pts)
