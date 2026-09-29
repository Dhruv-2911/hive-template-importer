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
# The committed export the live app opens on (SPEC.md US7).
COPY ["InterNACHI Commercial Template-2026-09-28.xls", "/app/samples/"]

# Render terminates HTTPS at its proxy. Trusting X-Forwarded-Proto keeps redirects (e.g. /templates -> /templates/)
# on https instead of bouncing users to http.
ENV PATH="/app/.venv/bin:$PATH" \
    FRONTEND_DIR=/app/frontend/out \
    SAMPLE_EXPORT="/app/samples/InterNACHI Commercial Template-2026-09-28.xls" \
    FORWARDED_ALLOW_IPS="*" \
    PORT=8000
EXPOSE 8000
# Every start: migrate, then seed the sample only if it's missing (SPEC.md US7). Both are safe to re-run. If either
# fails the container stops, so Render keeps the previous deploy live (ADR-001).
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT}"]
