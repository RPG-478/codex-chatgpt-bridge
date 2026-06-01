export type Mode = "ask" | "research" | "review" | "debug" | "plan" | "summarize";

export type OutputShape = {
  maxBullets: number;
  requireSources: boolean;
  requireNextAction: boolean;
};

export type Job = {
  id: string;
  mode: Mode;
  question: string;
  context: string;
  createdAt: string;
  outputShape: OutputShape;
  prompt: string;
};

export type BridgeResult = {
  jobId: string;
  status: "pending" | "done";
  responsePath?: string;
  response?: string;
};

export interface BridgeAdapter {
  submit(job: Job): Promise<BridgeResult>;
}

export type AdapterName = "manual" | "playwright";
