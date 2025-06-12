from ultralytics import YOLO
from Configurations.MttConfig import PublishMessage

# model = YOLO("yolov8x.pt")#modelo nao treinado  
# OBS: yolov8X.pt = melhor qualidade || yolov8n.pt = menor qualidade, melhor pra testes
model = YOLO("./MachineLearningTraining/runs/detect/train2/weights/best.pt") #modelo treinado com yolov8n.pt

for result in model.predict(source = "0", show = True, stream = True):  
    #Source 0 -> webcam, strem = true -> codigo conseguir validar em tempo real
    caixa_errada = False
    for box in result.boxes:
        cls = int(box.cls[0])
        if model.names[cls] == "caixa errada":
            caixa_errada = True
            break
        
    if caixa_errada == True: # OBS:msg tem q ser string
        PublishMessage("1") #Faz o seletor se mover 
    elif caixa_errada != False:
        PublishMessage("0") #Faz o seletor ignorar 