import hashlib
import uuid
from typing import Annotated, BinaryIO
from urllib.parse import quote

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import select

from app.api_errors import ApiError, not_found
from app.importer import errors
from app.models import ImportRun, Template
from app.schemas import ErrorBody, ImportCreated, ImportRunOut
from app.services.imports import ImportRejected, import_upload, record_rejection

router = APIRouter()
CHUNK = 1 << 20


def read_upload(stream: BinaryIO, max_bytes: int) -> tuple[bytes | None, str, int]:
    """Hash the whole upload but keep at most max_bytes of it in memory.

    The bytes are None when the upload is over the limit.
    """
    digest = hashlib.sha256()
    size = 0
    chunks: list[bytes] = []
    while chunk := stream.read(CHUNK):
        digest.update(chunk)
        size += len(chunk)
        if size <= max_bytes:
            chunks.append(chunk)
    return (b"".join(chunks) if size <= max_bytes else None), digest.hexdigest(), size


def rejected(rejection: ImportRejected) -> ApiError:
    failure = rejection.failure
    return ApiError(
        422, failure.code, failure.message, {**failure.details, "import_run_id": rejection.import_run_id}
    )


@router.post("/imports", status_code=201, response_model=ImportCreated, responses={422: {"model": ErrorBody}})
def create_import(request: Request, file: Annotated[UploadFile, File()]) -> dict:
    sessions = request.app.state.sessions
    max_bytes = request.app.state.settings.max_upload_bytes
    filename = file.filename or ""
    data, digest, size = read_upload(file.file, max_bytes)
    if data is None:
        failure = errors.file_too_large(size, max_bytes)
        raise rejected(
            record_rejection(sessions, filename=filename, digest=digest, data=None, failure=failure)
        )
    try:
        saved = import_upload(sessions, data=data, filename=filename, max_bytes=max_bytes)
    except ImportRejected as rejection:
        raise rejected(rejection) from None
    return {"import_run_id": saved.import_run_id, "template_id": saved.template_id, "report": saved.report}


@router.get("/imports/{import_run_id}", response_model=ImportRunOut, responses={404: {"model": ErrorBody}})
def get_import(request: Request, import_run_id: uuid.UUID) -> dict:
    with request.app.state.sessions() as session:
        run = session.get(ImportRun, import_run_id)
        if run is None:
            raise not_found("import")
        template_id = session.scalar(
            select(Template.id).where(Template.import_run_id == run.id, Template.copied_from_id.is_(None))
        )
        succeeded = run.status == "succeeded"
        return {
            "id": run.id,
            "filename": run.filename,
            "status": run.status,
            "created_at": run.created_at,
            "template_id": template_id,
            "report": run.report if succeeded else None,
            "error": None if succeeded else (run.report or {}).get("error"),
        }


@router.get("/imports/{import_run_id}/file", responses={404: {"model": ErrorBody}})
def download_import_file(request: Request, import_run_id: uuid.UUID) -> Response:
    with request.app.state.sessions() as session:
        run = session.get(ImportRun, import_run_id)
        if run is None or run.file_bytes is None:
            raise not_found("uploaded file")
        return Response(
            run.file_bytes,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{quote(run.filename or 'export')}"
            },
        )
