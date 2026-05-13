from fastapi import HTTPException, status

from app.db.config import get_settings
from app.models.account import Account
from app.models.enums import AccountStatus, MessageTaskStage, PostStatus
from app.models.inbound_message import InboundMessage
from app.models.message_task import MessageTask
from app.models.post import Post
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.integrations import QQMessageIngestRequest, QQMessageIngestResponse
from app.services.accounts import get_active_account


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


def _resolve_ingest_account_id() -> str:
    active_account = get_active_account()
    if active_account is not None:
        return active_account.id

    if repository.accounts:
        return sorted(repository.accounts.keys())[0]

    timestamp = now_iso()
    fallback_account = Account(
        id="account_ingest_default",
        name="默认接入账号",
        handle="@ingest_default",
        status=AccountStatus.ONLINE,
        summary="用于承接 QQ/OpenClaw 入站任务的默认账号",
        last_active_at=timestamp,
        created_at=timestamp,
        updated_at=timestamp,
    )
    repository.accounts[fallback_account.id] = fallback_account
    return fallback_account.id


def _ensure_task_account(task: MessageTask) -> None:
    if task.account_id is not None:
        return
    task.account_id = _resolve_ingest_account_id()
    task.updated_at = now_iso()


def _ensure_post_for_message_task(task: MessageTask) -> Post:
    if task.post_id is not None:
        linked_post = repository.posts.get(task.post_id)
        if linked_post is not None:
            changed = False
            if linked_post.message_task_id != task.id:
                linked_post.message_task_id = task.id
                changed = True
            if task.account_id is not None and linked_post.account_id != task.account_id:
                linked_post.account_id = task.account_id
                changed = True
            if changed:
                linked_post.updated_at = now_iso()
            return linked_post

    for post in repository.posts.values():
        if post.message_task_id == task.id:
            task.post_id = post.id
            task.updated_at = now_iso()
            if task.account_id is not None and post.account_id != task.account_id:
                post.account_id = task.account_id
                post.updated_at = now_iso()
            return post

    timestamp = now_iso()
    post = Post(
        id=new_id("post"),
        topic=task.topic,
        title=task.topic,
        body=task.source_message,
        tags=[],
        status=PostStatus.DRAFT,
        asset_ids=[],
        platform_post_id=None,
        account_id=task.account_id,
        message_task_id=task.id,
        created_at=timestamp,
        updated_at=timestamp,
    )
    repository.posts[post.id] = post
    task.post_id = post.id
    task.updated_at = timestamp
    return post


def ingest_qq_message(payload: QQMessageIngestRequest) -> QQMessageIngestResponse:
    validated_signature = _validate_signature(payload)
    duplicated_message = _find_inbound_message_by_event(payload.source, payload.eventId)
    if duplicated_message is not None:
        duplicated_task = repository.message_tasks.get(duplicated_message.message_task_id)
        if duplicated_task is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Message task not found")
        _ensure_task_account(duplicated_task)
        duplicated_post = _ensure_post_for_message_task(duplicated_task)
        repository.save()
        return QQMessageIngestResponse(
            accepted=True,
            duplicated=True,
            rawMessageId=duplicated_message.id,
            messageTaskId=duplicated_message.message_task_id,
            postId=duplicated_post.id,
        )

    timestamp = now_iso()
    topic = payload.content.strip()[:60]
    task = MessageTask(
        id=new_id("taskmsg"),
        source_message=payload.content,
        topic=topic,
        stage=MessageTaskStage.PENDING_GENERATION,
        post_id=None,
        account_id=_resolve_ingest_account_id(),
        requested_at=payload.sentAt,
        scheduled_at=None,
        has_copy=False,
        has_images=False,
        requires_human_review=True,
        created_at=timestamp,
        updated_at=timestamp,
    )
    repository.message_tasks[task.id] = task
    created_post = _ensure_post_for_message_task(task)

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
        postId=created_post.id,
    )
