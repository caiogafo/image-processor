from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import uuid

from app.database import get_db
from app.models.image import Image, ProcessingStatus
from app.schemas import ImageResponse
from app.services.cloudinary_service import upload_bytes
from app.services.image_processor import process_all_sizes, get_image_info
from app.services.ai_service import remove_background

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_MB = 10

async def process_image_task(image_id: str, file_bytes: bytes, remove_bg: bool, db: Session):
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        return

    try:
        image.status = ProcessingStatus.PROCESSING
        db.commit()

        operations = []

        # Get original info
        info = get_image_info(file_bytes)
        image.width = info["width"]
        image.height = info["height"]
        image.file_size_kb = len(file_bytes) // 1024

        # Upload original
        original_url = upload_bytes(file_bytes, f"{image_id}/original", folder="image-processor")
        image.original_url = original_url
        operations.append("upload_original")

        # Resize to multiple sizes
        sizes = process_all_sizes(file_bytes)
        image.thumbnail_url = upload_bytes(sizes["thumbnail"], f"{image_id}/thumbnail")
        image.medium_url = upload_bytes(sizes["medium"], f"{image_id}/medium")
        image.large_url = upload_bytes(sizes["large"], f"{image_id}/large")
        operations.append("resize_thumbnail_medium_large")
        operations.append("compress_85_quality")

        # AI background removal
        if remove_bg:
            no_bg_bytes = remove_background(file_bytes)
            image.no_bg_url = upload_bytes(no_bg_bytes, f"{image_id}/no_bg")
            operations.append("ai_remove_background")

        image.operations = operations
        image.status = ProcessingStatus.DONE

    except Exception as e:
        image.status = ProcessingStatus.ERROR
        image.error_message = str(e)

    finally:
        db.commit()


@router.post("/upload", response_model=ImageResponse, status_code=201)
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    remove_bg: bool = False,
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Formato não suportado. Use JPG, PNG ou WEBP.")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Arquivo muito grande. Máximo {MAX_SIZE_MB}MB.")

    image_id = str(uuid.uuid4())

    # Upload original immediately so we have a URL
    original_url = upload_bytes(file_bytes, f"{image_id}/original", folder="image-processor")

    db_image = Image(
        id=image_id,
        original_filename=file.filename,
        original_url=original_url,
        status=ProcessingStatus.PENDING,
        operations=[],
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)

    background_tasks.add_task(process_image_task, image_id, file_bytes, remove_bg, db)

    return db_image


@router.get("/", response_model=List[ImageResponse])
def list_images(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Image).order_by(Image.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{image_id}", response_model=ImageResponse)
def get_image(image_id: UUID, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.id == str(image_id)).first()
    if not image:
        raise HTTPException(404, "Imagem não encontrada.")
    return image


@router.delete("/{image_id}", status_code=204)
def delete_image(image_id: UUID, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.id == str(image_id)).first()
    if not image:
        raise HTTPException(404, "Imagem não encontrada.")
    db.delete(image)
    db.commit()
