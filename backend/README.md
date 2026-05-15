# Lenta ShelfVision API

FastAPI backend для хакатона Lenta Tech: прием видео робота, запуск анализа, выдача CSV/XLSX отчета.

## Запуск

```bash
python -m venv .venv
source .venv/bin/activate # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8765
```

API: http://localhost:8765/docs

## Контракт

- `POST /api/jobs` — multipart upload `file`, возвращает `job_id`.
- `GET /api/jobs/{job_id}` — статус, прогресс, метрики, ссылки на отчеты.
- `GET /api/jobs/{job_id}/download.csv` — CSV.
- `GET /api/jobs/{job_id}/download.xlsx` — Excel.

## Где подключать нейросеть

Файл `app/services/mock_model.py`, функция `analyze_video(...)`.

Сейчас порядок такой:

1. Backend пробует запустить `price_tag_detector` через `app/services/cv_detector_adapter.py`.
2. Если YOLO/Ultralytics доступны, детектор возвращает реальные bbox ценников/кандидатов, timestamp и координаты. Эти поля приводятся к 29-колоночному CSV-контракту задачи.
3. Если CV-детектор недоступен или ничего не нашел, используется CSV из `sample_data`, если имя видео совпадает.
4. Если sample не найден, генерируется демо-результат.

OCR текста и QR пока не подключены, поэтому для строк, полученных из CV-детектора, текстовые и ценовые поля остаются пустыми.
