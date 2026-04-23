from fastapi import HTTPException, status

from app.db.config import get_settings
from app.models.enums import MessageTaskStage
from app.models.inbound_message import InboundMessage
from app.models.message_task import MessageTask
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.integrations import QQMessageIngestRequest, QQMessageIngestResponse


def _event_key(source: str, event_id: str) -> str:
    return f"{source}:{event_id}"


def _find_inbound_message_by_event(source: str, event_id: str) -> InboundMessage | None:
    key = _event_key(source, event_id)
    for message in repository.inbound_messages.values():
        if _event_key(message.source, message.event_id) == key:
            return message
    return None


def _validate_signature(payload: QQMessageIngestRequest) -> str:
    provided_secret = payload.signature or payload.sharedKey
    expected_secret = get_settings().qq_ingest_shared_secret
    if provided_secret != expected_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    return provided_secret


def ingest_qq_message(payload: QQMessageIngestRequest) -> QQMessageIngestResponse:
    validated_signature = _validate_signature(payload)
    duplicated_message = _find_inbound_message_by_event(payload.source, payload.eventId)
    if duplicated_message is not None:
        return QQMessageIngestResponse(
            accepted=True,
            duplicated=True,
            rawMessageId=duplicated_message.id,
            messageTaskId=duplicated_message.message_task_id,
        )

    timestamp = now_iso()
    topic = payload.content.strip()[:60]
    task = MessageTask(
        id=new_id("taskmsg"),
        source_message=payload.content,
        topic=topic,
        stage=MessageTaskStage.PENDING_GENERATION,
        post_id=None,
        account_id=None,
        requested_at=payload.sentAt,
        scheduled_at=None,
        has_copy=False,
        has_images=False,
        requires_human_review=True,
        created_at=timestamp,
        updated_at=timestamp,
    )
    repository.message_tasks[task.id] = task

    inbound_message = InboundMessage(
        id=new_id("qqmsg"),
        event_id=payload.eventId,
        source=payload.source,
        sender_id=payload.senderId,
        sender_name=payload.senderName,
        conversation_id=payload.conversationId,
        content=payload.content,
        sent_at=payload.sentAt,
        signature=validated_signature,
        received_at=timestamp,
        message_task_id=task.id,
    )
    repository.inbound_messages[inbound_message.id] = inbound_message
    repository.save()

    return QQMessageIngestResponse(
        accepted=True,
        duplicated=False,
        rawMessageId=inbound_message.id,
        messageTaskId=task.id,
    )
