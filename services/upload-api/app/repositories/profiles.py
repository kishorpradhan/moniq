from __future__ import annotations


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
    if not row:
        return None
    return {
        "id": str(row[0]),
        "userId": row[1],
        "displayName": row[2],
        "profileType": row[3],
        "isDefault": bool(row[4]),
    }


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
    if not row:
        return None
    return {
        "id": str(row[0]),
        "userId": row[1],
        "displayName": row[2],
        "profileType": row[3],
        "isDefault": bool(row[4]),
    }


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
