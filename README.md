# Image Processor — Plataforma de Processamento de Imagens com IA

Plataforma para upload, processamento automático e armazenamento de imagens em nuvem.

## Funcionalidades

- Upload de imagens (JPG, PNG, WEBP)
- Redimensionamento automático em 3 tamanhos (thumbnail 150px, medium 600px, large 1200px)
- Compressão inteligente mantendo qualidade visual
- Remoção de fundo com IA (modelo U2Net via rembg)
- Armazenamento no Cloudinary com URLs públicas
- Galeria com histórico de uploads e downloads
- Status de processamento em tempo real (polling)

## Stack

| Camada | Tecnologia |
|---|---|
| API | Python 3.11 + FastAPI + SQLAlchemy |
| Processamento | Pillow + rembg (U2Net) |
| Storage | Cloudinary |
| Banco | PostgreSQL (Supabase) |
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Deploy API | Render.com |
| Deploy Web | Vercel |

## Estrutura

```
image-processor/
├── api/
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── config.py
│       ├── database.py
│       ├── models/
│       ├── services/
│       │   ├── cloudinary_service.py
│       │   ├── image_processor.py
│       │   └── ai_service.py
│       └── routes/
│           └── images.py
└── web/
    └── src/
        ├── pages/
        └── components/
```

## Instalação

```bash
# API
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Web
cd web
npm install
npm run dev
```

## Variáveis de Ambiente (API)

```env
DATABASE_URL=postgresql://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
