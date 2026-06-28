/**
 * HoverIcons — Animated SVG Icons aus itshover/itshover
 * Nutzt motion/react für Premium Hover-Animationen
 * 
 * Wrapper-Komponenten: Kompatibel mit lucide-react API (size, strokeWidth, className)
 * Die echten animierten Icons werden über forwardRef + useAnimate aus motion/react angesteuert.
 */

import { memo, useRef, useCallback } from "react";
import { type AnimatedIconHandle } from "./types";
import TrophyIcon from "./trophy-icon";
import GlobeIcon from "./globe-icon";
import UserIcon from "./user-icon";
import HomeIcon from "./home-icon";
import StarIcon from "./star-icon";
import ChartBarIcon from "./chart-bar-icon";
import UsersIcon from "./users-icon";
import UsersGroupIcon from "./users-group-icon";
import TargetIcon from "./target-icon";
import HeartIcon from "./heart-icon";
import FilledBellIcon from "./filled-bell-icon";
import BellOffIcon from "./bell-off-icon";
import LogoutIcon from "./logout-icon";
import SaveIcon from "./save-icon";
import TrashIcon from "./trash-icon";
import LockIcon from "./lock-icon";
import EyeIcon from "./eye-icon";
import EyeOffIcon from "./eye-off-icon";
import RefreshIcon from "./refresh-icon";
import CheckedIcon from "./checked-icon";
import DoubleCheckIcon from "./double-check-icon";
import UserPlusIcon from "./user-plus-icon";
import ShieldCheckIcon from "./shield-check";
import SendIcon from "./send-icon";
import ChartLineIcon from "./chart-line-icon";
import DownloadIcon from "./download-icon";

interface HoverIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

/** Erstellt eine hover-animierte Icon-Wrapper-Komponente */
function makeAnimatedIcon(
  DisplayName: string,
  Component: React.ForwardRefExoticComponent<
    { size?: number; color?: string; strokeWidth?: number; className?: string } & 
    React.RefAttributes<AnimatedIconHandle>
  >
) {
  const Wrapped = memo(function AnimIcon({ 
    size = 24, 
    strokeWidth = 2, 
    className = "",
    color = "currentColor"
  }: HoverIconProps) {
    const ref = useRef<AnimatedIconHandle>(null);
    const handleEnter = useCallback(() => ref.current?.startAnimation(), []);
    const handleLeave = useCallback(() => ref.current?.stopAnimation(), []);

    return (
      <span 
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-flex items-center justify-center"
      >
        <Component
          ref={ref}
          size={size}
          strokeWidth={strokeWidth}
          className={className}
          color={color}
        />
      </span>
    );
  });
  Wrapped.displayName = DisplayName;
  return Wrapped;
}

// ─── Navigation Icons ────────────────────────────────────────
export const HoverTrophyIcon   = makeAnimatedIcon("HoverTrophyIcon",    TrophyIcon);
export const HoverGlobeIcon    = makeAnimatedIcon("HoverGlobeIcon",     GlobeIcon);
export const HoverUserIcon     = makeAnimatedIcon("HoverUserIcon",      UserIcon);
export const HoverHomeIcon     = makeAnimatedIcon("HoverHomeIcon",      HomeIcon);
export const HoverUsersIcon    = makeAnimatedIcon("HoverUsersIcon",     UsersIcon);
export const HoverUsersGroupIcon = makeAnimatedIcon("HoverUsersGroupIcon", UsersGroupIcon);

// ─── Content Icons ───────────────────────────────────────────
export const HoverStarIcon       = makeAnimatedIcon("HoverStarIcon",       StarIcon);
export const HoverChartBarIcon   = makeAnimatedIcon("HoverChartBarIcon",   ChartBarIcon);
export const HoverChartLineIcon  = makeAnimatedIcon("HoverChartLineIcon",  ChartLineIcon);
export const HoverTargetIcon     = makeAnimatedIcon("HoverTargetIcon",     TargetIcon);
export const HoverHeartIcon      = makeAnimatedIcon("HoverHeartIcon",      HeartIcon);
export const HoverShieldCheckIcon = makeAnimatedIcon("HoverShieldCheckIcon", ShieldCheckIcon);

// ─── Action Icons ─────────────────────────────────────────────
export const HoverFilledBellIcon = makeAnimatedIcon("HoverFilledBellIcon", FilledBellIcon);
export const HoverBellOffIcon    = makeAnimatedIcon("HoverBellOffIcon",    BellOffIcon);
export const HoverLogoutIcon     = makeAnimatedIcon("HoverLogoutIcon",     LogoutIcon);
export const HoverSaveIcon       = makeAnimatedIcon("HoverSaveIcon",       SaveIcon);
export const HoverTrashIcon      = makeAnimatedIcon("HoverTrashIcon",      TrashIcon);
export const HoverDownloadIcon   = makeAnimatedIcon("HoverDownloadIcon",   DownloadIcon);
export const HoverSendIcon       = makeAnimatedIcon("HoverSendIcon",       SendIcon);
export const HoverRefreshIcon    = makeAnimatedIcon("HoverRefreshIcon",    RefreshIcon);

// ─── Auth/Form Icons ──────────────────────────────────────────
export const HoverLockIcon       = makeAnimatedIcon("HoverLockIcon",       LockIcon);
export const HoverEyeIcon        = makeAnimatedIcon("HoverEyeIcon",        EyeIcon);
export const HoverEyeOffIcon     = makeAnimatedIcon("HoverEyeOffIcon",     EyeOffIcon);
export const HoverCheckedIcon    = makeAnimatedIcon("HoverCheckedIcon",    CheckedIcon);
export const HoverDoubleCheckIcon = makeAnimatedIcon("HoverDoubleCheckIcon", DoubleCheckIcon);
export const HoverUserPlusIcon   = makeAnimatedIcon("HoverUserPlusIcon",   UserPlusIcon);

// ─── Legacy-Compat: einfache SVG-Wrappers für Stellen wo keine Animationen nötig
// (identisch mit was vorher war - als Fallback)
export const HoverClockIcon = memo(function HoverClockIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
});
