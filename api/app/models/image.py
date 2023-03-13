from sqlalchemy import Column, String, Integer, DateTime, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum
from app.database import Base

class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"

class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename = Column(String, nullable=False)
    original_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    medium_url = Column(String, nullable=True)
    large_url = Column(String, nullable=True)
    no_bg_url = Column(String, nullable=True)
    file_size_kb = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    error_message = Column(String, nullable=True)
    operations = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
