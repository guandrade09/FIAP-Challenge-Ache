# Machine-Learning
Projeto de machine learning para o challenge Next 2025 da fiap!!

Como usar?

• Adicionar pasta Certificate me Configurations e adicionar pastas Datasets-> Nome qualquer -> train (o path tem q ficar assim (Datasets/caixas/train))

• Iniciar Venv -> python -m venv venv

• Baixar todos os pacotes presentes no arquivo requirements.txt -> pip install -r requirements.txt

• Dentro de Datasets/Caixas/Train adicionar todas as fotos e anotacoes geradas pelo MakeSense.IA(https://www.makesense.ai/)

• Configurar arquivo caixas.yaml:  
        Path -> caminho ate o Datasets -> ./Machine Learning/MachineLearningTraining/datasets 
        Train -> caminho apos o DataSet ate a pasta Train -> caixas/train  
        Val -> caminho apos o DataSet ate a pasta Train -> caixas/train  
        test ->
        Classes -> Todos os labels criados no MakeSense.ia em ordem 

• Em treinamento.py deixar model.train(path ate o arquivo.yaml, numeros de vezes que o codigo ira estudar, cpu)

• Adicionar certificado .crt do mqtt em Configurations/Certificate e configurar certinho o MqttConfig com os dados do seu broker mqtt

• Em main.py, adicionar path gerado apos o treinamento que leve ate o melhor treinamento ->./MachineLearningTraining/runs/detect/train/weights/best.pt" 

