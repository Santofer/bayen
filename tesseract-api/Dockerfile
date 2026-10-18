FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-ara \
    libgl1 \
    libglib2.0-0 \
    libfribidi0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir
COPY app.py .
# Carte Open Graph (/og-card) : polices variables + logo ; libfribidi0 active
# libraqm (embarquée dans Pillow) pour mettre l'arabe en forme de droite à gauche
COPY fonts/ fonts/
COPY assets/ assets/

EXPOSE 5000
CMD ["python", "app.py"]
