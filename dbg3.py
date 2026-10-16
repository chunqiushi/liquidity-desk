import akshare as ak
print("=== LHB recent range ===")
try:
    df=ak.stock_lhb_detail_em(start_date="20260922", end_date="20260929")
    print("shape:", df.shape, "cols:", list(df.columns)[:12])
    if len(df): print("sample:", df.head(2).to_dict('records'))
except Exception as e: print("ERR", type(e).__name__, str(e)[:120])
print("=== futures RB0 close col ===")
try:
    df=ak.futures_main_sina(symbol="RB0")
    print("cols:", list(df.columns), "last close:", df["收盘价"].dropna().iloc[-1])
except Exception as e: print("ERR", e)
