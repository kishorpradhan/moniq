from __future__ import annotations

VALID_PROFILE_TYPES = {"portfolio", "watchlist", "kid"}


def _profile_from_row(row):
    return {
        "id": str(row[0]),
        "userId": row[1],
        "displayName": row[2],
        "profileType": row[3],
        "isDefault": bool(row[4]),
        "createdAt": str(row[5]) if row[5] else None,
        "updatedAt": str(row[6]) if row[6] else None,
    }


def list_profiles(cur, user_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT id, user_id, display_name, profile_type, is_default, created_at, updated_at
        FROM profiles
        WHERE user_id = %s
        ORDER BY is_default DESC, created_at ASC
        """,
        (user_id,),
    )
    return [_profile_from_row(row) for row in cur.fetchall()]


def get_profile(cur, user_id: str, profile_id: str) -> dict | None:
    cur.execute(
        """
        SELECT id, user_id, display_name, profile_type, is_default, created_at, updated_at
        FROM profiles
        WHERE user_id = %s AND id = %s
        """,
        (user_id, profile_id),
    )
    row = cur.fetchone()
    return _profile_from_row(row) if row else None


def create_profile(
    cur,
    user_id: str,
    display_name: str,
    profile_type: str,
    is_default: bool = False,
) -> dict:
    if profile_type not in VALID_PROFILE_TYPES:
        raise ValueError("Invalid profile type.")

    cur.execute(
        """
        SELECT 1
        FROM profiles
        WHERE user_id = %s AND display_name = %s
        """,
        (user_id, display_name),
    )
    if cur.fetchone():
        raise ValueError("Profile name already exists.")

    if is_default:
        cur.execute(
            """
            UPDATE profiles
            SET is_default = FALSE, updated_at = NOW()
            WHERE user_id = %s
            """,
            (user_id,),
        )

    cur.execute(
        """
        INSERT INTO profiles (user_id, display_name, profile_type, is_default)
        VALUES (%s, %s, %s, %s)
        RETURNING id, user_id, display_name, profile_type, is_default, created_at, updated_at
        """,
        (user_id, display_name, profile_type, is_default),
    )
    return _profile_from_row(cur.fetchone())


def update_profile(
    cur,
    user_id: str,
    profile_id: str,
    *,
    display_name: str | None = None,
    profile_type: str | None = None,
    is_default: bool | None = None,
) -> dict | None:
    existing = get_profile(cur, user_id, profile_id)
    if not existing:
        return None

    if profile_type is not None and profile_type not in VALID_PROFILE_TYPES:
        raise ValueError("Invalid profile type.")

    if display_name is not None:
        cur.execute(
            """
            SELECT 1
            FROM profiles
            WHERE user_id = %s AND display_name = %s AND id <> %s
            """,
            (user_id, display_name, profile_id),
        )
        if cur.fetchone():
            raise ValueError("Profile name already exists.")

    if is_default is False and existing["isDefault"]:
        raise ValueError("Cannot unset the default profile. Set another profile as default instead.")

    if is_default is True:
        cur.execute(
            """
            UPDATE profiles
            SET is_default = FALSE, updated_at = NOW()
            WHERE user_id = %s
            """,
            (user_id,),
        )

    cur.execute(
        """
        UPDATE profiles
        SET display_name = COALESCE(%s, display_name),
            profile_type = COALESCE(%s, profile_type),
            is_default = COALESCE(%s, is_default),
            updated_at = NOW()
        WHERE user_id = %s AND id = %s
        RETURNING id, user_id, display_name, profile_type, is_default, created_at, updated_at
        """,
        (display_name, profile_type, is_default, user_id, profile_id),
    )
    row = cur.fetchone()
    return _profile_from_row(row) if row else None


def profile_data_reference_count(cur, profile_id: str) -> int:
    total = 0
    for table in (
        "activities",
        "ingestion_runs",
        "positions_metrics_open",
        "positions_metrics_closed",
        "portfolio_sector_allocations",
    ):
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE profile_id = %s", (profile_id,))
        total += int(cur.fetchone()[0] or 0)
    return total


def delete_profile(cur, user_id: str, profile_id: str) -> bool:
    existing = get_profile(cur, user_id, profile_id)
    if not existing:
        return False
    if existing["isDefault"]:
        raise ValueError("Cannot delete the default profile.")
    if profile_data_reference_count(cur, profile_id) > 0:
        raise ValueError("Cannot delete a profile with portfolio data.")

    cur.execute(
        """
        DELETE FROM profiles
        WHERE user_id = %s AND id = %s
        """,
        (user_id, profile_id),
    )
    return cur.rowcount > 0


def get_default_profile(cur, user_id: str) -> dict | None:
    cur.execute(
        """
        SELECT id, user_id, display_name, profile_type, is_default, created_at, updated_at
        FROM profiles
        WHERE user_id = %s AND is_default
        """,
        (user_id,),
    )
    row = cur.fetchone()
    return _profile_from_row(row) if row else None


def resolve_profile_id(cur, user_id: str, profile_id: str | None = None) -> str:
    if profile_id:
        profile = get_profile(cur, user_id, profile_id)
        if not profile:
            raise ValueError("Profile not found.")
        return profile["id"]

    profile = get_default_profile(cur, user_id)
    if not profile:
        raise ValueError("Default profile not found.")
    return profile["id"]
