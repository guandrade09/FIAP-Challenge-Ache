from config import UPLOAD_PATH
import os

pasta_uploads = UPLOAD_PATH
contador = 0

for raiz, subpastas, pastas in os.walk(pasta_uploads):
    
    if subpastas is None:
        print("subspasta vazia")
    else:
        print(f"subpastas:", subpastas)
    
    if pastas is None:
        print(f"pasta vazia n:")
    else:
        print(f"pastas:", pastas)
    
    subpasta = subpastas
    pasta = pastas
    
    contador += 1

print(f"pasta: {pasta}")
print(f"subspasta: {subpasta}")