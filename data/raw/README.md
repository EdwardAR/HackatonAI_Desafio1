# CSV de entrada

Coloca aquí, sin cambiarles el nombre, los archivos entregados para el desafío:

- `PLANTA CLIENTES.csv`
- `FACTURACION-CLIENTES.csv`
- `BRAINY_PRORRATEO_ALTASV3.csv`
- `BRAINY_RECONEXIONESV3.csv`
- `BRAINY_DESCUENTOS_CUOTAS.csv` (P1)
- `CATALOGO-OFERTAS.csv`
- `Ordenes.csv` (si se usa para cambio de plan)

Esta carpeta no se publica. Los archivos reales están ignorados por Git; solo se conserva este instructivo. Después de copiarlos, ejecuta desde `backend`:

```powershell
python -m scripts.import_csv --dry-run
```

El comando informa archivos encontrados, encoding, separador, filas y columnas. No escribe en la base hasta que los encabezados se hayan validado y se complete el adaptador de carga con el esquema real recibido.
