from dataclasses import dataclass


@dataclass(slots=True)
class InboundMessage:
    id: str
    event_id: str
    source: str
    sender_id: str
    sender_name: str
    conversation_id: str
    content: str
    sent_at: str
    signature: str
    received_at: str
    message_task_id: str
