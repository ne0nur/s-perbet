import { memo } from "react";

interface HoverIconProps { size?: number; className?: string; }

export const HoverTrophyIcon = memo(function HoverTrophyIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <g
              style={{ transformOrigin: "center 20px" }}
            >
              {/* Handles */}
              <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
              <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
    
              {/* Base */}
              <path d="M4 22h16" />
              <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
              <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
    
              {/* Cup Body */}
              <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
    
              {/* Confetti Pieces */}
              <rect
                x="11"
                y="6"
                width="2"
                height="2"
                rx="0.5"
                fill="#FFD700"
                stroke="none"
                opacity={0}
                style={{ transformOrigin: "center" }}
              />
              <rect
                x="12"
                y="5"
                width="2"
                height="2"
                rx="0.5"
                fill="#FF4500"
                stroke="none"
                opacity={0}
                style={{ transformOrigin: "center" }}
              />
              <rect
                x="13"
                y="6"
                width="2"
                height="2"
                rx="0.5"
                fill="#00BFFF"
                stroke="none"
                opacity={0}
                style={{ transformOrigin: "center" }}
              />
              <rect
                x="12"
                y="7"
                width="2"
                height="2"
                rx="0.5"
                fill="#32CD32"
                stroke="none"
                opacity={0}
                style={{ transformOrigin: "center" }}
              />
            </g>
    </svg>
  );
});

export const HoverLockIcon = memo(function HoverLockIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    
            {/* Lock body */}
            <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" />
    
            {/* Keyhole */}
            <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
    
            {/* Lock shackle */}
            <path
              d="M8 11v-4a4 4 0 1 1 8 0v4"
              style={{ transformOrigin: "50% 100%" }}
            />
    </svg>
  );
});

export const HoverClockIcon = memo(function HoverClockIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path
              d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
            />
            <path d="M12 7v5l3 3" />
    </svg>
  );
});

export const HoverHomeIcon = memo(function HoverHomeIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
            <path
              style={{ transformOrigin: "center" }}
              d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"
            />
            <path
              style={{ transformOrigin: "center bottom" }}
              d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"
            />
    </svg>
  );
});

export const HoverUserIcon = memo(function HoverUserIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <g
              style={{ transformOrigin: "50% 50%" }}
            >
              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
              <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
            </g>
    </svg>
  );
});

export const HoverGlobeIcon = memo(function HoverGlobeIcon({ size = 24, className = "" }: HoverIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <g
                style={{ transformOrigin: "23px 19px" }}
              >
                <path
                  d="M36.6225 22.1264C34.6145 19.2959 32.3651 15.7913 28.4377 17.3428C24.4307 18.9257 30.0493 23.15 25.2064 26.9189C22.1135 29.3259 22.8515 31.6477 23.9478 33"
                />
    
                <path
                  d="M14 30L15.336 28.0984C16.3999 26.5841 16.557 24.5077 15.7357 22.8151L15.5751 22.4842C14.5131 20.2955 15.1651 17.5604 17.0607 16.253L17.3292 16.0677C18.2109 15.4596 18.808 14.4478 18.9613 13.3023C19.1316 12.0291 18.7338 10.7433 17.8962 9.85981L15.3599 7.24048"
                />
    
                <path
                  d="M23.0628 5C22.3771 9.64991 27.3946 14.948 33.7332 10.0381"
                />
    
                <path
                  d="M23 33C30.732 33 37 26.732 37 19C37 11.268 30.732 5 23 5C15.268 5 9 11.268 9 19C9 26.732 15.268 33 23 33Z"
                />
              </g>
    
              <path d="M23 43V38" />
    
              <path d="M16 43H30" />
    
              <path
                d="M38 3.99994L36.435 5.56491C43.855 12.9849 43.855 25.015 36.435 32.435C29.0151 39.8549 16.9849 39.8549 9.56497 32.435L7.99997 34"
              />
    </svg>
  );
});
