# Pendientes (lo que NO está resuelto todavía)

## Ya corregido en esta versión
- Instalación solo Colombia (país fijo CO; otros países se rechazan). Se eliminaron los packs CL/MX/UY/CR/HN/GENERICO.
- Identidad colombiana: CC, TI, RC, CE, PPT, PEP, pasaporte (validación de formato).
- Seudonimización: cédulas con puntos, CC/TI/PPT/PEP/pasaporte, celulares y fijos colombianos, historia clínica.
  Corregidos el patrón que corrompía "Cédula de ciudadanía" y el correo que se comía el punto final.
- API con autenticación por token; usuario y rol salen del token (antes venían en el body).
- PDF/imagen: falla directa a revisión humana (sin 3 reintentos ni 7 s de espera) y su base64 ya no llega al LLM.
- NEWS2: hueco de temperatura (39.0–39.1), PAS ≥220 y temp ≤35 como parámetros rojos, escala 2 con oxígeno.
- Alerta crítica que no salió por ningún canal: ya no se marca como emitida y aparece de inmediato en `/alertas/vencidas`.
- Canal alterno de correo (SMTP) y notificador compuesto Slack + correo.

## Falta (en orden de prioridad)
1. **PDF e imágenes / escaneados**: implementar OCR o visión. Hoy siempre van a revisión humana.
2. **Persistencia real**: almacén, checkpointer de LangGraph, idempotencia y despachadores están en memoria
   (se pierde todo al reiniciar). El `mapa_tokens` con datos reales vive en el estado del grafo: cifrarlo o sacarlo.
3. **Despachadores reales** a los sistemas destino (HCE, Farmacia, Auditoría, Emergencia): hoy son simulados,
   así que un documento puede quedar ENTREGADO sin haber llegado a ningún lado.
4. **Cron de escalamiento** (RN-F2) que consuma `/alertas/vencidas` y escale al siguiente rol.
5. **NER para nombres** en texto libre (p. ej. Presidio + spaCy `es`): la regex solo cubre nombres con etiqueta.
6. **Datos propios de Colombia**: EPS/régimen, CUPS para procedimientos, vademécum colombiano (INVIMA/CUM) para
   `MARCAS_A_DCI`, programas de cobertura (`programas` está vacío), integración MIPRES si aplica.
7. **Validación clínica** (marcada `# TODO clínico`): umbrales NEWS2 y SpO2 a la altitud de la sede (Bogotá/Boyacá),
   lista de conceptos urgentes, códigos CIE-11 (si solo usan CIE-10, retirarlos).
8. **Cumplimiento** (validar con asesor jurídico): Ley 1581 de 2012 (datos sensibles de salud), transferencia
   internacional de datos a OpenAI, Ley 2015 de 2020 y Resolución 1995 de 1999.
9. **Producción de la API**: HTTPS, rotación/almacenamiento seguro de tokens, límites de tasa, auditoría de accesos.
   La autenticación actual es por token estático (suficiente para arrancar, no para un despliegue clínico completo).
10. **Slack**: `FileInstallationStore` sirve para un workspace; con varios, usar base de datos.
