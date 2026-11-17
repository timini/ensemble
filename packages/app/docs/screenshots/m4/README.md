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
| `app-config` | App `/config`, mock mode | Today's wizard in the new tokens |
| `app-review` | App `/review`, mock mode | Today's review page in the new tokens |
| `cl-empty` | Storybook `Organisms/AppShell/WorkspaceEmpty` | First visit: composer alone |
| `cl-running` | Storybook `Organisms/AppShell/WorkspaceRunning` | Answers streaming, agreement and consensus waiting |
| `cl-workspace` | Storybook `Organisms/AppShell/WorkspaceDone` | Finished run built from the component library |
| `cl-method` | Same, method menu open (375 and 1440 px) | Consensus methods with calls, cost and summarizer |
| `cl-models` | Same, model picker open (375 and 1440 px) | Inline model picker |
| `cl-history` | Same, history open at 375 px | History and presets in a bottom sheet |

The `app-*` captures show the existing pages restyled by the token change only. The `cl-*` captures show the workspace components in Storybook with sample data, before the app is wired to them.
