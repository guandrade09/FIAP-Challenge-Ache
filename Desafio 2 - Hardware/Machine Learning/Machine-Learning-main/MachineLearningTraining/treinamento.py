from ultralytics import YOLO

def main():
    model = YOLO("yolov8n.pt")

    # Use the model
    model.train(data="venv/MachineLearning/caixas.yaml", epochs=1, device="cpu")
    metrics = model.val()  # evaluate model performance on the validation set
    # results = model("https://ultralytics.com/images/bus.jpg")  # predict on an image
    # path = model.export(format="onnx")  # export the model to ONNX format
    # print("path", path)


if __name__ == '__main__':
    # freeze_support()
    main()