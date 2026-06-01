import path from "node:path";
import { ensureStateDirs, jobsDir, writeJson, writeText } from "../fs.js";
import type { BridgeAdapter, BridgeResult, Job } from "../types.js";

export class ManualBridgeAdapter implements BridgeAdapter {
  async submit(job: Job): Promise<BridgeResult> {
    await ensureStateDirs();
    const jobPath = path.join(jobsDir, `${job.id}.json`);
    const promptPath = path.join(jobsDir, `${job.id}.prompt.md`);

    await writeJson(jobPath, job);
    await writeText(promptPath, job.prompt);

    return {
      jobId: job.id,
      status: "pending"
    };
  }
}
