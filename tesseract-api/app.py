from flask import Flask, request, jsonify
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import io

app = Flask(__name__)

def preprocess_image(image):
    image = image.convert('L')
    image = ImageEnhance.Contrast(image).enhance(2.0)
    image = image.filter(ImageFilter.SHARPEN)
    return image

@app.route('/ocr', methods=['POST'])
def ocr():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    file = request.files['image']
    lang = request.form.get('lang', 'fra+ara')
    preprocess = request.form.get('preprocess', 'true').lower() == 'true'
    try:
        image = Image.open(io.BytesIO(file.read()))
        if preprocess:
            image = preprocess_image(image)
        data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
        confidences = [c for c in data['conf'] if c > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        text = pytesseract.image_to_string(image, lang=lang)
        return jsonify({
            'text': text.strip(),
            'confidence': round(avg_confidence, 1),
            'lang': lang,
            'word_count': len([w for w in text.split() if len(w) > 1])
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'tesseract_version': str(pytesseract.get_tesseract_version())})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
