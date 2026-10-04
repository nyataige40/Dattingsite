// Icon components using inline SVGs (no external dependency needed)
import React from 'react';

const iconProps = {
  size: 20,
  color: 'currentColor',
  strokeWidth: 2,
  ...(({ size, ...rest }) => rest)
};

const Icon = ({ size = 20, color = 'currentColor', strokeWidth = 2, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  />
);

export const Mail = (props) => (
  <Icon {...props} viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 2 17.5V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14.5a2.5 2.5 0 0 1-2.5 2.5H4z" />
    <path d="M4 7l8 5 8-5" />
  </Icon>
);

export const Lock = (props) => (
  <Icon {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

export const User = (props) => (
  <Icon {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

export const Eye = (props) => (
  <Icon {...props}>
    <path d="M1 12s8-7 11-7 11 7 11 7-8 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOff = (props) => (
  <Icon {...props}>
    <path d="M17.94 17.94A2.6 2.6 0 0 1 11 20a9.38 9.38 0 0 1-5.34-1.66 1 1 0 0 0 .82 1.53 7.38 7.38 0 0 0 5.52-1.88z" />
    <path d="M1 1l23 23" />
    <path d="M8.5 8.5A3.5 3.5 0 1 0 12 5a3.5 3.5 0 0 0-3.5 3.5z" />
    <path d="M12 12.5A5 5 0 0 0 12 19a9.38 9.38 0 0 0 4.34-1.06 1 1 0 0 0-1.17-1.61A5 5 0 0 1 12 12.5z" />
  </Icon>
);

export const GoogleIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M5.83 14.75C5.41 14.41 5.09 13.99 4.87 13.48C4.65 12.97 4.54 12.43 4.54 11.88C4.54 11.33 4.65 10.79 4.87 10.28C5.09 9.77 5.41 9.35 5.83 9C6.25 8.65 6.75 8.42 7.3 8.3C7.86 8.18 8.44 8.23 8.99 8.39L8.99 5.83C7.88 5.54 6.73 5.41 5.58 5.44C4.43 5.47 3.32 5.72 2.31 6.17C1.3 6.62 0.51 7.25 0 8.02C-0.51 8.79-0.76 9.68-0.76 10.62C-0.76 11.56-0.51 12.45 0 13.23C0.51 14 1.3 14.64 2.31 15.08C3.32 15.54 4.43 15.78 5.58 15.82L5.83 15.82C5.83 15.5 5.83 15.13 5.83 14.75" fill="#4285F4" />
    <path d="M9.25 8.305V15.305L14.465 11.805L9.25 8.305Z" fill="#34A853" />
    <path d="M21.82 10.75C21.69 10.38 21.48 10.04 21.19 9.75C20.9 9.46 20.55 9.23 20.13 9.06C19.72 8.89 19.29 8.8 18.84 8.8C18.39 8.8 17.96 8.89 17.54 9.06C17.12 9.23 16.77 9.46 16.48 9.75C16.18 10.03 15.96 10.37 15.82 10.77L15.8 10.77L13.9 11.805L15.81 12.847C16.09 12.56 16.41 12.31 16.76 12.11C17.11 11.91 17.5 11.83 17.89 11.9C18.28 11.96 18.66 12.12 18.99 12.37C19.32 12.63 19.58 12.96 19.76 13.35C19.94 13.74 20.03 14.18 20.03 14.63C20.03 13.95 19.93 13.28 19.74 12.63C19.55 12.04 19.2 11.5 18.72 11.05C18.25 10.63 17.69 10.33 17.06 10.2C17.69 10.18 18.32 10.34 18.87 10.75C19.15 10.97 19.37 11.26 19.53 11.61C19.69 11.97 19.77 12.36 19.77 12.75C19.77 13.14 19.69 13.54 19.53 13.89C19.37 14.25 19.15 14.54 18.87 14.76L18.87 14.76L21.82 12.847L21.82 10.75Z" fill="#EA4335" />
  </svg>
);

export const FacebookIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" {...props}>
    <path d="M22.675 0h-21.35C.596 0 .001.594 0 1.326v21.348C0 23.406.596 24 1.326 24h11.494v-9.294H9.692V11.01h3.128V8.414c0-3.1 1.894-4.788 4.66-4.788 1.326 0 2.466.099 2.797.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.764v2.313h3.587l-.467 3.696h-3.12V24h6.116c.73 0 1.326-.594 1.326-1.326V1.326C24 .594 23.404 0 22.675 0z" />
  </svg>
);

export const ShoppingBag = (props) => (
  <Icon {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M12 2v4" />
    <path d="M5 20h14" />
    <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
  </Icon>
);

export const MessageCircle = (props) => (
  <Icon {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.4 5.5 5.5 0 0 1-7.7 2.8 6.5 6.5 0 0 1-2.4-.8" />
  </Icon>
);

export const LogOut = (props) => (
  <Icon {...props}>
    <path d="M9 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z" />
    <path d="M14 12h-4" />
    <path d="M12 10l2 2-2 2" />
  </Icon>
);

export const Check = (props) => (
  <Icon {...props}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);

export const Upload = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
);

export const Heart = (props) => (
  <Icon {...props}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
  </Icon>
);

export const Star = (props) => (
  <Icon {...props}>
    <polygon points="12 2 15 11 22 11 17 17 19 26 12 20 5 26 7 17 2 11 9 11 12 2" />
  </Icon>
);

export const Send = (props) => (
  <Icon {...props}>
    <line x1="22" y1="2" x2="11" y2="11" />
    <polygon points="6 22 10 14 14 10 2 6" />
  </Icon>
);

export const RefreshCw = (props) => (
  <Icon {...props}>
    <polyline points="3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.34 2.41" />
    <path d="M3 3l6 6" />
  </Icon>
);

export const Bell = (props) => (
  <Icon {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);

export const X = (props) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

export { Icon };
