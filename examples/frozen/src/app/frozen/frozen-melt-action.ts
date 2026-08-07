type FrozenMeltActionHandler = () => void;

let activeHandler: FrozenMeltActionHandler | null = null;

export function registerFrozenMeltAction(
  handler: FrozenMeltActionHandler,
): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

export function refreezeFrozenMelt(): void {
  activeHandler?.();
}
