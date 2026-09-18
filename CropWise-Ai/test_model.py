import sys
from pathlib import Path

from transformers import pipeline

MODEL_NAME = "kimcomehome/plantvillage-vit-leaf-disease"
DEFAULT_IMAGE = Path(__file__).resolve().parent / "test_leaf.jpg"


def main():
    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IMAGE
    if not image_path.exists():
        raise SystemExit(
            f"Image not found: {image_path}\n"
            "Usage: python test_model.py path\\to\\leaf.jpg"
        )

    print("Loading model...")
    classifier = pipeline("image-classification", model=MODEL_NAME)
    print("Model loaded!")
    print(f"Analyzing {image_path}...")

    results = classifier(str(image_path))
    print("\n===== PREDICTION =====")
    for result in results[:5]:
        print(f"{result['label']} -> {result['score'] * 100:.2f}%")


if __name__ == "__main__":
    main()
