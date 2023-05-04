from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import uuid

from app.database import get_db
from app.models.image import Image, ProcessingStatus
from app.schemas import ImageResponse
from app.services.cloudinary_service import upload_bytes
from app.services.image_processor import (
    open_image, to_bytes, resize_image, resize_custom,
    apply_adjustments, auto_enhance, process_all_sizes, get_image_info
)
from app.services.ai_service import remove_background, REMBG_AVAILABLE

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_MB = 10


async def process_image_task(
    image_id: str,
    file_bytes: bytes,
    remove_bg: bool,
    auto_enh: bool,
    custom_width: Optional[int],
    custom_height: Optional[int],
    brightness: float,
    contrast: float,
    saturation: float,
    sharpness: float,
    output_format: str,
    db: Session,
):
    image_rec = db.query(Image).filter(Image.id == image_id).first()
    if not image_rec:
        return

    try:
        image_rec.status = ProcessingStatus.PROCESSING
        db.commit()

        operations = []
        info = get_image_info(file_bytes)
        image_rec.width = info["width"]
        image_rec.height = info["height"]
        image_rec.file_size_kb = len(file_bytes) // 1024

        img = open_image(file_bytes)

        # Auto-enhance
        if auto_enh:
            img = auto_enhance(img)
            operations.append("auto_enhance")

        # Manual adjustments
        has_adj = any(v != 1.0 for v in [brightness, contrast, saturation, sharpness])
        if has_adj:
            img = apply_adjustments(img, brightness, contrast, saturation, sharpness)
            operations.append(f"adjust_B{brightness}_C{contrast}_S{saturation}_SH{sharpness}")

        # Custom resize
        if custom_width or custom_height:
            w = custom_width or img.width
            h = custom_height or img.height
            img = resize_custom(img.copy(), w, h)
            operations.append(f"resize_{w}x{h}")

        fmt = output_format.upper()

        # Upload processed original
        original_url = upload_bytes(to_bytes(img, fmt=fmt), f"{image_id}/original", folder="image-processor")
        image_rec.original_url = original_url
        operations.append("upload_original")

        # Resize presets
        image_rec.thumbnail_url = upload_bytes(to_bytes(resize_image(img.copy(), 150), fmt=fmt), f"{image_id}/thumbnail")
        image_rec.medium_url = upload_bytes(to_bytes(resize_image(img.copy(), 600), fmt=fmt), f"{image_id}/medium")
        image_rec.large_url = upload_bytes(to_bytes(resize_image(img.copy(), 1200), fmt=fmt), f"{image_id}/large")
        operations.append("resize_thumbnail_medium_large")
        operations.append("compress_85_quality")

        # AI background removal
        if remove_bg and REMBG_AVAILABLE:
            no_bg_bytes = remove_background(to_bytes(img, fmt="PNG"))
            image_rec.no_bg_url = upload_bytes(no_bg_bytes, f"{image_id}/no_bg")
            operations.append("ai_remove_background")

        image_rec.operations = operations
        image_rec.status = ProcessingStatus.DONE

    except Exception as e:
        image_rec.status = ProcessingStatus.ERROR
        image_rec.error_message = str(e)
    finally:
        db.commit()


@router.post("/upload", response_model=ImageResponse, status_code=201)
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    remove_bg: bool = False,
    auto_enhance: bool = False,
    custom_width: Optional[int] = None,
    custom_height: Optional[int] = None,
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    sharpness: float = 1.0,
    output_format: str = "JPEG",
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Formato não suportado. Use JPG, PNG ou WEBP.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Arquivo muito grande. Máximo {MAX_SIZE_MB}MB.")

    image_id = str(uuid.uuid4())
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

    background_tasks.add_task(
        process_image_task,
        image_id, file_bytes, remove_bg, auto_enhance,
        custom_width, custom_height,
        brightness, contrast, saturation, sharpness,
        output_format, db,
    )

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
