# M4 screenshots

Captured for review of the M4 wireframes and visual refresh, at 375, 768 and 1440 px in light and dark. File names are `<screen>-<width>-<theme>.png`. Images are viewport only and reduced to 256 colours to keep them small.

| Prefix | Source | Screen |
|--------|--------|--------|
| `wf-landing` | Wireframes `/` | Landing page |
| `wf-onboarding` | Wireframes `/workspace?state=new` | First run onboarding sheet |
| `wf-workspace` | Wireframes `/workspace` | Finished run: composer, agreement, consensus, answers |
| `wf-running` | Wireframes `/workspace?state=running` | Answers streaming |
| `wf-method` | Wireframes `/workspace?menu=method` | Consensus method dropdown with calls and cost |
| `wf-settings` | Wireframes `/workspace?sheet=settings` | Settings sheet |
| `app-empty` | App `/workspace`, mock mode, no key yet | First visit: heading, composer, setup card |
| `app-ready` | Same, after adding keys | Example questions under the composer |
| `app-models` | Same, picker open | Inline model picker, models of providers with a working key |
| `app-method` | Same, method menu open | Calls and cost of each method before asking, summarizer choice |
| `app-running` | Same, about a second after asking | Answers streaming. Below 1024 px one status row stands in for the agreement and consensus cards until every answer is in |
| `app-done` | Same, finished run | Agreement score and pairs, consensus with cost, answers |
| `app-settings` | Same, settings open (`/config` lands here) | Keys, endpoints, embeddings, appearance, data |
| `cl-empty` | Storybook `Organisms/AppShell/WorkspaceEmpty` | First visit: composer alone |
| `cl-running` | Storybook `Organisms/AppShell/WorkspaceRunning` | Answers streaming, agreement and consensus waiting |
| `cl-workspace` | Storybook `Organisms/AppShell/WorkspaceDone` | Finished run built from the component library |
| `cl-method` | Same, method menu open (375 and 1440 px) | Consensus methods with calls, cost and summarizer |
| `cl-models` | Same, model picker open (375 and 1440 px) | Inline model picker |
| `cl-history` | Same, history open at 375 px | History and presets in a bottom sheet |
| `landing` | App `/`, mock mode | Landing page with the recorded example run |
| `features` | App `/features` | Features page, top of the page |
| `about` | App `/about` | About page, top of the page |
| `onboarding-key` | App `/workspace`, first visit, a working key typed | Onboarding sheet, own key path, key checked |
| `onboarding-key-invalid` | Same, a key the provider rejects | Onboarding sheet with the key error, Start disabled |
| `onboarding-local` | Same, local models chosen | Onboarding sheet, local path, no server found (mock mode does not detect Ollama) |
| `settings` | App `/workspace`, settings open, no keys | Settings sheet, top |

The `app-*` captures show the app's workspace wired to the store in mock mode, so answers and the consensus are placeholder text and their length is not realistic. The `cl-*` captures show the workspace components in Storybook with sample data, before the app is wired to them.
