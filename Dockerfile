# One image, one origin (ADR-001, ADR-008): build the Next.js static export, then serve it from FastAPI.

FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same origin in production, so the API base is empty.
ENV NEXT_PUBLIC_API_BASE=""
RUN npm run build


FROM python:3.12-slim AS app
COPY --from=ghcr.io/astral-sh/uv:0.7 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app/backend

# Dependencies first, so code changes don't reinstall them.
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
COPY --from=frontend /frontend/out /app/frontend/out

# Render terminates HTTPS at its proxy. Trusting X-Forwarded-Proto keeps redirects (e.g. /templates -> /templates/)
# on https instead of bouncing users to http.
ENV PATH="/app/.venv/bin:$PATH" \
    FRONTEND_DIR=/app/frontend/out \
    FORWARDED_ALLOW_IPS="*" \
    PORT=8000
EXPOSE 8000
# Migrations run on every start and are safe to re-run; a failed migration stops the container, so Render keeps
# the previous deploy live (ADR-001).
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT}"]
