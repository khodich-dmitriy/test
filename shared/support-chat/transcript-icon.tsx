interface TranscriptIconProps {
  className?: string;
}

export function TranscriptIcon({ className }: TranscriptIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 4.5h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M3 8h6.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M3 11.5h4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M11 9.25v3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M9.25 11h3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
