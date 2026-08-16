"""Inspección segura de los CSV antes de mapearlos al modelo normalizado."""

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path


EXPECTED = (
    "PLANTA CLIENTES.csv",
    "FACTURACION-CLIENTES.csv",
    "BRAINY_PRORRATEO_ALTASV3.csv",
    "BRAINY_RECONEXIONESV3.csv",
    "BRAINY_DESCUENTOS_CUOTAS.csv",
    "CATALOGO-OFERTAS.csv",
    "Ordenes.csv",
)
ENCODINGS = ("utf-8-sig", "cp1252", "latin-1")


@dataclass(frozen=True)
class CsvInspection:
    filename: str
    encoding: str
    delimiter: str
    rows: int
    columns: tuple[str, ...]


def inspect_csv(path: Path) -> CsvInspection:
    decoded = None
    selected = ""
    raw = path.read_bytes()
    for encoding in ENCODINGS:
        try:
            decoded = raw.decode(encoding)
            selected = encoding
            break
        except UnicodeDecodeError:
            continue
    if decoded is None:
        raise ValueError(f"No se pudo decodificar {path.name}")
    sample = decoded[:8192]
    try:
        delimiter = csv.Sniffer().sniff(sample, delimiters=",;|\t").delimiter
    except csv.Error:
        delimiter = ","
    reader = csv.DictReader(decoded.splitlines(), delimiter=delimiter)
    rows = sum(1 for _ in reader)
    columns = tuple((name or "").strip() for name in (reader.fieldnames or []))
    if not columns:
        raise ValueError(f"{path.name} no contiene encabezados")
    return CsvInspection(path.name, selected, delimiter, rows, columns)


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida los CSV disponibles sin modificar la base de datos")
    parser.add_argument("--input-dir", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "raw")
    parser.add_argument("--dry-run", action="store_true", help="Obligatorio hasta validar los encabezados reales")
    args = parser.parse_args()
    if not args.dry_run:
        parser.error("Por seguridad, usa --dry-run. La escritura se habilitará al validar los CSV reales.")
    print(f"Carpeta: {args.input_dir}")
    found = 0
    for filename in EXPECTED:
        path = args.input_dir / filename
        if not path.exists():
            print(f"[pendiente] {filename}")
            continue
        result = inspect_csv(path)
        found += 1
        print(f"[ok] {result.filename}: {result.rows} filas, {len(result.columns)} columnas, {result.encoding}, separador={result.delimiter!r}")
        print("     " + ", ".join(result.columns))
    print(f"Resumen: {found}/{len(EXPECTED)} archivos disponibles")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
