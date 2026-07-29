---
target: packages/admin
total_score: 26
p0_count: 0
p1_count: 4
timestamp: 2026-07-29T05-39-16Z
slug: packages-admin
---
# Store Kit Admin critique

Method: dual-agent (A: sa-2 · B: sa-1)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Loading, saves, conflicts, and active navigation are clear; filtering and refresh activity are quieter. |
| 2 | Match system / real world | 2 | Slug, atomic save, initial variant, compare-at price, and sort order expose implementation language. |
| 3 | User control and freedom | 3 | Back, clear, draft guards, and reversible archive work; undo remains limited. |
| 4 | Consistency and standards | 3 | Patterns are consistent, but the consistency reinforces a generic component-library aesthetic. |
| 5 | Error prevention | 3 | Validation, conflict handling, safe defaults, and destructive confirmation are strong. |
| 6 | Recognition rather than recall | 3 | Most controls are labeled; mobile hides navigation behind an icon-only trigger. |
| 7 | Flexibility and efficiency | 2 | Shortcuts help, but sorting, fast mobile triage, and useful batch behavior are absent. |
| 8 | Aesthetic and minimalist design | 2 | The UI is not cluttered, but hierarchy is flat and repetitive. |
| 9 | Error recovery | 3 | Retry, conflict reload, preserved drafts, and direct messages are strong. |
| 10 | Help and documentation | 2 | Local field help exists, but workflow guidance does not. |
| **Total** |  | **26/40** | **Acceptable — significant redesign needed** |

## Anti-patterns verdict

**LLM assessment:** The current admin fails the product slop test. It reads as a copied component registry with a dark token pass: near-black surfaces, automatic violet accent, tiny Inter, generic Solar icons on nearly every action, a purple rounded identity tile, repeated bordered rectangles, and empty-state bands. It is structurally competent but emotionally anonymous.

**Deterministic scan:** The static detector returned `[]` with exit code 0. Runtime browser scans found two unique shared-shell issues on every representative route: `tiny-text` for the 11px administrator email and `text-overflow` for the same truncated email at `packages/admin/src/AdminShell.tsx:178`. The overflow is intentional truncation rather than layout breakage, but the full account identity has no discoverable expansion.

**Browser evidence:** Authenticated dashboard, catalog, new product, orders, and settings were inspected at 360×800, 768×1024, and 1440×900 in independent sessions. No horizontal document overflow occurred. The interface does mechanically fit, but touch targets and information structure remain desktop-first. No persistent human-visible overlay remains because the available browser was headless.

## Overall impression

The behavioral foundation is much better than the visual product. The admin protects drafts, validates destructive actions, handles conflicts, and exposes real CRUD. The redesign opportunity is to stop styling a desktop table system and instead design a calm, touch-first retail operating surface. Mobile should determine hierarchy and actions; desktop should add density and simultaneous context later.

## What is working

1. **Operational safeguards:** skeletons, retries, toasts, draft guards, optimistic-conflict recovery, draft defaults, reversible archive, and explicit destructive confirmation are credible.
2. **Responsive mechanics:** routes fit all tested widths without page overflow. Forms reflow and desktop tables already have a mobile rendering path.
3. **Power-user foundation:** command palette, `G` route chords, `/` search focus, and row keyboard navigation are valuable and should survive the redesign where relevant.

## Cognitive load

Five of eight checks fail: chunking, hierarchy, one-thing-at-a-time, minimal choices, and progressive disclosure. The mobile new-product flow is about 1,920px tall and exposes URL, publishing, pricing, stock, ordering, options, and merchandising decisions together. Grouping and working-memory support are good, but advanced concepts are shown before they are needed.

## Emotional journey

- **Entry:** competent but anonymous; generic dark developer-console cues reduce retail trust.
- **Dashboard:** unclear next action; zero counts and empty bands report state but do not guide setup.
- **Catalog:** the New product action is discoverable, but duplicated in the same empty context.
- **Create product:** effort and anxiety rise because implementation terms and advanced controls appear before the product exists.
- **Settings:** save state is trustworthy, but high-stakes checkout details lack a clear consequence preview.
- **Completion:** a toast confirms success, but the interface does not offer the next useful action, such as previewing the product.

## Priority issues

### [P1] Touch targets and density contradict mobile-first intent

**Evidence:** At 360px, navigation trigger is 30×30, command trigger about 32×30, links 32px high, and most fields/buttons 32px high. Compact styles are forced in `packages/admin/styles.css`; navigation is fixed to `h-8` in `AdminShell.tsx`.

**Why it matters:** one-handed use and motor accessibility suffer. Tablet inherits hidden navigation while retaining desktop density.

**Fix:** base mobile controls at 44–48px, use 16px input text, provide labeled bottom navigation or an equally reachable mobile pattern, move contextual primary actions into the thumb zone, and apply 30–34px density only at fine-pointer desktop breakpoints.

**Suggested command:** `$impeccable adapt`

### [P1] The dark-violet and blanket-icon system is generic AI product styling

**Evidence:** forced dark mode, violet primary, blue-violet neutral ramp, purple rounded shield tile, generic line icons throughout navigation and commands, and large expanses of nearly identical graphite.

**Why it matters:** a store operator handling inventory, orders, and bank details needs a reliable retail tool, not a developer-console costume.

**Fix:** shape the theme from the physical usage scene: a store owner using a phone under bright shop lighting. Use a light-first or system-adaptive neutral foundation, one non-purple identity color chosen from real product context, and semantic hues only for state. Remove the logo tile and make navigation text-led. Icons must earn space through recognition, not decoration.

**Suggested commands:** `$impeccable shape`, then `$impeccable colorize` and `$impeccable distill`

### [P1] The dashboard reports metrics instead of directing work

**Evidence:** five unlinked queue counts and two empty data bands leave extensive unused space. The empty store offers no direct setup path.

**Why it matters:** operators need to know what requires action now. Raw counts impose interpretation and navigation work.

**Fix:** make the dashboard an action queue: orders needing payment/fulfillment, stock needing attention, and setup problems. Counts link to filtered work. A new store sees a short readiness sequence: add first product, confirm checkout settings, preview storefront.

**Suggested commands:** `$impeccable shape`, `$impeccable distill`

### [P1] Product creation exposes advanced implementation concepts too early

**Evidence:** the mobile flow is 2.4 viewports tall. Initial variant exposes seven controls. Slug, featured state, compare-at price, sort order, options, and long content remain visible. Copy mentions an “atomic save.” The sticky action area can cover content near the viewport edge.

**Why it matters:** creating a sellable draft feels like database administration. First-time operators must understand internal concepts before making progress.

**Fix:** first save requires only name, price, stock, generated SKU, and category when useful. Hide generated slug, merchandising, options, compare-at price, and ordering under progressive sections. Keep atomicity internal. On mobile, use one 44–48px action and a short state label.

**Suggested commands:** `$impeccable shape`, `$impeccable clarify`, `$impeccable harden`

### [P2] Mobile rows are desktop tables mechanically restyled as long pseudo-cards

**Evidence:** catalog and order rows convert every desktop cell into a labeled block. An eight-column row becomes an eight-line mobile record. Filters stack into a tall control block. Empty actions repeat.

**Why it matters:** this preserves the table schema rather than the mobile task. Scanning products and orders remains slow.

**Fix:** create dedicated edge-to-edge mobile records, not floating cards: product image/name/status/price/stock; order number/customer/total/payment/fulfillment. Make the record a tap target and move secondary metadata to detail. Keep search visible; put secondary filters in a sheet with active chips. Enhance to full tables on desktop.

**Suggested command:** `$impeccable adapt`

## Persona red flags

**Alex, power user:** shortcuts are promising, but dashboard queues are not links, sorting and fast triage are limited, and command palette behavior is mostly navigation rather than meaningful operations.

**Sam, accessibility-dependent:** labels, headings, ARIA, and focus are generally strong. However, 30–32px controls, 11–13px text, hidden mobile navigation, forced dark mode, and pervasive muted text make operation harder.

**Casey, distracted mobile operator:** primary navigation is at the top, the create flow requires too much typing and scrolling, advanced controls are not deferred, and interruption recovery is weaker than the navigation draft guard. The mobile sticky action occupies scarce space.

## Minor observations

- Administrator email is 11px and truncated without a discoverable full value.
- New product and Clear filters actions are duplicated in empty contexts.
- Empty orders copy incorrectly implies filters are active when the store simply has no orders.
- Desktop shortcut labels appear in the mobile command palette.
- “Atomic save” is engineering language.
- Forced English should be reconsidered for a Mongolia-only product.
- Empty desktop screens feel unfinished rather than intentionally calm.
- Populated long-row behavior was not visually assessed in the read-only fixture.

## Questions to consider

1. In the first five seconds, should the operator see general metrics or the next order that needs action?
2. Why is dark mode mandatory for a phone likely used under bright shop lighting?
3. Could a valid product draft require only name, price, stock, and one image?
4. Should the admin be Mongolian-first?
5. Which icons still earn space when every navigation label is already visible?
6. Should Store Kit feel like a developer console or a calm retail operations tool?
