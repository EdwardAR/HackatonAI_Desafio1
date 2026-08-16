from pathlib import Path

from app.services.knowledge_service import KnowledgeService


def test_knowledge_search_is_local_and_traceable(tmp_path: Path):
    root = tmp_path / "knowledge"
    root.mkdir()
    (root / "pagos.md").write_text("# Pagos seguros\n\nPaga desde la app o la banca móvil.", encoding="utf-8")
    service = KnowledgeService(root)
    hit = service.search("¿Cómo hago pagos desde la banca?")
    assert hit is not None
    assert hit.title == "Pagos seguros"
    assert "banca móvil" in hit.content
    assert hit.source.endswith("pagos.md")
    assert service.search("xy") is None


def test_knowledge_search_handles_missing_corpus(tmp_path: Path):
    assert KnowledgeService(tmp_path / "missing").search("cómo pago") is None
