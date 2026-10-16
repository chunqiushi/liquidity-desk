// 自动生成：龙虎榜真实数据（akshare stock_lhb_detail_em / stock_lhb_stock_statistic_em）
// 数据日期：2026-09-29；用于 /china/stocks 龙虎榜动态分析。
export type LhbRow = {
  name: string; code: string; close: number; chg: number;
  net: number; inst: number; times: number; reason: string;
};
export type LhbReason = { reason: string; count: number };
export type LhbData = {
  asOf: string; onBoard: number; activeToday: number; totalNetBuy: number;
  instNetTotal: number; withInst: number; avgNetBuy: number;
  topBuy: LhbRow[]; topSell: LhbRow[]; instLeaders: LhbRow[]; reasons: LhbReason[];
};
export const LHB_DATA: LhbData = {
  "asOf": "2026-09-29",
  "onBoard": 81,
  "activeToday": 63,
  "totalNetBuy": 40.02,
  "instNetTotal": 2.72,
  "withInst": 41,
  "avgNetBuy": 0.64,
  "topBuy": [
    {
      "name": "平潭发展",
      "code": "000592",
      "close": 8.78,
      "chg": 10.03,
      "net": 14.16,
      "inst": 0.85,
      "times": 3,
      "reason": "日涨幅偏离值达到7%的前5只证券"
    },
    {
      "name": "海峡创新",
      "code": "300300",
      "close": 10.81,
      "chg": 19.98,
      "net": 4.23,
      "inst": 0.41,
      "times": 2,
      "reason": "日涨幅达到15%的前5只证券"
    },
    {
      "name": "电科思仪",
      "code": "301689",
      "close": 83.88,
      "chg": 20.0,
      "net": 3.91,
      "inst": 2.89,
      "times": 8,
      "reason": "连续三个交易日内，涨幅偏离值累计达到30%的证券"
    },
    {
      "name": "中京电子",
      "code": "002579",
      "close": 19.22,
      "chg": 3.33,
      "net": 3.87,
      "inst": -0.86,
      "times": 8,
      "reason": "日换手率达到20%的前5只证券"
    },
    {
      "name": "金健米业",
      "code": "600127",
      "close": 16.49,
      "chg": -1.55,
      "net": 3.09,
      "inst": 0.0,
      "times": 22,
      "reason": "有价格涨跌幅限制的日换手率达到20%的前五只证券"
    },
    {
      "name": "洛轴股份",
      "code": "301699",
      "close": 35.54,
      "chg": 19.99,
      "net": 2.84,
      "inst": 1.66,
      "times": 7,
      "reason": "日涨幅达到15%的前5只证券"
    },
    {
      "name": "奥佳华",
      "code": "002614",
      "close": 8.33,
      "chg": 10.04,
      "net": 2.72,
      "inst": 1.47,
      "times": 3,
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券"
    },
    {
      "name": "宁波东力",
      "code": "002164",
      "close": 13.06,
      "chg": 10.03,
      "net": 2.67,
      "inst": 1.25,
      "times": 2,
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券"
    },
    {
      "name": "国芳集团",
      "code": "601086",
      "close": 15.32,
      "chg": -9.99,
      "net": 2.14,
      "inst": 0.0,
      "times": 11,
      "reason": "有价格涨跌幅限制的日价格振幅达到15%的前五只证券"
    },
    {
      "name": "科德教育",
      "code": "300192",
      "close": 25.31,
      "chg": 10.28,
      "net": 1.77,
      "inst": 0.89,
      "times": 2,
      "reason": "连续三个交易日内，涨幅偏离值累计达到30%的证券"
    },
    {
      "name": "华脉科技",
      "code": "603042",
      "close": 18.73,
      "chg": 9.98,
      "net": 1.74,
      "inst": -0.58,
      "times": 5,
      "reason": "有价格涨跌幅限制的日换手率达到20%的前五只证券"
    },
    {
      "name": "雷科防务",
      "code": "002413",
      "close": 8.97,
      "chg": 10.06,
      "net": 1.71,
      "inst": 0.41,
      "times": 1,
      "reason": "日涨幅偏离值达到7%的前5只证券"
    }
  ],
  "topSell": [
    {
      "name": "托伦斯",
      "code": "301583",
      "close": 141.89,
      "chg": 5.35,
      "net": -0.61,
      "inst": -1.8,
      "times": 3,
      "reason": "日换手率达到30%的前5只证券"
    },
    {
      "name": "德龙汇能",
      "code": "000593",
      "close": 21.77,
      "chg": -10.0,
      "net": -0.62,
      "inst": -0.35,
      "times": 1,
      "reason": "日跌幅偏离值达到7%的前5只证券"
    },
    {
      "name": "百迈科",
      "code": "920268",
      "close": 32.79,
      "chg": -9.39,
      "net": -0.74,
      "inst": 0.06,
      "times": 12,
      "reason": "当日换手率达到20%的前5只股票"
    },
    {
      "name": "一鸣食品",
      "code": "605179",
      "close": 24.38,
      "chg": -10.0,
      "net": -0.84,
      "inst": 0.0,
      "times": 4,
      "reason": "有价格涨跌幅限制的日收盘价格跌幅偏离值达到7%的前五只证券"
    },
    {
      "name": "集泰股份",
      "code": "002909",
      "close": 8.29,
      "chg": 9.95,
      "net": -1.66,
      "inst": -0.47,
      "times": 9,
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券"
    },
    {
      "name": "澳洋健康",
      "code": "002172",
      "close": 5.42,
      "chg": 1.31,
      "net": -2.12,
      "inst": -0.43,
      "times": 7,
      "reason": "日换手率达到20%的前5只证券"
    },
    {
      "name": "超声电子",
      "code": "000823",
      "close": 24.48,
      "chg": -10.0,
      "net": -2.21,
      "inst": -1.71,
      "times": 11,
      "reason": "日跌幅偏离值达到7%的前5只证券"
    },
    {
      "name": "百合花",
      "code": "603823",
      "close": 45.42,
      "chg": -10.01,
      "net": -4.0,
      "inst": 0.0,
      "times": 4,
      "reason": "有价格涨跌幅限制的日收盘价格跌幅偏离值达到7%的前五只证券"
    }
  ],
  "instLeaders": [
    {
      "name": "电科思仪",
      "code": "301689",
      "close": 83.88,
      "chg": 20.0,
      "net": 3.91,
      "inst": 2.89,
      "times": 8,
      "reason": "连续三个交易日内，涨幅偏离值累计达到30%的证券"
    },
    {
      "name": "洛轴股份",
      "code": "301699",
      "close": 35.54,
      "chg": 19.99,
      "net": 2.84,
      "inst": 1.66,
      "times": 7,
      "reason": "日涨幅达到15%的前5只证券"
    },
    {
      "name": "奥佳华",
      "code": "002614",
      "close": 8.33,
      "chg": 10.04,
      "net": 2.72,
      "inst": 1.47,
      "times": 3,
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券"
    },
    {
      "name": "我爱我家",
      "code": "000560",
      "close": 3.66,
      "chg": -5.18,
      "net": -0.23,
      "inst": 1.33,
      "times": 12,
      "reason": "日换手率达到20%的前5只证券"
    },
    {
      "name": "宁波东力",
      "code": "002164",
      "close": 13.06,
      "chg": 10.03,
      "net": 2.67,
      "inst": 1.25,
      "times": 2,
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券"
    },
    {
      "name": "科德教育",
      "code": "300192",
      "close": 25.31,
      "chg": 10.28,
      "net": 1.77,
      "inst": 0.89,
      "times": 2,
      "reason": "连续三个交易日内，涨幅偏离值累计达到30%的证券"
    },
    {
      "name": "华瓷股份",
      "code": "001216",
      "close": 28.4,
      "chg": 0.32,
      "net": 1.13,
      "inst": 0.87,
      "times": 3,
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券"
    },
    {
      "name": "平潭发展",
      "code": "000592",
      "close": 8.78,
      "chg": 10.03,
      "net": 14.16,
      "inst": 0.85,
      "times": 3,
      "reason": "日涨幅偏离值达到7%的前5只证券"
    },
    {
      "name": "万邦医药",
      "code": "301520",
      "close": 74.19,
      "chg": -5.81,
      "net": 0.23,
      "inst": 0.82,
      "times": 18,
      "reason": "日换手率达到30%的前5只证券"
    },
    {
      "name": "南华生物",
      "code": "000504",
      "close": 13.73,
      "chg": 7.6,
      "net": 0.62,
      "inst": 0.71,
      "times": 4,
      "reason": "日振幅值达到15%的前5只证券"
    }
  ],
  "reasons": [
    {
      "reason": "连续三个交易日内，涨幅偏离值累计达到20%的证券",
      "count": 12
    },
    {
      "reason": "日换手率达到20%的前5只证券",
      "count": 5
    },
    {
      "reason": "日涨幅偏离值达到7%的前5只证券",
      "count": 5
    },
    {
      "reason": "日跌幅偏离值达到7%的前5只证券",
      "count": 5
    },
    {
      "reason": "日换手率达到30%的前5只证券",
      "count": 5
    },
    {
      "reason": "有价格涨跌幅限制的日换手率达到20%的前五只证券",
      "count": 5
    },
    {
      "reason": "有价格涨跌幅限制的日收盘价格涨幅偏离值达到7%的前五只证券",
      "count": 5
    },
    {
      "reason": "有价格涨跌幅限制的日价格振幅达到15%的前五只证券",
      "count": 5
    },
    {
      "reason": "非S证券连续三个交易日内收盘价格涨幅偏离值累计达到20%的证券",
      "count": 5
    },
    {
      "reason": "有价格涨跌幅限制的日收盘价格跌幅偏离值达到7%的前五只证券",
      "count": 5
    },
    {
      "reason": "当日换手率达到20%的前5只股票",
      "count": 5
    },
    {
      "reason": "日涨幅达到15%的前5只证券",
      "count": 4
    },
    {
      "reason": "日振幅值达到15%的前5只证券",
      "count": 3
    },
    {
      "reason": "连续三个交易日内，涨幅偏离值累计达到30%的证券",
      "count": 3
    },
    {
      "reason": "当日收盘价跌幅达到-20%的前5只股票",
      "count": 2
    },
    {
      "reason": "连续三个交易日内，跌幅偏离值累计达到20%的证券",
      "count": 1
    },
    {
      "reason": "有价格涨跌幅限制的连续3个交易日内收盘价格涨幅偏离值累计达到30%的证券",
      "count": 1
    },
    {
      "reason": "有价格涨跌幅限制的日收盘价格涨幅达到15%的前五只证券",
      "count": 1
    },
    {
      "reason": "有价格涨跌幅限制的日换手率达到30%的前五只证券",
      "count": 1
    },
    {
      "reason": "北交所股票连续3个交易日内日收盘价涨跌幅偏离值累计达到+40%(-40%)",
      "count": 1
    },
    {
      "reason": "当日收盘价涨幅达到20%的前5只股票",
      "count": 1
    },
    {
      "reason": "当日价格振幅达到30%的前5只股票",
      "count": 1
    }
  ]
};
