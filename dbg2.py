import akshare as ak, inspect
print("=== bond_china_yield YYYYMMDD ===")
try:
    df=ak.bond_china_yield(start_date="20260101", end_date="20260929")
    df=df[df["曲线名称"].str.contains("国债")]
    print("gov curve rows:", len(df), "latest date:", df["日期"].max(), "10Y latest:", df.sort_values("日期").iloc[-1]["10年"])
except Exception as e: print("ERR", e)
print("=== repo_rate_hist YYYYMMDD ===")
try:
    df=ak.repo_rate_hist(start_date="20260901", end_date="20260929")
    print("rows:", len(df), "latest:", df.sort_values("date").iloc[-1].to_dict())
except Exception as e: print("ERR", e)
print("=== LHB signatures ===")
for fn in ["stock_lhb_detail_em","stock_lhb_stock_statistic_em","stock_lhb_jgmmtj_em","stock_lhb_stock_statistic_detail_em"]:
    try: print(fn, inspect.signature(getattr(ak,fn)))
    except Exception as e: print(fn,"MISSING",e)
