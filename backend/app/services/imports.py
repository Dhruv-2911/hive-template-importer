"""Saving an import: all of it, verified inside the same transaction, or nothing (ADR-006)."""

import hashlib
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import insert, select
from sqlalchemy.orm import Session, sessionmaker

from app.importer import errors
from app.importer.errors import ImportFailure
from app.importer.pipeline import Imported, import_export
from app.importer.types import CommentDraft, TemplateDraft
from app.models import Comment, ImportRun, Item, Section, Template

# Every comment field the round-trip check compares with the parsed source.
CHECKED_FIELDS = (
    "comment_type",
    "source_type",
    "name",
    "source_name",
    "text_html",
    "source_text_html",
    "severity",
    "answer_type",
    "options",
    "unit_options",
    "recommendation",
    "default_value",
    "source_columns",
)
MAX_LISTED_MISMATCHES = 50


@dataclass(frozen=True)
class SavedImport:
    import_run_id: uuid.UUID
    template_id: uuid.UUID
    report: dict[str, Any]


class ImportRejected(Exception):
    def __init__(self, import_run_id: uuid.UUID, failure: ImportFailure) -> None:
        super().__init__(failure.message)
        self.import_run_id = import_run_id
        self.failure = failure


class _VerificationMismatch(Exception):
    def __init__(self, mismatches: list[dict[str, Any]]) -> None:
        self.mismatches = mismatches


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def import_upload(
    sessions: sessionmaker[Session], *, data: bytes, filename: str, max_bytes: int, is_sample: bool = False
) -> SavedImport:
    """Parse, save and verify an upload. Raises ImportRejected after recording why."""
    digest = sha256(data)
    try:
        imported = import_export(data, filename=filename, max_bytes=max_bytes)
    except ImportFailure as failure:
        raise record_rejection(
            sessions, filename=filename, digest=digest, data=data, failure=failure
        ) from None

    try:
        with sessions.begin() as session:
            return _save_and_verify(
                session, imported, filename=filename, digest=digest, data=data, is_sample=is_sample
            )
    except _VerificationMismatch as mismatch:
        rows = sorted({m["row"] for m in mismatch.mismatches})
        failure = errors.verification_failed(mismatch.mismatches[:MAX_LISTED_MISMATCHES], len(rows))
        raise record_rejection(
            sessions, filename=filename, digest=digest, data=data, failure=failure
        ) from None


def record_rejection(
    sessions: sessionmaker[Session], *, filename: str, digest: str, data: bytes | None, failure: ImportFailure
) -> ImportRejected:
    """Keep a record of every rejected upload, in its own transaction, so the reason survives the rollback."""
    run_id = uuid.uuid4()
    with sessions.begin() as session:
        session.add(
            ImportRun(
                id=run_id,
                filename=filename,
                file_sha256=digest,
                file_bytes=data,
                status="failed",
                error_code=failure.code,
                error_message=failure.message,
                report={
                    "error": {"code": failure.code, "message": failure.message, "details": failure.details}
                },
            )
        )
    return ImportRejected(run_id, failure)


def _save_and_verify(
    session: Session, imported: Imported, *, filename: str, digest: str, data: bytes, is_sample: bool
) -> SavedImport:
    run = ImportRun(
        id=uuid.uuid4(), filename=filename, file_sha256=digest, file_bytes=data, status="succeeded"
    )
    template_id = uuid.uuid4()
    session.add(run)
    session.add(
        Template(
            id=template_id,
            name=imported.template.name,
            source_name=imported.template.name,
            is_sample=is_sample,
            import_run_id=run.id,
        )
    )
    session.flush()
    sections, items, comments = _rows(template_id, imported.template)
    session.execute(insert(Section), sections)
    session.execute(insert(Item), items)
    session.execute(insert(Comment), comments)

    mismatches = _compare_with_database(session, template_id, imported.template)
    if mismatches:
        raise _VerificationMismatch(mismatches)  # leaving the `with` block rolls every row back

    checked = len(comments)
    report = imported.report.as_dict()
    report["verification"] = {"checked": checked, "matched": checked, "mismatches": []}
    run.report = report
    return SavedImport(run.id, template_id, report)


def _rows(template_id: uuid.UUID, draft: TemplateDraft) -> tuple[list[dict], list[dict], list[dict]]:
    sections: list[dict] = []
    items: list[dict] = []
    comments: list[dict] = []
    for section_position, section in enumerate(draft.sections):
        section_id = uuid.uuid4()
        sections.append(
            {
                "id": section_id,
                "template_id": template_id,
                "position": section_position,
                "name": section.name,
                "source_name": section.name,
            }
        )
        for item_position, item in enumerate(section.items):
            item_id = uuid.uuid4()
            items.append(
                {
                    "id": item_id,
                    "section_id": section_id,
                    "position": item_position,
                    "name": item.name,
                    "source_name": item.name,
                }
            )
            for comment_position, comment in enumerate(item.comments):
                comments.append(
                    {
                        "id": uuid.uuid4(),
                        "item_id": item_id,
                        "position": comment_position,
                        "source_row": comment.source_row,
                        **_expected_fields(comment),
                    }
                )
    return sections, items, comments


def _expected_fields(comment: CommentDraft) -> dict[str, Any]:
    return {
        "comment_type": comment.comment_type,
        "source_type": comment.source_type,
        "name": comment.name,
        "source_name": comment.name,
        "text_html": comment.text_html,
        "source_text_html": comment.text_html,
        "severity": comment.severity,
        "answer_type": comment.answer_type,
        "options": list(comment.options),
        "unit_options": list(comment.unit_options),
        "recommendation": comment.recommendation,
        "default_value": comment.default_value,
        "source_columns": comment.source_columns,
    }


def _compare_with_database(
    session: Session, template_id: uuid.UUID, draft: TemplateDraft
) -> list[dict[str, Any]]:
    """Read the saved tree back from the database and compare it with the parsed source, field by field."""
    stored = session.execute(
        # Labelled because Section, Item and Comment all have a `name` column.
        select(
            Section.name.label("section_name"),
            Item.name.label("item_name"),
            Comment.source_row,
            *(getattr(Comment, field) for field in CHECKED_FIELDS),
        )
        .join(Item, Item.section_id == Section.id)
        .join(Comment, Comment.item_id == Item.id)
        .where(Section.template_id == template_id)
        .order_by(Section.position, Item.position, Comment.position)
    ).all()
    expected = [
        (section.name, item.name, comment)
        for section in draft.sections
        for item in section.items
        for comment in item.comments
    ]

    mismatches: list[dict[str, Any]] = []
    stored_rows = [row.source_row for row in stored]
    expected_rows = [comment.source_row for _, _, comment in expected]
    for missing in sorted(set(expected_rows) - set(stored_rows)):
        mismatches.append({"row": missing, "field": "missing"})
    if [r for r in stored_rows if r in set(expected_rows)] != [
        r for r in expected_rows if r in set(stored_rows)
    ]:
        first = next(s for s, e in zip(stored_rows, expected_rows, strict=False) if s != e)
        mismatches.append({"row": first, "field": "order"})

    by_row = {row.source_row: row for row in stored}
    for section_name, item_name, comment in expected:
        row = by_row.get(comment.source_row)
        if row is None:
            continue
        if row.section_name != section_name:
            mismatches.append({"row": comment.source_row, "field": "section"})
        if row.item_name != item_name:
            mismatches.append({"row": comment.source_row, "field": "item"})
        for field, value in _expected_fields(comment).items():
            if getattr(row, field) != value:
                mismatches.append({"row": comment.source_row, "field": field})
    return sorted(mismatches, key=lambda m: m["row"])
