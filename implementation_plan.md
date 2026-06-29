# Implementation Plan: Smart Tournament & Knockout Features

This plan outlines the fixes and major new features requested for the tournament system (World Cup & Champions League support), UI fixes, and the tournament bracket (Turnierbaum).

## 1. Logos & Fallbacks (Wappen & WM Logo)
- **WM Logo**: `getTournamentLogo` (in `utils.ts`) will be updated to return a crisp Wikipedia/Wikimedia URL for the World Cup 2026 logo instead of falling back to a generic soccer ball.
- **National Flags**: `getTeamLogo` (in `teamLogos.ts`) will be rewritten for World Cup teams to automatically map to their 2-letter ISO country code and return the high-quality SVG flag from `flagcdn.com` (e.g. `https://flagcdn.com/de.svg` for Germany).

## 2. Naming & Translations (statt "Liga" -> "Spieltag")
- The German translation for `clRoundLeague` is currently `"{st}. Liga"`, which is confusing for the World Cup and Champions League. 
- **Fix**: It will be changed to `"{st}. Spieltag"` (Matchday) or `"{st}. Runde"` to make sense across all tournaments.
- In `DashboardPage.tsx`, the phase labels will be cleaned up so "PLAY-OFFS", "ACHTELFINALE" etc. are labeled correctly.

## 3. Dashboard Tabs Bug ("3.Liga" lässt Playoffs verschwinden)
- **Bug**: Currently, if you click on Matchday 3, the `matches` state is filtered down to Matchday 3. The `getTabsCount` function mistakenly uses the highest matchday in the *current local state* to render the tabs, causing all future tabs (like Play-Offs) to disappear.
- **Fix**: `getTabsCount` will strictly use the `tournament_configs` (e.g. `group_stage_matchdays + 5`) or a global un-filtered max value, so the tabs never shrink or disappear when you click them.

## 4. Smart Seasons Selector ("tote Saisons raus!")
- Currently, the season selector is hardcoded to `2026, 2025, 2024`.
- **Fix**: The dropdown will dynamically read the `tournament_configs` table. If a tournament like "World Cup 2026" only exists in 2026, the dropdown will **only** show 2026. If a tournament has `has_historical_data = true` (like Süper Lig), it will show the historical seasons. Dead seasons will be removed.

## 5. League Page: Groups & Tournament Bracket (Gruppen & Turnierbaum)
- This is the largest feature. Currently, `LeaguePage` (Tabelle) renders one giant table.
- **Fix**:
  - We will fetch `matches` for the selected tournament. 
  - **Group Stage**: If the tournament has groups (derived from the `group` column in `matches` or `teams` if available), we will split the table into Group A, Group B, Group C, etc.
  - **Tournament Bracket (Turnierbaum)**: We will create a new visual component (`TournamentBracket.tsx`) that renders the knockout stages (Achtelfinale ➔ Viertelfinale ➔ Halbfinale ➔ Finale). It will be visible below the groups or in a separate tab in the League view.

> [!IMPORTANT]
> **User Review Required**
> 1. Does the World Cup 2026 matches in your database currently have a `group` column assigned to them (e.g., "A", "B", "C") so I can group them automatically, or do I need to group them based on the home/away teams?
> 2. Do you agree with fetching the national flags from `flagcdn.com`? They look great and are always up-to-date.
> 3. Should the "Turnierbaum" (Knockout Bracket) be displayed on the **"Liga" (Tabelle)** page below the groups, or do you want a separate button/tab for it?

Please approve this plan or provide feedback on the open questions!
