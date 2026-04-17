export function TenetWordmark({ height = 32 }: { height?: number }) {
  return (
    <img
      src="/tenet-logo.png"
      alt="TENET"
      style={{
        height,
        width: 'auto',
        opacity: 0.55,
        userSelect: 'none',
        display: 'block',
      }}
      draggable={false}
    />
  );
}
