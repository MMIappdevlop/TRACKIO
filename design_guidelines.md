# Trakio Design Guidelines

## Brand Identity
**Purpose**: Offline-first personal training log for users who bring their own programs. Fast logging, trustworthy history, clear progress.

**Visual Direction**: Dark-first, minimal, instrument-like. Professional and data-focused, avoiding fitness clichés. Built for long-term daily use. Numbers are more prominent than labels. Calm beats impressive.

**Memorable Element**: Burnt orange accent appears ONLY during active training (running timers, active sets)—creating a clear "work mode" visual state that disappears when not training.

---

## Navigation Architecture
**Root Navigation**: Bottom Tab Bar (3 tabs)
1. **Training** - Active program, session templates, start workouts
2. **Progress** - Weekly overview, session history, task history
3. **Profile** - Badges, settings, import/export/backup

No authentication required (offline-first, local storage only).

---

## Screen-by-Screen Specifications

### Training Tab Screens

**Training Home**
- Header: "Training" (H1), right button: program switcher icon
- Content: Active program name + session template list (scrollable)
- Empty state: "Create Program" button with illustration
- Floating action button: "New Program" (steel blue)
- Safe area: top (insets.top + Spacing.xl), bottom (tabBarHeight + Spacing.xl)

**Session Logging Screen** (modal, full screen)
- Header: Session template name, left: close, right: finish
- Content: Scrollable task list with mode-specific inputs
- Strength tasks show previous performance, set checkboxes, rest timer bottom sheet (burnt orange when active)
- Distance tasks: distance + duration inputs, auto-calculated pace display
- Interval tasks: full-screen timer button → timer modal (burnt orange)
- Safe area: top (headerHeight + Spacing.xl), bottom (insets.bottom + Spacing.xl)

**Session Summary** (modal after finish)
- Header: "Session Complete"
- Content: Factual stats (tasks completed, sets, volume, distance, duration), difficulty rating (1-5 stars), comparative insight, reflective quote
- Bottom: "Save" button (steel blue)

### Progress Tab Screens

**Progress Home**
- Header: "Progress" (H1)
- Content: Weekly overview card (sessions, duration, volume, distance), session history list with filters (by program, by type)
- Safe area: top (insets.top + Spacing.xl), bottom (tabBarHeight + Spacing.xl)

**Session Detail**
- Header: Session template name + date
- Content: Full logged data for all tasks
- Safe area: standard navigation stack

**Task History**
- Header: Task name
- Content: Last result, best result, list of sessions where task appeared
- Safe area: standard navigation stack

### Profile Tab Screens

**Profile Home**
- Header: "Profile" (H1)
- Content: User avatar + name (editable), badges section, settings list, data & backup section
- Safe area: top (insets.top + Spacing.xl), bottom (tabBarHeight + Spacing.xl)

**Badges Screen**
- Header: "Badges"
- Content: Grid of badge cards (bronze/silver/steel/gold colors), tap for detail
- Safe area: standard navigation stack

**Badge Detail** (modal)
- Header: Badge name
- Content: Badge icon, calm contextual meaning, date earned
- Safe area: standard modal

**Import Program**
- Header: "Import Program"
- Content: File picker trigger, CSV/XLSX preview table, column mapping UI, validation errors list
- Safe area: standard navigation stack

---

## Typography System
**Font**: Inter (Regular 400, Medium 500, SemiBold 600, Bold 700)
- H1 (screen titles): Inter SemiBold, 22-24px
- H2 (section titles): Inter Medium, 16-18px
- Primary body: Inter Regular, 15-16px
- Secondary text: Inter Regular, 13-14px
- Key stats: Inter SemiBold, 20-24px, tabular numbers ON
- Inline numbers: Inter Medium, 15-16px, tabular numbers ON

---

## Color Palette
**Backgrounds**:
- App background: #0F1115
- Surface/card: #181B21
- Elevated/modal: #1F2430

**Text**:
- Primary: #E6E8EB
- Secondary: #9AA0AA
- Muted: #6B7280

**Accents**:
- Steel Blue (primary, navigation, buttons): #4C7DFF (pressed: #3A63CC, background: rgba(76,125,255,0.12))
- Burnt Orange (effort states ONLY): #E76F51 (background: rgba(231,111,81,0.15))

**Badges**: Bronze #8C6A4A, Silver #AEB4BC, Steel #6E7C8C, Gold #D4AF37

**Design Rules**:
1. One accent color per screen
2. Orange visible = user actively training
3. Numbers more prominent than labels
4. Readability over aesthetics
5. Calm beats impressive

---

## Assets to Generate

**App Icon** (icon.png)
- Minimal, instrument-like design with steel blue accent on dark background
- WHERE USED: Device home screen

**Splash Icon** (splash-icon.png)
- Simplified version of app icon
- WHERE USED: App launch screen

**Empty Training** (empty-training.png)
- Illustration of training log/clipboard, neutral style
- WHERE USED: Training tab when no programs exist

**Empty Progress** (empty-progress.png)
- Illustration of chart/graph, minimal style
- WHERE USED: Progress tab when no sessions logged

**Empty Badges** (empty-badges.png)
- Illustration of achievement medallion, subtle
- WHERE USED: Badges screen when no badges earned

**User Avatar Preset** (avatar-default.png)
- Simple geometric avatar in steel blue
- WHERE USED: Profile screen default avatar

**Badge Icons** (badge-[name].png for each badge family)
- Flat, minimal icons for 6 badge families (training days, strength milestones, distance milestones, lifetime volume, lifetime distance, program completion)
- Use bronze/silver/steel/gold colors
- WHERE USED: Badge grid and badge detail screens