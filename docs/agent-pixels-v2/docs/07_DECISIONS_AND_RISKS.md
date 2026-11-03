# 07. Decisions, risks, constraints and open matters

## Settled decisions from the owner

1. The experience should get **very close to the generated visual reference** in atmosphere, composition, lighting, depth and richness.
2. The headquarters must be **multi-floor with actual elevators** and feel like a side-on/angled dollhouse, not a Game Boy bird's-eye grid.
3. Agent Pixels should become a **general reusable headquarters builder**, not a Nebula-only one-off.
4. Owner should be able to **place, move, resize where safe, and arrange objects** visually.
5. Owner should be able to **prompt-generate props, room kits, wall/floor textures** in the editor, review them and reuse them.
6. Astra's working **read-only telemetry and currently finished infrastructure are to be preserved**; no handoff-driven rebuild of data correctness.
7. Nebula will remain the first example scene with two Leads, Clerk outside offices, rocket lab, math lab, trainer racks, sterile review, clinic, observatory growth, model gallery, render count, queue, cooldown lounge.
8. Both visual magic and data honesty matter; simulated demo values are not live machine output.

## Implementation defaults chosen in this spec

These are product-architecture recommendations based on current source, not independently verified decisions by the owner:

- Prefer an additive **2.5D cutaway** renderer over a wholesale 3D engine rewrite.
- Keep current Agent Pixels character/seat/tile navigation per floor; add a multilevel connector graph and elevator travel state machine.
- Default Nebula example to 3 levels: executive/observatory at top, engineering/data/training/render in middle, review/doctor/models/queue/lounge below. Reposition Clerk outside Lead offices (requires deliberate migration from old 2D plan).
- Use **layered generated high-res room plates + hero props + animated sprite/state overlays**, not an all-at-once generated single office screenshot and not just 16px hand-drawn fixtures.
- Separate read-only runtime from a role-gated editor/asset generation service; prompts and saves are owner-authorized writes only to **scene and asset drafts**, not Paperclip, GitHub or research data.
- Provider-neutral image API adapter; first working provider can be OpenAI's current Images API if an approved server API key/budget is available. No provider key is assumed or shared.
- Prototype a 3-floor vertical slice before generating a full building worth of assets; use the reference for an owner visual go/no-go decision.
- Preserve Astra's classic 2D scene as fallback and a regression fixture until V2 acceptance.

## Risks with mitigation and acceptance responsibility

| Risk | Severity | Mitigation / stop condition |
| --- | --- | --- |
| V2 becomes another enormous engineering rabbit hole | High | One strict 3-level, 4-room hero slice + editor action + elevator, owner go/no-go BEFORE scaling to 12 rooms |
| Pretty generated art fails to align with walkable perspective | High | Separate logical physics from render projection, define pivots/masks, use real browser preview, manual cleanup, never auto-publish |
| Reference is a beautiful fantasy collage, not a workable game scene | High | Reproduce art direction, not impossible layouts, fake numbers or physically inconsistent passages |
| Generated assets lack consistent perspectives/state frames | High | Shared style sheet/reference examples, deterministic animation overlays, pose consistency QA and rejection threshold |
| Too much 16px legacy pixel constraint ruins reference fidelity | High | Decouple tile size from visual source resolution and use layered room plates / hero art, LOD and configurable raster quality |
| Renderer rewrite destroys Astra's tested state/agent behavior | High | Feature-flagged new renderer, legacy adapter, exact-head tests, no branch overwrite; source state remains a pure projection |
| Generated-editor image API becomes new ungoverned expensive worker | Medium/High | Separate authorization, visible cost estimate/receipts, quotas/caps, cancellation/retention; BYO approved provider credentials |
| Editor creates unwanted write route into Paperclip | Critical | Separate authoring API scoped to scene/assets and audited; viewer stays GET/HEAD-only; no generic action execution |
| Usage cooldown wrongly sends agents while GPU work active | High | Exact validated usage source, independent job ownership, fail-closed unknown state and elevator routing tests |
| Elevator navigation fails under 12-agent traffic | Medium/High | Capacity, queue, timeout, deterministic path graph and 12-agent cooldown test |
| Art and actors overlap or occlusion breaks selection | Medium | Explicit depth anchors and hit testing, room front-wall hide editor mode, actual screenshot QA |
| Performance collapses under 3 layers / many hero textures | High | Atlas/LOD and static layer caching, reduced FX, per-frame budgets, p95 measurement, memory caps and fallback renderer |
| External assets / upstream art legal rights unclear | High | Original/authorized generated source, provenance, upstream permission check before public release |
| Current real data source permissions remain blocked | High for production | Maintain explicit partial/unknown labels, get approved read-only exporter grants; never fabricate live machine data |
| UI designer confuses generated design text and numbers with real telemetry | High | Don't bake counts/labels in art; render dynamic text from trusted source atop background panels |
| Team mistakes staged screenshots for deployed product | High | Distinguish SCENE TESTED, VISUAL APPROVED, LIVE SOURCES VERIFIED, SERVICE DEPLOYED, FULL SDK REVIEWED |

## Open items - do not assume answers

- **Which image-generation provider will be connected?** OpenAI, another cloud API, or locally approved ComfyUI. All require explicit account/credential/cost policy; draft editor must work without one.
- **External release and license**: upstream Agent Pixels rights not established by an explicit license at last inspection; public sale/redistribution requires permission clarification.
- **Editor users / scope**: assume owner-only private editor MVP. Additional multi-user collaboration, permissions and sharing need product approval.
- **Visual language**: exact fraction of crisp pixel edges vs painted high-detail room plates; resolve by owner review of first vertical slice, not a week of abstract debate.
- **World template scale**: 3-level default Nebula example; any larger floor count requires performance acceptance first.
- **Asset storage**: approved private storage target (filesystem/TrueNAS/object storage); no path is authorized purely by this document.
- **Paid generation spend**: require per-request budgeting and explicit opt-in to a provider; no vendor pricing/entitlement assumptions baked into source.
- **Target scene publishing**: choose dedicated private host and verified tailnet ACL after UI/source acceptance. Don't reuse active Paperclip service privileges.
- **Actual approved project telemetry grants**: protected Paperclip, watcher/usage, TrueNAS manifests/models and stages remain unresolved until owner/admin grants read authority.

## Source links (checked 2026-11-02)

- Viewer current Astra draft: https://github.com/akimbo-bin/nebula-observatory/pull/3
- Agent Pixels current Astra draft: https://github.com/akimbo-bin/Agent-Pixels/pull/1
- Detailed Astra implementation report: https://github.com/akimbo-bin/nebula-observatory/blob/feat/connected-hq-20261102-astra/docs/handoff/11_ASTRA_IMPLEMENTATION_REPORT.md
- Latest visual evidence/readme: https://github.com/akimbo-bin/nebula-observatory/blob/feat/connected-hq-20261102-astra/docs/evidence/visual-overhaul-20261102/README.md
- Current image generation guide: https://developers.openai.com/api/docs/guides/image-generation
- Current Images API parameters: https://developers.openai.com/api/reference/go/resources/images/methods/generate

This specification has **not been committed to either repo, submitted as issues, run in Codex, or implemented**. Those are separate authorized actions and must be verified when they occur.