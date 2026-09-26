"use client";

type Props = {
  active: boolean;
  onClick: () => void;
  title?: string;
};

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

export function DictationButton({ active, onClick, title }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || "Dictar"}
      aria-label={title || "Dictar"}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
        active
          ? "border-[#241B16] bg-[#241B16] text-[#FAF7F2]"
          : "border-[#EADBCE] bg-white text-[#6D5E52] hover:border-[#241B16] hover:text-[#241B16]"
      }`}
    >
      <MicIcon className="h-4 w-4" />
    </button>
  );
}
