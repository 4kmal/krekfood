# Default Three-Column Chat Layout and Readable Map Tooltip

Date: 2026-07-16

## Problem

The first `/chat` visit opened as a full-width chatbot even on large desktop screens. The map and restaurant details were available only after additional interaction, which made the primary discovery workflow less obvious. When a map point was selected, the Google Maps InfoWindow also mixed a white native shell with very pale metadata colors intended for a dark background, making the restaurant details difficult to read.

## UX decisions

- Large screens now open with a balanced chat, map, and restaurant-details layout.
- The detail column starts with guidance instead of selecting an arbitrary restaurant.
- Small screens stay chat-first unless the visitor has explicitly saved a different map choice.
- Map visibility is a user preference only when the visitor presses **View Map** or **Hide Map**. Opening the map from a restaurant recommendation does not overwrite that preference.
- A selected restaurant replaces the desktop empty state. On smaller screens, the details appear as a full-width overlay and its close action returns to the map.
- The map tooltip is always a high-contrast white surface in both light and dark app themes.

## Layout and responsive behavior

| State | Desktop (`lg` and wider) | Mobile and tablet |
| --- | --- | --- |
| First visit | Chat 25%, map 50%, detail guidance 25% | Full-width chat |
| Map visible, no selection | Three columns with the empty detail state | Full-width map |
| Map visible, restaurant selected | Chat 25%, map 50%, restaurant details 25% | Full-width restaurant-details overlay |
| Map hidden | Full-width chat | Full-width chat |

The desktop empty state asks the visitor to choose either a chat recommendation or a map marker and explains which restaurant information will become available.

## Map visibility persistence

The browser preference is stored as `krekfood-chat-map-visible` with a serialized value of `true` or `false`.

- A valid saved value always wins.
- With no saved value, the map defaults to visible when `(min-width: 1024px)` matches and hidden otherwise.
- Invalid, blocked, or unavailable browser storage falls back safely to the viewport default.
- Only the explicit header toggle writes this value. Restaurant-card selections can reveal the map for the current session without changing the saved choice.

## POI tooltip palette and accessibility

The Google Maps InfoWindow shell and content now use an explicit palette that is independent of the app theme:

- Surface: white (`#ffffff`)
- Primary text: slate 900 (`#0f172a`)
- Metadata: slate 700 with slate 500 secondary review text
- Location, rating, food, price, and distance icons use accessible indigo, amber, cyan, emerald, and blue accents on pale backgrounds
- Directions: indigo-to-violet action with white text and a 44px minimum height
- Close control: visible slate icon on a pale slate 40px circular target

Long restaurant names and optional metadata wrap inside a constrained 280–300px content card. The InfoWindow overrides are intentionally outside Tailwind layers so they reliably take precedence over Google Maps' injected styles. A defensive Maps constructor guard also prevents a partially initialized Google API object from crashing the chat layout during an authentication or billing failure.

## Affected files

- `src/pages/Index.tsx`
  - Adds safe viewport-aware map initialization, explicit preference persistence, the responsive three-column layout, mobile overlay behavior, stable layout test hooks, and an accessible theme-toggle label.
- `src/components/KedaiDetailEmptyState.tsx`
  - Adds the initial desktop restaurant-detail guidance.
- `src/components/KedaiDetailPanel.tsx`
  - Adds an accessible label to the mobile/desktop detail close action.
- `src/components/InteractiveMap.tsx`
  - Rebuilds the InfoWindow content hierarchy and palette, enforces the directions target size, and guards Google Maps geometry constructors.
- `src/index.css`
  - Replaces the old dark InfoWindow overrides with unlayered, high-contrast white shell, arrow, shadow, and close-control styles.

No API, Supabase, database, authentication, AI-model, or Edge Function interfaces changed.

## Validation

- Targeted ESLint passed for every changed TSX file.
- The Vite production build passed (2,271 modules transformed).
- Browser validation at a 1,440px viewport measured the columns at exactly 25%, 50%, and 25%.
- Explicit hidden and visible map preferences both survived refresh; hidden-map desktop chat settled at 100% width.
- At a mobile viewport, map mode measured 100% width, chat mode measured 100% width, restaurant details measured as a 100% overlay, and closing details returned to the map.
- The live tooltip measured a white shell, slate title text, 16px shell radius, a 40px visible close control, and a 44px directions action with white text. The same explicit colors were verified under light and dark themes.
- Full-project ESLint still reports 174 pre-existing errors outside this change, primarily in `repo-reference/`, `MapFilters.tsx`, shared UI primitives, the existing vibe-check function, and `tailwind.config.ts`.
- The current Google Maps project reports a separate billing/permission failure. The layout and tooltip behavior remain implemented independently, and the existing API diagnostics continue to report that provider issue.

## Rollout

The change is released through `feature/default-three-column-map-ui`, then fast-forwarded into `main`. Only the source and documentation files listed above are included; the unrelated local `bun.lock` and `repo-reference/` worktree changes are intentionally excluded.
