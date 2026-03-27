export type SummaryResponse = {
  asOfDate: string | null;
  totalValue: number;
  totalInvested: number;
  unrealizedPl: number;
  unrealizedPct: number | null;
  realizedPl: number;
};

export type AllocationTicker = {
  ticker: string;
  weight: number | null;
  marketValue: number;
};

export type AllocationSector = {
  sector: string;
  weight: number | null;
  marketValue: number;
};

export type PositionsOpenRow = {
  ticker: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  returnPct: number | null;
  dividendsReceived: number;
  xirr: number | null;
  contributionPct: number | null;
  asOfDate: string;
};

export type PositionsClosedRow = {
  ticker: string;
  closedQuantity: number;
  realizedCostBasis: number;
  realizedProceeds: number;
  realizedPl: number;
  returnPct: number | null;
  asOfDate: string;
};

export async function getSummary(): Promise<SummaryResponse> {
  return fetchJson<SummaryResponse>("/portfolio/summary");
}

export async function getAllocation(): Promise<{
  tickers: AllocationTicker[];
  sectors: AllocationSector[];
}> {
  return fetchJson<{ tickers: AllocationTicker[]; sectors: AllocationSector[] }>(
    "/portfolio/allocation"
  );
}

export async function getPositions(): Promise<{
  open: PositionsOpenRow[];
  closed: PositionsClosedRow[];
}> {
  return fetchJson<{ open: PositionsOpenRow[]; closed: PositionsClosedRow[] }>(
    "/portfolio/positions"
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    throw new Error("Missing PORTFOLIO_API_URL env var");
  }
  const url = new URL(path, baseUrl).toString();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Portfolio API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
