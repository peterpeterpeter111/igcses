// Browser state contains public questions and the student's own work only.
export type QuizView = {
  id: string;
  status: 'answering' | 'marking' | 'complete';
  position: number;
  question: {
    id: string;
    position: number;
    prompt: string;
    stimulus: string;
    maxMarks: number;
  } | null;
  draft?: string;
  draftRevision?: number;
};
export type QuizResults = {
  total: number;
  percentage: number;
  questions: {
    id: string;
    prompt: string;
    stimulus: string;
    maxMarks: number;
    answer: string;
    solution: string;
    rubric: { id: string; marks: number; description: string }[];
    grade: { earnedMarks: number; rationale: string };
  }[];
};
type DraftReply = {
  saved: boolean;
  applied: boolean;
  superseded: boolean;
  revision: number;
};
type Draft = {
  action: 'draft';
  questionId: string;
  answer: string;
  revision: number;
};
type Submission = {
  action: 'submit';
  questionId: string;
  answer: string;
  key: string;
  skipConfirmed: boolean;
};
type Transport = (path: string, body?: Draft | Submission) => Promise<unknown>;
export class RequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function quizRequest(
  path: string,
  body?: Draft | Submission,
): Promise<unknown> {
  const response = await fetch(path, {
    method: body ? 'PATCH' : 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    ...(body
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const value = (await response.json()) as { error?: string };
  if (!response.ok)
    throw new RequestError(value.error ?? 'Request failed.', response.status);
  return value;
}
export type ClientState = {
  view: QuizView | null;
  answer: string;
  dirty: boolean;
  busy: boolean;
  error: string;
  saving: string;
  uncertain: boolean;
  conflict: boolean;
  recovery: { questionId: string; text: string } | null;
  results: QuizResults | null;
};
const empty = (): ClientState => ({
  view: null,
  answer: '',
  dirty: false,
  busy: false,
  error: '',
  saving: '',
  uncertain: false,
  conflict: false,
  recovery: null,
  results: null,
});
export class QuizClient {
  private state = empty();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private draftFlight: Promise<void> | null = null;
  private pendingDraft: Draft | null = null;
  private pendingSubmission: Submission | null = null;
  private draftRevision = 0;
  private epoch = 0;
  private closed = false;
  private endpoint: string;
  private request: Transport;
  constructor(endpoint: string, request: Transport = quizRequest) {
    this.endpoint = endpoint;
    this.request = request;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.state;
  private set(update: Partial<ClientState>) {
    if (this.closed) return;
    this.state = { ...this.state, ...update };
    this.listeners.forEach((fn) => fn());
  }
  private cancelTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
  dispose() {
    this.closed = true;
    this.epoch++;
    this.cancelTimer();
  }
  resume() {
    const wasClosed = this.closed;
    this.closed = false;
    if (wasClosed) this.set({ busy: false });
  }
  private failure(error: unknown) {
    if (error instanceof RequestError && [401, 404].includes(error.status)) {
      this.pendingDraft = null;
      this.pendingSubmission = null;
      this.set({
        ...empty(),
        error:
          'This attempt is not available to the signed-in account. Sign in again from History.',
      });
      return;
    }
    this.set({
      error:
        error instanceof Error
          ? error.message
          : 'Connection failed. Your text is still on this page.',
    });
  }
  async load() {
    if (this.state.busy) return;
    this.cancelTimer();
    const epoch = ++this.epoch;
    const recovery =
      this.state.dirty || this.state.uncertain
        ? {
            questionId:
              this.pendingSubmission?.questionId ??
              this.state.view?.question?.id ??
              '',
            text: this.state.answer,
          }
        : this.state.recovery;
    this.set({ busy: true, error: '' });
    try {
      // Any dispatched save must settle before loading its authoritative state.
      if (this.draftFlight) await this.draftFlight;
      const view = (await this.request(this.endpoint)) as QuizView;
      if (epoch !== this.epoch || this.closed) return;
      const results =
        view.status === 'complete'
          ? ((await this.request(this.endpoint + '/results')) as QuizResults)
          : null;
      if (epoch !== this.epoch || this.closed) return;
      this.pendingDraft = null;
      this.pendingSubmission = null;
      this.draftRevision = view.draftRevision ?? 0;
      this.set({
        view,
        results,
        answer: view.draft ?? '',
        dirty: false,
        uncertain: false,
        conflict: false,
        recovery:
          recovery &&
          !(
            view.question?.id === recovery.questionId &&
            view.draft === recovery.text
          )
            ? recovery
            : null,
        saving: '',
      });
    } catch (error) {
      if (epoch === this.epoch) this.failure(error);
    } finally {
      if (epoch === this.epoch) this.set({ busy: false });
    }
  }
  edit(answer: string) {
    if (
      this.state.busy ||
      this.state.uncertain ||
      this.state.conflict ||
      !this.state.view?.question
    )
      return;
    this.set({ answer, dirty: true, saving: 'Unsaved changes' });
    this.cancelTimer();
    this.timer = setTimeout(() => {
      void this.save();
    }, 650);
  }
  save(): Promise<void> {
    this.cancelTimer();
    if (this.draftFlight) return this.draftFlight;
    if (this.state.conflict || this.state.uncertain || this.closed)
      return Promise.resolve();
    const epoch = this.epoch;
    this.draftFlight = this.drainDrafts(epoch).finally(() => {
      this.draftFlight = null;
    });
    return this.draftFlight;
  }
  private async drainDrafts(epoch: number) {
    while (
      this.state.dirty &&
      this.state.view?.question &&
      epoch === this.epoch &&
      !this.closed
    ) {
      const draft: Draft = this.pendingDraft ?? {
        action: 'draft',
        questionId: this.state.view.question.id,
        answer: this.state.answer,
        revision: this.draftRevision + 1,
      };
      this.pendingDraft = draft;
      this.set({ saving: 'Saving draft…', error: '' });
      try {
        const reply = (await this.request(this.endpoint, draft)) as DraftReply;
        if (epoch !== this.epoch || this.closed) return;
        if (!reply.saved) {
          this.set({
            conflict: true,
            saving:
              'Another tab changed this answer. Reload saved state to compare; your text will be kept below.',
          });
          return;
        }
        this.draftRevision = reply.revision;
        this.pendingDraft = null;
        const dirty = this.state.answer !== draft.answer;
        this.set({
          dirty,
          saving: dirty ? 'Saving latest changes…' : 'Draft saved',
        });
      } catch (error) {
        if (epoch === this.epoch) {
          this.failure(error);
          this.set({
            saving:
              'Draft not saved. Retry saving or reload saved state to compare.',
          });
        }
        return;
      }
    }
  }
  async submit(skipConfirmed = false) {
    if (this.state.busy || this.state.conflict || !this.state.view?.question)
      return;
    if (!this.state.answer.trim() && !skipConfirmed && !this.pendingSubmission)
      return;
    this.cancelTimer();
    this.set({ busy: true, error: '' });
    const epoch = this.epoch;
    try {
      if (!this.pendingSubmission) {
        await this.save();
        if (
          this.state.dirty ||
          this.state.conflict ||
          !this.state.view?.question
        )
          return;
        this.pendingSubmission = {
          action: 'submit',
          questionId: this.state.view.question.id,
          answer: this.state.answer,
          key: crypto.randomUUID(),
          skipConfirmed,
        };
      }
      const view = (await this.request(
        this.endpoint,
        this.pendingSubmission,
      )) as QuizView;
      if (epoch !== this.epoch || this.closed) return;
      this.pendingSubmission = null;
      this.draftRevision = view.draftRevision ?? 0;
      this.set({
        view,
        answer: view.draft ?? '',
        dirty: false,
        uncertain: false,
        saving: 'Answer saved',
      });
    } catch (error) {
      if (epoch === this.epoch) {
        this.set({
          uncertain: true,
          conflict: error instanceof RequestError && error.status === 409,
        });
        this.failure(error);
      }
    } finally {
      if (epoch === this.epoch) this.set({ busy: false });
    }
  }
  dismissRecovery() {
    this.set({ recovery: null });
  }
  restoreRecovery() {
    if (
      this.state.recovery &&
      this.state.view?.question?.id === this.state.recovery.questionId
    ) {
      const text = this.state.recovery.text;
      this.set({ recovery: null });
      this.edit(text);
    }
  }
}
