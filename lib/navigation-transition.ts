type ExitAnimation = { finished: Promise<unknown>; cancel: () => void };
type Exit = {
  animations: ExitAnimation[];
  restore: () => void;
  timer?: ReturnType<typeof setTimeout>;
};

// Own every filled animation until unmount, Back, or bounded recovery. A
// completed animation must not outlive the handle needed to cancel its fill.
export function createNavigationTransition() {
  let active: Exit | null = null;
  function clear(exit: Exit) {
    if (active !== exit) return;
    active = null;
    clearTimeout(exit.timer);
    for (const animation of exit.animations) animation.cancel();
    exit.restore();
  }
  return {
    get running() {
      return active !== null;
    },
    cancel() {
      if (active) clear(active);
    },
    async start(
      animate: (track: (animation: ExitAnimation) => void) => void,
      navigate: () => void,
      restore: () => void,
    ) {
      if (active) return;
      const exit: Exit = { animations: [], restore };
      active = exit;
      try {
        animate((animation) => {
          exit.animations.push(animation);
          // A later animation constructor may throw. Observe each rejection
          // immediately so cancelling an earlier animation is still handled.
          void animation.finished.catch(() => {});
        });
      } catch {
        clear(exit);
        // An unsupported visual effect must not disable an otherwise valid link.
        try {
          navigate();
        } catch {
          /* The restored native link remains usable. */
        }
        return;
      }
      exit.timer = setTimeout(() => clear(exit), 2200);
      try {
        await Promise.all(exit.animations.map((a) => a.finished));
        if (active !== exit) return;
        clearTimeout(exit.timer);
        // Install recovery before push: a synchronous unmount can then cancel it.
        exit.timer = setTimeout(() => clear(exit), 1500);
        navigate();
      } catch {
        clear(exit);
      }
    },
  };
}
