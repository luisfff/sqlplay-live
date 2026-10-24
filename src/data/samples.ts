import { TASKS_SQL } from "./tasks";

export const DEFAULT_DATASET_ID = "tasks";

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  /** Setup script that creates and populates the schema. */
  sql: string;
  /** A starter query to drop into the editor. */
  starterQuery: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: DEFAULT_DATASET_ID,
    name: "Tasks database",
    description: "Tasks, assigned users, statuses and tags. Practice JOINs, nullable assignments and cascading foreign keys.",
    sql: TASKS_SQL,
    starterQuery: `SELECT id, name, email, phone
FROM user;`,
  },
];

export function findDataset(id: string): SampleDataset {
  return SAMPLE_DATASETS.find((d) => d.id === id)
    ?? SAMPLE_DATASETS.find((d) => d.id === DEFAULT_DATASET_ID)!;
}
