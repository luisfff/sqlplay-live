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
