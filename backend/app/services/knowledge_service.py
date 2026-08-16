import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class KnowledgeHit:
    title: str
    content: str
    source: str


class KnowledgeService:
    """Retrieval local y trazable para conceptos/FAQ; nunca calcula datos financieros."""

    def __init__(self, root: Path | None = None) -> None:
        self.root = root or Path(__file__).resolve().parents[3] / "data" / "knowledge"

    @staticmethod
    def _tokens(text: str) -> set[str]:
        normalized = unicodedata.normalize("NFKD", text.lower())
        ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
        return {token for token in re.findall(r"[a-z]{3,}", ascii_text) if token not in {"para", "como", "porque", "esto", "esta", "tengo"}}

    def search(self, query: str) -> KnowledgeHit | None:
        query_tokens = self._tokens(query)
        if not query_tokens or not self.root.exists():
            return None
        best: tuple[int, Path, str] | None = None
        for path in self.root.rglob("*.md"):
            content = path.read_text(encoding="utf-8")
            score = len(query_tokens & self._tokens(f"{path.stem} {content}"))
            if score and (best is None or score > best[0]):
                best = (score, path, content)
        if not best:
            return None
        _, path, content = best
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        title = lines[0].lstrip("# ") if lines else path.stem.replace("-", " ").title()
        body = " ".join(line.lstrip("- ") for line in lines[1:] if not line.startswith("#"))
        return KnowledgeHit(title=title, content=body[:500], source=str(path.relative_to(self.root.parent.parent)))
