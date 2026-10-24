export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Challenge {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Which sample dataset this challenge runs against. */
  datasetId: string;
  prompt: string;
  hint?: string;
  /** Reference solution used to compute the expected result set. */
  solution: string;
  /** Whether row order is part of the correct answer. */
  orderMatters: boolean;
  /** Compare the resulting database state instead of a result set. */
  checkDatabaseState?: boolean;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "tasks-1",
    title: "Task titles and IDs",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Return every task's id and title. Column order: id, title. Order by id ascending.",
    hint: "Select only the two requested columns from task.",
    solution: "SELECT id, title FROM task ORDER BY id;",
    orderMatters: true,
  },
  {
    id: "tasks-2",
    title: "Tasks in progress",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Return the id and title of tasks with status_id 2. Column order: id, title. Order by id ascending.",
    hint: "Filter task rows with WHERE status_id = 2.",
    solution: "SELECT id, title FROM task WHERE status_id = 2 ORDER BY id;",
    orderMatters: true,
  },
  {
    id: "tasks-3",
    title: "Tasks without due dates",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Return the id and title of tasks whose due_date is NULL. Column order: id, title. Order by id ascending.",
    hint: "Use IS NULL rather than = NULL.",
    solution: "SELECT id, title FROM task WHERE due_date IS NULL ORDER BY id;",
    orderMatters: true,
  },
  {
    id: "tasks-4",
    title: "Tasks alphabetically",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Return each task's id and title, ordered by title alphabetically (A to Z). Column order: id, title.",
    hint: "Use ORDER BY title ASC.",
    solution: "SELECT id, title FROM task ORDER BY title ASC;",
    orderMatters: true,
  },
  {
    id: "tasks-5",
    title: "Five highest task IDs",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Return the id and title of the five tasks with the highest IDs, highest ID first. Column order: id, title.",
    hint: "Sort id descending before applying LIMIT.",
    solution: "SELECT id, title FROM task ORDER BY id DESC LIMIT 5;",
    orderMatters: true,
  },
  {
    id: "tasks-6",
    title: "Unassigned tasks",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Return the id and title of tasks with no assigned user (user_id is NULL). Column order: id, title. Order by id ascending.",
    hint: "Test user_id with IS NULL.",
    solution: "SELECT id, title FROM task WHERE user_id IS NULL ORDER BY id;",
    orderMatters: true,
  },
  {
    id: "tasks-7",
    title: "Count the tasks",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt: "Return the total number of rows in task as a single value.",
    hint: "COUNT(*) counts every row.",
    solution: "SELECT COUNT(*) FROM task;",
    orderMatters: false,
  },
  {
    id: "tasks-8",
    title: "Rename a task",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Change the title of task id 1 to 'Wash the laundry'. Update only that task and no other columns.",
    hint: "Use UPDATE task with WHERE id = 1.",
    solution: "UPDATE task SET title = 'Wash the laundry' WHERE id = 1;",
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-9",
    title: "Mark a task done",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Set status_id to 3 for task id 22 only. Leave every other task unchanged.",
    hint: "Update task with a WHERE clause matching id 22.",
    solution: "UPDATE task SET status_id = 3 WHERE id = 22;",
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-10",
    title: "Assign an unassigned task",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Assign task id 23 to user id 11 by setting user_id to 11. Change no other rows or columns.",
    hint: "Set user_id in task where id = 23.",
    solution: "UPDATE task SET user_id = 11 WHERE id = 23;",
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-11",
    title: "Set unassigned task status",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Set status_id to 1 for tasks whose user_id is NULL. These are task ids 23 and 35; change no other rows or columns.",
    hint: "Use WHERE user_id IS NULL so both unassigned tasks are updated.",
    solution: "UPDATE task SET status_id = 1 WHERE user_id IS NULL;",
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-12",
    title: "Delete one task",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Delete task id 35 only. Do not delete or change any other rows.",
    hint: "Use DELETE FROM task with WHERE id = 35.",
    solution: "DELETE FROM task WHERE id = 35;",
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-13",
    title: "Remove one task tag",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Remove the Personal tag association (tag_id 2) from task id 1 only. Do not delete the task or any other tag association.",
    hint: "Delete the matching row from task_tag using both task_id and tag_id.",
    solution: "DELETE FROM task_tag WHERE task_id = 1 AND tag_id = 2;",
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-14",
    title: "Create task notes table",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Create a table named task_note with columns in this order: id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL, note TEXT NOT NULL. Add a foreign key from task_id to task(id).",
    hint: "Use CREATE TABLE with a table-level FOREIGN KEY constraint.",
    solution: `CREATE TABLE task_note (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES task(id)
);`,
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-15",
    title: "Create reminders table",
    difficulty: "Easy",
    datasetId: "tasks",
    prompt:
      "Create a table named reminder with columns in this order: id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL, remind_at DATETIME NOT NULL, sent INTEGER NOT NULL with default 0. Add a foreign key from task_id to task(id) with ON DELETE CASCADE.",
    hint: "Specify DEFAULT 0 for sent and ON DELETE CASCADE on the foreign key.",
    solution: `CREATE TABLE reminder (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  remind_at DATETIME NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE
);`,
    orderMatters: false,
    checkDatabaseState: true,
  },
  {
    id: "tasks-16",
    title: "Tasks and their statuses",
    difficulty: "Medium",
    datasetId: "tasks",
    prompt:
      "Return every task title with its status name. Column order: task title, status name. Order by task id ascending.",
    hint: "Join task to status using status_id and id.",
    solution: `SELECT task.title, status.name
FROM task
JOIN status ON status.id = task.status_id
ORDER BY task.id;`,
    orderMatters: true,
  },
  {
    id: "tasks-17",
    title: "Tasks and assigned users",
    difficulty: "Medium",
    datasetId: "tasks",
    prompt:
      "Return every task title and its assigned user's name, including tasks with no assigned user (show NULL for that name). Column order: task title, user name. Order by task id ascending.",
    hint: "Use a LEFT JOIN from task to user.",
    solution: `SELECT task.title, user.name
FROM task
LEFT JOIN user ON user.id = task.user_id
ORDER BY task.id;`,
    orderMatters: true,
  },
  {
    id: "tasks-18",
    title: "Tasks and tags",
    difficulty: "Medium",
    datasetId: "tasks",
    prompt:
      "Return the title of each tagged task and the name of each tag attached to it. Column order: task title, tag name. Order by task id, then tag id, both ascending.",
    hint: "Join task to task_tag, then task_tag to tag.",
    solution: `SELECT task.title, tag.name
FROM task
JOIN task_tag ON task_tag.task_id = task.id
JOIN tag ON tag.id = task_tag.tag_id
ORDER BY task.id, tag.id;`,
    orderMatters: true,
  },
];

export function challengesByDataset(): Record<string, Challenge[]> {
  const grouped: Record<string, Challenge[]> = {};
  for (const c of CHALLENGES) (grouped[c.datasetId] ??= []).push(c);
  return grouped;
}
