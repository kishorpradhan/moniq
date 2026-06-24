import type {
  AllocationSector,
  AllocationTicker,
  PositionsClosedRow,
  PositionsOpenRow,
  SummaryResponse,
} from "@/lib/portfolio";

export const demoSummary: SummaryResponse = {
  asOfDate: "2026-06-23",
  totalValue: 184250,
  totalInvested: 151800,
  unrealizedPl: 32450,
  unrealizedPct: 0.2138,
  realizedPl: 6420,
};

export const demoAllocation: {
  tickers: AllocationTicker[];
  sectors: AllocationSector[];
} = {
  tickers: [
    { ticker: "AAPL", weight: 0.212, marketValue: 39060 },
    { ticker: "NVDA", weight: 0.188, marketValue: 34639 },
    { ticker: "MSFT", weight: 0.164, marketValue: 30217 },
    { ticker: "RELIANCE.NS", weight: 0.123, marketValue: 22663 },
    { ticker: "HDFCBANK.NS", weight: 0.089, marketValue: 16398 },
    { ticker: "VTI", weight: 0.074, marketValue: 13635 },
  ],
  sectors: [
    { sector: "Technology", weight: 0.564, marketValue: 103916 },
    { sector: "Financials", weight: 0.137, marketValue: 25242 },
    { sector: "Energy", weight: 0.123, marketValue: 22663 },
    { sector: "Broad market ETF", weight: 0.074, marketValue: 13635 },
  ],
};

export const demoPositions: {
  open: PositionsOpenRow[];
  closed: PositionsClosedRow[];
} = {
  open: [
    {
      ticker: "AAPL",
      quantity: 180,
      marketValue: 39060,
      costBasis: 28620,
      unrealizedPl: 10440,
      returnPct: 0.3648,
      dividendsReceived: 432,
      xirr: 0.1824,
      contributionPct: 0.212,
      asOfDate: "2026-06-23",
    },
    {
      ticker: "NVDA",
      quantity: 210,
      marketValue: 34639,
      costBasis: 18430,
      unrealizedPl: 16209,
      returnPct: 0.8795,
      dividendsReceived: 0,
      xirr: 0.412,
      contributionPct: 0.188,
      asOfDate: "2026-06-23",
    },
    {
      ticker: "MSFT",
      quantity: 64,
      marketValue: 30217,
      costBasis: 24220,
      unrealizedPl: 5997,
      returnPct: 0.2476,
      dividendsReceived: 384,
      xirr: 0.147,
      contributionPct: 0.164,
      asOfDate: "2026-06-23",
    },
    {
      ticker: "RELIANCE.NS",
      quantity: 820,
      marketValue: 22663,
      costBasis: 21400,
      unrealizedPl: 1263,
      returnPct: 0.059,
      dividendsReceived: 275,
      xirr: 0.071,
      contributionPct: 0.123,
      asOfDate: "2026-06-23",
    },
    {
      ticker: "HDFCBANK.NS",
      quantity: 760,
      marketValue: 16398,
      costBasis: 17300,
      unrealizedPl: -902,
      returnPct: -0.0521,
      dividendsReceived: 165,
      xirr: -0.018,
      contributionPct: 0.089,
      asOfDate: "2026-06-23",
    },
    {
      ticker: "VTI",
      quantity: 48,
      marketValue: 13635,
      costBasis: 11830,
      unrealizedPl: 1805,
      returnPct: 0.1526,
      dividendsReceived: 310,
      xirr: 0.108,
      contributionPct: 0.074,
      asOfDate: "2026-06-23",
    },
  ],
  closed: [
    {
      ticker: "TSLA",
      closedQuantity: 35,
      realizedCostBasis: 6900,
      realizedProceeds: 9180,
      realizedPl: 2280,
      returnPct: 0.3304,
      asOfDate: "2026-04-18",
    },
    {
      ticker: "INFY.NS",
      closedQuantity: 240,
      realizedCostBasis: 4300,
      realizedProceeds: 5105,
      realizedPl: 805,
      returnPct: 0.1872,
      asOfDate: "2026-05-02",
    },
  ],
};

export function getDemoChatAnswer(question: string) {
  const normalized = question.toLowerCase();
  const matchedPosition = demoPositions.open.find((position) =>
    normalized.includes(position.ticker.toLowerCase())
  );

  if (matchedPosition) {
    const allocation = demoAllocation.tickers.find((ticker) => ticker.ticker === matchedPosition.ticker);
    const weight = allocation?.weight !== null && allocation?.weight !== undefined
      ? `${(allocation.weight * 100).toFixed(1)}%`
      : "unknown";
    const marketValue = matchedPosition.marketValue.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    const profit = matchedPosition.unrealizedPl.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    const signedProfit = matchedPosition.unrealizedPl > 0 ? `+${profit}` : profit;
    const returnPct =
      matchedPosition.returnPct !== null ? `${(matchedPosition.returnPct * 100).toFixed(1)}%` : "unknown";

    return `${matchedPosition.ticker} is ${weight} of the sample portfolio with ${marketValue} in market value. Unrealized P&L is ${signedProfit}, and the open-position return is ${returnPct}. ${matchedPosition.contributionPct && matchedPosition.contributionPct > 0.15 ? "It is a major driver of portfolio concentration, so changes in this holding can noticeably move overall results." : "It is a meaningful but not dominant contributor to the portfolio."}`;
  }

  if (normalized.includes("top") || normalized.includes("holding")) {
    return "The top holdings in this sample portfolio are AAPL at 21.2%, NVDA at 18.8%, and MSFT at 16.4%. Together, the top three represent 56.4% of the portfolio, so concentration risk is the main thing to watch.";
  }

  if (normalized.includes("divers") || normalized.includes("sector")) {
    return "This sample portfolio is moderately concentrated. Technology is 56.4% of market value, followed by Financials at 13.7% and Energy at 12.3%. A more balanced target would reduce single-sector exposure below roughly 40%.";
  }

  if (normalized.includes("return") || normalized.includes("performance")) {
    return "The sample portfolio has $32,450 in unrealized gains, or 21.4% on invested capital. NVDA contributes the largest unrealized gain at $16,209, while HDFCBANK.NS is the main detractor at -$902.";
  }

  if (normalized.includes("india") || normalized.includes("us")) {
    return "The sample portfolio mixes US and India exposure. US-listed holdings dominate through AAPL, NVDA, MSFT, and VTI, while India exposure comes mainly from RELIANCE.NS and HDFCBANK.NS.";
  }

  return "For this sample portfolio, the main takeaway is strong gains with meaningful concentration. The largest opportunities are reviewing Technology exposure, trimming oversized winners if needed, and deciding whether India financial exposure still fits the target allocation.";
}
