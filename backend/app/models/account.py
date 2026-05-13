from dataclasses import dataclass

from app.models.enums import AccountConnectionStatus, AccountStatus, AccountSyncStatus


@dataclass(slots=True)
class Account:
    id: str
    name: str
    handle: str
    status: AccountStatus
    summary: str
    last_active_at: str | None
    created_at: str
    updated_at: str
    avatar_url: str | None = None
    xhs_id: str | None = None
    profile_url: str | None = None
    connection_status: AccountConnectionStatus = AccountConnectionStatus.UNKNOWN
    reauth_required: bool = False
    connected_at: str | None = None
    last_validated_at: str | None = None
    last_used_at: str | None = None
    last_auth_error: str | None = None
    last_sync_at: str | None = None
    last_sync_status: AccountSyncStatus = AccountSyncStatus.UNKNOWN
    last_sync_error: str | None = None
