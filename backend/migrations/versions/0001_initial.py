"""Initial schema: import runs and the template tree (ADR-004), with row-level security on (ADR-002).

Revision ID: 0001
Revises:
Create Date: 2026-09-29
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

TABLES = ("import_runs", "templates", "sections", "items", "comments")


def _id() -> sa.Column:
    return sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def _timestamp(name: str, nullable: bool = False) -> sa.Column:
    default = None if nullable else sa.func.now()
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=default)


def upgrade() -> None:
    op.create_table(
        "import_runs",
        _id(),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("file_sha256", sa.Text(), nullable=False),
        sa.Column("file_bytes", sa.LargeBinary(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error_code", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("report", postgresql.JSONB(), nullable=True),
        _timestamp("created_at"),
        sa.CheckConstraint("status in ('succeeded', 'failed')", name="import_runs_status"),
    )
    op.create_table(
        "templates",
        _id(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column("is_sample", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "import_run_id", sa.Uuid(), sa.ForeignKey("import_runs.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column(
            "copied_from_id", sa.Uuid(), sa.ForeignKey("templates.id", ondelete="SET NULL"), nullable=True
        ),
        _timestamp("created_at"),
        _timestamp("updated_at"),
    )
    op.create_index(
        "templates_one_sample", "templates", ["is_sample"], unique=True, postgresql_where=sa.text("is_sample")
    )
    op.create_table(
        "sections",
        _id(),
        sa.Column(
            "template_id", sa.Uuid(), sa.ForeignKey("templates.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.UniqueConstraint("template_id", "position", name="sections_position"),
    )
    op.create_table(
        "items",
        _id(),
        sa.Column("section_id", sa.Uuid(), sa.ForeignKey("sections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.UniqueConstraint("section_id", "position", name="items_position"),
    )
    op.create_table(
        "comments",
        _id(),
        sa.Column("item_id", sa.Uuid(), sa.ForeignKey("items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("source_row", sa.Integer(), nullable=False),
        sa.Column("comment_type", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column("text_html", sa.Text(), nullable=False),
        sa.Column("source_text_html", sa.Text(), nullable=False),
        sa.Column("severity", sa.SmallInteger(), nullable=True),
        sa.Column("answer_type", sa.Text(), nullable=True),
        sa.Column("options", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column(
            "unit_options", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'")
        ),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("default_value", sa.Text(), nullable=True),
        sa.Column("source_columns", postgresql.JSONB(), nullable=False),
        _timestamp("edited_at", nullable=True),
        sa.UniqueConstraint("item_id", "position", name="comments_position"),
        sa.CheckConstraint("comment_type in ('info', 'limit', 'defect', 'unknown')", name="comments_type"),
        sa.CheckConstraint("severity in (-1, 0, 1)", name="comments_severity"),
    )

    # Supabase exposes the public schema through its Data API. RLS with no policies denies that API every row,
    # while the app, which connects as the tables' owner, is unaffected (ADR-002).
    for table in (*TABLES, "alembic_version"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY")
    for table in reversed(TABLES):
        op.drop_table(table)
