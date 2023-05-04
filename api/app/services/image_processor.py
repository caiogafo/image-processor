from PIL import Image, ImageEnhance, ImageFilter
from io import BytesIO

SIZES = {
    "thumbnail": 150,
    "medium": 600,
    "large": 1200,
}

def open_image(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes))

def to_bytes(image: Image.Image, fmt: str = "JPEG", quality: int = 85) -> bytes:
    buffer = BytesIO()
    save_fmt = fmt.upper()
    if save_fmt == "JPG":
        save_fmt = "JPEG"
    img = image.convert("RGBA") if save_fmt == "PNG" else image.convert("RGB")
    if save_fmt == "WEBP":
        img = image.convert("RGBA")
    img.save(buffer, format=save_fmt, optimize=True, quality=quality)
    return buffer.getvalue()

def resize_image(image: Image.Image, max_size: int) -> Image.Image:
    img = image.copy()
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    return img

def resize_custom(image: Image.Image, width: int, height: int, keep_aspect: bool = True) -> Image.Image:
    if keep_aspect:
        image.thumbnail((width, height), Image.LANCZOS)
        return image
    return image.resize((width, height), Image.LANCZOS)

def apply_adjustments(
    image: Image.Image,
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    sharpness: float = 1.0,
) -> Image.Image:
    if brightness != 1.0:
        image = ImageEnhance.Brightness(image).enhance(brightness)
    if contrast != 1.0:
        image = ImageEnhance.Contrast(image).enhance(contrast)
    if saturation != 1.0:
        image = ImageEnhance.Color(image).enhance(saturation)
    if sharpness != 1.0:
        image = ImageEnhance.Sharpness(image).enhance(sharpness)
    return image

def auto_enhance(image: Image.Image) -> Image.Image:
    """Apply smart auto-enhancement: slight contrast + sharpness boost."""
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Sharpness(image).enhance(1.4)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    return image

def process_all_sizes(original_bytes: bytes) -> dict:
    image = open_image(original_bytes)
    results = {}
    for name, size in SIZES.items():
        resized = resize_image(image.copy(), size)
        fmt = "PNG" if image.mode == "RGBA" else "JPEG"
        results[name] = to_bytes(resized, fmt=fmt)
    return results

def get_image_info(image_bytes: bytes) -> dict:
    image = Image.open(BytesIO(image_bytes))
    return {
        "width": image.width,
        "height": image.height,
        "format": image.format,
        "mode": image.mode,
    }
