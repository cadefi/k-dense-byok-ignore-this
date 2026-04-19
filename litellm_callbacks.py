"""LiteLLM proxy callbacks / startup patches.

We pin `google-adk>=1.31.0`, which pins `litellm<=1.82.6`. That version has a
regression (#24234, fixed upstream in #24282) where routing a request with
model=`openrouter/<vendor>/<name>` and `custom_llm_provider="openrouter"` sends
the full `openrouter/<vendor>/<name>` string to OpenRouter, which rejects it
as "not a valid model ID". The proxy's wildcard routing path always resolves
`custom_llm_provider="openrouter"` for `openrouter/*` matches, so neither the
config alone nor `model: "*"` substitution alone can work around it.

Rather than enumerate every OpenRouter model in the config, we patch
`litellm.get_llm_provider` here to strip a stray `openrouter/` prefix whenever
the provider is already `openrouter`. This is exactly the behavior PR #24282
introduces upstream and runs only at proxy startup.

LiteLLM imports this module because it is declared in
`litellm_settings.callbacks` in `litellm_config.yaml`.
"""

from __future__ import annotations

import litellm
from litellm.integrations.custom_logger import CustomLogger
from litellm.litellm_core_utils import get_llm_provider_logic
from litellm.llms.openrouter.chat.transformation import OpenrouterConfig


_ORIG_GET_LLM_PROVIDER = get_llm_provider_logic.get_llm_provider
_ORIG_OR_TRANSFORM_REQUEST = OpenrouterConfig.transform_request


def _strip_openrouter_prefix(model: str) -> str:
    """Drop a stray ``openrouter/`` prefix on ``<vendor>/<name>`` ids."""
    if (
        isinstance(model, str)
        and model.startswith("openrouter/")
        and model.count("/") >= 2
    ):
        return model[len("openrouter/") :]
    return model


def _patched_transform_request(  # type: ignore[no-untyped-def]
    self,
    model,
    messages,
    optional_params,
    litellm_params,
    headers,
):
    model = _strip_openrouter_prefix(model)
    return _ORIG_OR_TRANSFORM_REQUEST(
        self, model, messages, optional_params, litellm_params, headers
    )


OpenrouterConfig.transform_request = _patched_transform_request


def _patched_get_llm_provider(  # type: ignore[no-untyped-def]
    model,
    custom_llm_provider=None,
    api_base=None,
    api_key=None,
    litellm_params=None,
):
    """Strip a double `openrouter/` prefix before delegating.

    When the proxy router has already set ``custom_llm_provider='openrouter'``
    and the substituted ``model`` still carries the ``openrouter/`` prefix
    (e.g. ``openrouter/anthropic/claude-opus-4.7``), the upstream function
    short-circuits and forwards the prefixed id, which OpenRouter rejects.
    Drop the prefix in that narrow window so the dispatch sees the clean
    ``<vendor>/<model>`` string.
    """
    if (
        isinstance(model, str)
        and model.startswith("openrouter/")
        and custom_llm_provider == "openrouter"
        and model.count("/") >= 2
    ):
        # Letting the upstream auto-detect from the `openrouter/` prefix
        # strips it correctly. Passing custom_llm_provider="openrouter"
        # explicitly hits a bugged branch that keeps (or re-adds) the
        # prefix before the HTTP call.
        custom_llm_provider = None
    return _ORIG_GET_LLM_PROVIDER(
        model=model,
        custom_llm_provider=custom_llm_provider,
        api_base=api_base,
        api_key=api_key,
        litellm_params=litellm_params,
    )


get_llm_provider_logic.get_llm_provider = _patched_get_llm_provider
litellm.get_llm_provider = _patched_get_llm_provider


class OpenRouterPrefixFix(CustomLogger):
    """No-op logger. Importing this module installs the patch above."""


proxy_handler_instance = OpenRouterPrefixFix()
