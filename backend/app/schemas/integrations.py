from typing import Literal

from pydantic import BaseModel, Field, model_validator


class QQMessageIngestRequest(BaseModel):
    source: Literal["qq"] = "qq"
    senderId: str = Field(min_length=1)
    senderName: str = Field(min_length=1)
    conversationId: str = Field(min_length=1)
    content: str = Field(min_length=1)
    sentAt: str = Field(min_length=1)
    eventId: str = Field(min_length=1)
    signature: str | None = None
    sharedKey: str | None = None

    @model_validator(mode="after")
    def validate_auth_fields(self) -> "QQMessageIngestRequest":
        if not self.signature and not self.sharedKey:
            raise ValueError("Either signature or sharedKey is required")
        return self


class QQMessageIngestResponse(BaseModel):
    accepted: bool
    duplicated: bool
    rawMessageId: str
    messageTaskId: str
