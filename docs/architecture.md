# Chatt — System Architecture & Foundation Document

## 1. Overview & Project Purpose

This document defines the architectural baseline and technical foundation for **Chatt**, a high-privacy, closed-circle mobile messaging application built with **Expo**, **React Native**, and **TypeScript**.

- **Module 1 (Completed)**: Initialized the baseline project repository, strict TypeScript typing, Expo Router configuration, theme foundations, and empty Supabase placeholders.
- **Module 2 (Completed)**: Established the **Raw Black Monochrome UI Foundation**, complete with design tokens, reusable UI primitives, and 5 fully navigable screens powered by local mock data.
- **Module 3 (Completed)**: **UI Polish & Premium Experience** — Refined tactile animations, micro-interactions, responsive keyboard avoidance, pull-to-refresh, empty & error states, visual slot meters, and peer typing simulations.

---

## 2. Core Product Requirements & Constraints

* **Maximum Registered Members**: The application strictly enforces a **hard cap of 10 registered members**. Once 10 accounts exist, no additional users may register.
* **One-to-One Messaging Only**: Communication is exclusively private, direct one-to-one messaging between registered members. Public channels, open rooms, and group chats are strictly excluded.
* **Closed-Circle Privacy**: All messaging data, user presence, and media are restricted solely to the two participants of each direct conversation.
* **Raw Black Monochrome Aesthetic**: Clean OLED true-black palette without colourful accents, gradients, or excessive ornamentation.

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

## 4. Raw Black Monochrome Design System

The design system is established in `src/theme/` and strictly implements the monochrome palette:

| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `background` | `#000000` | True black base background for OLED screens |
| `surfaceElevated` | `#0A0A0A` | Elevated containers, cards, and modal sheets |
| `surfaceSecondary` | `#111111` | Secondary surfaces, list rows, incoming bubbles |
| `inputBackground` | `#0D0D0D` | Form inputs and message composer background |
| `border` | `#262626` | Geometric dividers, input outlines, and component edges |
| `text` | `#FFFFFF` | Primary high-contrast text and interactive labels |
| `textSecondary` | `#A3A3A3` | Secondary text, chat snippets, descriptions |
| `textMuted` | `#737373` | Metadata, timestamps, placeholders, uppercase tags |

Strictly avoids colorful accents, unnecessary gradients, colorful shadows, and excessive decoration.

---

## 5. Project Directory & Route Structure

```text
chatt/
├── docs/
│   └── architecture.md            # System architecture, constraints, and module roadmap
├── src/
│   ├── app/                       # Expo Router screens and layout
│   │   ├── _layout.tsx            # Root Stack navigator, StatusBar & Theme integration
│   │   ├── index.tsx              # 1. Welcome / Sign-in screen (with inline validation)
│   │   ├── register.tsx           # 2. Member registration screen (validation & slot meter)
│   │   ├── chats.tsx              # 3. Chat list (pull-to-refresh, slot progression bar)
│   │   ├── chat/
│   │   │   └── [id].tsx           # 4. Private 1:1 chat (auto-scroll, typing indicator, reply)
│   │   └── settings.tsx           # 5. Profile & Raw Black appearance settings (sign out modal)
│   ├── components/                # Reusable UI component library
│   │   ├── AppAvatar.tsx          # Initial-based avatar with online indicator
│   │   ├── AppButton.tsx          # Primary, secondary, outline with tactile scale feedback
│   │   ├── AppCard.tsx            # Elevated raw black container with subtle borders
│   │   ├── AppIcon.tsx            # Pure React Native geometric monochrome icons
│   │   ├── AppTextInput.tsx       # Raw black input with animated focus borders & clear action
│   │   ├── ConversationItem.tsx   # Chat list row with snippets, timestamps, unread badge
│   │   ├── MessageBubble.tsx      # Incoming & outgoing chat bubbles with mount animation
│   │   ├── MessageComposer.tsx    # Bottom message composer with animated send action
│   │   ├── ScreenHeader.tsx       # Uniform top navigation header with animated back button
│   │   ├── ThemedText.tsx         # Typography token wrapper
│   │   ├── ThemedView.tsx         # Surface and background wrapper
│   │   └── index.ts               # Clean component barrel export
│   ├── data/
│   │   └── mockData.ts            # Local mock users, conversations, and messages
│   ├── hooks/
│   │   ├── use-color-scheme.ts    # Native color-scheme hook
│   │   ├── use-color-scheme.web.ts# SSR/Hydration-safe hook for web
│   │   └── use-theme.ts           # Access point for active theme and color tokens
│   ├── lib/
│   │   └── supabase/              # Future Supabase client & schema contracts
│   ├── theme/
│   │   ├── colors.ts              # Raw Black color tokens
│   │   ├── spacing.ts             # Spacing scale and corner radius tokens
│   │   ├── typography.ts          # Typography scale, line heights, font families
│   │   └── index.ts               # AppTheme interface, default theme, exports
│   ├── types/
│   │   ├── declarations.d.ts      # CSS and asset ambient declarations
│   │   └── index.ts               # DirectMessage, DirectConversationPreview, UserSummary
│   └── utils/
│       └── index.ts               # Text truncation, initials extraction, member cap check
```

---

## 6. Planned Future Modules

The application is structured to add functional layers sequentially:

* **Module 1 (Done)**: **Project Foundation Setup** — Repository initialization, Expo Router configuration, TypeScript contracts, Theme foundation, Supabase scaffolding, and verification.
* **Module 2 (Done)**: **Raw Black UI Foundation** — Centralized monochrome theme, reusable UI component library, 5 core screens, and local mock navigation.
* **Module 3 (Done)**: **UI Polish & Premium Experience** — Subtle micro-animations, keyboard handling, auto-scroll, pull-to-refresh, typing simulation, and visual constraint indicators.
* **Module 4 (Future)**: **Authentication & Access Gatekeeping** — Account creation, login, session persistence, and server-side verification to enforce the strict 10-member ceiling.
* **Module 5 (Future)**: **Database Schema & Row-Level Security (RLS)** — Supabase PostgreSQL tables (`profiles`, `conversations`, `messages`), real-time triggers, and strict RLS policies allowing access only to 1:1 participants.
* **Module 6 (Future)**: **Direct 1:1 Messaging & Realtime Presence** — Live chat threads, message delivery receipts, typing indicators, and online status indicators.
* **Module 7 (Future)**: **Media Attachments, Notifications & Polish** — Secure attachment upload (images), offline caching, push notifications, and production builds via EAS.
