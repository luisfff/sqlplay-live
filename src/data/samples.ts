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
    starterQuery: `SELECT t.id, t.title, s.name AS status, u.name AS assigned_user,
       t.due_date
FROM task t
JOIN status s ON s.id = t.status_id
LEFT JOIN user u ON u.id = t.user_id
ORDER BY t.id;`,
  },
];

export function findDataset(id: string): SampleDataset {
  return SAMPLE_DATASETS.find((d) => d.id === id)
    ?? SAMPLE_DATASETS.find((d) => d.id === DEFAULT_DATASET_ID)!;
}
