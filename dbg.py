import akshare as ak, traceback
def show(name, fn):
    try:
        df=fn()
        print(f"[OK] {name}: shape={df.shape if hasattr(df,'shape') else '?'}")
        if hasattr(df,'shape') and len(df): print("   cols:", list(df.columns)[:10]); print("   head:", df.head(2).to_dict('records'))
    except Exception as e:
        print(f"[FAIL] {name}: {type(e).__name__}: {str(e)[:120]}")
# China bond curve alternatives
show("bond_china_yield(no-arg)", lambda: ak.bond_china_yield())
show("bond_china_yield(hyphen)", lambda: ak.bond_china_yield(start_date="2026-09-01", end_date="2026-09-29"))
show("bond_zh_cov", lambda: ak.bond_zh_cov())
# repo alternatives
show("repo_rate_query(no-arg)", lambda: ak.repo_rate_query())
show("repo_rate_hist(hyphen)", lambda: ak.repo_rate_hist(start_date="2026-09-01", end_date="2026-09-29"))
# LHB alternatives
show("stock_lhb_detail_em(20260929)", lambda: ak.stock_lhb_detail_em(trade_date="20260929"))
show("stock_lhb_stock_statistic_em(20260929)", lambda: ak.stock_lhb_stock_statistic_em(symbol="近一月", date="20260929"))
# futures alternatives
show("futures_main_sina(RB0)", lambda: ak.futures_main_sina(symbol="RB0"))
show("futures_zh_daily(symbol=RB0)", lambda: ak.futures_zh_daily(symbol="RB0"))
