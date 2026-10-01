"""Duplicating a template (SPEC.md US5).

Every section, item and comment is copied, source values included, in the caller's transaction, so a failure
part-way leaves nothing behind.
"""

import uuid

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.models import Comment, Item, Section, Template


def duplicate_template(session: Session, template_id: uuid.UUID) -> uuid.UUID | None:
    original = session.get(Template, template_id)
    if original is None:
        return None

    copy_id = uuid.uuid4()
    session.add(
        Template(
            id=copy_id,
            name=f"{original.name} (copy)",
            source_name=original.source_name,
            is_sample=False,
            import_run_id=original.import_run_id,  # the copy still reaches the import report
            copied_from_id=original.id,
        )
    )
    session.flush()

    sections = (
        session.execute(select(Section.__table__).where(Section.template_id == template_id)).mappings().all()
    )
    new_section = {row["id"]: uuid.uuid4() for row in sections}
    _insert(
        session, Section, [{**row, "id": new_section[row["id"]], "template_id": copy_id} for row in sections]
    )

    items = (
        session.execute(select(Item.__table__).where(Item.section_id.in_(list(new_section)))).mappings().all()
    )
    new_item = {row["id"]: uuid.uuid4() for row in items}
    _insert(
        session,
        Item,
        [{**row, "id": new_item[row["id"]], "section_id": new_section[row["section_id"]]} for row in items],
    )

    comments = (
        session.execute(select(Comment.__table__).where(Comment.item_id.in_(list(new_item)))).mappings().all()
    )
    _insert(
        session,
        Comment,
        [{**row, "id": uuid.uuid4(), "item_id": new_item[row["item_id"]]} for row in comments],
    )
    return copy_id


def _insert(session: Session, model: type, rows: list[dict]) -> None:
    if rows:
        session.execute(insert(model), rows)
