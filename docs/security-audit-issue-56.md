# Security Audit Report: API Key Handling (Issue #56)

**Date**: 2026-02-23  
**Scope**: Free mode client key handling, Pro mode server-side key posture, and tRPC authorization setup.

## Summary

This audit reviewed API-key storage, request construction, error/logging behavior, and server route authorization posture.

## Findings and Status

- [x] **No plaintext API keys in localStorage**
  - `packages/app/src/store/index.ts` persists only `encrypted` key material and forces `key: ''` during serialization.
  - Added regression test: `packages/app/src/store/__tests__/index.test.ts`.

- [x] **No key leakage in network request URLs/referrer paths**
  - Fixed Google free-client validation/model-list calls to use `x-goog-api-key` headers instead of `?key=...` query params.
  - Updated in `packages/shared-utils/src/providers/clients/google/FreeGoogleClient.ts`.
  - Added/updated tests in:
    - `packages/shared-utils/src/providers/clients/google/FreeGoogleClient.test.ts`
    - `packages/shared-utils/src/providers/__tests__/free-clients.test.ts`

- [x] **No key leakage in error/console output (provider/client paths)**
  - Added shared redaction utility:
    - `packages/shared-utils/src/providers/utils/sanitizeSensitiveData.ts`
  - Wired redaction into:
    - `packages/shared-utils/src/providers/utils/extractAxiosError.ts`
    - `packages/shared-utils/src/providers/clients/base/BaseFreeClient.ts`
    - `packages/shared-utils/src/providers/clients/openai/FreeOpenAIClient.ts`
    - `packages/shared-utils/src/providers/clients/anthropic/FreeAnthropicClient.ts`
    - `packages/shared-utils/src/providers/clients/google/FreeGoogleClient.ts`
    - `packages/shared-utils/src/providers/clients/xai/FreeXAIClient.ts`
    - `packages/shared-utils/src/providers/clients/deepseek/FreeDeepSeekClient.ts`
    - `packages/shared-utils/src/providers/clients/perplexity/FreePerplexityClient.ts`
    - `packages/app/src/lib/validation.ts`
  - Added tests: `packages/shared-utils/src/providers/utils/sanitizeSensitiveData.test.ts`.

- [x] **Pro mode server-side key exposure review**
  - Current codebase does not implement server-side provider key storage flows for Pro mode yet.
  - No server route currently returns provider API keys to the client.
  - Current provider registration in app initializes `mock` and `free` only (`packages/app/src/providers/index.ts`).

- [x] **tRPC protected route authorization review**
  - Current router surface is public-only example routes (`packages/app/src/server/api/routers/post.ts`).
  - No protected procedures/routes are currently implemented; therefore no protected-route auth bypass was identified in existing routes.
  - Follow-up required when Pro-mode server APIs are added: define and enforce auth middleware for all non-public procedures.

## Risk Notes

- Free mode necessarily sends user-owned keys in outbound provider auth headers; this is expected for direct-from-browser architecture.
- Before shipping Pro mode, add authenticated `protectedProcedure` middleware and explicit tests asserting unauthorized access is rejected.
