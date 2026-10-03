from fastapi import APIRouter, Request

from app.schemas import AuthConfig

router = APIRouter()


@router.get("/auth/config")
def auth_config(request: Request) -> AuthConfig:
    """What the browser needs to sign in. Both values are public by design (ADR-009)."""
    settings = request.app.state.settings
    return AuthConfig(
        supabase_url=settings.supabase_url, supabase_publishable_key=settings.supabase_publishable_key
    )
