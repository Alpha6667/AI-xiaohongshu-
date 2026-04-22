from dataclasses import dataclass

from app.models.enums import AccountStatus


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
