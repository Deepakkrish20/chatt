# Chatt 💬

A private, secure, closed-circle mobile messaging application built with **Expo**, **React Native**, and **TypeScript**.

## Product Core Rule

* **10-Member Hard Cap**: Strictly limited to a maximum of 10 registered accounts.
* **1-to-1 Messaging Only**: Exclusively direct, private conversations. No group channels or public feeds.

## Project Structure

* `src/app/` — Screen routes and layout managed by Expo Router
* `src/components/` — Reusable UI components styled with design tokens
* `src/theme/` — Dark-first color palette, spacing, and typography tokens
* `src/types/` — Application models and TypeScript definitions
* `src/utils/` — Common utility functions
* `src/lib/supabase/` — Supabase integration skeleton (Auth & DB target for subsequent modules)
* `docs/` — System architecture and module documentation

## Development Commands

```bash
# Start development server
npm run start

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Validate Expo environment and packages
npx expo-doctor
```
