# FloraSubs Design System Specification

## Brand Identity
**FloraSubs** — "Fansub & Anime Encoding Studio"
Professional, technical, dark-first desktop application for anime video processing.

## Color Palette

### Core Brand Colors
- **Primary Blue**: `#3B82F6` (blue-500) — Main actions, focus states, active indicators
- **Primary Blue Dark**: `#2563EB` (blue-600) — Hover states, primary buttons
- **Primary Blue Light**: `#60A5FA` (blue-400) — Text accents, icons, borders
- **Primary Blue Muted**: `#1E3A5F` (blue-900/30) — Backgrounds, badges

### Secondary Accent Colors
- **Purple Accent**: `#A855F7` (purple-500) — Subtitle/features, AI/ML features
- **Purple Dark**: `#9333EA` (purple-600) — Subtitle hover states
- **Emerald Accent**: `#10B981` (emerald-500) — Success, font extraction, completed jobs
- **Emerald Dark**: `#059669` (emerald-600) — Success hover
- **Amber Accent**: `#F59E0B` (amber-500) — Warnings, pending states
- **Rose Accent**: `#F43F5E` (rose-500) — Errors, cancelled jobs, destructive actions

### Neutral Scale (Dark Theme)
- **Background Deep**: `#0F1117` (slate-950) — App canvas, full-screen backgrounds
- **Background Card**: `#141824` (slate-900/80) — Cards, panels, modals
- **Background Elevated**: `#161922` (slate-900) — Headers, sidebars, toolbars
- **Background Input**: `#1B2130` (slate-800) — Input fields, selects, dropdowns
- **Background Hover**: `#1F2433` (slate-800/60) — Hover states on cards

### Border Scale
- **Border Subtle**: `#242938` (slate-700/50) — Default card borders
- **Border Default**: `#2E364A` (slate-700) — Input borders, divider lines
- **Border Strong**: `#37415A` (slate-600) — Focus rings, active borders
- **Border Brand**: `#3B82F6` (blue-500) — Focus rings, primary borders

### Text Scale
- **Text Primary**: `#F8FAFC` (slate-50) — Headlines, primary content
- **Text Secondary**: `#CBD5E1` (slate-300) — Body text, descriptions
- **Text Muted**: `#64748B` (slate-500) — Labels, secondary info, disabled
- **Text Disabled**: `#475569` (slate-600) — Disabled states
- **Text Inverse**: `#0F1117` (slate-950) — On primary backgrounds

### Semantic Status Colors
- **Info**: `#3B82F6` (blue-500)
- **Success**: `#10B981` (emerald-500)
- **Warning**: `#F59E0B` (amber-500)
- **Error**: `#F43F5E` (rose-500)
- **Processing**: `#A855F7` (purple-500)

## Typography

### Font Families
- **UI Font**: `'JetBrains Mono', 'Fira Code', 'Monospace'` — Primary monospace for technical data, code, timecodes
- **Display Font**: `'Space Grotesk', 'Inter', 'system-ui', 'sans-serif'` — Headlines, UI labels, buttons
- **Body Font**: `'Inter', 'system-ui', 'sans-serif'` — Body text, descriptions

### Type Scale
| Token | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| `display-lg` | 24px / 1.5rem | 700 | 1.2 | Page titles |
| `display-md` | 20px / 1.25rem | 600 | 1.3 | Section headers |
| `display-sm` | 16px / 1rem | 600 | 1.4 | Card titles |
| `headline` | 14px / 0.875rem | 600 | 1.4 | Subsection headers |
| `body-lg` | 14px / 0.875rem | 400 | 1.6 | Primary body text |
| `body-md` | 13px / 0.8125rem | 400 | 1.5 | Standard body |
| `body-sm` | 12px / 0.75rem | 400 | 1.5 | Secondary text |
| `caption` | 11px / 0.6875rem | 500 | 1.4 | Labels, badges, metadata |
| `caption-mono` | 11px / 0.6875rem | 500 | 1.4 | Monospace labels |
| `mono-xs` | 10px / 0.625rem | 500 | 1.3 | Timecodes, technical IDs |
| `mono-sm` | 11px / 0.6875rem | 500 | 1.4 | File paths, stream info |
| `mono-md` | 13px / 0.8125rem | 500 | 1.5 | Code blocks, logs |

### Letter Spacing
- `tight`: -0.02em — Headlines
- `normal`: 0 — Body
- `wide`: 0.05em — Uppercase labels, tracking
- `wider`: 0.1em — All-caps navigation

## Spacing System
Base unit: **4px**

| Token | Value | Use Case |
|-------|-------|----------|
| `space-0` | 0px | Reset |
| `space-1` | 4px | Micro gaps |
| `space-2` | 8px | Tight spacing |
| `space-3` | 12px | Standard gaps |
| `space-4` | 16px | Component padding |
| `space-5` | 20px | Section spacing |
| `space-6` | 24px | Large sections |
| `space-8` | 32px | Page margins |
| `space-10` | 40px | Major divisions |
| `space-12` | 48px | Full-screen padding |

## Border Radius
| Token | Value | Use Case |
|-------|-------|----------|
| `radius-none` | 0 | Sharp corners |
| `radius-sm` | 4px | Small badges, pills |
| `radius-md` | 8px | Buttons, inputs, cards |
| `radius-lg` | 12px | Large cards, modals |
| `radius-xl` | 16px | Feature panels |
| `radius-2xl` | 24px | Hero sections |
| `radius-full` | 9999px | Pills, avatars, progress |

## Shadows & Elevation
| Token | Value | Use Case |
|-------|-------|----------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle depth |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modals, tooltips |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.6)` | Full-screen overlays |
| `shadow-glow-blue` | `0 0 20px rgba(59,130,246,0.3)` | Primary focus |
| `shadow-glow-purple` | `0 0 20px rgba(168,85,247,0.3)` | AI features |
| `shadow-glow-emerald` | `0 0 20px rgba(16,185,129,0.3)` | Success states |

## Component Specifications

### Button
**Variants:**
- `primary` — Blue bg, white text, glow shadow
- `secondary` — Elevated bg, gray text, subtle border
- `ghost` — Transparent, text only, hover:bg-elevated
- `danger` — Rose bg, white text
- `success` — Emerald bg, white text
- `outline` — Transparent, brand border, brand text

**Sizes:**
- `sm` — h-8 px-3 text-caption
- `md` — h-10 px-4 text-body-sm
- `lg` — h-12 px-6 text-body-md

**States:** default, hover, active, focus-visible, disabled, loading

### Input
**Variants:**
- `default` — Standard form input
- `search` — With leading icon, rounded-full
- `mono` — Monospace font for technical data

**Sizes:** same as button
**States:** default, hover, focus, error, disabled, read-only

### Select / Dropdown
- Matches input styling
- Custom chevron icon
- Keyboard navigable
- Max-height with scroll

### Card
**Variants:**
- `default` — bg-card, border-subtle, shadow-md
- `elevated` — bg-elevated, border-default, shadow-lg
- `interactive` — hover:border-strong, hover:shadow-lg, transition
- `featured` — border-brand, shadow-glow-blue

### Badge / Pill
**Variants:**
- `default` — Muted bg, muted text
- `primary` — Blue muted bg, blue text
- `success` — Emerald muted bg, emerald text
- `warning` — Amber muted bg, amber text
- `error` — Rose muted bg, rose text
- `processing` — Purple muted bg, purple text

**Sizes:**
- `sm` — px-2 py-0.5 text-caption
- `md` — px-2.5 py-1 text-body-sm

### Progress Bar
- Height: 4px (sm), 6px (md), 8px (lg)
- Rounded-full
- Animated indeterminate variant
- Color variants: primary, success, warning, error

### Table / DataGrid
- Monospace font for numeric columns
- Hover row highlight: bg-elevated/50
- Striped variant
- Sortable headers
- Virtualized for large datasets

### Tabs
- Underline indicator (brand color)
- Ghost variant for secondary nav
- Keyboard navigation

### Tooltip
- Dark bg-elevated, border-subtle
- 12px offset, fade-in 150ms
- Arrow indicator

### Modal / Dialog
- Backdrop: rgba(0,0,0,0.7) blur-sm
- Card elevated, radius-xl, shadow-xl
- Focus trap, ESC to close
- Sizes: sm (400px), md (600px), lg (800px), xl (1200px), full

### Sidebar Navigation
- Width: 224px (collapsed: 64px)
- bg-elevated, border-r
- Icon + label, active state: bg-primary-muted, text-primary, border-l-2 brand

### Header / Toolbar
- Height: 56px
- bg-elevated, border-b
- Left: branding + context
- Right: global actions, status

## Animation & Motion
| Token | Duration | Easing | Use Case |
|-------|----------|--------|----------|
| `fast` | 100ms | ease-out | Hover, focus |
| `normal` | 200ms | ease-out | Transitions, expand |
| `slow` | 300ms | ease-in-out | Modals, drawers |
| `spring` | 350ms | cubic-bezier(0.34,1.56,0.64,1) | Delightful interactions |

**Reduced Motion:** Respect `prefers-reduced-motion` — disable non-essential animations.

## Breakpoints (Tailwind)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Iconography
- **Library**: Lucide React (consistent, 24x24 base)
- **Sizes**: 16px (sm), 20px (md), 24px (lg), 32px (xl)
- **Stroke**: 2px base, 1.5px for smaller

## Accessibility
- WCAG AA contrast ratios (4.5:1 text, 3:1 UI)
- Focus-visible outlines (2px brand, 2px offset)
- Semantic HTML (button, nav, main, aside, header, footer)
- ARIA labels on icon-only controls
- Keyboard navigation for all interactive elements
- Screen reader announcements for status changes

## CSS Custom Properties (for runtime theming)
```css
:root {
  --color-bg-deep: #0F1117;
  --color-bg-card: #141824;
  --color-bg-elevated: #161922;
  --color-bg-input: #1B2130;
  --color-bg-hover: #1F2433;
  --color-border-subtle: #242938;
  --color-border-default: #2E364A;
  --color-border-strong: #37415A;
  --color-border-brand: #3B82F6;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #CBD5E1;
  --color-text-muted: #64748B;
  --color-text-disabled: #475569;
  --color-primary: #3B82F6;
  --color-primary-dark: #2563EB;
  --color-primary-light: #60A5FA;
  --color-primary-muted: #1E3A5F;
  --color-purple: #A855F7;
  --color-emerald: #10B981;
  --color-amber: #F59E0B;
  --color-rose: #F43F5E;
}
```

## Screen Specifications

### 1. Home / Encode (Primary Workspace)
- **Layout**: 3-column (Sidebar 224px | EncodingView ~60% | FileQueue ~40%)
- **EncodingView**: Two-column grid (Core params | AI/Advanced)
- **FileQueue**: Full-height list with drag-drop, inline progress bars
- **Header**: Preset selector, active job counter, queue count

### 2. Subtitle (Subtitle & Font Station)
- **Layout**: 2-column (Left: Track picker + extract actions | Right: Font inspector)
- **Track List**: Radio selection, metadata badges, default indicator
- **Font List**: Monospace filenames, MIME badges, extract all action

### 3. Preview (Interactive Media Player)
- **Layout**: 2/3 video player | 1/3 technical details + subtitle tracks
- **Player**: Custom controls, keyboard shortcuts, subtitle overlay
- **Source Switcher**: Main video / Intro clip toggle
- **Details Grid**: Resolution, FPS, Codec, Pixel format cards

### 4. Converter (Quick Remux)
- **Layout**: Centered card (max-w-2xl)
- **Flow**: Source picker → Format pills → Output folder → Action button
- **Stream Copy**: No re-encode, format change only

### 5. Console (Real-time Logs)
- **Layout**: Full-height terminal viewport
- **Toolbar**: Stream filter (all/stdout/stderr/system), search, auto-scroll, copy
- **Log Lines**: Timestamp, stream badge, monospace content
- **Virtualized**: Handle 10k+ lines

### 6. Settings
- **Layout**: Single column, max-w-3xl, grouped cards
- **Sections**: Hardware status (read-only), General preferences
- **Persistence**: Auto-save to Tauri store

## Component Inventory (to generate)
1. Button (6 variants × 3 sizes × 6 states)
2. Input (3 variants × 3 sizes × 6 states)
3. Select
4. Checkbox / Radio / Switch
5. Card (4 variants)
6. Badge (6 variants × 2 sizes)
7. ProgressBar (3 sizes × 4 colors × 2 modes)
7. Table/DataGrid
8. Tabs (2 variants)
9. Tooltip
10. Modal/Dialog (5 sizes)
11. SidebarNav
12. Header/Toolbar
13. FileDropZone
14. QueueItem (with inline progress)
15. PresetSelector
16. EncoderSelect (with optgroups)
17. ResolutionPill / FPSPill
18. VideoPlayer (custom controls)
19. SubtitleOverlay
20. LogViewer (virtualized)
21. StatusIndicator (spinner, dot, badge)
22. EmptyState
23. Divider
24. Accordion/Details