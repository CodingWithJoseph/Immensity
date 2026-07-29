# Immensity UI System

## Status and scope

This document is the source of truth for UI standardization work in Immensity. It defines the target rules and rollout order; it does not imply that every current screen already conforms.

Standardization begins with Manage > Pipeline. Do not apply these rules broadly to Portfolio, Monitor, Build, Dashboard, Market, or another feature until the rollout reaches that phase.

When implementation and this document disagree, record the discrepancy and resolve it deliberately. Do not invent a new local rule, semantic color, component variant, or exception during an unrelated change.

## Change discipline

- Keep each standardization pull request limited to its named phase and feature.
- Document an intentional rule before applying it across features.
- Reuse an approved shared component when it fits; do not create a second shared primitive for the same role.
- Do not make a component global merely because it is used twice in one feature.
- Do not mix documentation, shared-component refactors, and broad feature adoption in one pass.
- Preserve product behavior while standardizing presentation unless behavior changes are explicitly approved.
- List exceptions in the pull request instead of silently establishing a competing pattern.

## Color semantics

| Color | Meaning |
| --- | --- |
| Blue | Process, progress, informational, or in motion |
| Green | Verified, successful, healthy, live, or complete |
| Amber | Needs attention, incomplete setup, or caution |
| Red | Error, blocked, danger, or at risk |
| Gray/taupe | Neutral, inactive, metadata, and default chips |
| Orange | Immensity brand accent and primary action accent only |

Never rely on color alone. Pair semantic color with a text label, count, status, or recognizable icon.

Do not use orange as a general status color. Do not use green for ordinary motion or blue for verified success merely because either color is already nearby.

Semantic chip colors are approved for Manage > Pipeline only under the scoped mapping below. This approval does not extend to Portfolio, Monitor, Build, Dashboard, Market, or another feature.

## Chip and badge system

Use one centralized Chip component for compact labels, counts, and metadata. Status-specific wrappers may map known states to the Chip API, but should not duplicate chip geometry or styling.

Pipeline card rules for the current rollout:

- Show Issues and Kill criteria as separate chips.
- Do not show category or taxonomy chips.
- Pass explicit tones from Pipeline-specific mappings; the base Chip never infers tone from label text.
- Keep labels concise and understandable; do not rely on an icon or color alone.
- Use one consistent chip radius.

The controlled tone API is:

- neutral
- info
- success
- warning
- danger
- muted

The base Chip defaults to neutral. A shared consumer must opt into a tone explicitly, and introducing Pipeline tones must not recolor existing consumers in other features.

Chip component architecture:

- `Chip` is the low-level visual primitive for geometry and tone classes.
- `SemanticChip` renders a typed chip definition and is reused by feature chip wrappers.
- `StatusChip` and `HealthChip` remain the typed public wrappers for their respective sets.
- Pipeline issue, kill-criteria, counter, and stale-state chips use centralized definitions; feature components do not pass local tone strings.

Pipeline and approved Portfolio status/health chips use the opt-in filled appearance: no border, semantic tinted background, semibold text, and a line height that preserves descenders. Chip text uses the darker readable value from the same color family in light mode and the approved higher-contrast value from that family in dark mode. Neutral and muted chips use gray/taupe text.

### Pipeline semantic chips and section headers

This subsection applies only to Manage > Pipeline.
The detailed color and component mapping is governed by [Immensity Color Mapping Reference](./immensity-color-mapping-reference.md).

Pipeline card chips:

- Issues: zero is neutral; one or more open issues is warning. Use danger only when supported severity data says an issue is critical or blocking.
- Kill criteria: zero is warning because stop conditions are missing; one or more is neutral. Use danger only when supported data says a criterion triggered or failed.
- Post metadata remains neutral.
- Issue and kill-criteria labels, counts, configured/missing states, and supported critical/triggered states belong to the centralized Issues chip set.

Pipeline lifecycle status:

- Watching and Building are info.
- Live and Launched are success.
- Paused is warning.
- Retired, Removed, and Archived are muted.
- Blocked and At risk are danger only when those states exist in supported data.

Pipeline drawer counters use the same rules as cards:

- Current issues: zero is neutral; one or more is warning.
- Kill criteria: zero is warning; one or more is neutral.
- Do not infer critical, blocking, triggered, or failed state from a count.

Pipeline drawer status treatments:

- Monitoring setup: Connected is success, Not connected is warning when setup is expected, and Planned is muted.
- Health summary: Healthy/live/connected is success; missing data needing attention is warning; silent, failed, at risk, or critical is danger; No prior is muted.
- Normal metric labels use muted text and metric values use primary ink.

Pipeline section headers:

- Use the shared Pipeline section-header pattern rather than local title classes.
- Keep title text Primary Ink and semibold; do not color full section titles.
- Put semantic meaning in counter chips, status chips, icons, dots, progress bars, or actions.
- Keep one consistent title size, tracking treatment, and header alignment across Overview, Readiness, Monitoring setup, Health summary, Kill criteria, and Current issues.

## Button system

The shared button system should support these intentional variants:

- **Primary:** the main action in a group; uses the approved orange primary-action token.
- **Secondary:** a standard non-destructive action with restrained emphasis.
- **Ghost:** a low-emphasis action on a clear surface; use sparingly.
- **Outline:** an action that needs a visible subtle full border without primary emphasis.
- **Danger/destructive:** removal or another destructive action; pair red semantics with explicit action text.

Button rules:

- Use medium radius.
- Use subtle full borders where appropriate for the variant.
- Provide a visible keyboard focus state using global focus tokens.
- Preserve disabled, loading, hover, and focus behavior.
- Keep button sizes aligned within the same action group unless hierarchy requires an intentional difference.
- Do not use pill buttons unless the design is explicitly approved for that control.
- Do not recreate button variants with repeated one-off class strings.

### Pipeline action layout

- Each card or detail surface exposes at most one state-appropriate primary action; do not force a primary button when the compact Actions menu is clearer.
- Put navigation, reversible state changes, and less-frequent actions in one compact Actions menu.
- Do not render every available lifecycle transition as a separate footer button.
- Keep removal behind a clearly labeled confirmation.
- Do not present Sunset, Retire, Remove from Pipeline, and Remove from Portfolio as competing actions.
- Preserve existing backend lifecycle semantics while the action vocabulary is consolidated separately.

Current Pipeline presentation:

- Watching: use the compact Actions menu; do not expose a redundant **Move to Building** action.
- Building: **Continue Building** is primary; **Mark launched** is in Actions.
- Launched: use the compact Actions menu; **Open in Monitor**, pause/resume, and removal are menu actions.
- Existing `sunsetting` and `retired` states remain readable and may be reopened, but the Pipeline drawer does not offer new Sunset or Retire transitions.
- The existing removal request is presented as **Remove project/product** because it sets `removed_at` and retains source data. Do not present it as permanent deletion until final-deletion behavior is explicitly defined.

## Progress bar system

Use a centralized ProgressBar component with numeric value and maximum inputs.

- The component owns the standard height, track, fill, radius, clamping, and accessibility attributes.
- Use medium radius, never pill radius.
- Use global color and surface tokens.
- Labels and numeric values remain outside the bar when shown.
- A compact size may exist only as an explicit centralized variant, not as local height overrides.
- Color must describe the meaning of the measure, not merely the Pipeline column.

Pipeline card progress remains green for now as a temporary, Pipeline-specific rule. Do not generalize that exception to other progress bars.

Pipeline readiness may show only metrics that are genuinely tracked:

- Breakdown verified
- Tasks verified

Do not show unsupported readiness rows:

- Tasks built
- Verified problem-task pairs

Do not label simple record counts as “verified” unless the data source provides an actual verification signal. If verification cannot be established, stop and resolve the data contract before implementing the row.

## Border hierarchy

- Parent surfaces may use subtle full borders. This includes cards, panels, empty states, and drawer containers.
- Major sections may be separated by a single horizontal divider.
- Items inside the same section should not use individual bottom borders by default.
- Separate rows within a section through spacing, label/value alignment, typography, and explicit status text.
- Per-row borders are reserved for intentional table or list patterns that need scan-line separation; document that exception before using it.
- Pipeline drawer sections use section dividers only, not row dividers.
- Form controls use bottom-border styling where appropriate.
- Buttons use subtle full borders where their variant calls for a visible control boundary.
- Alerts and destructive confirmations may use a semantic full border when the distinction is intentional.
- Avoid mixing dashed, full, and bottom borders without a documented purpose.

## Radius rules

- Use medium radius for cards, panels, buttons, empty states, drawers, form surfaces, and progress bars.
- Chip and badge radius must be consistent across the feature.
- Pill radius is reserved for intentionally approved chips, badges, or tags.
- Do not use pill radius for buttons or progress bars.
- Avatar circles are an identity treatment and are not governed by the pill-control restriction.

## Drawer and detail panel pattern

Detail panels should feel compact and scannable.

- Use compact overview rows with the label on the left and value on the right.
- Separate major sections with a single divider; keep rows inside each section unbordered.
- Show **Last updated**, not **Last event**.
- Last updated must use the entity update timestamp, not a monitoring-event or last-seen timestamp.
- Do not include a person's name inside Last updated.
- Show Owner and Team identity separately using the approved identity pattern.
- Avoid repeating the same status in both the header and overview unless there is a documented reason.
- Avoid distributing sections across the full drawer height when that creates excessive vertical gaps.
- Avoid nested cards inside normal drawer sections; use section separators and rows.

Lifecycle content:

- Watching and Building show projected launch information and Readiness.
- Launched shows launched information, Monitoring setup, and Health summary.
- Destructive confirmation areas remain visually clear without overpowering the rest of the drawer.

A shared Drawer or Sheet should be created only after existing side-panel patterns are inventoried and its ownership is agreed.

## Card pattern

Pipeline cards use this target pattern:

- Parent card has a subtle full border and medium radius.
- Content stays minimal and immediately scannable.
- Do not add category chips yet.
- Show only separate Issues and Kill criteria chips.
- Show avatar/profile identity with the updated timestamp below the chips.
- Use the actual owner or updater identity when available; the signed-in viewer is not automatically the owner.
- Keep the progress bar minimal and do not add readiness rows to cards.
- Avoid duplicate kill-criteria content, redundant instructions, and decorative metadata.
- Interactive cards must provide an accessible keyboard interaction pattern.

Do not introduce a global Card component until current card patterns have been inventoried and a genuinely shared API is clear.

## Empty state pattern

- Use a subtle full border and medium radius.
- Use simple, accurate, action-oriented copy.
- Keep lifecycle and navigation language aligned with the current product.
- Empty-state actions use the shared button system and medium radius.
- Do not use oversized pill buttons.
- Reuse or extend the approved empty-state primitive instead of adding a duplicate.

## Avatar and user identity pattern

- Use the approved shared avatar/user component.
- Show the avatar image when one is available.
- Otherwise use the standard person icon; use the approved team icon for team identity.
- Avoid random initials or unrelated fallback icons unless initials are intentionally standardized later.
- Keep avatar sizing consistent within each context.
- Keep Last updated separate from Owner or Team attribution.
- Do not represent the current signed-in viewer as the entity owner or updater without supporting data.

## Implementation phases

### Phase 1: Audit and documentation only

Scope of this phase:

- Capture the approved rules in this document.
- Record known discrepancies and data-contract questions.
- Confirm Pipeline-first rollout boundaries.
- Make no UI implementation, shared-component refactor, or cross-feature adoption changes.

Exit gate: the rules, exceptions, terminology, and rollout order are reviewed and accepted.

### Phase 2: Standardize shared components where safe

- Inventory existing Button, Chip, avatar/identity, empty-state, progress, card, and side-panel patterns.
- Decide which primitives are genuinely shared and which should remain feature-local.
- Reconcile duplicate primitives before creating new ones.
- Define variant names, focus behavior, tokens, radius, and accessibility contracts.
- Apply changes only where behavior and ownership are clear.

Exit gate: shared APIs are reviewed, tested, and ready for controlled adoption. No broad feature restyling is included.

### Phase 3: Apply the system to Pipeline only

- Update Pipeline cards, detail drawer, actions, progress, chips, identity, empty states, borders, and spacing.
- Resolve readiness tracking before presenting a metric as verified.
- Verify lifecycle-specific content for Watching, Building, and Launched.
- Apply the approved Pipeline-only semantic chip mapping through explicit tones.
- Validate keyboard behavior, focus states, loading/empty states, and representative viewport sizes.

Exit gate: Pipeline is stable, visually consistent, and accepted as the reference implementation.

### Phase 4: Apply to Portfolio

- Audit Portfolio against the stable Pipeline reference.
- Identify legitimate Portfolio-specific exceptions before implementation.
- Adopt shared primitives incrementally without changing Portfolio behavior.
- Keep the Portfolio work in its own pull requests.

Exit gate: Portfolio adoption is stable and documented without weakening Pipeline rules.

### Phase 5: Apply to remaining features later

Apply the reviewed system incrementally to Monitor, Build, Dashboard, Market, and other features.

Each feature starts with an audit, records exceptions, and receives a separate implementation scope. Do not perform a repository-wide styling sweep.

## Pull request checklist

Before a UI-standardization pull request is opened:

- Confirm the active phase and named feature.
- Read this document and identify any proposed exception.
- List every changed file and explain why it belongs in scope.
- Confirm no unrelated feature was restyled.
- Confirm colors use global tokens and match their documented meaning.
- Confirm state is communicated with text, count, status, or icon in addition to color.
- Confirm Pipeline chips follow the explicit Pipeline-only mapping and no other feature was recolored implicitly.
- Confirm buttons, borders, radius, identity, progress, and empty states use the approved pattern.
- Confirm documentation is not claiming an implementation that does not yet exist.
