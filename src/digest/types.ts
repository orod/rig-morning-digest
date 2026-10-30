// Plan morning-digest § 1. The contract every part of § 2 starts against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One job across the night. Times keep the log's offset (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  // Sorted by job.
  rows: DigestRow[];
  // Lines that didn't parse: counted, never thrown.
  badLines: number;
};

// null when runs/<night>.jsonl doesn't exist.
export type ReadNight = (runsDir: string, night: string) => Night | null;
