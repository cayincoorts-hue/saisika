export default function TopNotice({ type, message }: { type: 'error' | 'warning' | 'info'; message: string }) {
  if (!message) return null;
  return <div className={`notice notice-${type}`}>{message}</div>;
}
