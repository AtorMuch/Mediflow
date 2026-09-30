"""Adaptadores concretos de los puertos (`puertos.py`) hacia servicios externos reales.

Nada de este paquete lo importa `nodos.py`, `grafo.py` ni `agente.py`: el grafo solo
conoce los Protocol de `puertos.py`. Esto es lo que se conecta desde afuera (API, main).
"""
