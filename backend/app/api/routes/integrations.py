from fastapi import APIRouter, status

from app.schemas.integrations import QQMessageIngestRequest, QQMessageIngestResponse
from app.services.integrations import ingest_qq_message


router = APIRouter(prefix="/api/integrations/qq", tags=["integrations"])


@router.post("/messages", response_model=QQMessageIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_qq_message_route(payload: QQMessageIngestRequest) -> QQMessageIngestResponse:
    return ingest_qq_message(payload)
