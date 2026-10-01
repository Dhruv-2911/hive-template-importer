import uuid

from fastapi import APIRouter, Request
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import defer, selectinload

from app.api_errors import not_found
from app.models import Comment, Item, Section, Template
from app.schemas import (
    DuplicateCreated,
    ErrorBody,
    TemplateCounts,
    TemplateFields,
    TemplateSummary,
    TemplateTree,
)
from app.services.duplicate import duplicate_template

router = APIRouter()


@router.get("/templates", response_model=list[TemplateSummary])
def list_templates(request: Request) -> list[TemplateSummary]:
    # Labels avoid `.items`, which is a method on SQLAlchemy's column collection.
    counts = (
        select(
            Section.template_id,
            func.count(distinct(Section.id)).label("section_count"),
            func.count(distinct(Item.id)).label("item_count"),
            func.count(Comment.id).label("comment_count"),
        )
        .outerjoin(Item, Item.section_id == Section.id)
        .outerjoin(Comment, Comment.item_id == Item.id)
        .group_by(Section.template_id)
        .subquery()
    )
    with request.app.state.sessions() as session:
        rows = session.execute(
            select(Template, counts.c.section_count, counts.c.item_count, counts.c.comment_count)
            .outerjoin(counts, counts.c.template_id == Template.id)
            .order_by(Template.is_sample.desc(), Template.created_at.desc())
        ).all()
        return [
            TemplateSummary(
                **TemplateFields.model_validate(template).model_dump(),
                counts=TemplateCounts(sections=sections or 0, items=items or 0, comments=comments or 0),
            )
            for template, sections, items, comments in rows
        ]


@router.get("/templates/{template_id}", response_model=TemplateTree, responses={404: {"model": ErrorBody}})
def get_template(request: Request, template_id: uuid.UUID) -> TemplateTree:
    with request.app.state.sessions() as session:
        template = session.scalar(
            select(Template)
            .where(Template.id == template_id)
            .options(
                selectinload(Template.sections)
                .selectinload(Section.items)
                # All 42 source cells stay in the database; the tree doesn't need them.
                .selectinload(Item.comments)
                .options(defer(Comment.source_columns))
            )
        )
        if template is None:
            raise not_found("template")
        return TemplateTree.model_validate(template)


@router.post(
    "/templates/{template_id}/duplicate",
    status_code=201,
    response_model=DuplicateCreated,
    responses={404: {"model": ErrorBody}},
)
def duplicate(request: Request, template_id: uuid.UUID) -> DuplicateCreated:
    with request.app.state.sessions.begin() as session:
        copy_id = duplicate_template(session, template_id)
        if copy_id is None:
            raise not_found("template")
    return DuplicateCreated(template_id=copy_id)
