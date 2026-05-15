"""
download_model.py
Downloads YOLOv8n weights into the models/ folder.
Run once before first use.
"""

import sys
from pathlib import Path

def download():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics not installed. Run install.bat first.")
        sys.exit(1)

    models_dir = Path(__file__).parent.parent / "models"
    models_dir.mkdir(exist_ok=True)

    target = models_dir / "yolov8n.pt"
    if target.exists():
        print(f"[OK] Model already exists: {target}")
        return

    print("Downloading YOLOv8n weights (~6 MB)...")
    model = YOLO("yolov8n.pt")           # downloads automatically
    # Move to our models/ folder
    import shutil, os
    downloaded = Path("yolov8n.pt")
    if downloaded.exists():
        shutil.move(str(downloaded), str(target))
    print(f"[OK] Saved to {target}")

if __name__ == "__main__":
    download()
