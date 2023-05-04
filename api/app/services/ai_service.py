from PIL import Image
from io import BytesIO

try:
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

def remove_background(image_bytes: bytes) -> bytes:
    """Remove image background using U2Net AI model via rembg."""
    if not REMBG_AVAILABLE:
        raise RuntimeError("rembg não instalado. Execute: pip install rembg")
    result = rembg_remove(image_bytes)
    image = Image.open(BytesIO(result)).convert("RGBA")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
# rembg uses U2Net model, downloaded on first call (~170MB)
