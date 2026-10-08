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
    id: "empty",
    name: "Empty database",
    description: "A blank in-memory database. Bring your own schema.",
    sql: "",
    starterQuery: "-- Create a table and start querying\nCREATE TABLE demo (id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO demo (name) VALUES ('hello'), ('world');\nSELECT * FROM demo;",
  },
  {
    id: "tasks",
    name: "Tasks / To-do",
    description:
      "Users, tasks, statuses and tags with a many-to-many task_tag table. The default startup database.",
    sql: `-- This file contains the initial data for a sample Tasks database.
-- It is intended to be used with SQLite.
-- You can execute this SQL statements to bootstrap the database or just use test.sqlite3, which is already created with this data.

-- Enable foreign keys (must be done at runtime in SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE \`user\` (
  \`id\` INTEGER PRIMARY KEY,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`phone\` varchar(255) NULL
);

CREATE TABLE \`status\` (
  \`id\` INTEGER PRIMARY KEY,
  \`name\` varchar(255) NOT NULL
);

CREATE TABLE \`task\` (
  \`id\` INTEGER PRIMARY KEY,
  \`title\` varchar(255) NOT NULL,
  \`description\` text NULL DEFAULT NULL,
  \`created\` DATETIME NOT NULL,
  \`updated\` DATETIME NOT NULL,
  \`due_date\` DATETIME NULL DEFAULT NULL,
  \`status_id\` INTEGER NOT NULL,
  \`user_id\` INTEGER,
  CONSTRAINT \`fk_status\` FOREIGN KEY (\`status_id\`) REFERENCES \`status\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE
);

CREATE TABLE \`tag\` (
  \`id\` INTEGER PRIMARY KEY,
  \`name\` varchar(255) NOT NULL
);

CREATE TABLE \`task_tag\` (
  \`task_id\` INTEGER NOT NULL,
  \`tag_id\` INTEGER NOT NULL,
  PRIMARY KEY (\`task_id\`, \`tag_id\`),
  CONSTRAINT \`fk_task_tag_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`task\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_task_tag_tag\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tag\` (\`id\`) ON DELETE CASCADE
);

-- Users
INSERT INTO user (id, name, email, phone) values (1, 'Aarika Ellingworth', 'aellingworth0@harvard.edu', '483-396-8795');
INSERT INTO user (id, name, email, phone) values (2, 'Pren Goldsworthy', 'pgoldsworthy1@spotify.com', '635-572-8467');
INSERT INTO user (id, name, email, phone) values (3, 'Pablo Kisbee', 'pkisbee2@lulu.com', '790-962-8683');
INSERT INTO user (id, name, email, phone) values (4, 'Rodie Duncan', 'rduncan3@quantcast.com', '646-743-6191');
INSERT INTO user (id, name, email, phone) values (5, 'Aubry Polak', 'apolak4@indiatimes.com', '302-678-7931');
INSERT INTO user (id, name, email, phone) values (6, 'Maryrose Meadows', 'mmeadows5@comcast.net', '251-524-6594');
INSERT INTO user (id, name, email, phone) values (7, 'Pavel Brushneen', 'pbrushneen6@techcrunch.com', '316-170-3640');
INSERT INTO user (id, name, email, phone) values (8, 'Hedy Gerault', 'hgerault7@nymag.com', '176-177-5579');
INSERT INTO user (id, name, email, phone) values (9, '王秀英', 'wang.xiuying@weebly.com', '891-952-6749');
INSERT INTO user (id, name, email, phone) values (10, 'إلياس', 'elias@github.com', '202-517-6983');
INSERT INTO user (id, name, email, phone) values (11, 'Donald Duck', 'donald@duck.com', NULL);
INSERT INTO user (id, name, email, phone) values (12, 'Adam Smith', 'smith@bla.com', NULL);

-- Statuses
INSERT INTO status (id, name) values (1, 'Not started');
INSERT INTO status (id, name) values (2, 'In progress');
INSERT INTO status (id, name) values (3, 'Done');

-- Tags
INSERT INTO tag (id, name) values (1, 'Work');
INSERT INTO tag (id, name) values (2, 'Personal');
INSERT INTO tag (id, name) values (3, 'Urgent');
INSERT INTO tag (id, name) values (4, 'Home');
INSERT INTO tag (id, name) values (5, 'Shopping');

-- Tasks
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (1, 'Wash clothes', 'Title says it all.', '2017-10-25 06:54:16', '2017-10-15 13:05:09', null, 2, 1);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (2, 'Become a billionaire', 'This should not take long, just invent a time machine, travel back to 2010 and buy bitcoin', '2017-09-26 03:06:46', '2017-10-08 06:14:31', '2017-12-22 20:58:03', 3, 6);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (3, 'Plan meeting with London office', 'We will probably use skype', '2017-10-04 18:07:37', '2017-10-14 16:01:31', '2017-12-05 19:42:15', 2, 8);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (4, 'Order groceries online', 'The fridge is almost empty, we need eggs and milk', '2017-09-20 19:34:43', '2017-10-15 23:35:45', '2017-12-24 16:00:46', 1, 1);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (5, 'Empty the mailbox', NULL, '2017-09-27 15:17:08', '2017-10-08 17:31:16', null, 2, 9);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (6, 'Fix the flat tire on the bike', 'Tools are in the garage', '2017-09-13 23:16:30', '2017-10-06 04:03:52', '2017-12-07 11:51:11', 2, 6);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (7, 'Wash the car', NULL, '2017-10-06 19:39:16', '2017-10-03 04:49:05', '2017-12-04 17:43:16', 2, 10);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (8, 'Walk the dog', NULL, '2017-09-03 02:47:17', '2017-10-12 18:40:08', null, 3, 2);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (9, 'Write a book', 'Maybe something about dragons?', '2017-10-11 06:14:01', '2017-10-17 12:19:08', '2017-12-21 20:18:05', 2, 6);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (10, 'Do HackYourFuture assginment', NULL, '2017-10-04 13:55:16', '2017-10-10 00:18:05', '2017-12-19 17:01:10', 1, 3);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (11, 'Iron shirts', NULL, '2017-09-23 03:59:58', '2017-10-19 08:30:48', '2017-12-08 11:00:35', 3, 9);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (12, 'Water the potted plants', 'Maybe they need fertilizer as well', '2017-09-29 23:38:42', '2017-10-08 04:24:53', null, 2, 1);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (13, 'Buy wine for the birthday party', 'Both red and white wine', '2017-10-10 14:57:22', '2017-10-14 14:03:30', '2017-12-10 23:43:56', 2, 5);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (14, 'Buy gift for Paul', 'He could use a shirt or a tie and some socks', '2017-09-09 05:22:08', '2017-10-17 15:58:05', '2017-12-04 20:45:18', 3, 3);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (15, 'Change lightbulb in hallway', 'Should be an LED bulb', '2017-10-01 19:07:35', '2017-10-03 10:02:27', '2017-12-08 17:09:03', 3, 10);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (16, 'Wash windows', NULL, '2017-10-02 22:15:17', '2017-10-07 22:31:35', '2017-12-06 03:36:09', 2, 8);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (17, 'Setup salary databases for accounting', 'Use MySQL', '2017-10-25 05:35:33', '2017-10-10 23:22:33', '2017-12-05 00:19:08', 1, 9);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (18, 'Learn how databases work', NULL, '2017-09-06 03:16:47', '2017-10-10 16:56:58', '2017-12-18 05:08:05', 3, 5);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (19, 'Make the databases perform better', 'It should be possible to optimize the indexes', '2017-10-03 09:27:20', '2017-10-01 16:27:46', '2017-12-01 13:28:35', 2, 4);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (20, 'Buy beer for the company party', '2 or 3 cases should be enough', '2017-10-08 01:39:02', '2017-10-13 23:07:41', null, 3, 4);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (21, 'Knit sweater', NULL, '2017-09-22 17:14:55', '2017-10-08 09:01:35', '2017-12-15 20:33:57', 2, 9);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (22, 'Charge electric bicycle', 'It sucks to ride it without a battery!', '2017-10-10 12:25:07', '2017-10-07 21:45:01', '2017-12-10 19:02:17', 1, 7);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (23, 'Buy new phone', 'The battery in the current one only lasts 5 hours 😞', '2017-09-17 00:25:34', '2017-10-09 11:48:12', null, 3, NULL);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (24, 'Ride bike aroud Sjælland', 'Remember rainclothes and tire repair kit!', '2017-10-20 19:21:13', '2017-10-07 01:38:06', '2017-12-19 15:08:18', 2, 7);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (25, 'Look at apartments in Ørestad', '2 or 3 rooms', '2017-10-30 09:47:00', '2017-10-19 06:11:26', null, 1, 6);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (26, 'Empty Mr Fluffys litterbox', NULL, '2017-09-28 03:09:06', '2017-10-13 10:38:34', '2017-12-20 23:37:18', 2, 8);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (27, 'Buy new dining room table and chairs', 'Ikea has some on sale', '2017-09-21 12:02:34', '2017-10-02 02:05:11', '2017-12-06 00:14:30', 1, 3);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (28, 'Renew buscard', '3 zones', '2017-10-07 22:47:51', '2017-10-09 15:50:03', '2017-12-01 14:25:40', 2, 6);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (29, 'Sign up for LinkedIn', 'Make the CV awesome! 😄', '2017-09-04 00:57:47', '2017-10-18 18:07:48', '2017-12-07 23:04:38', 3, 2);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (30, 'Remove facebook from phone', 'To avoid interruptions when working', '2017-10-26 17:15:07', '2017-10-13 03:36:47', '2017-12-19 11:10:02', 3, 4);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (31, 'Backup databases to external disk', 'Remember to store the disk in another physical location', '2017-09-09 17:32:33', '2017-10-01 21:18:59', '2017-12-23 14:21:01', 1, 2);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (32, 'Put up the new lamp in the hallway', NULL, '2017-10-15 05:45:54', '2017-10-16 14:05:35', '2017-12-29 02:29:26', 3, 3);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (33, 'Hang up paintings in living room', NULL, '2017-09-10 05:36:11', '2017-10-09 17:40:42', null, 3, 4);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (34, 'Buy plane ticket to Auckland', 'Check prices online first!', '2017-09-05 09:07:22', '2017-10-15 09:36:06', '2017-12-07 11:10:05', 1, 9);
INSERT INTO task (id, title, description, created, updated, due_date, status_id, user_id) values (35, 'Learn about NoSQL databases', 'MongoDB, CouchDB, etc.', '2017-10-20 01:41:53', '2017-10-04 07:19:56', '2017-12-23 10:13:42', 2, NULL);

-- Task Tags
INSERT INTO task_tag (task_id, tag_id) values (1, 4); -- Wash clothes (Home)
INSERT INTO task_tag (task_id, tag_id) values (1, 2); -- Wash clothes (Personal)
INSERT INTO task_tag (task_id, tag_id) values (2, 1); -- Become a billionaire (Work)
INSERT INTO task_tag (task_id, tag_id) values (2, 3); -- Become a billionaire (Urgent)
INSERT INTO task_tag (task_id, tag_id) values (3, 1); -- Plan meeting with London office (Work)
INSERT INTO task_tag (task_id, tag_id) values (4, 5); -- Order groceries online (Shopping)
INSERT INTO task_tag (task_id, tag_id) values (4, 4); -- Order groceries online (Home)
INSERT INTO task_tag (task_id, tag_id) values (10, 1); -- Do HackYourFuture assignment (Work)
INSERT INTO task_tag (task_id, tag_id) values (10, 3); -- Do HackYourFuture assignment (Urgent)
INSERT INTO task_tag (task_id, tag_id) values (17, 1); -- Setup salary databases for accounting (Work)
INSERT INTO task_tag (task_id, tag_id) values (23, 5); -- Buy new phone (Shopping)
INSERT INTO task_tag (task_id, tag_id) values (23, 2); -- Buy new phone (Personal)`,
    starterQuery: `-- Tasks with their owner and status
SELECT t.id, t.title, u.name AS owner, s.name AS status, t.due_date
FROM task t
LEFT JOIN user u ON u.id = t.user_id
JOIN status s ON s.id = t.status_id
ORDER BY t.id;`,
  },
  {
    id: "hr",
    name: "HR / Employees",
    description:
      "Departments and employees with a self-referencing manager column. Great for JOINs and aggregates.",
    sql: `CREATE TABLE departments (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  budget INTEGER NOT NULL
);

CREATE TABLE employees (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  dept_id     INTEGER REFERENCES departments(id),
  manager_id  INTEGER REFERENCES employees(id),
  salary      INTEGER NOT NULL,
  hired_on    TEXT NOT NULL
);

INSERT INTO departments (id, name, budget) VALUES
  (1, 'Engineering', 2000000),
  (2, 'Sales',       800000),
  (3, 'Marketing',   500000),
  (4, 'HR',          300000);

INSERT INTO employees (id, name, dept_id, manager_id, salary, hired_on) VALUES
  (1,  'Alice Chen',     1, NULL, 185000, '2018-03-01'),
  (2,  'Bob Martins',    1, 1,    142000, '2019-07-15'),
  (3,  'Carla Diaz',     1, 1,    138000, '2020-01-20'),
  (4,  'Deepak Rao',     1, 2,    120000, '2021-05-10'),
  (5,  'Elena Petrov',   2, NULL, 160000, '2017-11-02'),
  (6,  'Frank Obi',      2, 5,    98000,  '2020-09-30'),
  (7,  'Grace Kim',      2, 5,    102000, '2021-02-11'),
  (8,  'Hassan Ali',     3, NULL, 145000, '2019-04-18'),
  (9,  'Ivy Nwosu',      3, 8,    89000,  '2022-06-01'),
  (10, 'Jason Brooks',   4, NULL, 110000, '2018-08-08');`,
    starterQuery: `-- Average salary per department, highest first
SELECT d.name        AS department,
       COUNT(*)      AS headcount,
       ROUND(AVG(e.salary)) AS avg_salary
FROM employees e
JOIN departments d ON d.id = e.dept_id
GROUP BY d.name
ORDER BY avg_salary DESC;`,
  },
  {
    id: "shop",
    name: "E-commerce / Orders",
    description:
      "Customers, products, orders and line items. Realistic schema for practicing multi-table JOINs and revenue queries.",
    sql: `CREATE TABLE customers (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  country TEXT NOT NULL,
  joined  TEXT NOT NULL
);

CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  ordered_on  TEXT NOT NULL
);

CREATE TABLE order_items (
  order_id   INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity   INTEGER NOT NULL
);

INSERT INTO customers (id, name, country, joined) VALUES
  (1, 'Nadia Farouk', 'EG', '2023-01-12'),
  (2, 'Tom Becker',   'DE', '2023-02-03'),
  (3, 'Sara Lopez',   'ES', '2023-02-28'),
  (4, 'Wei Zhang',    'CN', '2023-03-15'),
  (5, 'Omar Haddad',  'EG', '2023-04-01');

INSERT INTO products (id, name, category, price) VALUES
  (1, 'Mechanical Keyboard', 'Electronics', 89.99),
  (2, 'USB-C Cable',         'Electronics', 12.50),
  (3, 'Standing Desk',       'Furniture',   349.00),
  (4, 'Ergonomic Chair',     'Furniture',   229.00),
  (5, 'Notebook (pack)',     'Stationery',  8.75),
  (6, 'Webcam',              'Electronics', 59.99);

INSERT INTO orders (id, customer_id, ordered_on) VALUES
  (1, 1, '2023-05-01'),
  (2, 2, '2023-05-03'),
  (3, 1, '2023-05-20'),
  (4, 3, '2023-06-11'),
  (5, 4, '2023-06-15'),
  (6, 5, '2023-07-02');

INSERT INTO order_items (order_id, product_id, quantity) VALUES
  (1, 1, 1), (1, 2, 2),
  (2, 3, 1), (2, 4, 1),
  (3, 5, 5),
  (4, 1, 2), (4, 2, 1),
  (5, 4, 2),
  (6, 3, 1), (6, 5, 3);`,
    starterQuery: `-- Total revenue per customer
SELECT c.name AS customer,
       ROUND(SUM(p.price * oi.quantity), 2) AS revenue
FROM customers c
JOIN orders o        ON o.customer_id = c.id
JOIN order_items oi  ON oi.order_id = o.id
JOIN products p      ON p.id = oi.product_id
GROUP BY c.name
ORDER BY revenue DESC;`,
  },
];

SAMPLE_DATASETS.push({
  id: "university",
  name: "University / Enrollments",
  description:
    "Students, courses, and a many-to-many enrollments table. Ideal for NOT IN, anti-joins, HAVING and window functions.",
  sql: `CREATE TABLE students (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  major         TEXT NOT NULL,
  gpa           REAL NOT NULL,
  enrolled_year INTEGER NOT NULL
);

CREATE TABLE courses (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  department TEXT NOT NULL,
  credits    INTEGER NOT NULL
);

CREATE TABLE enrollments (
  student_id INTEGER REFERENCES students(id),
  course_id  INTEGER REFERENCES courses(id),
  semester   TEXT NOT NULL,
  score      INTEGER NOT NULL
);

INSERT INTO students (id, name, major, gpa, enrolled_year) VALUES
  (1, 'Maya Singh',    'CS',      3.8, 2021),
  (2, 'Leo Turner',    'CS',      3.2, 2022),
  (3, 'Priya Nair',    'Math',    3.9, 2021),
  (4, 'Sam Okoro',     'Physics', 2.9, 2023),
  (5, 'Ana Costa',     'Math',    3.5, 2022),
  (6, 'Ken Watanabe',  'CS',      3.1, 2023),
  (7, 'Lucia Rossi',   'Physics', 3.7, 2021),
  (8, 'Tariq Aziz',    'Biology', 3.4, 2022);

INSERT INTO courses (id, title, department, credits) VALUES
  (1, 'Algorithms',        'CS',      4),
  (2, 'Databases',         'CS',      3),
  (3, 'Calculus I',        'Math',    4),
  (4, 'Linear Algebra',    'Math',    3),
  (5, 'Quantum Mechanics', 'Physics', 4),
  (6, 'Statistics',        'Math',    3),
  (7, 'Thermodynamics',    'Physics', 4);

INSERT INTO enrollments (student_id, course_id, semester, score) VALUES
  (1, 1, 'F23', 92), (1, 2, 'F23', 88), (1, 3, 'S23', 79),
  (2, 1, 'F23', 65), (2, 2, 'F23', 72),
  (3, 3, 'S23', 95), (3, 4, 'S23', 90), (3, 6, 'F23', 85),
  (4, 5, 'F23', 58),
  (5, 3, 'S23', 80), (5, 6, 'F23', 77),
  (6, 1, 'F23', 70), (6, 2, 'F23', 60),
  (7, 5, 'F23', 88), (7, 3, 'S23', 91);`,
  starterQuery: `-- Average score per course
SELECT c.title, ROUND(AVG(e.score), 1) AS avg_score
FROM courses c
JOIN enrollments e ON e.course_id = c.id
GROUP BY c.title
ORDER BY avg_score DESC;`,
});

export function findDataset(id: string): SampleDataset {
  return SAMPLE_DATASETS.find((d) => d.id === id) ?? SAMPLE_DATASETS[0];
}
