export type JobState = {
  id: string;
  filename?: string;
  createdAt: number;
  analysis?: {
    title?: string;
    summary?: string;
    prompts?: string[];
  };
};

class InMemoryStore {
  private jobs = new Map<string, JobState>();

  createJob(filename?: string): JobState {
    const id = crypto.randomUUID();
    const job: JobState = { id, filename, createdAt: Date.now() };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): JobState | undefined {
    return this.jobs.get(id);
  }

  setAnalysis(id: string, analysis: JobState["analysis"]): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.analysis = analysis;
    this.jobs.set(id, job);
  }
}

export const store = new InMemoryStore();


