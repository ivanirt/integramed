function Icon({
  children,
  className = "h-[18px] w-[18px]",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </Icon>
  );
}

export function CalendarIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </Icon>
  );
}

export function UsersIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 19a4.5 4.5 0 0 1 5 0" />
    </Icon>
  );
}

export function PharmacyIcon() {
  return (
    <Icon>
      <rect x="9" y="3" width="6" height="18" rx="3" />
      <path d="M9 8h6M12 5.5v5" />
    </Icon>
  );
}

export function StaffIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Icon>
  );
}

export function VaultIcon() {
  return (
    <Icon>
      <path d="M5 7.5 12 4l7 3.5v8.2c0 3.2-3 5.3-7 6.8-4-1.5-7-3.6-7-6.8z" />
      <path d="M12 11v4M12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3V21M4.9 6.5l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12H21M4.9 17.5l1.6-1.6M17.5 8l1.6-1.6" />
    </Icon>
  );
}

export function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function OffDayIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17M8.5 15l7-4M15.5 15l-7-4" />
    </Icon>
  );
}

export function LogoutIcon() {
  return (
    <Icon>
      <path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" />
      <path d="M13 8l4 4-4 4M17 12H9" />
    </Icon>
  );
}
