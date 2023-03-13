from rembg import remove
from PIL import Image
from io import BytesIO

def remove_background(image_bytes: bytes) -> bytes:
    """Remove image background using U2Net AI model via rembg."""
    result = remove(image_bytes)
    # Convert to PNG to preserve transparency
    image = Image.open(BytesIO(result)).convert("RGBA")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
