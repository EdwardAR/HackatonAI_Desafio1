import json
import re
from decimal import Decimal

from app.core.config import Settings, get_settings
from app.schemas.billing import BillingAnalysis, Cause


UNSAFE_PHRASE = re.compile(r"[0-9]|S/|sol(?:es)?|por\s*ciento|%", re.IGNORECASE)


class AIExplainer:
    """Gemini may rewrite labels, but deterministic code owns facts and money."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def explain(self, analysis: BillingAnalysis, use_ai: bool = True) -> tuple[str, str]:
        phrases: dict[str, str] = {}
        generated_by = "deterministic"
        if use_ai and self.settings.gemini_api_key and analysis.causas:
            try:
                phrases = self._gemini_phrases(analysis.causas)
                generated_by = "gemini-validated"
            except Exception:
                phrases = {}
                generated_by = "deterministic-fallback"
        return self._render(analysis, phrases), generated_by

    def _gemini_phrases(self, causes: list[Cause]) -> dict[str, str]:
        from google import genai

        client = genai.Client(api_key=self.settings.gemini_api_key)
        allowed = [{"id": cause.id, "approved_fact": cause.explicacion} for cause in causes]
        prompt = (
            "Reformula cada approved_fact en español claro y empático. No agregues hechos, causas, fechas, "
            "números, monedas ni porcentajes. Devuelve SOLO JSON: {\"phrases\":{\"id\":\"frase\"}}. Datos: "
            + json.dumps(allowed, ensure_ascii=False)
        )
        response = client.models.generate_content(model=self.settings.gemini_model, contents=prompt)
        payload = json.loads(response.text or "{}")
        raw = payload.get("phrases", {})
        allowed_ids = {cause.id for cause in causes}
        if set(raw) != allowed_ids:
            raise ValueError("Gemini referenced an unapproved cause")
        cleaned: dict[str, str] = {}
        for key, phrase in raw.items():
            if not isinstance(phrase, str) or not phrase.strip() or len(phrase) > 180 or UNSAFE_PHRASE.search(phrase):
                raise ValueError("Gemini phrase failed financial safety validation")
            cleaned[key] = phrase.strip().rstrip(".")
        return cleaned

    @staticmethod
    def _format_money(value: Decimal) -> str:
        sign = "-" if value < 0 else ""
        return f"{sign}S/{abs(value):,.2f}"

    def _render(self, analysis: BillingAnalysis, phrases: dict[str, str]) -> str:
        direction = "aumentó" if analysis.variacion > 0 else "disminuyó" if analysis.variacion < 0 else "no cambió"
        if analysis.variacion == 0:
            heading = "Tu recibo no cambió frente al ciclo anterior."
        else:
            heading = f"Tu recibo {direction} {self._format_money(abs(analysis.variacion))} este ciclo."
        if not analysis.causas:
            return f"{heading}\n\nNo se detectaron cambios relevantes con la evidencia disponible."
        lines = [heading, "", "Estas son las causas verificadas:"]
        for index, cause in enumerate(analysis.causas, 1):
            phrase = phrases.get(cause.id, cause.explicacion).rstrip(".")
            effect = "aumentó" if cause.impacto >= 0 else "redujo"
            lines.append(f"{index}. {phrase}. Esto {effect} el recibo en {self._format_money(abs(cause.impacto))}.")
        lines.extend(["", "Cada causa está respaldada por los registros mostrados en Evidencia."])
        return "\n".join(lines)
