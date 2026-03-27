from typing import Iterable, List

from psycopg2.extras import execute_values

from app.market_data.types import PricePoint


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS prices (
            ticker TEXT NOT NULL,
            price_date DATE NOT NULL,
            close_price DECIMAL(10,2) NOT NULL,
            source TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            pe_ratio DECIMAL(10,2),
            marketcap NUMERIC(20,2),
            industry TEXT,
            sector TEXT,
            indices TEXT,
            UNIQUE (ticker, price_date)
        )
        """
    )


def upsert_prices(cur, points: Iterable[PricePoint], batch_size: int = 1000) -> int:
    rows = list(points)
    if not rows:
        return 0

    columns = [
        "ticker",
        "price_date",
        "close_price",
        "source",
        "pe_ratio",
        "marketcap",
        "industry",
        "sector",
        "indices",
    ]

    values: List[tuple] = []
    for point in rows:
        values.append(
            (
                point.ticker,
                point.price_date,
                point.close_price,
                point.source,
                point.pe_ratio,
                point.marketcap,
                point.industry,
                point.sector,
                point.indices,
            )
        )

    insert_sql = f"""
        INSERT INTO prices ({", ".join(columns)}) VALUES %s
        ON CONFLICT (ticker, price_date) DO UPDATE SET
            close_price = EXCLUDED.close_price,
            source = EXCLUDED.source,
            pe_ratio = EXCLUDED.pe_ratio,
            marketcap = EXCLUDED.marketcap,
            industry = EXCLUDED.industry,
            sector = EXCLUDED.sector,
            indices = EXCLUDED.indices
    """

    total = 0
    for i in range(0, len(values), batch_size):
        chunk = values[i : i + batch_size]
        execute_values(cur, insert_sql, chunk, page_size=len(chunk))
        total += len(chunk)
    return total
