"""Duplicating a template (SPEC.md US5).

Every section, item and comment is copied inside the database, source values included, in the caller's
transaction, so a failure part-way leaves nothing behind. Each level is one INSERT ... SELECT, matched to its
new parent by position (unique per parent), so nothing passes through the app: copying row by row sent ~1 MB
of comments each way and took 9.5 s against Supabase.
"""

import uuid

from sqlalchemy import Uuid, and_, func, insert, literal, select
from sqlalchemy.orm import Session

from app.models import Comment, Item, Section, Template

SECTIONS, ITEMS, COMMENTS = Section.__table__, Item.__table__, Comment.__table__


def duplicate_template(session: Session, template_id: uuid.UUID) -> uuid.UUID | None:
    original = session.get(Template, template_id)
    if original is None:
        return None

    copy_id = uuid.uuid4()
    copy_name = f"{original.name} (copy)"
    session.add(
        Template(
            id=copy_id,
            name=copy_name,
            # A template's name doesn't come from the export, so the copy's reference name is the one it was
            # created with: it's only marked as edited once the inspector renames it.
            source_name=copy_name,
            is_sample=False,
            import_run_id=original.import_run_id,  # the copy still reaches the import report
            copied_from_id=original.id,
        )
    )
    session.flush()

    old_section, new_section = SECTIONS.alias("old_section"), SECTIONS.alias("new_section")
    old_item, new_item = ITEMS.alias("old_item"), ITEMS.alias("new_item")
    # The copy's section at the same position as the original's.
    same_section = and_(
        new_section.c.template_id == copy_id, new_section.c.position == old_section.c.position
    )

    session.execute(
        insert(SECTIONS).from_select(
            ["id", "template_id", "position", "name", "source_name"],
            select(
                func.gen_random_uuid(),
                literal(copy_id, Uuid()),
                SECTIONS.c.position,
                SECTIONS.c.name,
                SECTIONS.c.source_name,
            ).where(SECTIONS.c.template_id == template_id),
        )
    )
    session.execute(
        insert(ITEMS).from_select(
            ["id", "section_id", "position", "name", "source_name"],
            select(
                func.gen_random_uuid(),
                new_section.c.id,
                old_item.c.position,
                old_item.c.name,
                old_item.c.source_name,
            )
            .select_from(
                old_item.join(old_section, old_section.c.id == old_item.c.section_id).join(
                    new_section, same_section
                )
            )
            .where(old_section.c.template_id == template_id),
        )
    )
    copied = [column for column in COMMENTS.c if column.key not in ("id", "item_id")]
    session.execute(
        insert(COMMENTS).from_select(
            ["id", "item_id", *(column.key for column in copied)],
            select(func.gen_random_uuid(), new_item.c.id, *copied)
            .select_from(
                COMMENTS.join(old_item, old_item.c.id == COMMENTS.c.item_id)
                .join(old_section, old_section.c.id == old_item.c.section_id)
                .join(new_section, same_section)
                .join(
                    new_item,
                    and_(
                        new_item.c.section_id == new_section.c.id, new_item.c.position == old_item.c.position
                    ),
                )
            )
            .where(old_section.c.template_id == template_id),
        )
    )
    return copy_id
