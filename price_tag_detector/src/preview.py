"""
preview.py  –  Draw detections live on screen for debugging.
Press Q to quit.
"""

import cv2
import argparse
from pathlib import Path


def preview(video_path: str, model_path: str, conf: float = 0.35):
    try:
        from ultralytics import YOLO
    except ImportError:
        raise ImportError("Run install.bat first")

    model = YOLO(model_path)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    cap.release()

    for result in model.track(
        source=video_path,
        stream=True,
        device="0",
        conf=conf,
        persist=True,
        verbose=False,
    ):
        frame = result.orig_img.copy()
        if result.boxes is not None and result.boxes.id is not None:
            for box, tid, conf_val in zip(
                result.boxes.xyxy.cpu().numpy().astype(int),
                result.boxes.id.cpu().numpy().astype(int),
                result.boxes.conf.cpu().numpy(),
            ):
                x1, y1, x2, y2 = box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame, f"ID:{tid}  {conf_val:.2f}",
                    (x1, max(y1-6, 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1,
                )

        cv2.imshow("Price Tag Preview  (Q=quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--model", default="models/yolov8n.pt")
    parser.add_argument("--conf", type=float, default=0.35)
    args = parser.parse_args()
    preview(args.video, args.model, args.conf)
