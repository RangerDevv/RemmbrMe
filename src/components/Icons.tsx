// SVG Icons for RemmbrMe
// Clean, consistent icon set to replace emojis

import { JSX } from 'solid-js';

interface IconProps {
    class?: string;
    size?: number;
}

// Helper to apply common props
const iconProps = (props: IconProps): JSX.SvgSVGAttributes<SVGSVGElement> => ({
    class: props.class || 'w-5 h-5',
    width: props.size || 20,
    height: props.size || 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round' as const,
    'stroke-linejoin': 'round' as const,
});

// Dashboard / Chart icon
export const DashboardIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
);

// Checkmark / Todo icon
export const CheckIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

// Circle with checkmark (completed)
export const CheckCircleIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

// Calendar icon
export const CalendarIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

// Clock / Time Machine icon
export const ClockIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

// Robot / AI icon
export const RobotIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <circle cx="9" cy="14" r="2" />
        <circle cx="15" cy="14" r="2" />
        <path d="M12 2v4" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
);

// Tag icon
export const TagIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
);

// Plus icon
export const PlusIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

// Search icon
export const SearchIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

// Edit / Pencil icon
export const EditIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);

// Trash / Delete icon
export const TrashIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

// Settings / Gear icon
export const SettingsIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
);

// Star icon
export const StarIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

// Logout / Door icon
export const LogoutIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

// Warning / Alert triangle icon
export const WarningIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// Error / X circle icon
export const ErrorIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

// Info icon
export const InfoIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

// Question icon
export const QuestionIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// Bell / Notification icon
export const BellIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

// Repeat / Recurrence icon
export const RepeatIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
);

// Lightning bolt / Active icon
export const BoltIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

// Priority High (red circle)
export const PriorityHighIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="none" />
        <line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="2" />
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" stroke-width="2" />
    </svg>
);

// Priority Medium (yellow circle)
export const PriorityMediumIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" fill="#eab308" stroke="none" />
        <line x1="8" y1="12" x2="16" y2="12" stroke="white" stroke-width="2" />
    </svg>
);

// Priority Low (green circle)
export const PriorityLowIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="none" />
        <polyline points="8 12 11 15 16 9" fill="none" stroke="white" stroke-width="2" />
    </svg>
);

// Calendar with day marker
export const CalendarDayIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <rect x="8" y="14" width="8" height="4" rx="1" fill="currentColor" />
    </svg>
);

// Calendar with week marker
export const CalendarWeekIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="6" y1="15" x2="18" y2="15" stroke-width="3" />
    </svg>
);

// Calendar month icon
export const CalendarMonthIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="8" cy="15" r="1.5" fill="currentColor" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" />
        <circle cx="16" cy="15" r="1.5" fill="currentColor" />
    </svg>
);

// Heart icon
export const HeartIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" stroke="none" />
    </svg>
);

// Chevron down icon
export const ChevronDownIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// Chevron up icon  
export const ChevronUpIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

// User icon
export const UserIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

// X / Close icon
export const XIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// Menu icon (hamburger)
export const MenuIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

// Success / Checkmark solid
export const SuccessIcon = (props: IconProps) => (
    <svg {...iconProps(props)}>
        <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="none" />
        <polyline points="8 12 11 15 16 9" fill="none" stroke="white" stroke-width="2" />
    </svg>
);
