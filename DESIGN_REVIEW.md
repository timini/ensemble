# Ensemble AI - Comprehensive Design Review

**Date**: 2026-02-14
**Reviewed by**: Claude Code (Opus 4.6) with specialised code-explorer and code-reviewer agents
**Site**: https://ensemble-app--ensemble-ai-prod.us-central1.hosted.app
**Pages reviewed**: Home, Config, Ensemble, Prompt, Review, Features, About

---

## Executive Summary

Ensemble AI demonstrates solid engineering fundamentals with a well-structured component library, consistent design token system, and a clear 4-step workflow. However, there are several UX, information hierarchy, and design issues that, if addressed, would significantly improve the user experience — particularly around mobile responsiveness, navigation clarity, content hierarchy on marketing pages, and workflow continuity.

**Overall Grade**: B+
- Design system consistency: A
- Information hierarchy: B
- Mobile responsiveness: C+
- Navigation & wayfinding: B-
- Content & copy: B+
- Accessibility: B+

---

## 1. Global Navigation & Header

### Current State
The `EnsembleHeader` is minimal: brand name + tagline on the left, "Features" and "About" links + settings gear on the right.

### Issues

#### 1.1 No Link to the Main App Workflow (Severity: High)
The header only links to Features and About. There is **no way to get back to the main workflow** (Config/Ensemble/Prompt/Review) from the Features or About pages without using the browser back button.

**Recommendation**: Add a "Get Started" or "Try It" CTA button in the header that navigates to `/config`. The brand name ("Ensemble AI") should also be a clickable link back to the home/config page.

#### 1.2 Active State Missing on Navigation Links (Severity: Medium)
The Features and About links have hover states but no active/current state indicator. When on `/features`, the Features link looks the same as on any other page.

**Recommendation**: Add an `aria-current="page"` attribute and visual indicator (underline, bold, or different colour) for the current page's nav link.

#### 1.3 Header is Not Semantic `<header>` Element (Severity: Low)
The header uses `<div>` rather than the semantic `<header>` element, which slightly hurts accessibility and SEO.

**Recommendation**: Change the outer `<div>` to `<header>` and use `<nav>` for the navigation links.

#### 1.4 No Mobile Hamburger Menu (Severity: High)
On small screens, the header elements will likely collide or become cramped. There's no responsive hamburger/drawer menu.

**Recommendation**: Add a mobile menu that collapses nav links and settings into a hamburger menu below `md` breakpoint.

---

## 2. Progress Stepper (Workflow Pages)

### Current State
A 4-step progress indicator (circles with numbers, connected by lines) appears at the top of Config, Ensemble, Prompt, and Review pages.

### Issues

#### 2.1 Steps Are Not Clickable (Severity: High)
Completed steps show a checkmark but are not clickable. Users cannot navigate backward by clicking on a previous step — they must use the "Back" button at the bottom of each page.

**Recommendation**: Make completed (and current) step indicators clickable, navigating the user to that step. This is a standard pattern users expect from step indicators.

#### 2.2 Step Labels Can Truncate (Severity: Medium)
Each label is constrained to `w-12` (48px), which is fine for short labels like "Config" but may clip longer translated labels (e.g., French "Configurer" fits, but "Sélectionner l'ensemble" would not fit in a 48px width).

**Recommendation**: Allow labels to be flexible width, or truncate with an ellipsis and provide a tooltip. Consider using responsive text sizes.

#### 2.3 No Contextual Help (Severity: Low)
The stepper doesn't indicate what each step involves beyond the label. New users seeing "Ensemble" may not understand what that step entails.

**Recommendation**: Add tooltips on hover explaining what each step does (e.g., "Select 2-6 AI models to compare").

---

## 3. Config Page (`/config`)

### Current State
Step 1 of the workflow. Users choose between Free Mode (BYOK) and Pro Mode (coming soon), then enter API keys if Free Mode is selected.

### Issues

#### 3.1 Mode Cards Not Responsive (Severity: High)
The `ModeSelector` uses a fixed `grid-cols-2` layout with no responsive breakpoint. On mobile, the two cards will be too narrow to read properly.

**Recommendation**: Change to `grid-cols-1 md:grid-cols-2` so cards stack on mobile.

#### 3.2 Pro Mode Card is a Dead End (Severity: Medium)
The Pro Mode card shows "Coming Soon" but is still rendered as a full card with a disabled button. This takes up 50% of the visual space for something users cannot interact with.

**Recommendation**: Either:
- Make the Pro Mode card visually smaller/dimmer with a "Notify Me" email capture instead of a disabled button
- Or collapse it to a single line below the Free Mode card: "Pro Mode coming soon — managed access with credits."

#### 3.3 API Key Section Appears Abruptly (Severity: Low)
When Free Mode is selected, the API key configuration section appears below without any transition or visual cue connecting the mode selection to the key entry.

**Recommendation**: Add a subtle slide-down animation or a visual connector (arrow/line) between the mode selector and API key section. Consider an explanatory sentence like "Great choice! Enter at least one API key to get started."

#### 3.4 Security Reassurance is Buried (Severity: Medium)
The "Your keys are stored locally and never sent to our servers" message is shown per-input field, which is good but repetitive. The WebCrypto/AES-256 encryption details are not visible unless users select Free Mode.

**Recommendation**: Show a consolidated security badge/banner near the mode selector that's always visible — something like a shield icon with "AES-256 encrypted, browser-only storage" that builds trust before users start entering keys.

---

## 4. Ensemble Page (`/ensemble`)

### Current State
Step 2. Users select 2-6 AI models from 4 providers. A sidebar shows the selection summary.

### Issues

#### 4.1 Duplicate Continue Buttons (Severity: High)
The page has **two** "Continue" buttons:
1. Inside the `EnsembleSidebar` component
2. In the `WorkflowNavigator` at the bottom

Both call the same handler and have the same disabled state. This is confusing and wastes space.

**Recommendation**: Remove the continue button from the sidebar. Keep the `WorkflowNavigator` at the bottom for consistency with all other workflow pages. The sidebar should be informational only.

#### 4.2 Sidebar Ordering on Mobile (Severity: High)
On mobile, the grid collapses to single column. The sidebar (which is secondary information) appears **after** the model list, meaning on a long page users have to scroll past all models to see their selection summary.

**Recommendation**: On mobile, either:
- Move the sidebar above the model list (using CSS `order`)
- Or convert the sidebar to a sticky bottom sheet/floating summary bar on mobile showing "X models selected" with a "View Summary" expand action

#### 4.3 Provider Sections Lack Visual Hierarchy (Severity: Medium)
All 4 provider sections (OpenAI, Anthropic, Google, xAI) are presented with equal visual weight. There's no visual distinction between providers that have API keys configured vs. those that don't.

**Recommendation**:
- Add a subtle green checkmark or "configured" badge next to providers with valid API keys
- Grey out or add an "API key required" overlay for unconfigured providers
- Consider collapsing unconfigured providers by default

#### 4.4 Max Selection Limit Not Clearly Communicated (Severity: Low)
The page says "Select 2-6 AI models" in the description but doesn't show a counter or progress toward the limit.

**Recommendation**: Add a visible counter near the model list: "3 of 6 models selected" with a progress indicator.

---

## 5. Prompt Page (`/prompt`)

### Current State
Step 3. Users enter their prompt, see the ensemble configuration summary, and submit.

### Issues

#### 5.1 Page Width Inconsistency (Severity: Medium)
The Prompt page uses `max-w-4xl` while Config, Ensemble, and Review all use `max-w-6xl`. This creates a visible narrowing when transitioning from Ensemble to Prompt, then widening again on Review.

**Recommendation**: Standardise to `max-w-6xl` across all workflow pages, or use `max-w-4xl` consistently for the content area within a `max-w-6xl` outer container.

#### 5.2 Prompt Input is Below the Fold (Severity: High)
The page renders in this order:
1. Progress Steps
2. Page Hero (title + description)
3. Ensemble Configuration Summary (can be tall)
4. Manual Responses Preview (if any)
5. **Prompt Input** (the primary action)
6. Prompt Tips

The actual prompt input — the most important element on this page — is pushed below the fold by the summary and preview sections.

**Recommendation**: Reorder to put the prompt input **first** (or at least above the configuration summary):
1. Progress Steps
2. Page Hero
3. Prompt Input (primary action)
4. Prompt Tips (collapsible, below input)
5. Ensemble Configuration Summary (collapsible, secondary info)

#### 5.3 Keyboard Shortcut Hint Placement (Severity: Low)
The "Cmd+Enter to submit" hint is good, but it's shown as part of the label/input area. Users who aren't keyboard-savvy may not understand it.

**Recommendation**: Show the hint as subtle helper text below the textarea, or as a floating badge in the bottom-right corner of the textarea.

---

## 6. Review Page (`/review`)

### Current State
Step 4. Shows the submitted prompt, consensus analysis, agreement metrics, and individual model responses.

### Issues

#### 6.1 Three Separate Action Buttons with Mixed Patterns (Severity: Medium)
The page footer has three buttons implemented two different ways:
- `WorkflowNavigator` renders "Back to Prompt" and "Start Over"
- A standalone `<button>` renders "New Comparison"

This creates visual inconsistency (the standalone button uses a different styling approach).

**Recommendation**: Either add `newComparison` as a third action in `WorkflowNavigator`, or use three consistently styled `Button` components from the design system.

#### 6.2 Empty State is Generic (Severity: Medium)
When no responses have been generated yet, the page shows a plain grey box with "No responses generated yet." This doesn't tell users what to do.

**Recommendation**: Replace with a more informative empty state:
- Add an illustration or icon
- Explain: "Responses will appear here as models complete. Go back to submit a prompt."
- Include a CTA button to go back to the Prompt page

#### 6.3 Response Cards Default to Collapsed (Severity: Low)
Individual response cards are collapsed by default. Users need to expand each one to read the actual responses.

**Recommendation**: Auto-expand the first 2-3 response cards so users immediately see content. Keep the rest collapsed with a "Show all responses" link.

#### 6.4 No Loading Skeleton (Severity: Low)
While responses are streaming, there's no skeleton/placeholder for cards that haven't started streaming yet.

**Recommendation**: Show skeleton cards for all expected models, then replace with real content as streaming begins. This sets expectations about how many responses will arrive.

---

## 7. Features Page (`/features`)

### Current State
A marketing/informational page showcasing Ensemble AI's differentiators, capabilities, workflow, modes, models, and security.

### Issues

#### 7.1 Information Overload — Too Many Sections (Severity: High)
The page has **7 distinct sections** stacked vertically:
1. Hero
2. Differentiators (3 cards)
3. Capabilities (4 metric cards)
4. How It Works (4 step cards)
5. Modes (2 cards)
6. Models (provider list)
7. Security (feature list)

This creates an extremely long page with no clear visual hierarchy distinguishing primary from secondary information.

**Recommendation**:
- Consolidate sections: merge "Modes" and "Models" into a single "How It Works" section
- Add a sticky table-of-contents or section navigation on the side
- Use visual variation (background colours, full-width sections) to break up the monotony
- Consider making Security and Models collapsible/accordions

#### 7.2 No Primary CTA (Severity: High)
The only CTA on the entire features page is a small text link to the About page at the very bottom. There is **no "Get Started" or "Try It Now" button** anywhere on the page.

**Recommendation**: Add prominent CTAs:
- After the Hero section: "Get Started Free" button
- After the "How It Works" section: "Try It Now" button
- Sticky footer CTA on mobile

#### 7.3 Capability Numbers Lack Context (Severity: Medium)
The capability cards show impressive numbers ("12+", "<100ms", "AES-256", "Zero") but some lack intuitive meaning:
- "Zero Lock-in" — what does this mean to a non-technical user?
- "<100ms Streaming" — compared to what?

**Recommendation**: Add brief comparisons or explanations: "Zero lock-in: use your own API keys, switch providers anytime" or "<100ms: responses start appearing almost instantly."

#### 7.4 "Military-Grade Encryption" Phrasing (Severity: Low)
The security section uses "Military-grade encryption" which is a commonly criticised marketing term that can undermine trust with technical users.

**Recommendation**: Replace with more specific, credible language: "Industry-standard AES-256-GCM encryption" or "Bank-grade encryption standards."

---

## 8. About Page (`/about`)

### Current State
Educational page explaining the ensemble concept, the research behind it, and linking to academic papers.

### Issues

#### 8.1 No Visual Engagement (Severity: Medium)
The page is entirely text-based with card containers. There are no diagrams, illustrations, or visual explanations of how ensembles work.

**Recommendation**: Add:
- A simple diagram showing multiple models receiving the same prompt and converging on a consensus
- An infographic showing the accuracy improvements from the cited research
- Provider logos to visually reinforce which models are supported

#### 8.2 Research Papers Section Could Be More Scannable (Severity: Low)
The papers are in card format which is good, but the venue badge + authors + title + finding creates a lot of text per card.

**Recommendation**: Lead with the **key finding** (the most compelling info) and put the paper title/authors in secondary position. Users care about results, not paper titles.

#### 8.3 Missing CTA to Try the Product (Severity: Medium)
Like the Features page, the About page only links to Features at the bottom. There's no "Try it yourself" CTA.

**Recommendation**: Add a "See It in Action" or "Try Ensemble AI" CTA that links to `/config`.

---

## 9. Cross-Cutting Issues

### 9.1 No Footer (Severity: Medium)
The site has no footer on any page. Footers typically contain:
- Links to all pages
- Legal links (Terms, Privacy)
- Social media / GitHub links
- Contact information

**Recommendation**: Add a minimal footer with page links and legal information.

### 9.2 No 404 Page (Severity: Low)
Navigating to an invalid route likely shows a default Next.js 404 page rather than a branded one.

**Recommendation**: Create a custom 404 page matching the site's design system.

### 9.3 No Loading State on Initial Page Load (Severity: Medium)
The home page (`/`) shows `t('common.loading')` text during the brief redirect to `/config`. This appears as a flash of content.

**Recommendation**: Either:
- Use Next.js middleware to redirect `/` to `/config` server-side (no flash)
- Or add a branded loading spinner instead of plain text

### 9.4 `dangerouslySetInnerHTML` in Layout (Severity: Medium — Code Quality)
The root layout uses an inline `<script>` with `dangerouslySetInnerHTML` to clear stale review state. This is a code smell that could be replaced with a cleaner React effect.

**Recommendation**: Move the stale state clearing logic into the Review page's `useEffect` or a custom hook, rather than having it in the root layout's raw HTML.

### 9.5 Inconsistent Content Width (Severity: Medium)
- Config, Ensemble, Review: `max-w-6xl` (1152px)
- Prompt, Features, About: `max-w-4xl` (896px)

**Recommendation**: Standardise. Use `max-w-6xl` for all workflow pages and `max-w-4xl` for content/marketing pages, or use a consistent approach throughout.

---

## 10. Accessibility Audit Summary

### Strengths
- Semantic heading hierarchy (h2 > h3 > h4) across all pages
- ARIA labels on icon buttons (settings gear)
- Proper use of `role="alert"` on inline alerts
- Focus-visible rings with primary colour
- Dark mode with proper colour contrast

### Areas for Improvement
- Header should use `<header>` and `<nav>` elements
- Step circles in ProgressSteps should be buttons with `role="link"` if made clickable
- Response cards during streaming should have `aria-live="polite"` for screen readers
- Skip navigation link is missing ("Skip to main content")
- Some colour-only status indicators (agreement analysis) need text alternatives

---

## 11. Design System Consistency

### Strengths
- Cohesive colour palette (indigo primary, semantic state colours)
- Consistent card-based layout pattern
- Uniform spacing (8px grid system)
- Well-structured component library with atoms/molecules/organisms
- Both light and dark mode supported via CSS custom properties

### Inconsistencies Found
- Button styles: Some pages use the `Button` component, others use raw `<button>` elements (Review page line 226-229)
- Card padding: Most use `p-6` but some sections have inconsistent inner padding
- Section spacing: Features page uses `mt-16` between sections while About uses `mt-8` and `mt-12`
- Typography: Some headings use the `Heading` component while others use raw `<h3>` elements

---

## 12. Prioritised Recommendations

### P0 — Fix Before Launch
1. **Add primary CTA to Features page** — users can't easily start using the product from the marketing page
2. **Make header brand name clickable** — basic navigation expectation
3. **Fix mobile responsiveness** — ModeSelector grid, Ensemble sidebar ordering, header collapse
4. **Remove duplicate continue button** on Ensemble page

### P1 — Fix Soon After Launch
5. **Make progress steps clickable** for easier navigation
6. **Reorder Prompt page** — put the prompt input above the configuration summary
7. **Add a site footer** with navigation links
8. **Standardise page widths** across workflow pages
9. **Improve empty states** with illustrations and helpful CTAs

### P2 — Polish
10. **Add active state to nav links**
11. **Improve Features page information hierarchy** — consolidate sections, add visual variety
12. **Add visual content to About page** — diagrams, infographics
13. **Fix action button consistency** on Review page
14. **Add loading skeletons** for streaming responses
15. **Replace "military-grade encryption" wording**

### P3 — Nice to Have
16. Add tooltips to progress steps
17. Add skip navigation link
18. Create custom 404 page
19. Add model selection counter on Ensemble page
20. Auto-expand first few response cards on Review page

---

*Report generated by Claude Code with code-explorer and code-reviewer agents analysing the full codebase and live site content.*
