import uuid


def get_user_by_firebase_uid(cur, firebase_uid: str):
    cur.execute(
        """
        SELECT id, email
        FROM users
        WHERE firebase_uid = %s
        """,
        (firebase_uid,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": str(row[0]), "email": row[1]}


def create_user(cur, firebase_uid: str, email: str):
    user_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO users (id, firebase_uid, email)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (user_id, firebase_uid, email),
    )
    return {"id": user_id, "email": email}


def is_allowlisted(cur, email: str) -> bool:
    cur.execute(
        """
        SELECT 1
        FROM beta_users
        WHERE email = %s
        """,
        (email,),
    )
    return cur.fetchone() is not None
