from PIL import Image, ImageFilter, ImageEnhance
from io import BytesIO

SIZES = {
    "thumbnail": 150,
    "medium": 600,
    "large": 1200,
}

def resize_image(image: Image.Image, max_size: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((max_size, max_size), Image.LANCZOS)
    return image

def compress_to_bytes(image: Image.Image, quality: int = 85, fmt: str = "JPEG") -> bytes:
    buffer = BytesIO()
    rgb = image.convert("RGB") if fmt == "JPEG" else image
    rgb.save(buffer, format=fmt, optimize=True, quality=quality)
    return buffer.getvalue()

def process_all_sizes(original_bytes: bytes) -> dict[str, bytes]:
    image = Image.open(BytesIO(original_bytes))
    results = {}
    for name, size in SIZES.items():
        resized = resize_image(image, size)
        fmt = "PNG" if image.mode == "RGBA" else "JPEG"
        results[name] = compress_to_bytes(resized, quality=85, fmt=fmt)
    return results

def get_image_info(image_bytes: bytes) -> dict:
    image = Image.open(BytesIO(image_bytes))
    return {
        "width": image.width,
        "height": image.height,
        "format": image.format,
        "mode": image.mode,
    }
# Pillow image processor with LANCZOS resize and quality compression
