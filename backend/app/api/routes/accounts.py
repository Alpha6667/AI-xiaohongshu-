from fastapi import APIRouter

from app.schemas.accounts import AccountResponse
from app.services.accounts import list_accounts


router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
def list_accounts_route() -> list[AccountResponse]:
    return list_accounts()
