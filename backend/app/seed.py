"""The sample template the live app opens on (SPEC.md US7).

    python -m app.seed            import the sample if there isn't one (runs on every container start)
    python -m app.seed --reset    operator only: replace the sample with a fresh import of the committed file

The sample goes through the same verified import as any upload. --reset imports the fresh copy first and only
then, in one transaction, deletes the old sample and marks the new one, so a failed reset changes nothing.
Copies of the sample, other templates and the import history are never touched.
"""

import argparse
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.db import make_engine
from app.importer.pipeline import template_name_from
from app.importer.workbook import MAX_BYTES
from app.models import Template
from app.services.imports import ImportRejected, import_upload


@dataclass(frozen=True)
class SeedResult:
    action: Literal["imported", "kept", "replaced", "rejected"]
    template_id: uuid.UUID | None = None
    name: str | None = None
    verified: tuple[int, int] | None = None  # (matched, checked)
    deleted_template_id: uuid.UUID | None = None
    error: str | None = None


def seed(sessions: sessionmaker[Session], path: Path, *, reset: bool = False) -> SeedResult:
    existing = _current_sample(sessions)
    if existing is not None and not reset:
        return SeedResult("kept", existing.id, existing.name)

    try:
        saved = import_upload(
            sessions,
            data=path.read_bytes(),
            filename=path.name,
            max_bytes=MAX_BYTES,
            is_sample=existing is None,
        )
    except ImportRejected as rejection:
        return SeedResult("rejected", error=f"{rejection.failure.code}: {rejection.failure.message}")
    except IntegrityError:
        # Another process seeded the sample between our check and our insert (at most one sample is allowed).
        winner = _current_sample(sessions)
        return SeedResult("kept", winner.id if winner else None, winner.name if winner else None)

    verification = saved.report["verification"]
    verified = (verification["matched"], verification["checked"])
    name = template_name_from(path.name)
    if existing is None:
        return SeedResult("imported", saved.template_id, name, verified)

    with sessions.begin() as session:
        session.execute(delete(Template).where(Template.id == existing.id))
        session.execute(update(Template).where(Template.id == saved.template_id).values(is_sample=True))
    return SeedResult("replaced", saved.template_id, name, verified, deleted_template_id=existing.id)


def _current_sample(sessions: sessionmaker[Session]) -> Template | None:
    with sessions() as session:
        return session.scalar(select(Template).where(Template.is_sample))


def describe(result: SeedResult) -> str:
    if result.action == "rejected":
        return f"The sample could not be imported. {result.error}"
    if result.action == "kept":
        return (
            f"The sample template “{result.name}” ({result.template_id}) is already there; nothing changed. "
            "Use --reset to replace it."
        )
    matched, checked = result.verified or (0, 0)
    if result.action == "imported":
        return (
            f"Imported the sample template “{result.name}” ({result.template_id}): "
            f"{matched} of {checked} verified."
        )
    return (
        f"Replaced the sample: deleted {result.deleted_template_id}, imported “{result.name}” "
        f"({result.template_id}), {matched} of {checked} verified. Copies and other templates were kept."
    )


def main(argv: list[str] | None = None, *, database_url: str | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.seed", description="Import the sample template.")
    parser.add_argument(
        "--reset", action="store_true", help="replace the existing sample with a fresh import"
    )
    parser.add_argument(
        "--file", type=Path, help="export to import (default: the committed Commercial export)"
    )
    args = parser.parse_args(argv)

    settings = Settings(database_url=database_url) if database_url else Settings()
    engine = make_engine(settings.database_url)
    try:
        result = seed(
            sessionmaker(engine, expire_on_commit=False),
            args.file or Path(settings.sample_export),
            reset=args.reset,
        )
    finally:
        engine.dispose()
    print(describe(result))
    return 1 if result.action == "rejected" else 0


if __name__ == "__main__":
    sys.exit(main())
