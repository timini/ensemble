# @ensemble-ai/shared-utils

Shared utilities for Ensemble AI application.

## Overview

This package contains domain utilities used across the Ensemble AI monorepo. These are **non-UI utilities** - UI-specific utilities remain in `@ensemble-ai/component-library`.

## Modules

### Similarity (`similarity/`)

Cosine similarity calculations for AI response agreement analysis.

**Functions:**
- `cosineSimilarity(vectorA, vectorB)` - Calculate cosine similarity between two embedding vectors (-1 to 1)
- `similarityMatrix(vectors)` - Generate pairwise similarity matrix for multiple vectors
- `agreementStatistics(similarities)` - Calculate mean, median, min, max, stddev from similarity scores

**Usage:**
```typescript
import { cosineSimilarity, similarityMatrix, agreementStatistics } from '@ensemble-ai/shared-utils/similarity';

// Compare two embeddings
const similarity = cosineSimilarity([1, 2, 3], [2, 3, 4]);

// Generate matrix for multiple responses
const embeddings = [embedding1, embedding2, embedding3];
const matrix = similarityMatrix(embeddings);

// Calculate agreement statistics
const scores = [0.85, 0.92, 0.78];
const stats = agreementStatistics(scores); // { mean, median, min, max, stddev }
```

### Crypto (Future - Phase 3)

Client-side encryption for API keys using Web Crypto API (AES-256).

### Embeddings (Future - Phase 3)

Utilities for generating embeddings from AI model responses.

### Streaming (Future - Phase 2-3)

Utilities for handling streaming responses from AI providers.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type checking
npm run typecheck

# Build
npm run build

# Lint
npm run lint
```

## Testing

All utilities include comprehensive unit tests with 100% coverage.

- **Test Framework**: Vitest
- **Coverage Requirement**: 80%+ (currently 100%)
- **Test Location**: `src/**/*.test.ts`

## License

Private - All rights reserved
