import os
from groq import AsyncGroq

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = AsyncGroq(api_key=api_key, timeout=45.0)
    return _client


# Fast, capable model for all features
DEFAULT_MODEL = "llama-3.3-70b-versatile"

# Shared generation configs
CHAT_PARAMS = dict(max_tokens=600, temperature=0.7, top_p=0.9, frequency_penalty=0.3)
ROLEPLAY_PARAMS = dict(max_tokens=300, temperature=0.65, top_p=0.85, frequency_penalty=0.2)
REPORT_PARAMS = dict(max_tokens=800, temperature=0.1, top_p=0.1)
