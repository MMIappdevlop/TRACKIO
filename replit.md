# Trackio - Personal Training Log

## Overview
Trackio is a mobile-first personal training log built with React Native + Expo (TypeScript). It is designed for single-user, offline-first operation with all data stored locally on the device. Trackio does not provide training plans; users always bring their own program and exercises.

**Core Promise**: "Bring your plan. Trackio records your training."

## Recent Changes
- **2026-03-05**: Optional Location field on training days — free-text "Location (optional)" input on Session Template Detail screen (below day picker); location displayed with map-pin icon under day title in Plan view (ProgramDetailScreen); not shown during workout execution; stored as `locationName?: string` on DayTemplate
- **2026-03-05**: In-app Weight Update Reminder — Settings → Reminders → Weight Reminder screen with toggle, day-of-week multi-select pills, hour/minute stepper time picker; in-app reminder popup on app open checks day/time/existing entry conditions; weight upsell popup after first workout + 10-day re-prompt; WeightLogModal for decimal weight input; all state persisted locally (no OS notifications)
- **2026-03-05**: Progress screen consolidation — merged old Card 2 (grid comparison) and Card 3 (summary list) into a single Card 2 with clean list-style rows showing 5 metrics (Sessions, Training Time, Distance, Training Weight, Body Weight) with colored delta arrows + "Share as PNG" button; Card 1 now has "This Week" section label; PNG export updated to match 2-card layout; deleted WeeklySummaryCard.tsx
- **2026-03-05**: Progress screen redesign — opaque header shows "My Progress" with "Week N · date range" subtitle; Card 1: Quick Progress Overview with 5 metrics (Weight, Workout Days, Total Exercises, Calories Burned, Training Duration); collapsible "This Week" sessions section; calendar icon in header navigates to Training History Calendar
- **2026-03-05**: Training History Calendar — full month grid (Mon-Sun), dot indicators for training days, day selection shows sessions below, month navigation arrows, navigates to SessionDetail on tap
- **2026-03-05**: Add Exercise button moved from header to exercise name row — pill-shaped "Add" button styled like "Add Set", positioned right of exercise name
- **2026-02-28**: Server-mediated backup export — client POSTs backup JSON to `POST /api/backup`, server stores in memory (5min TTL, max 20 entries, 10MB cap), returns download URL; client opens `GET /api/backup/:id/download` via WebBrowser; replaces broken client-side FileSystem/Sharing approach; import uses fallback chain (FileSystem → fetch)
- **2026-02-28**: Session header layout — "+" (add exercise) moved to left header alongside the X (cancel) button; "Finish" stands alone on the right; add exercise modal now uses KeyboardAvoidingView so the sheet floats above the keyboard
- **2026-02-28**: Ad-hoc exercise during active workout — "+" button in header opens a bottom-sheet modal to add a session-only exercise (name, mode, set count for strength); navigates directly to it; saved in session summary like any planned exercise
- **2026-02-28**: Color/text cleanup — all hardcoded colors now reference theme.ts constants; added `overlay` to theme; `#FFFFFF` replaced with `theme.buttonText`, accent colors with `theme.link`, overlay rgba with `theme.overlay`
- **2026-02-28**: Session pause/resume — auto-saves workout progress, resume banner on Training home, Save & Exit / Discard options
- **2026-02-28**: Calorie setup prompt moved to Training home screen — appears once after first plan is created or imported, never again after dismissal
- **2026-02-28**: Rest timer now starts paused (user presses Start), button changed from "Skip Rest" to "Skip"
- **2026-02-28**: All numeric inputs (weight, distance, target distance) now support decimal values (e.g., 12.5, 5.5)
- **2026-02-28**: Duration input for distance exercises changed from minutes-only to mm:ss format (e.g., 12:21)
- **2026-02-24**: Added previous weight/reps hints on strength exercise set rows during workouts ("Last: X kg x Y reps")
- **2026-02-18**: Added estimated calorie burn display to session summary and history (MET-based with intensity multipliers)
- **2026-02-01**: Added profile fields for weight, height, and age (optional)
- **2026-02-01**: Exercise cards now expand to show Move/Delete actions directly (removed long press)
- **2026-02-01**: Added optional reference link field to exercises (video/article URL)
- **2025-01-25**: Redesigned program creation with one-screen Program Builder - inline session/task creation, no modals
- **2024-01-24**: Initial MVP implementation with full offline-first functionality

## Project Architecture

### Tech Stack
- **Frontend**: React Native with Expo SDK 54
- **Navigation**: React Navigation 7 (bottom tabs + native stack)
- **State Management**: React hooks + AsyncStorage for persistence
- **Styling**: StyleSheet with Trackio design system
- **Fonts**: Inter (Google Fonts)

### Directory Structure
```
client/
├── App.tsx                 # Root component with font loading
├── components/             # Reusable UI components
│   ├── BadgeCard.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── EmptyState.tsx
│   ├── HeaderTitle.tsx
│   ├── InputModal.tsx
│   ├── RestTimerSheet.tsx
│   ├── SessionHistoryCard.tsx
│   ├── SessionTemplateCard.tsx
│   ├── TaskCard.tsx
│   ├── ThemedText.tsx
│   ├── ThemedView.tsx
│   ├── WeeklyStatsCard.tsx
│   ├── WeightLogModal.tsx
│   ├── WeightReminderPopup.tsx
│   └── WeightUpsellPopup.tsx
├── constants/
│   └── theme.ts            # Design system (colors, spacing, typography)
├── hooks/
│   ├── useColorScheme.ts
│   ├── useData.ts          # Data hooks for all entities
│   ├── useScreenOptions.ts
│   └── useTheme.ts
├── lib/
│   ├── query-client.ts
│   └── storage.ts          # AsyncStorage CRUD operations
├── navigation/
│   ├── MainTabNavigator.tsx
│   ├── ProgressStackNavigator.tsx
│   ├── ProfileStackNavigator.tsx
│   ├── RootStackNavigator.tsx
│   └── TrainingStackNavigator.tsx
├── screens/
│   ├── AddTaskScreen.tsx
│   ├── BadgesScreen.tsx
│   ├── DataBackupScreen.tsx
│   ├── ImportProgramScreen.tsx
│   ├── IntervalTimerScreen.tsx
│   ├── ProfileHomeScreen.tsx
│   ├── ProgramDetailScreen.tsx
│   ├── ProgramListScreen.tsx
│   ├── ProgressHomeScreen.tsx
│   ├── SessionDetailScreen.tsx
│   ├── SessionRunScreen.tsx
│   ├── SessionSummaryScreen.tsx
│   ├── SessionTemplateDetailScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── TaskDetailScreen.tsx
│   ├── TrainingCalendarScreen.tsx
│   ├── TrainingHomeScreen.tsx
│   └── WeightReminderScreen.tsx
└── types/
    └── index.ts            # TypeScript type definitions
```

### Data Model
- **Program**: Training programs (can be active/archived)
- **SessionTemplate**: Workout templates within a program
- **TaskTemplate**: Exercises/activities within a session (strength, distance, interval, time, notes)
- **CompletedSession**: Logged workout sessions
- **CompletedTask**: Individual task data from completed sessions
- **BadgeAward**: Achievement milestones
- **Settings**: User preferences (units, RPE/RIR toggles)

### Navigation Structure
Bottom Tab Bar with 3 tabs:
1. **Training** - Active program, session templates, start workouts
2. **Progress** - Weekly overview, session history, task history
3. **Profile** - Badges, settings, import/export/backup

## Design System

### Colors
- **Background**: #0F1115 (root), #181B21 (surface), #1F2430 (elevated)
- **Text**: #E6E8EB (primary), #9AA0AA (secondary), #6B7280 (muted)
- **Steel Blue** (#4C7DFF): Primary accent for navigation, buttons, selections
- **Burnt Orange** (#E76F51): ONLY for active effort states (running timers, active sets)
- **Badges**: Bronze (#8C6A4A), Silver (#AEB4BC), Steel (#6E7C8C), Gold (#D4AF37)

### Typography
- Font: Inter (Regular 400, Medium 500, SemiBold 600, Bold 700)
- H1: 24px SemiBold, H2: 18px Medium, Body: 15px Regular
- Stats use tabular numbers for alignment

### Design Rules
1. One accent color per screen
2. Orange visible = user actively training
3. Numbers more prominent than labels
4. Readability over aesthetics
5. Calm beats impressive

## User Preferences
- Dark-first theme (light mode supported)
- Minimal animations (fade/slide only)
- No emojis in UI
- Feather icons for all iconography

## Key Features
- **Offline-first**: All data stored locally via AsyncStorage
- **5 Task Modes**: Strength, Distance, Interval, Time, Notes
- **Rest Timer**: Bottom sheet with +/-15s controls
- **Weekly Stats**: Sessions count, duration, volume, distance
- **Badges**: Training days, strength/distance milestones, lifetime achievements
- **Import/Export**: JSON backup + CSV/XLSX program import
