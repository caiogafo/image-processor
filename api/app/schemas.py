from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.image import ProcessingStatus

class ImageResponse(BaseModel):
    id: UUID
    original_filename: str
    original_url: str
    thumbnail_url: Optional[str]
    medium_url: Optional[str]
    large_url: Optional[str]
    no_bg_url: Optional[str]
    file_size_kb: Optional[int]
    width: Optional[int]
    height: Optional[int]
    status: ProcessingStatus
    error_message: Optional[str]
    operations: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}
