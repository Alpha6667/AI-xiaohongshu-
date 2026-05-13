from fastapi import APIRouter

from app.schemas.accounts import AccountCreateRequest, AccountDeleteResponse, AccountResponse, AccountWorksSyncResponse
from app.services.accounts import activate_account, create_account, delete_account, get_account_works_sync, list_accounts, trigger_account_works_sync


router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
def list_accounts_route() -> list[AccountResponse]:
    return list_accounts()


@router.post("", response_model=AccountResponse, status_code=201)
def create_account_route(payload: AccountCreateRequest) -> AccountResponse:
    return create_account(payload)


@router.delete("/{account_id}", response_model=AccountDeleteResponse)
def delete_account_route(account_id: str) -> AccountDeleteResponse:
    return delete_account(account_id)


@router.patch("/{account_id}/activate", response_model=AccountResponse)
def activate_account_route(account_id: str) -> AccountResponse:
    return activate_account(account_id)


@router.get("/{account_id}/works-sync", response_model=AccountWorksSyncResponse)
def get_account_works_sync_route(account_id: str) -> AccountWorksSyncResponse:
    return get_account_works_sync(account_id)


@router.post("/{account_id}/works-sync", response_model=AccountWorksSyncResponse)
def trigger_account_works_sync_route(account_id: str) -> AccountWorksSyncResponse:
    return trigger_account_works_sync(account_id)
