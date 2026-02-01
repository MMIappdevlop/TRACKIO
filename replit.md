# Trackio - Personal Training Log

## Overview
Trackio is a mobile-first personal training log built with React Native + Expo (TypeScript). It is designed for single-user, offline-first operation with all data stored locally on the device. Trackio does not provide training plans; users always bring their own program and exercises.

**Core Promise**: "Bring your plan. Trackio records your training."

## Recent Changes
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
│   └── WeeklyStatsCard.tsx
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
│   └── TrainingHomeScreen.tsx
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
