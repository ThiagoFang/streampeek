interface PollWorker {
  close: () => Promise<unknown>;
}

export interface CloseResource {
  name: string;
  close: () => Promise<unknown>;
}

export interface ApplicationLifecycleDependencies {
  loadPollingUserIds: () => Promise<string[]>;
  synchronizePolls: (userIds: string[]) => Promise<unknown>;
  createPollWorker: () => PollWorker;
  startCleanupJob: () => () => Promise<unknown> | unknown;
  closeResources: CloseResource[];
}

export function createApplicationLifecycle(dependencies: ApplicationLifecycleDependencies) {
  let worker: PollWorker | undefined;
  let stopCleanupJob: (() => Promise<unknown> | unknown) | undefined;
  let startPromise: Promise<{ scheduledUserCount: number }> | undefined;
  let shutdownPromise: Promise<void> | undefined;

  const startApplication = async () => {
    const userIds = await dependencies.loadPollingUserIds();
    await dependencies.synchronizePolls(userIds);

    worker = dependencies.createPollWorker();
    stopCleanupJob = dependencies.startCleanupJob();

    return { scheduledUserCount: userIds.length };
  };

  const closeStep = async (
    name: string,
    operation: (() => Promise<unknown> | unknown) | undefined,
    errors: Error[],
  ) => {
    if (!operation) return;

    try {
      await operation();
    } catch (cause) {
      errors.push(new Error(`Failed to close ${name}`, { cause }));
    }
  };

  return {
    start() {
      if (shutdownPromise) {
        return Promise.reject(new Error("Cannot start an application that is shutting down"));
      }

      return (startPromise ??= startApplication());
    },

    shutdown() {
      return (shutdownPromise ??= (async () => {
        await startPromise?.catch(() => undefined);

        const errors: Error[] = [];
        const activeWorker = worker;
        await closeStep("cleanup job", stopCleanupJob, errors);
        await closeStep(
          "poll worker",
          activeWorker ? () => activeWorker.close() : undefined,
          errors,
        );

        for (const resource of dependencies.closeResources) {
          await closeStep(resource.name, resource.close, errors);
        }

        if (errors.length) {
          throw new AggregateError(errors, "Application shutdown failed");
        }
      })());
    },
  };
}
