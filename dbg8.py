import akshare as ak
# forex_hist_em uses Chinese names WITHOUT slash
for sym in ["美元人民币","欧元美元","美元日元","英镑美元","美元瑞郎","澳元美元","美元港币"]:
    try:
        df=ak.forex_hist_em(symbol=sym)
        if df is not None and len(df):
            print(f"[OK] {sym}: {df.shape} cols={list(df.columns)[:6]} latest={df.head(1).to_dict('records')}")
        else:
            print(f"[EMPTY] {sym}")
    except Exception as e:
        print(f"[FAIL] {sym}: {type(e).__name__}: {str(e)[:60]}")
