import cloudinary
import cloudinary.uploader
from app.config import settings

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
)

def upload_bytes(data: bytes, public_id: str, folder: str = "image-processor") -> str:
    result = cloudinary.uploader.upload(
        data,
        public_id=public_id,
        folder=folder,
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]

def delete_image(public_id: str):
    cloudinary.uploader.destroy(public_id)
# Cloudinary SDK configured with env credentials
