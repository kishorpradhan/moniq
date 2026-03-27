from typing import List


def fetch_distinct_tickers(cur) -> List[str]:
    cur.execute(
        """
        SELECT DISTINCT ticker
        FROM activities
        WHERE ticker IS NOT NULL
        ORDER BY ticker
        """
    )
    return [row[0] for row in cur.fetchall() if row and row[0]]
