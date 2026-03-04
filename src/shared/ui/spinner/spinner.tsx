import styles from '@/src/shared/ui/spinner/spinner.module.css';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 18, className }: SpinnerProps) {
  const finalClassName = `${styles.spinner} ${className ?? ''}`.trim();

  return (
    <div
      className={finalClassName}
      aria-hidden="true"
      style={{ width: size, height: size }}
    />
  );
}
