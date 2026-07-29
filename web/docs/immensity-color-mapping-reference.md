# Immensity Color Mapping Reference

## Scope

This document defines how Immensity colors map to chips, badges, buttons, section headers, counters, progress indicators, and related UI elements.

Current rollout scope: Manage > Pipeline, plus approved Manage > Portfolio project-status, project-health, and table-trend indicators.

Do not apply these mappings broadly to Portfolio, Monitor, Build, Dashboard, Market, or other features until that feature receives its own reviewed rollout.

---

## Core rule

Color is never automatic.

The base component must not infer semantic color from label text alone.

A component labeled Open, Done, Archived, Issue, Watching, Building, Live, or Kill criteria defaults to neutral unless the consuming feature passes an explicit approved tone.

For Manage > Pipeline, semantic tones are approved and must be passed intentionally through Pipeline-specific mapping helpers or wrappers.

---

## Component roles

| Role                          | Purpose                                                    | Examples                                                | Color behavior                                     |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Chip                          | Compact metadata label, count, or descriptor               | 3 issues, 0 kill criteria, 10 posts                     | Defaults to neutral unless explicit tone is passed |
| Badge                         | Semantic status or type label built on the Chip foundation | Watching, Open, Issue, Live                             | May use explicit feature-approved tone             |
| SectionCounter                | Numeric count beside a section title                       | KILL CRITERIA 0, CURRENT ISSUES 3                       | May use explicit feature-approved tone             |
| SegmentedControl / FilterTabs | View switcher                                              | Open / Done / Archived                                  | Not a chip group; selected state only              |
| Header / Title                | Structural label                                           | Page title, drawer title, section header, column header | Uses Primary Ink by default                        |
| Button                        | Action control                                             | Continue Building, Actions, Remove project              | Uses variant based on action hierarchy and risk    |

---

## Chip geometry

Text chips should be horizontally elongated.

Do not use CSS aspect-ratio as the primary sizing rule for text chips.

Use shared chip geometry:

| Property      | Rule                          |
| ------------- | ----------------------------- |
| Height        | Consistent                    |
| Min-width     | Consistent                    |
| Padding       | Consistent horizontal padding |
| Radius        | Consistent chip radius        |
| Font size     | Consistent                    |
| Font weight   | Bold for Pipeline fills       |
| Line height   | Must preserve descenders      |
| Text behavior | white-space: nowrap           |
| Long text     | Truncate instead of wrapping  |
| Shape         | Wider than tall               |

Count-only chips may be more compact but must use the centralized count-chip variant.

Do not create local chip padding, radius, height, border, or font-size rules inside feature components.

### Filled chip text colors

Filled semantic chips use dedicated chip tokens rather than general-purpose soft surface tokens. Light-mode fills stay visible but are softened enough to avoid a heavy badge feel; dark mode keeps the established deep fills. Text stays in the same color family and uses a readable light-mode value.

| Tone    | Fill token            | Light fill | Text token            | Light text | Dark fill | Dark text |
| ------- | --------------------- | ---------- | --------------------- | ---------- | --------- | --------- |
| neutral | `--chip-neutral-bg`   | #E2D8CC    | `--chip-neutral-text` | #3A342E    | #2D2A27   | #C8BFB4   |
| muted   | `--chip-neutral-bg`   | #E2D8CC    | `--chip-neutral-text` | #3A342E    | #2D2A27   | #C8BFB4   |
| info    | `--chip-info-bg`      | #C8DEF8    | `--chip-info-text`    | #0B437A    | #102A46   | #8AC0FF   |
| success | `--chip-success-bg`   | #B2E8CC    | `--chip-success-text` | #0D5535    | #123425   | #8DFFD0   |
| warning | `--chip-warning-bg`   | #EBC969    | `--chip-warning-text` | #664100    | #3A2D0A   | #FFD666   |
| danger  | `--chip-danger-bg`    | #F5B9B2    | `--chip-danger-text`  | #7D211A    | #3A1717   | #FF8A8A   |

---

## Component tone system

Component tones are not separate color meanings. They are approved ways for components to use the color families.

| Tone    | Color family             | Meaning                                                                                |
| ------- | ------------------------ | -------------------------------------------------------------------------------------- |
| neutral | Gray/taupe + Primary Ink | Default metadata, ordinary counts, non-semantic labels                                 |
| muted   | Gray/taupe               | De-emphasized, inactive, archived, removed, historical, or secondary states            |
| info    | Blue                     | Active workflow, in-progress process, progress, monitoring, review, or in-motion state |
| success | Green                    | Verified, successful, healthy, connected, live, launched, or complete                  |
| warning | Amber                    | Needs attention, incomplete setup, caution, open issue, or missing required setup      |
| danger  | Red                      | Error, blocked, destructive, removal, at risk, failed, critical                        |

Muted is not a separate semantic color. It is a lower-emphasis gray/taupe treatment.

---

# Primary Ink / #1C1C1C

## Semantics

* Default readable UI text
* Informational text
* Structural text
* Section headers
* Column headers
* Major labels
* Neutral button text
* Neutral chip text
* Card titles
* Drawer titles
* Page titles

## Tone usage

Primary Ink is the default readable UI color.

Primary Ink is not a semantic status color.

Primary Ink may appear inside neutral UI elements, including:

* neutral chips
* muted chips, when readable contrast is needed
* secondary buttons
* outline buttons
* ghost buttons
* menu items
* section headers
* card titles
* drawer titles
* metadata labels

## Chip usage

Primary Ink may be used as chip text color for:

| Chip tone | Use                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------- |
| neutral   | Default metadata and ordinary counts                                                           |
| muted     | De-emphasized metadata, inactive states, historical labels                                     |
| info      | Supporting text only if the chip background, border, or accent carries the blue info treatment |

Primary Ink should not be the semantic color for:

| Tone    | Required semantic color |
| ------- | ----------------------- |
| success | Green                   |
| warning | Amber                   |
| danger  | Red                     |

## Button usage

In light mode, default buttons should use Primary Ink unless they require semantic or CTA emphasis.

| Button type          | Treatment                                          |
| -------------------- | -------------------------------------------------- |
| Secondary            | Primary Ink text, neutral border/background        |
| Outline              | Primary Ink text, subtle border                    |
| Ghost                | Primary Ink text, clear or low-emphasis background |
| Menu trigger         | Primary Ink text                                   |
| Normal menu item     | Primary Ink text                                   |
| Close/dismiss button | Neutral at rest; red icon/border hover affordance  |
| Primary CTA          | Orange brand/primary action accent                 |
| Danger action        | Red/danger treatment                               |

Do not make ordinary buttons orange.

Orange is reserved for the main CTA or approved primary action.

## Header / title rule

All headers and titles use Primary Ink by default.

| Header type           | Treatment                                                       |
| --------------------- | --------------------------------------------------------------- |
| Page title            | Primary Ink, bold                                               |
| Drawer title          | Primary Ink, bold                                               |
| Card title            | Primary Ink, semibold                                           |
| Column header         | Primary Ink, semibold                                           |
| Section header        | Primary Ink, semibold                                           |
| Drawer section header | Primary Ink, semibold, uppercase/letter-spaced when appropriate |

Semantic color should not be applied directly to header text by default.

State should be communicated through:

* chips
* badges
* section counters
* icons
* progress bars
* actions

## Rule

Headers tell the user where they are.

Chips, badges, counters, progress bars, and actions communicate state.

Do not create one-off colored section headers.

---

# Blue

## Semantics

* Active workflow
* In-progress process
* Progress
* Monitoring
* Review
* In motion
* Action-guiding state

## Tone

info

## Included chips / badges

| Element      | Condition              | Tone |
| ------------ | ---------------------- | ---- |
| Status badge | Watching               | info |
| Status badge | Building               | info |
| Status badge | Active review state    | info |
| Status badge | Monitoring in progress | info |

## Included buttons / links

| Element                     | Condition                     | Treatment                                 |
| --------------------------- | ----------------------------- | ----------------------------------------- |
| Workflow navigation link    | Opens active workflow surface | Link/info treatment                       |
| Open in Signal              | Workflow navigation           | Link/info or menu item                    |
| Open in Monitor             | Workflow navigation           | Link/info or menu item                    |
| Non-primary workflow action | Not the main CTA              | Secondary/info treatment only if approved |

Primary actions should not become blue if the approved primary action color is orange.

## Included headers / titles

Do not make section title text blue by default.

Allowed only as a small supporting accent, icon, or marker when the section represents active workflow.

| Header           | Treatment                                    |
| ---------------- | -------------------------------------------- |
| Readiness        | Primary Ink title; optional blue icon/accent |
| Monitoring Setup | Primary Ink title; optional blue icon/accent |
| Signals          | Primary Ink title; optional blue icon/accent |
| Timeline         | Primary Ink title; optional blue icon/accent |

## Included progress

| Element                | Condition           | Tone |
| ---------------------- | ------------------- | ---- |
| Readiness progress bar | Partial/in progress | info |
| Timeline progress bar  | Partial/in progress | info |
| Workflow progress      | Not complete        | info |

## Not included

* Ordinary informational text
* Static labels
* Metadata
* Dates
* Owner/team labels
* Descriptions
* Section headers by default
* Counts by default
* Completed success states
* Warnings
* Destructive actions

---

# Green

## Semantics

* Verified
* Successful
* Healthy
* Connected
* Live
* Launched
* Complete

## Tone

success

## Included chips / badges

| Element            | Condition                              | Tone    |
| ------------------ | -------------------------------------- | ------- |
| Status badge       | Live                                   | success |
| Status badge       | Launched                               | success |
| Connection badge   | Connected                              | success |
| Health badge       | Healthy                                | success |
| Verification badge | Fully verified                         | success |
| Issues chip        | 0 issues, only if presented as healthy | success |

## Included buttons

Use green buttons only for explicitly approved success/confirmation actions.

Do not use green for ordinary primary actions.

| Element             | Condition                     | Treatment                                |
| ------------------- | ----------------------------- | ---------------------------------------- |
| Confirmation action | Completes a positive workflow | Success only if approved                 |
| Connected action    | Confirms connection state     | Success only if interactive and approved |

## Included headers / titles

Section headers remain Primary Ink.

Success may appear as a supporting icon, badge, or counter.

| Header           | Condition                         | Treatment                                        |
| ---------------- | --------------------------------- | ------------------------------------------------ |
| Health Summary   | Healthy/live/connected            | Primary Ink title + optional success icon/accent |
| Monitoring Setup | All required connections complete | Primary Ink title + optional success icon/accent |

## Included progress

| Element      | Condition                   | Tone                              |
| ------------ | --------------------------- | --------------------------------- |
| Progress bar | 100% complete and verified  | success                           |
| Readiness    | Fully complete and verified | success only if supported by data |

## Not included

* Partial progress
* Watching
* Building
* Open issues
* Incomplete setup
* Ordinary active workflow
* Metadata

---

# Amber

## Semantics

* Needs attention
* Incomplete setup
* Caution
* Missing required setup
* Open issue
* Paused work
* No data that requires attention

## Tone

warning

## Included chips / badges

| Element            | Condition                           | Tone    |
| ------------------ | ----------------------------------- | ------- |
| Issues chip        | 1+ open issues                      | warning |
| Kill criteria chip | 0 kill criteria                     | warning |
| SectionCounter     | CURRENT ISSUES count greater than 0 | warning |
| SectionCounter     | KILL CRITERIA count equals 0        | warning |
| Status badge       | Paused                              | warning |
| Health badge       | No data, if attention is required   | warning |
| Setup badge        | Not connected, if setup is expected | warning |

## Included buttons

Do not use amber for ordinary actions.

Use amber only for cautionary actions that are not destructive.

| Element       | Condition              | Treatment                                         |
| ------------- | ---------------------- | ------------------------------------------------- |
| Pause action  | Temporarily stops work | Warning only if button/action styling supports it |
| Review action | Requires attention     | Warning only if approved                          |

## Included headers / titles

Section headers remain Primary Ink.

Warning should appear through a counter chip, icon, or accent.

| Header         | Condition                   | Treatment                             |
| -------------- | --------------------------- | ------------------------------------- |
| Current Issues | Count greater than 0        | Primary Ink title + warning counter   |
| Kill Criteria  | Count equals 0              | Primary Ink title + warning counter   |
| Health Summary | No data requiring attention | Primary Ink title + warning indicator |

## Not included

* Normal metadata
* Static counts with no action needed
* Archived/removed states
* Destructive actions
* Completed success states

---

# Red

## Semantics

* Error
* Blocked
* Danger
* Destructive
* Removal
* At risk
* Failed
* Critical

## Tone

danger

## Included chips / badges

| Element            | Condition                                            | Tone   |
| ------------------ | ---------------------------------------------------- | ------ |
| Status badge       | Blocked                                              | danger |
| Status badge       | At risk                                              | danger |
| Issues chip        | Critical/blocking issue, only if supported by data   | danger |
| Kill criteria chip | Triggered/failed criteria, only if supported by data | danger |
| Health badge       | Critical error                                       | danger |
| Error badge        | Error state                                          | danger |

## Included buttons / menu items

| Element                  | Condition                          | Treatment |
| ------------------------ | ---------------------------------- | --------- |
| Remove project           | Sets removed_at / removal behavior | danger    |
| Remove product           | Sets removed_at / removal behavior | danger    |
| Delete action            | Permanently deletes data           | danger    |
| Destructive confirmation | Confirms removal/deletion          | danger    |

Remove project/product must remain behind confirmation.

Do not present removal as permanent deletion unless true final-delete behavior exists.

## Included headers / titles

Section headers remain Primary Ink.

Danger should appear through a badge, icon, counter, or destructive action.

| Header         | Condition                        | Treatment                               |
| -------------- | -------------------------------- | --------------------------------------- |
| Current Issues | Critical/blocking issue exists   | Primary Ink title + danger counter/icon |
| Errors         | Critical errors exist            | Primary Ink title + danger indicator    |
| Kill Criteria  | Failed/triggered criteria exists | Primary Ink title + danger counter/icon |

## Not included

* Drawer close X
* Pause
* Archive
* Neutral removal from view
* Filter tabs
* Ordinary open status
* Static labels

## Close button rule

The drawer close X is not destructive.

It closes or dismisses the panel only.

It stays neutral at rest. On hover, X-style close/dismiss controls use a red icon and, when bordered, a red border; this is a consistent dismissal affordance rather than destructive behavior.

---

# Gray / Taupe

## Semantics

* Neutral
* Inactive
* Metadata
* Default chips
* Muted controls
* Historical
* Disabled
* Secondary information
* Archived/removed/de-emphasized states

## Tones

neutral
muted

## Included chips / badges

| Element               | Condition                                          | Tone    |
| --------------------- | -------------------------------------------------- | ------- |
| Generic metadata chip | Default                                            | neutral |
| Count chip            | Ordinary count with no semantic state              | neutral |
| Type badge            | Issue, unless feature-specific rule says otherwise | neutral |
| Kill criteria chip    | 1+ kill criteria                                   | neutral |
| Status badge          | Archived                                           | muted   |
| Status badge          | Retired                                            | muted   |
| Status badge          | Removed                                            | muted   |
| Historical label      | No prior                                           | muted   |
| Planned label         | Planned                                            | muted   |
| Disabled label        | Disabled/unavailable                               | muted   |

## Included buttons

| Element             | Condition                           | Treatment |
| ------------------- | ----------------------------------- | --------- |
| Secondary button    | Non-primary, non-destructive action | Neutral   |
| Ghost button        | Low-emphasis action                 | Neutral   |
| Outline button      | Subtle bordered action              | Neutral   |
| Actions menu button | Opens menu only                     | Neutral   |
| Drawer close X      | Closes panel only                   | Neutral at rest; red on hover |

## Included headers / titles

Headers use Primary Ink by default.

Secondary labels and metadata labels may use muted taupe.

| Header / label type      | Treatment   |
| ------------------------ | ----------- |
| Section labels           | Primary Ink |
| Secondary section labels | Muted taupe |
| Metadata labels          | Muted taupe |
| Empty-state labels       | Muted taupe |

## Included controls

| Element                       | Condition        | Treatment                            |
| ----------------------------- | ---------------- | ------------------------------------ |
| SegmentedControl inactive tab | Not selected     | Neutral                              |
| SegmentedControl selected tab | Active selection | Selected styling, not semantic color |
| Disabled control              | Disabled         | Muted                                |
| Empty state                   | No items         | Neutral/muted                        |

## Not included

* Active workflow state
* Success state
* Warning state
* Danger/destructive action
* Brand accent

---

# Orange

## Semantics

* Immensity brand accent
* Primary action accent only

## Tone

No chip tone.

Orange is not a semantic chip/status color.

## Included chips / badges

None.

Do not use orange for:

* Status chips
* Issue chips
* Kill criteria chips
* Section counters
* Health badges
* Open status
* Warning status

## Included buttons

| Element               | Condition                       | Treatment                    |
| --------------------- | ------------------------------- | ---------------------------- |
| Primary button        | Main approved action in a group | Orange primary action accent |
| Active app/nav accent | Brand navigation accent         | Orange accent                |

## Included headers / titles

None by default.

Do not use orange for section headers unless it is part of the Immensity brand mark or approved navigation accent.

## Included navigation

| Element                     | Condition     | Treatment     |
| --------------------------- | ------------- | ------------- |
| Immensity logo/brand mark   | Always        | Orange brand  |
| Active navigation indicator | Current route | Orange accent |

## Not included

* General status
* Warning
* Open issue
* Live state
* Progress
* Metadata
* Section counters

---

# Pipeline-specific tone map

Pipeline chip rendering uses the shared `SemanticChip` definition renderer. `StatusChip` and `HealthChip` are the typed wrappers for project status and health. Issues, kill criteria, their counters, and supported critical/triggered states use the centralized Issues chip set. Pipeline components must not define local semantic tone strings.

## Lifecycle status badges

| Element      | Condition         | Tone                             | Color family |
| ------------ | ----------------- | -------------------------------- | ------------ |
| Status badge | Watching          | info                             | Blue         |
| Status badge | Building          | info                             | Blue         |
| Status badge | Live / Launched   | success                          | Green        |
| Status badge | Paused            | warning                          | Amber        |
| Status badge | Archived          | muted                            | Gray/taupe   |
| Status badge | Retired           | muted                            | Gray/taupe   |
| Status badge | Removed           | muted                            | Gray/taupe   |
| Status badge | Blocked / At risk | danger only if supported by data | Red          |

---

## Pipeline card chips

| Element            | Condition                 | Tone                                                    | Color family        |
| ------------------ | ------------------------- | ------------------------------------------------------- | ------------------- |
| Issues chip        | 0 issues                  | success only if presented as healthy; otherwise neutral | Green or gray/taupe |
| Issues chip        | 1+ open issues            | warning                                                 | Amber               |
| Issues chip        | Critical/blocking issue   | danger only if severity is supported by data            | Red                 |
| Kill criteria chip | 0 kill criteria           | warning                                                 | Amber               |
| Kill criteria chip | 1+ kill criteria          | neutral                                                 | Gray/taupe          |
| Kill criteria chip | Triggered/failed criteria | danger only if supported by data                        | Red                 |
| Posts chip/count   | Any count                 | neutral                                                 | Gray/taupe          |

---

## Pipeline drawer section counters

| Section        | Condition                        | Tone                                                    | Color family        |
| -------------- | -------------------------------- | ------------------------------------------------------- | ------------------- |
| KILL CRITERIA  | Count equals 0                   | warning                                                 | Amber               |
| KILL CRITERIA  | Count greater than 0             | neutral                                                 | Gray/taupe          |
| KILL CRITERIA  | Triggered/failed criteria exists | danger only if supported by data                        | Red                 |
| CURRENT ISSUES | Count equals 0                   | success only if presented as healthy; otherwise neutral | Green or gray/taupe |
| CURRENT ISSUES | Count greater than 0             | warning                                                 | Amber               |
| CURRENT ISSUES | Critical/blocking issue exists   | danger only if severity is supported by data            | Red                 |

---

## Pipeline drawer section headers

| Header           | Text color  | Optional indicator                                      |
| ---------------- | ----------- | ------------------------------------------------------- |
| Overview         | Primary Ink | None                                                    |
| Readiness        | Primary Ink | Optional blue/info icon or accent                       |
| Monitoring Setup | Primary Ink | Optional blue/info or success indicator depending state |
| Health Summary   | Primary Ink | Success/warning/danger indicator based on health        |
| Kill Criteria    | Primary Ink | Counter chip carries semantic tone                      |
| Current Issues   | Primary Ink | Counter chip carries semantic tone                      |

Do not color entire section titles blue, amber, green, or red by default.

---

## Pipeline drawer Current Issues rows

Current Issues rows should use the same issue badge language as issue rows.

Preferred pattern:

[Open] [Issue] Analyze signals

| Element                  | Tone                                                     |
| ------------------------ | -------------------------------------------------------- |
| Issue status badge: Open | warning or info only if documented for Pipeline          |
| Issue type badge: Issue  | neutral                                                  |
| Issue title              | Primary Ink                                              |
| Right-side status/action | Neutral unless interactive link/action style is approved |

If issue severity is not available, do not fake danger.

---

## Pipeline action buttons and menu items

| Action                 | Treatment                                                   |
| ---------------------- | ----------------------------------------------------------- |
| Actions menu trigger   | Neutral secondary/outline                                   |
| Continue Building      | Primary only when it is the clear main action               |
| Mark launched          | Menu action unless approved as primary                      |
| Open in Signal         | Menu action / workflow navigation                           |
| Open in Monitor        | Menu action / workflow navigation                           |
| Pause monitoring       | Neutral or warning depending approved interaction treatment |
| Resume monitoring      | Neutral or info depending approved interaction treatment    |
| Remove project/product | Danger menu item + confirmation                             |
| Drawer close X         | Neutral at rest; red icon/border on hover                   |

Do not render every lifecycle transition as a visible footer button.

Do not show Sunset, Retire, Remove from Pipeline, and Remove from Portfolio as competing visible actions.

---

# Portfolio table indicators

These mappings are approved for Manage > Portfolio tables when the consuming column explicitly opts in.

## Metric trends

Trend color communicates whether movement is favorable for that metric. The value, filled directional triangle, and percentage must remain on one line, and color must not be the only signal.

| Metric            | Up                              | Neutral                    | Down                            |
| ----------------- | ------------------------------- | -------------------------- | ------------------------------- |
| Revenue / Traffic | Up triangle + success/green text | Right triangle + muted `0%` | Down triangle + danger/red text  |
| Errors            | Up triangle + danger/red text    | Right triangle + muted `0%` | Down triangle + success/green text |

Do not invent a non-zero trend when the API has not supplied comparison data. Render the neutral right-pointing triangle and `0%` until real trend data is available.

## Last-event freshness

Last-event dots must be paired with a timestamp or explicit empty value.

| Dot color  | Meaning                         |
| ---------- | ------------------------------- |
| Gray/taupe | No event data or inactive       |
| Green      | Recent and healthy              |
| Amber      | Stale or needs attention        |
| Red        | Critical, failed, or at risk    |

---

# Segmented controls / filter tabs

Open / Done / Archived is a segmented control, not a chip group.

| State          | Treatment               |
| -------------- | ----------------------- |
| Selected tab   | Selected/active styling |
| Inactive tab   | Neutral                 |
| Hover/focus    | Control focus styling   |
| Semantic color | Not used                |

Do not color filter tabs based on words like Open, Done, or Archived.

---

# Buttons

## Button variants

| Variant   | Color family             | Use                                      |
| --------- | ------------------------ | ---------------------------------------- |
| Primary   | Orange                   | Main approved action                     |
| Secondary | Gray/taupe + Primary Ink | Standard non-destructive action          |
| Ghost     | Gray/taupe + Primary Ink | Low-emphasis action                      |
| Outline   | Gray/taupe + Primary Ink | Subtle bordered action                   |
| Danger    | Red                      | Destructive/removal action               |
| Link      | Blue or Primary Ink      | Navigation/action text depending context |

## Button rules

* Primary action uses orange.
* Destructive/removal action uses red.
* Secondary actions stay neutral.
* Workflow navigation may use link treatment.
* X-style close/dismiss actions stay neutral at rest and turn red on hover.
* Most buttons in light mode use Primary Ink text.
* Do not use blue simply because an action is informational.
* Do not use red unless the action mutates, removes, blocks, destroys, represents danger, or is the approved X-style close hover affordance.

---

# Headers and titles

## Header color rule

All headers and titles use Primary Ink by default.

Semantic color should appear through:

* Counter chip
* Status badge
* Icon
* Small accent
* Progress bar
* Action state

## Header hierarchy

| Header type           | Treatment                                                       |
| --------------------- | --------------------------------------------------------------- |
| Page title            | Primary Ink, bold                                               |
| Drawer title          | Primary Ink, bold                                               |
| Card title            | Primary Ink, semibold                                           |
| Column header         | Primary Ink, semibold                                           |
| Section header        | Primary Ink, semibold                                           |
| Drawer section header | Primary Ink, semibold, uppercase/letter-spaced when appropriate |
| Metadata label        | Muted taupe                                                     |
| Empty-state label     | Muted taupe                                                     |

## Do not

* Do not make all informational headers blue.
* Do not color section headers based only on section name.
* Do not rely on color alone.
* Do not create one-off section title colors.

---

# Final enforcement rules

1. Base Chip defaults to neutral.
2. Base Chip does not infer tone from label text.
3. Feature wrappers may pass explicit tones only when approved.
4. Pipeline semantic chip tones are approved for Manage > Pipeline only.
5. Issues screen must not inherit Pipeline chip coloring automatically.
6. Open / Done / Archived filter tabs are not chips.
7. Text chips use shared geometry, not CSS aspect-ratio.
8. Headers and titles use Primary Ink by default.
9. Semantic color belongs on chips, badges, counters, icons, progress bars, and destructive actions.
10. Most light-mode buttons use Primary Ink unless they are primary CTA or danger actions.
11. Orange is brand and primary action only.
12. Red is only for danger, destructive, blocked, error, removal, at risk, failed, critical states, or the approved X-style close hover affordance.
13. Drawer close X is neutral at rest and uses red icon/border treatment on hover.
14. Remove project/product is danger and requires confirmation.
15. Do not add local one-off color mappings.
16. Do not apply Pipeline mappings globally.
17. Filled semantic chip text uses the approved readable value from the same color family; neutral and muted chips use gray/taupe text.
18. Portfolio metric trends and last-event dots follow the documented Portfolio table indicator map and never invent non-zero movement.
