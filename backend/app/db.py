from sqlalchemy import Engine, create_engine


def sqlalchemy_url(url: str) -> str:
    """Name the psycopg 3 driver explicitly.

    Supabase and most hosts hand out plain `postgresql://` URLs, which SQLAlchemy would map to psycopg2.
    """
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def make_engine(url: str) -> Engine:
    # A small pool suits one long-running process behind the Supabase session pooler (ADR-002).
    return create_engine(
        sqlalchemy_url(url),
        pool_size=5,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},
    )
