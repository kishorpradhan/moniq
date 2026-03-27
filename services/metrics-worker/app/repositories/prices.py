from typing import Optional, Tuple


def get_latest_price(cur, ticker: str, as_of_date) -> Optional[Tuple[float, object]]:
    cur.execute(
        """
        SELECT close_price, price_date
        FROM prices
        WHERE ticker = %s AND price_date <= %s
        ORDER BY price_date DESC
        LIMIT 1
        """,
        (ticker, as_of_date),
    )
    row = cur.fetchone()
    if not row:
        return None
    return row[0], row[1]


def get_latest_price_with_meta(
    cur, ticker: str, as_of_date
) -> Optional[Tuple[float, object, Optional[str], Optional[str]]]:
    cur.execute(
        """
        SELECT close_price, price_date, sector, industry
        FROM prices
        WHERE ticker = %s AND price_date <= %s
        ORDER BY price_date DESC
        LIMIT 1
        """,
        (ticker, as_of_date),
    )
    row = cur.fetchone()
    if not row:
        return None
    return row[0], row[1], row[2], row[3]
