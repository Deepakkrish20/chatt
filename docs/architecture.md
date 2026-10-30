# Chatt — System Architecture & Foundation Document

## 1. Overview & Purpose of Module 1

This document defines the architectural baseline and technical foundation for **Chatt**, a high-privacy, closed-circle mobile messaging application.

The primary objective of **Module 1 (Project Foundation Setup)** is to create a clean, stable, and strictly typed baseline project structure without prematurely implementing authentication, database persistence, or messaging mechanics.

---

## 2. Core Product Requirements & Constraints

* **Maximum Registered Members**: The application strictly enforces a **hard cap of 10 registered members**. Once 10 accounts exist, no additional users may register.
* **One-to-One Messaging Only**: Communication is exclusively private, direct one-to-one messaging between registered members. Public channels, open rooms, and group chats are explicitly out of scope.
* **Closed-Circle Privacy**: All messaging data, user presence, and media are restricted solely to the two participants of each direct conversation.

---

## 3. Technology Stack

| Layer | Technology | Version / Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Expo | SDK 58 | Managed React Native development, cross-platform compilation |
| **Runtime** | React Native | 0.88.1 (React 19.3.0) | Native mobile UI primitives |
| **Language** | TypeScript | Strict Mode (~6.0) | End-to-end static typing and interface contracts |
| **Navigation** | Expo Router | ~58.0.28 | File-based routing located in `src/app/` |
| **Backend Target** | Supabase | Future Integration | PostgreSQL, Row-Level Security (RLS), Auth & Realtime engine |
| **Version Control**| Git | Git repository initialized | Change management and milestone tracking |

---

## 4. Project Directory Structure

```text
chatt/
├── .gitignore                     # Git ignore rules for Expo/React Native & dependencies
├── AGENTS.md                      # Agent rules and Expo SDK guidelines
├── app.json                       # Expo application manifest and configuration
├── assets/                        # Static icons, splash images, and app badges
│   └── images/
├── docs/
│   └── architecture.md            # System architecture, constraints, and module roadmap
├── package.json                   # Project manifest, scripts, and dependencies
├── tsconfig.json                  # Strict TypeScript configuration with alias mappings
├── eslint.config.js               # Flat ESLint configuration with expo lint rules
└── src/
    ├── app/                       # Expo Router route definitions (screens and layout only)
    │   ├── _layout.tsx            # Root Stack navigator, StatusBar & Theme integration
    │   └── index.tsx              # Application entry / verification dashboard
    ├── components/                # Reusable UI component library
    │   ├── AppButton.tsx          # Accessible button with accent styling and pressed states
    │   ├── AppCard.tsx            # Elevated surface container with subtle border & radius
    │   ├── ThemedText.tsx         # Typography component mapping to design tokens
    │   ├── ThemedView.tsx         # Themed container component for background hierarchies
    │   └── index.ts               # Clean component barrel export
    ├── hooks/                     # Custom React hooks
    │   ├── use-color-scheme.ts    # Native color-scheme hook
    │   ├── use-color-scheme.web.ts# SSR/Hydration-safe color-scheme hook for web
    │   └── use-theme.ts           # Access point for active theme and color tokens
    ├── lib/                       # Third-party integrations
    │   └── supabase/              # Future Supabase client & schema contracts
    │       ├── client.ts          # Env configuration placeholder (no credentials/live calls)
    │       ├── types.ts           # Schema models placeholder (Profile, DirectMessage)
    │       └── index.ts           # Supabase barrel export
    ├── theme/                     # Design tokens and theme system
    │   ├── colors.ts              # Dark-first palette, text hierarchy, Electric Indigo accent
    │   ├── spacing.ts             # Spacing scale and corner radius tokens
    │   ├── typography.ts          # Typography scale, line heights, font families
    │   └── index.ts               # AppTheme interface, default dark theme, exports
    ├── types/                     # Shared domain and global TypeScript interfaces
    │   ├── declarations.d.ts      # CSS and asset ambient declarations
    │   └── index.ts               # Domain interfaces and MAX_REGISTERED_MEMBERS constant
    └── utils/                     # Pure utility functions
        └── index.ts               # Text truncation, initials extraction, member cap check
```

---

## 5. Design Foundation

The design system is established in `src/theme/` and adheres to a modern, dark-first visual language tailored for private communications:

1. **Dark Backgrounds**:
   * Root Background: `#0F1117` (OLED-friendly dark base)
   * Surface Layer: `#181B24` (Elevated card containers)
   * Elevated Surface: `#222634` (Interactive / highlighted containers)
   * Subtle Borders: `#2A3042`
2. **Readable Typography**:
   * Text Primary: `#F3F4F6` (High contrast, crisp legibility)
   * Text Secondary: `#9CA3AF` (Captions, timestamps, descriptions)
   * Text Muted: `#6B7280` (Labels, metadata)
3. **Distinctive Accent Color**:
   * Accent: `#6366F1` (Electric Indigo)
   * Accent Hover: `#4F46E5`
   * Accent Light: `#818CF8`
   * Accent Muted: `rgba(99, 102, 241, 0.16)`
4. **Spacing & Geometry**:
   * Consistent spacing units (`xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 48`)
   * Harmonized border radius (`sm: 6`, `md: 10`, `lg: 16`, `full: 9999`)

---

## 6. Planned Future Modules

The application will be developed progressively across the following modules:

* **Module 1 (Current)**: **Project Foundation Setup** — Repository initialization, Expo Router configuration, TypeScript contracts, Theme foundation, Supabase scaffolding, and verification.
* **Module 2**: **Authentication & Access Gatekeeping** — Account creation, login, session persistence, and server-side verification to enforce the strict 10-member ceiling.
* **Module 3**: **Database Schema & Row-Level Security (RLS)** — Supabase PostgreSQL tables (`profiles`, `conversations`, `messages`), real-time triggers, and strict RLS policies allowing access only to 1:1 participants.
* **Module 4**: **Direct 1:1 Messaging & Realtime Presence** — Live chat threads, message delivery receipts, typing indicators, and online status indicators.
* **Module 5**: **Media Attachments, Notifications & Polish** — Secure attachment upload (images), offline caching, push notifications, and production builds via EAS.
