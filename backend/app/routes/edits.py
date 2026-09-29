"""Renames and comment edits (SPEC.md US4, ADR-007). Only `name`/`text_html` change; `source_*` never do."""

import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api_errors import ApiError, not_found
from app.models import Comment, Item, Section, Template
from app.sanitize import clean_comment_html
from app.schemas import CommentChange, CommentOut, ErrorBody, NameChange, NamedOut

router = APIRouter()
MAX_NAME_LENGTH = 200
MAX_TEXT_LENGTH = 50_000  # the longest comment in either export is 665 characters
ERRORS = {404: {"model": ErrorBody}, 422: {"model": ErrorBody}}


def valid_name(name: str) -> str:
    """Names are stored as typed; they just can't be blank or absurdly long."""
    if not name.strip():
        raise ApiError(422, "NAME_REQUIRED", "A name can't be empty.")
    if len(name) > MAX_NAME_LENGTH:
        raise ApiError(422, "NAME_TOO_LONG", f"Names can be at most {MAX_NAME_LENGTH} characters long.")
    return name


def touch(session: Session, template_id: uuid.UUID) -> None:
    session.execute(update(Template).where(Template.id == template_id).values(updated_at=func.now()))


@router.patch("/templates/{template_id}", response_model=NamedOut, responses=ERRORS)
def rename_template(request: Request, template_id: uuid.UUID, change: NameChange) -> NamedOut:
    name = valid_name(change.name)
    with request.app.state.sessions.begin() as session:
        template = session.get(Template, template_id)
        if template is None:
            raise not_found("template")
        template.name = name
        touch(session, template.id)
        return NamedOut.model_validate(template)


@router.patch("/sections/{section_id}", response_model=NamedOut, responses=ERRORS)
def rename_section(request: Request, section_id: uuid.UUID, change: NameChange) -> NamedOut:
    name = valid_name(change.name)
    with request.app.state.sessions.begin() as session:
        section = session.get(Section, section_id)
        if section is None:
            raise not_found("section")
        section.name = name
        touch(session, section.template_id)
        return NamedOut.model_validate(section)


@router.patch("/items/{item_id}", response_model=NamedOut, responses=ERRORS)
def rename_item(request: Request, item_id: uuid.UUID, change: NameChange) -> NamedOut:
    name = valid_name(change.name)
    with request.app.state.sessions.begin() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise not_found("item")
        item.name = name
        touch(session, session.scalar(select(Section.template_id).where(Section.id == item.section_id)))
        return NamedOut.model_validate(item)


@router.patch("/comments/{comment_id}", response_model=CommentOut, responses=ERRORS)
def edit_comment(request: Request, comment_id: uuid.UUID, change: CommentChange) -> CommentOut:
    with request.app.state.sessions.begin() as session:
        comment = session.get(Comment, comment_id)
        if comment is None:
            raise not_found("comment")
        if change.name is not None:
            comment.name = valid_name(change.name)
        if change.text_html is not None:
            if len(change.text_html) > MAX_TEXT_LENGTH:
                raise ApiError(
                    422, "TEXT_TOO_LONG", f"Comment text can be at most {MAX_TEXT_LENGTH} characters long."
                )
            comment.text_html = clean_comment_html(change.text_html)
        comment.edited_at = func.now()
        template_id = session.scalar(
            select(Section.template_id)
            .join(Item, Item.section_id == Section.id)
            .where(Item.id == comment.item_id)
        )
        touch(session, template_id)
        session.flush()
        session.refresh(comment)  # edited_at is set by the database
        return CommentOut.model_validate(comment)
