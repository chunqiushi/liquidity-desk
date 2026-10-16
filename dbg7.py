import akshare as ak
for sym in ["美元/人民币","美元/离岸人民币","欧元/人民币","100日元/人民币","英镑/人民币"]:
    try:
        df=ak.forex_hist_em(symbol=sym)
        if df is not None and len(df):
            print(f"[OK] {sym}: shape={df.shape} cols={list(df.columns)[:6]}")
            print("    latest:", df.head(1).to_dict('records'))
        else:
            print(f"[EMPTY] {sym}")
    except Exception as e:
        print(f"[FAIL] {sym}: {type(e).__name__}: {str(e)[:70]}")
