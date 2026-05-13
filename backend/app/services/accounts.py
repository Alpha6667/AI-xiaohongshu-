from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.models.account import Account
from app.models.enums import AccountConnectionStatus, AccountStatus, AccountSyncStatus, MessageTaskStage, PostStatus, ReviewStatus
from app.repositories.memory import now_iso, repository
from app.schemas.accounts import AccountCreateRequest, AccountDeleteResponse, AccountResponse, AccountWorksSyncResponse, WorkSyncItemResponse


def _is_today(iso_text: str) -> bool:
    try:
        return datetime.fromisoformat(iso_text).astimezone(UTC).date() == datetime.now(UTC).date()
    except ValueError:
        return False


def _engagement_for_post(post_id: str) -> int:
    snapshots = repository.metrics_snapshots.get(post_id, [])
    if not snapshots:
        return 0
    latest = snapshots[-1]
    return latest.likes + latest.favorites + latest.comments + latest.follow_conversions


def _get_account_or_404(account_id: str) -> Account:
    account = repository.accounts.get(account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


def _default_profile_path(account_id: str) -> str:
    return f"/root/.openclaw/xhs-profile-persist-{account_id}"


def _account_id_from_xhs_id(xhs_id: str) -> str:
    safe_xhs_id = "".join(char for char in xhs_id.lower() if char.isalnum() or char in {"_", "-"})
    return f"account_{safe_xhs_id or 'xhs'}"


def _connected_accounts() -> list[Account]:
    return [account for account in repository.accounts.values() if account.connection_status == AccountConnectionStatus.CONNECTED and not account.reauth_required]


def _ensure_single_active_account() -> None:
    active_accounts = [account for account in repository.accounts.values() if account.is_active]
    if len(active_accounts) == 1:
        return

    preferred = _connected_accounts()[0] if _connected_accounts() else (next(iter(repository.accounts.values()), None) if repository.accounts else None)
    for account in repository.accounts.values():
        account.is_active = preferred is not None and account.id == preferred.id


def get_active_account() -> Account | None:
    _ensure_single_active_account()
    return next((account for account in repository.accounts.values() if account.is_active), None)


def _review_status_for_post(post) -> ReviewStatus:
    if post.review_status != ReviewStatus.UNKNOWN:
        return post.review_status
    if post.status == PostStatus.UNDER_REVIEW:
        return ReviewStatus.UNDER_REVIEW
    if post.status == PostStatus.REJECTED:
        return ReviewStatus.REJECTED
    if post.status in {PostStatus.APPROVED, PostStatus.PUBLISHED}:
        return ReviewStatus.APPROVED
    if post.status in {PostStatus.DRAFT, PostStatus.IN_REVIEW}:
        return ReviewStatus.PENDING
    return ReviewStatus.UNKNOWN


def _serialize_account(item: Account, *, today_task_count: int, waiting_count: int, published_count: int, total_engagement: int, best_topic: str | None) -> AccountResponse:
    return AccountResponse(
        id=item.id,
        name=item.name,
        handle=item.handle,
        avatarUrl=item.avatar_url,
        xhsId=item.xhs_id,
        profileUrl=item.profile_url,
        profilePath=item.profile_path,
        isActive=item.is_active,
        status=item.status,
        summary=item.summary,
        lastActiveAt=item.last_active_at,
        todayTaskCount=today_task_count,
        waitingCount=waiting_count,
        publishedCount=published_count,
        totalEngagement=total_engagement,
        bestTopic=best_topic,
        connectionStatus=item.connection_status,
        reauthRequired=item.reauth_required,
        connectedAt=item.connected_at,
        lastValidatedAt=item.last_validated_at,
        lastUsedAt=item.last_used_at,
        lastAuthError=item.last_auth_error,
        lastSyncAt=item.last_sync_at,
        lastSyncStatus=item.last_sync_status,
        lastSyncError=item.last_sync_error,
    )


def _serialize_work_sync_item(post) -> WorkSyncItemResponse:
    snapshots = repository.metrics_snapshots.get(post.id, [])
    latest = snapshots[-1] if snapshots else None
    like_count = post.like_count if post.like_count is not None else (latest.likes if latest is not None else 0)
    collect_count = post.collect_count if post.collect_count is not None else (latest.favorites if latest is not None else 0)
    comment_count = post.comment_count if post.comment_count is not None else (latest.comments if latest is not None else 0)
    return WorkSyncItemResponse(
        postId=post.id,
        title=post.title,
        topic=post.topic,
        platformPostId=post.platform_post_id,
        platformUrl=post.platform_url,
        publishedAt=post.published_at,
        reviewStatus=_review_status_for_post(post),
        likeCount=like_count,
        collectCount=collect_count,
        commentCount=comment_count,
        lastSyncAt=post.last_sync_at,
        lastSyncStatus=post.last_sync_status,
        syncError=post.sync_error,
        updatedAt=post.updated_at,
    )


def list_accounts() -> list[AccountResponse]:
    _ensure_single_active_account()
    accounts = sorted(repository.accounts.values(), key=lambda item: item.updated_at, reverse=True)
    waiting_stages = {
        MessageTaskStage.PENDING_GENERATION,
        MessageTaskStage.WAITING_REVIEW,
        MessageTaskStage.WAITING_PUBLISH,
    }

    responses: list[AccountResponse] = []
    for item in accounts:
        account_tasks = [task for task in repository.message_tasks.values() if task.account_id == item.id]
        account_posts = [post for post in repository.posts.values() if post.account_id == item.id]

        today_task_count = sum(1 for task in account_tasks if _is_today(task.requested_at))
        waiting_count = sum(1 for task in account_tasks if task.stage in waiting_stages)
        published_count = sum(1 for post in account_posts if post.status == PostStatus.PUBLISHED)

        post_engagements = [(post.topic, _engagement_for_post(post.id)) for post in account_posts]
        total_engagement = sum(data[1] for data in post_engagements)
        best_topic = None
        if post_engagements:
            best_topic = max(post_engagements, key=lambda data: data[1])[0]

        responses.append(_serialize_account(item, today_task_count=today_task_count, waiting_count=waiting_count, published_count=published_count, total_engagement=total_engagement, best_topic=best_topic))

    return responses


def create_account(payload: AccountCreateRequest) -> AccountResponse:
    account_id = payload.id or _account_id_from_xhs_id(payload.xhsId)
    if account_id in repository.accounts:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account already exists")

    created_at = now_iso()
    should_activate = not repository.accounts
    account = Account(
        id=account_id,
        name=payload.name,
        handle=f"@{payload.xhsId}",
        status=AccountStatus.ONLINE,
        summary=f"真实小红书账号 {payload.name}。",
        last_active_at=created_at,
        created_at=created_at,
        updated_at=created_at,
        avatar_url=payload.avatarUrl,
        xhs_id=payload.xhsId,
        profile_url=payload.profileUrl,
        profile_path=payload.profilePath or _default_profile_path(account_id),
        is_active=should_activate,
        connection_status=AccountConnectionStatus.CONNECTED,
        reauth_required=False,
        connected_at=created_at,
        last_validated_at=created_at,
        last_sync_at=created_at,
        last_sync_status=AccountSyncStatus.SUCCEEDED,
    )
    repository.accounts[account.id] = account
    _ensure_single_active_account()
    repository.save()
    return next(item for item in list_accounts() if item.id == account.id)


def delete_account(account_id: str) -> AccountDeleteResponse:
    account = _get_account_or_404(account_id)
    if any(post.account_id == account.id for post in repository.posts.values()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account has linked posts and cannot be deleted")
    if any(task.account_id == account.id for task in repository.message_tasks.values()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account has linked tasks and cannot be deleted")

    del repository.accounts[account.id]
    _ensure_single_active_account()
    repository.save()
    return AccountDeleteResponse(accountId=account_id, deleted=True)


def activate_account(account_id: str) -> AccountResponse:
    account = _get_account_or_404(account_id)
    if account.connection_status in {AccountConnectionStatus.DISCONNECTED, AccountConnectionStatus.REAUTH_REQUIRED} or account.reauth_required:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account is not available for activation")

    updated_at = now_iso()
    for item in repository.accounts.values():
        item.is_active = item.id == account.id
    account.last_used_at = updated_at
    account.updated_at = updated_at
    repository.save()
    return next(item for item in list_accounts() if item.id == account.id)


def get_account_works_sync(account_id: str) -> AccountWorksSyncResponse:
    account = _get_account_or_404(account_id)
    works = sorted(
        [post for post in repository.posts.values() if post.account_id == account.id],
        key=lambda item: item.updated_at,
        reverse=True,
    )
    return AccountWorksSyncResponse(
        accountId=account.id,
        connectionStatus=account.connection_status,
        reauthRequired=account.reauth_required,
        lastSyncAt=account.last_sync_at,
        lastSyncStatus=account.last_sync_status,
        lastSyncError=account.last_sync_error,
        works=[_serialize_work_sync_item(post) for post in works],
    )


def trigger_account_works_sync(account_id: str) -> AccountWorksSyncResponse:
    account = _get_account_or_404(account_id)
    sync_time = datetime.now(UTC).isoformat()
    account.last_used_at = sync_time

    if account.connection_status in {AccountConnectionStatus.DISCONNECTED, AccountConnectionStatus.REAUTH_REQUIRED} or account.reauth_required:
        account.last_sync_at = sync_time
        account.last_sync_status = AccountSyncStatus.FAILED
        account.last_sync_error = account.last_auth_error or "账号连接不可用，无法同步作品数据。"
        for post in repository.posts.values():
            if post.account_id == account.id:
                post.last_sync_at = sync_time
                post.last_sync_status = AccountSyncStatus.FAILED
                post.sync_error = account.last_sync_error
        repository.save()
        return get_account_works_sync(account_id)

    account.last_sync_at = sync_time
    account.last_sync_status = AccountSyncStatus.SUCCEEDED
    account.last_sync_error = None
    account.last_validated_at = sync_time

    for post in repository.posts.values():
        if post.account_id != account.id:
            continue
        snapshots = repository.metrics_snapshots.get(post.id, [])
        latest = snapshots[-1] if snapshots else None
        post.like_count = latest.likes if latest is not None else (post.like_count or 0)
        post.collect_count = latest.favorites if latest is not None else (post.collect_count or 0)
        post.comment_count = latest.comments if latest is not None else (post.comment_count or 0)
        post.last_sync_at = sync_time
        post.last_sync_status = AccountSyncStatus.SUCCEEDED
        post.sync_error = None
        if post.platform_post_id and not post.platform_url:
            post.platform_url = f"https://www.xiaohongshu.com/explore/{post.platform_post_id}"
        if post.status == PostStatus.PUBLISHED:
            post.review_status = ReviewStatus.APPROVED

    repository.save()
    return get_account_works_sync(account_id)
