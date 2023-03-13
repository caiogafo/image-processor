from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str

    class Config:
        env_file = ".env"

settings = Settings()
