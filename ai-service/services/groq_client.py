import os
from groq import Groq

_client: Groq | None = None

def get_groq_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = Groq(api_key=api_key)
    return _client

# Default model — fast and free on Groq
DEFAULT_MODEL = "llama-3.3-70b-versatile"
