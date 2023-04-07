from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import Image
from app.database import Base
from app.routes.images import router as images_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Image Processor API",
    description="Plataforma de upload e processamento de imagens com IA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "service": "Image Processor API"}

# Background task processing keeps the upload response fast
# while Pillow + rembg run asynchronously in the server process
