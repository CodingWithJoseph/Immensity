# Signal workspace module boundaries

The workspace is split by screen so parallel branches can merge without editing
the same files.

## Shared/integration owner

- `types.ts`
- `SignalWorkspaceShell.tsx`
- `SignalWorkspaceTabs.tsx`
- changes to existing `SignalPageClient.tsx`
- changes to shared API clients

## Overview owner

May edit only:

- `overview/**`

## Evidence owner

May edit only:

- `evidence/**`

## Conversation owner

May edit only:

- `conversation/**`

Screen implementations consume contracts from `types.ts`. Screen branches must
not change the shared contract. If a contract is insufficient, document the
requested addition in the branch handoff instead of editing `types.ts`.

## Runtime integration

`SignalWorkspaceController.tsx` owns server state and composes the three screens.
It resolves the selected Pipeline project, loads the current versioned Signal
case, polls while analysis is queued or generating, and keeps the active screen
in the `view` query parameter.

Browser calls go through the authenticated Next.js proxy at
`/api/pipeline/:pipelineId/signal/*`. The proxy forwards only the Signal
`case` and `conversations` route families. `lib/signalWorkspaceApi.ts` is the
typed client for those routes.

The UI never writes model output directly over the generated case:

- overview and evidence edits are stored as user overrides;
- Ask Signal turns are stored in persistent conversations;
- generated proposals require an explicit accept or reject action;
- accepting a proposal reloads the case so the accepted override is visible.

## Rollout order

1. Apply backend migration `0047_signal_workspace.sql`.
2. Deploy the backend with the Signal worker/provider configuration.
3. Deploy this frontend.
4. Add or open a Pipeline project and verify the queued, generating, ready,
   stale, insufficient-evidence, and failed states.

The previous Signal page remains exported as `LegacySignalPageClient`; the new
workspace is the route default, so rollback does not require reconstructing the
old implementation.
