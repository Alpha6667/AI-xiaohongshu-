from app.repositories.memory import repository
from app.schemas.accounts import AccountResponse


def list_accounts() -> list[AccountResponse]:
    accounts = sorted(repository.accounts.values(), key=lambda item: item.updated_at, reverse=True)
    return [
        AccountResponse(
            id=item.id,
            name=item.name,
            handle=item.handle,
            status=item.status,
            summary=item.summary,
            lastActiveAt=item.last_active_at,
        )
        for item in accounts
    ]
