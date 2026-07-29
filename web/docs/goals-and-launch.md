# Goals & the launch boundary

This explains what you see on the **Goals** page (`/dashboard/manage/goals`)
before and after a product launches, and why. The short version: goals come in
two scopes, and one of them is intentionally gated on launch.

## Two scopes of goals

Every goal is a **group** (e.g. Signups) with **ordered milestones** (5 → 10 →
50 → …). Groups live at one of two scopes:

| Scope | Examples | Measured from | Endpoint |
|-------|----------|---------------|----------|
| **Account** (portfolio-wide) | Launch products, Problems discovered, Tasks created, Teammates invited | Your account activity (pipelines, problems, tasks, team) | `GET /api/portfolio/goals` |
| **Project** (per-product) | Signups, Revenue, Traffic, Product setup, Issue tracking | That product's **monitoring data** (usage/revenue/error events) | `GET /api/portfolio/{id}/goals` |

Account goals describe *your journey building products*. Project goals describe
*how one live product is doing*.

## Why there are no project goals before launch

Project goals are **gated on launch**. The project-goals endpoint calls
`_require_launched_product` (`app/routes/portfolio.py`), which returns **404 for
any product without a `launched_at` date**:

```python
# app/routes/portfolio.py
@router.get("/{pipeline_id}/goals")
async def get_project_goals(pipeline_id, db, uid):
    """Project-scoped goals for a launched product…"""
    await _require_launched_product(pipeline_id, db, uid)   # 404 if not launched
    return {"data": await project_goals_payload(pipeline_id, db)}
```

The Goals page requests project goals for the selected product and quietly
treats that 404 as "no project goals," so **a pre-launch product simply shows no
per-product goals.**

This is by design, not a bug. Project goals measure **signups, revenue, and
traffic** — numbers that come from a product's monitoring stream
(`MonitorUsageEvent`, `MonitorRevenueSource`, …). Before launch there is no live
product and no connected data source, so those metrics don't exist yet. Showing
"0 / 5 signups" with a ticking target for something that isn't live would be
misleading.

## What you *do* see before launch

Account goals have **no launch gate** — they're always returned. Pre-launch you
still see the portfolio-scoped goals, and several can already be in progress:

- **Launch products** — reach 1 launched product. *This is the pre-launch goal.*
  It's active from the start and completes when you launch.
- **Problems discovered** / **Tasks created** — advance during discovery and
  planning, before anything ships.
- **Teammates invited** — advances as you build your team.

So pre-launch the Goals page is centered on *getting to launch*; it is not empty
unless the account itself has no activity yet.

## What launch unlocks

The moment a product gets a `launched_at` date:

1. Its project-goals endpoint starts returning data instead of 404.
2. **Signups, Revenue, Traffic, Product setup, and Issue tracking** appear for
   that product on the Goals page (and its milestone dates flow onto the
   Calendar).
3. Progress is measured live from the product's monitoring data as it connects
   and events arrive.

> Note: project metrics read from monitoring rollups. A freshly launched product
> with no connected data source will show its project goals at **0** until a data
> source is connected and events start flowing — connecting sources is itself the
> **Product setup** goal.

## How a goal becomes "active" (recap)

Within any group, only the **next un-reached milestone** is active — its clock
starts *when it becomes active*, not before:

- **Active**: `activated_at` = the previous milestone's actual completion date
  (or the group's start anchor for the first milestone); `target_date` =
  `activated_at + estimate_days`; a live countdown.
- **Upcoming**: shows its configured estimate only (a soft "≈" projection), never
  a committed deadline or countdown.
- **Completed**: keeps its activation, target, and completion dates.

The start anchor for a **project** group is the product's `launched_at` (falling
back to `created_at`); for an **account** group it's your earliest project. That
anchoring is another reason project goals are framed around launch — their clock
is meant to start at launch.

## TL;DR

- **Pre-launch:** account goals only — led by *"Launch your first product."* No
  per-product goals, because there's no live product to measure.
- **At launch:** that product's Signups / Revenue / Traffic / Setup / Issues
  goals switch on and start tracking from real data.
- The 404 you'd get hitting `/api/portfolio/{id}/goals` for an unlaunched product
  is the intended gate, handled gracefully in the UI.
