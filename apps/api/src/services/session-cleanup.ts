export interface ExpiredSession {
  session_id: string;
}

export interface SessionCleanupFailure {
  sessionId: string;
  error: unknown;
}

export interface SessionCleanupResult {
  scanned: number;
  removed: number;
  failures: SessionCleanupFailure[];
}

export interface SessionCleanupDependencies {
  findExpiredBefore: (cutoff: Date) => Promise<ExpiredSession[]>;
  deleteSession: (sessionId: string) => Promise<unknown>;
  now: () => number;
  retentionMs: number;
  intervalMs: number;
  schedule: (operation: () => void, intervalMs: number) => () => void;
  reportResult: (result: SessionCleanupResult) => void;
  reportError: (error: unknown) => void;
}

export function createSessionCleanup(dependencies: SessionCleanupDependencies) {
  let activeRun: Promise<SessionCleanupResult> | undefined;

  const execute = async (): Promise<SessionCleanupResult> => {
    const cutoff = new Date(dependencies.now() - dependencies.retentionMs);
    const expiredSessions = await dependencies.findExpiredBefore(cutoff);
    const failures: SessionCleanupFailure[] = [];
    let removed = 0;

    for (const session of expiredSessions) {
      try {
        await dependencies.deleteSession(session.session_id);
        removed += 1;
      } catch (error) {
        failures.push({ sessionId: session.session_id, error });
      }
    }

    return { scanned: expiredSessions.length, removed, failures };
  };

  const run = () => {
    if (activeRun) return activeRun;

    const currentRun = execute();
    activeRun = currentRun;
    const clearRun = () => {
      if (activeRun === currentRun) activeRun = undefined;
    };
    void currentRun.then(clearRun, clearRun);

    return currentRun;
  };

  return {
    run,

    start() {
      let stopped = false;
      let scheduledRun: Promise<SessionCleanupResult> | undefined;
      let stopPromise: Promise<void> | undefined;

      const stopSchedule = dependencies.schedule(() => {
        if (stopped || scheduledRun) return;

        scheduledRun = run();
        void scheduledRun.then(dependencies.reportResult, dependencies.reportError).finally(() => {
          scheduledRun = undefined;
        });
      }, dependencies.intervalMs);

      return () => {
        return (stopPromise ??= (async () => {
          stopped = true;
          stopSchedule();
          await (scheduledRun ?? activeRun)?.catch(() => undefined);
        })());
      };
    },
  };
}
