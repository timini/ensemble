# UI Implementation Review - Recommended Spec Updates

**Date**: 2025-09-30
**Reviewed**: shadcn/ui wireframe implementation
**Status**: 9 discrepancies found, recommendations below

---

## 1. Add Mock Mode to Config Page (CRITICAL)

**Spec Location**: spec.md FR-011 description
**Issue**: Config page only shows Free Mode and Pro Mode

**Recommended Addition**:

Add to spec.md after line 161 (FR-012):
```markdown
- **FR-011a**: Config page MUST display all three modes with equal visual hierarchy: Mock Mode (test with simulated responses, no API keys required), Free Mode (bring your own API keys with client-side encryption), Pro Mode (pay-as-you-go credit system)
```

**UI Implementation Required**: Add Mock Mode card in config/page.tsx

---

## 2. Add Embeddings Provider Selection UI

**Spec Location**: spec.md FR-022a (line 171)
**Issue**: No embeddings provider dropdown visible in UI

**Recommended Spec Update**:

Update spec.md FR-022a:
```markdown
- **FR-022a**: Embeddings provider selection MUST be available in the Ensemble step via dropdown in the sidebar "Ensemble Summary" section; selection MUST persist with ensemble configuration and display the selected provider name prominently
```

**UI Implementation Required**: Add dropdown to ensemble/page.tsx sidebar

---

## 3. Update Model List in FR-014

**Spec Location**: spec.md line 162
**Issue**: Model list inconsistencies (missing o1 models, wrong Grok models)

**Current Text**:
```markdown
- **FR-014**: System MUST support 4 AI providers: OpenAI (GPT-4o, GPT-4o-mini, o1, o1-mini), Anthropic (Claude 3 Opus/Sonnet/Haiku), Google (Gemini 1.5 Pro/Flash), XAI (Grok-2, Grok-2-mini)
```

**Recommended Update**:
```markdown
- **FR-014**: System MUST support 4 AI providers with the following models: OpenAI (GPT-4o, GPT-4o-mini, o1-preview, o1-mini, GPT-3.5 Turbo), Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku), Google (Gemini 1.5 Pro, Gemini 1.5 Flash), XAI (Grok-2, Grok-2-mini)
```

---

## 4. Update Component Naming in Spec

**Spec Location**: Multiple references to "WorkflowNavigator", "PageHero"
**Issue**: Actual components are named differently and work better

**Recommended Updates**:

Replace in spec.md and tasks.md:
- "WorkflowNavigator" → "ProgressSteps" (better name, keeps stepper semantics)
- "PageHero" → Remove (replaced by inline headers, cleaner UX)
- Keep "ApiKeyInput", "ModelCard", etc. as conceptual names even if implemented inline

**Spec Language Update**:
```markdown
- **FR-008**: System MUST implement a 4-step workflow (Config → Ensemble → Prompt → Review) with visual progress tracking via a stepper component (e.g. ProgressSteps) that highlights the current step, marks completed steps with checkmarks, and displays step names
```

---

## 5. Enhance Preset Feature Description

**Spec Location**: spec.md FR-018 (line 166)
**Issue**: Implementation has 3 presets with rich descriptions, spec only mentions 1

**Current Text**:
```markdown
- **FR-018**: System MUST provide a default "Research Synthesis" preset with GPT-4o, Claude 3 Opus, Gemini 1.5 Pro, GPT-4o as summarizer, and OpenAI as embeddings provider
```

**Recommended Update**:
```markdown
- **FR-018**: System MUST provide 3 curated ensemble presets with descriptions:
  - **Research Synthesis** (default): GPT-4o, Claude 3 Opus, Gemini 1.5 Pro; Summarizer: Claude 3.5 Sonnet; Embeddings: OpenAI. Description: "Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis."
  - **Rapid Drafting**: GPT-4o Mini, Claude 3 Haiku, Gemini 1.5 Flash; Summarizer: GPT-4o Mini; Embeddings: OpenAI. Description: "Fast, budget-friendly models tuned for quick ideation and iteration."
  - **Balanced Perspective**: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro; Summarizer: GPT-4o; Embeddings: Anthropic. Description: "Balanced trio for contrasting opinions and concise summaries."
```

---

## 6. Add Response Time Tracking Requirement

**Spec Location**: Add new FR-060 after FR-059
**Issue**: Response time visible in UI but not in spec

**Recommended Addition**:
```markdown
- **FR-060**: System SHOULD display response time in milliseconds for each model response in the Review step to help users understand relative performance characteristics across providers and models
```

---

## 7. Clarify Share Feature Timeline

**Spec Location**: spec.md FR-042 (line 195)
**Issue**: Share button visible in Phase 2 wireframes but spec says Phase 4 only

**Current Text**:
```markdown
- **FR-042**: Users MUST be able to share ensemble results via a public URL
```

**Recommended Update**:
```markdown
- **FR-042**: Users MUST be able to share ensemble results via a public URL (Phase 4 Pro Mode only); Share UI button MAY be present in earlier phases but must display "Pro Mode required" message when clicked
```

---

## 8. Add Tips Card Feature

**Spec Location**: Add new FR-061 in Phase 2 section
**Issue**: Prompt page has excellent "Tips for better prompts" card not mentioned in spec

**Recommended Addition**:
```markdown
- **FR-061**: Prompt step SHOULD display a tips card with best practices for writing effective prompts, including guidance on specificity, context, tone, and iteration
```

---

## 9. Update Entity Definitions for Preset

**Spec Location**: spec.md Key Entities, Preset definition (line 221)
**Issue**: Preset entity doesn't include description field

**Current Text**:
```markdown
- **Preset**: Saved ensemble configuration. Attributes: name, model list, summarizer, embeddings provider, is_default
```

**Recommended Update**:
```markdown
- **Preset**: Saved ensemble configuration. Attributes: name, description (user-visible purpose/use case), model list, summarizer, embeddings provider, is_default, icon (optional emoji)
```

---

## 10. Remove "Missing Tasks" for FR-056, FR-057

**Spec Location**: Analysis report C1 (Coverage Gap)
**Issue**: FR-056 (copy to clipboard) and FR-057 (rating) are already implemented in review page wireframes

**Recommended Action**:
- **FR-056**: ✅ Implemented (Copy icons visible in review/page.tsx line 156, 171)
- **FR-057**: ✅ Implemented (5-star rating visible in review/page.tsx line 176-182)
- Remove these from "missing tasks" list
- Add note to tasks.md: "T189b, T189c: Already implemented in wireframes, verify functionality during Phase 2.3"

---

## 11. Add Theme & i18n Providers to Layout

**Spec Location**: spec.md FR-053, FR-054 (lines 208-209)
**Issue**: layout.tsx missing theme and i18n providers required by Constitution

**Current Implementation**:
```tsx
// layout.tsx only has TRPCReactProvider
<TRPCReactProvider>{children}</TRPCReactProvider>
```

**Recommended Update** (both spec and implementation):

Add to spec.md:
```markdown
- **FR-006a**: Root layout MUST wrap application with theme provider (supporting light/dark modes), i18n provider (supporting EN/FR), and state management provider (Zustand) in addition to API provider (tRPC)
```

Add to tasks.md T024:
```markdown
- [ ] T024 Create src/app/layout.tsx with root layout, ThemeProvider, I18nProvider, TRPCReactProvider, and fonts
```

---

## 12. Update Manual Response Feature Scope

**Spec Location**: spec.md FR-023 (line 172)
**Issue**: Manual response button present but modal not implemented

**Current Text**:
```markdown
- **FR-023**: Users MUST be able to manually add responses (provider name, model name, response text) at two points: (1) during Ensemble step to pre-populate known responses before prompt submission, and (2) on Review page before, during, or after AI streaming to add additional perspectives; manually added responses MUST be included in agreement analysis
```

**Recommended Update**:
```markdown
- **FR-023**: Users MUST be able to manually add responses via a modal form collecting provider name, model name, and response text at two points: (1) "Add Manual Response" button in Ensemble step sidebar to pre-populate known responses before prompt submission, and (2) "Add Manual Response" button on Review page to add perspectives during or after AI streaming; manually added responses MUST be included in agreement analysis with visual indicator distinguishing them from AI-generated responses
```

---

## Summary of Required Actions

### High Priority (Implement Before Phase 1 Complete)
1. ✅ Add Mock Mode card to config/page.tsx
2. ✅ Add embeddings provider dropdown to ensemble/page.tsx sidebar
3. ✅ Fix model list in ensemble/page.tsx (add o1 models, fix Grok names)
4. ✅ Add theme provider, i18n provider to layout.tsx
5. ✅ Implement ManualResponseModal component

### Medium Priority (Update Spec for Phase 2)
6. ✅ Update spec.md FR-014 with complete model list
7. ✅ Update spec.md FR-018 with 3 presets
8. ✅ Update spec.md FR-022a with UI location details
9. ✅ Add FR-060 (response time tracking)
10. ✅ Add FR-061 (prompt tips card)

### Low Priority (Documentation)
11. ✅ Update component names (WorkflowNavigator → ProgressSteps)
12. ✅ Update tasks.md to note FR-056, FR-057 already implemented
13. ✅ Clarify Share feature timeline (FR-042)

---

## Overall Assessment

**UI Quality**: ⭐⭐⭐⭐⭐ (5/5) - Exceptional design, clean implementation, excellent UX decisions

**Spec Alignment**: 🟡 (7/10) - Good foundation but 9 discrepancies need resolution

**Recommendation**: **Update spec to match superior UI implementation** rather than changing UI to match spec in most cases. The UI represents thoughtful UX improvements over the original spec.