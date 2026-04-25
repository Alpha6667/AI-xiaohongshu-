from fastapi import APIRouter

from app.schemas.accounts import AccountResponse, AccountWorksSyncResponse
from app.services.accounts import get_account_works_sync, list_accounts, trigger_account_works_sync


router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
def list_accounts_route() -> list[AccountResponse]:
    return list_accounts()


@router.get("/{account_id}/works-sync", response_model=AccountWorksSyncResponse)
def get_account_works_sync_route(account_id: str) -> AccountWorksSyncResponse:
    return get_account_works_sync(account_id)


@router.post("/{account_id}/works-sync", response_model=AccountWorksSyncResponse)
def trigger_account_works_sync_route(account_id: str) -> AccountWorksSyncResponse:
    return trigger_account_works_sync(account_id)
