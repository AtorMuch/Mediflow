"""MediFlow: agente autónomo de triaje, extracción y enrutamiento de documentos clínicos."""


def __getattr__(nombre):            # import perezoso: los submódulos puros no cargan LangChain
    if nombre == "AgenteMediFlow":
        from .agente import AgenteMediFlow
        return AgenteMediFlow
    raise AttributeError(nombre)
