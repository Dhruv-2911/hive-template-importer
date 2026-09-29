"""The stored template (ADR-004).

A relational tree, with comments identified by source row and the imported values kept unchanged next to the
editable ones. The schema itself is owned by the Alembic migrations.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    type_annotation_map = {str: Text, uuid.UUID: UUID(as_uuid=True), dict[str, Any]: JSONB}


def _id() -> Mapped[uuid.UUID]:
    return mapped_column(primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))


def _now() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class ImportRun(Base):
    __tablename__ = "import_runs"
    __table_args__ = (CheckConstraint("status in ('succeeded', 'failed')", name="import_runs_status"),)

    id: Mapped[uuid.UUID] = _id()
    filename: Mapped[str]
    file_sha256: Mapped[str]
    file_bytes: Mapped[bytes | None] = mapped_column(
        LargeBinary
    )  # null only for uploads rejected as too large
    status: Mapped[str]
    error_code: Mapped[str | None]
    error_message: Mapped[str | None]
    report: Mapped[dict[str, Any] | None]
    created_at: Mapped[datetime] = _now()


class Template(Base):
    __tablename__ = "templates"
    # At most one sample, so concurrent container starts can't both seed it.
    __table_args__ = (
        Index("templates_one_sample", "is_sample", unique=True, postgresql_where=text("is_sample")),
    )

    id: Mapped[uuid.UUID] = _id()
    name: Mapped[str]
    source_name: Mapped[str]
    is_sample: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    # One-way link to the import (a copy keeps its original's), so there is no circular foreign key.
    import_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("import_runs.id", ondelete="SET NULL"))
    copied_from_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("templates.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = _now()
    updated_at: Mapped[datetime] = _now()

    sections: Mapped[list["Section"]] = relationship(
        order_by="Section.position", cascade="all, delete-orphan", passive_deletes=True
    )


class Section(Base):
    __tablename__ = "sections"
    __table_args__ = (UniqueConstraint("template_id", "position", name="sections_position"),)

    id: Mapped[uuid.UUID] = _id()
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("templates.id", ondelete="CASCADE"))
    position: Mapped[int]
    name: Mapped[str]
    source_name: Mapped[str]

    items: Mapped[list["Item"]] = relationship(
        order_by="Item.position", cascade="all, delete-orphan", passive_deletes=True
    )


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (UniqueConstraint("section_id", "position", name="items_position"),)

    id: Mapped[uuid.UUID] = _id()
    section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sections.id", ondelete="CASCADE"))
    position: Mapped[int]
    name: Mapped[str]
    source_name: Mapped[str]

    comments: Mapped[list["Comment"]] = relationship(
        order_by="Comment.position", cascade="all, delete-orphan", passive_deletes=True
    )


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        UniqueConstraint("item_id", "position", name="comments_position"),
        CheckConstraint("comment_type in ('info', 'limit', 'defect', 'unknown')", name="comments_type"),
        CheckConstraint("severity in (-1, 0, 1)", name="comments_severity"),
    )

    id: Mapped[uuid.UUID] = _id()
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"))
    position: Mapped[int]
    source_row: Mapped[int]
    comment_type: Mapped[str]
    source_type: Mapped[str]
    name: Mapped[str]
    source_name: Mapped[str]
    text_html: Mapped[str]
    source_text_html: Mapped[str]
    severity: Mapped[int | None] = mapped_column(SmallInteger)
    answer_type: Mapped[str | None]
    options: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    unit_options: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    recommendation: Mapped[str | None]
    default_value: Mapped[str | None]
    source_columns: Mapped[dict[str, Any]]
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
