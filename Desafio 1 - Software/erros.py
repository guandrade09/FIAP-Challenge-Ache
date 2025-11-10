class AIError(Exception):
    """Exceção base para todos os erros da IA."""
    pass

class AIGenerationError(AIError):
    """Erro quando a IA para de gerar (segurança, tokens, etc.)."""
    def __init__(self, reason, message="A geração foi interrompida"):
        self.reason = reason
        super().__init__(f"{message}: {reason}")

class AIResponseStructureError(AIError):
    """Erro quando a resposta da API vem em formato inesperado."""
    pass