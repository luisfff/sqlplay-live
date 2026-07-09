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
}

export const CHALLENGES: Challenge[] = [
  // ---------------- HR dataset ----------------
  {
    id: "hr-1",
    title: "List employee names",
    difficulty: "Easy",
    datasetId: "hr",
    prompt: "Return the name of every employee.",
    solution: "SELECT name FROM employees;",
    orderMatters: false,
  },
  {
    id: "hr-2",
    title: "Well-paid employees",
    difficulty: "Easy",
    datasetId: "hr",
    prompt:
      "Return the name and salary of employees earning more than 120,000.",
    solution: "SELECT name, salary FROM employees WHERE salary > 120000;",
    orderMatters: false,
  },
  {
    id: "hr-3",
    title: "Headcount",
    difficulty: "Easy",
    datasetId: "hr",
    prompt: "Return the total number of employees as a single value.",
    solution: "SELECT COUNT(*) FROM employees;",
    orderMatters: false,
  },
  {
    id: "hr-4",
    title: "Employees per department",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return each department name and how many employees it has. Column order: department name, headcount.",
    hint: "JOIN employees to departments, then GROUP BY the department.",
    solution: `SELECT d.name, COUNT(*)
FROM employees e JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;`,
    orderMatters: false,
  },
  {
    id: "hr-5",
    title: "Average salary by department",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return each department name and the average salary (rounded to the nearest whole number) of its employees.",
    solution: `SELECT d.name, ROUND(AVG(e.salary))
FROM employees e JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;`,
    orderMatters: false,
  },
  {
    id: "hr-6",
    title: "Who manages whom",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return each employee's name and their manager's name. Employees with no manager should not appear. Column order: employee, manager.",
    hint: "Self-join employees to itself on manager_id.",
    solution: `SELECT e.name, m.name
FROM employees e JOIN employees m ON m.id = e.manager_id;`,
    orderMatters: false,
  },
  {
    id: "hr-7",
    title: "Second highest salary",
    difficulty: "Hard",
    datasetId: "hr",
    prompt:
      "Return the second highest salary among all employees as a single value.",
    hint: "ORDER BY salary DESC and use LIMIT/OFFSET, or a subquery with MAX.",
    solution:
      "SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;",
    orderMatters: false,
  },
  {
    id: "hr-8",
    title: "Top earner per department",
    difficulty: "Hard",
    datasetId: "hr",
    prompt:
      "For each department, return the department name, the highest-paid employee's name, and that salary. Column order: department, employee, salary.",
    hint: "A window function (RANK/ROW_NUMBER OVER PARTITION BY dept) makes this clean.",
    solution: `SELECT d.name, e.name, e.salary
FROM (
  SELECT *, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) rk
  FROM employees
) e
JOIN departments d ON d.id = e.dept_id
WHERE e.rk = 1;`,
    orderMatters: false,
  },
  {
    id: "hr-9",
    title: "Recent hires",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return the names of employees hired on or after 2020-01-01, ordered by hire date (earliest first).",
    solution:
      "SELECT name FROM employees WHERE hired_on >= '2020-01-01' ORDER BY hired_on ASC;",
    orderMatters: true,
  },

  {
    id: "hr-10",
    title: "Engineering roster",
    difficulty: "Easy",
    datasetId: "hr",
    prompt: "Return the names of all employees in the 'Engineering' department.",
    solution: `SELECT e.name
FROM employees e JOIN departments d ON d.id = e.dept_id
WHERE d.name = 'Engineering';`,
    orderMatters: false,
  },
  {
    id: "hr-11",
    title: "Total payroll",
    difficulty: "Easy",
    datasetId: "hr",
    prompt: "Return the sum of all employee salaries as a single value.",
    solution: "SELECT SUM(salary) FROM employees;",
    orderMatters: false,
  },
  {
    id: "hr-12",
    title: "Top salary",
    difficulty: "Easy",
    datasetId: "hr",
    prompt: "Return the highest salary among all employees as a single value.",
    solution: "SELECT MAX(salary) FROM employees;",
    orderMatters: false,
  },
  {
    id: "hr-13",
    title: "Who are the managers",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return the names of employees who manage at least one other employee.",
    hint: "An employee is a manager if their id appears in some other row's manager_id.",
    solution: `SELECT name FROM employees
WHERE id IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL);`,
    orderMatters: false,
  },
  {
    id: "hr-14",
    title: "Individual contributors",
    difficulty: "Medium",
    datasetId: "hr",
    prompt: "Return the names of employees who do NOT manage anyone.",
    solution: `SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL);`,
    orderMatters: false,
  },
  {
    id: "hr-15",
    title: "Team sizes",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "For each manager, return the manager's name and how many employees report directly to them. Column order: manager, report count.",
    solution: `SELECT m.name, COUNT(*)
FROM employees e JOIN employees m ON m.id = e.manager_id
GROUP BY m.name;`,
    orderMatters: false,
  },
  {
    id: "hr-16",
    title: "Above average",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return the name and salary of every employee earning more than the company-wide average salary. Column order: name, salary.",
    hint: "Compare salary to a scalar subquery: (SELECT AVG(salary) FROM employees).",
    solution: `SELECT name, salary FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);`,
    orderMatters: false,
  },
  {
    id: "hr-17",
    title: "Salary leaderboard",
    difficulty: "Hard",
    datasetId: "hr",
    prompt:
      "Rank all employees by salary, highest first. Return name, salary and the rank (1 = highest), ordered by rank.",
    hint: "Use RANK() OVER (ORDER BY salary DESC).",
    solution: `SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS rk
FROM employees
ORDER BY rk;`,
    orderMatters: true,
  },
  {
    id: "hr-18",
    title: "Department payroll ranking",
    difficulty: "Medium",
    datasetId: "hr",
    prompt:
      "Return each department name and its total salary spend, highest spend first. Column order: department, total salary.",
    solution: `SELECT d.name, SUM(e.salary) AS total
FROM employees e JOIN departments d ON d.id = e.dept_id
GROUP BY d.name
ORDER BY total DESC;`,
    orderMatters: true,
  },

  // ---------------- E-commerce dataset ----------------
  {
    id: "shop-1",
    title: "Products, priciest first",
    difficulty: "Easy",
    datasetId: "shop",
    prompt:
      "Return product name and price for all products, most expensive first.",
    solution: "SELECT name, price FROM products ORDER BY price DESC;",
    orderMatters: true,
  },
  {
    id: "shop-2",
    title: "Furniture only",
    difficulty: "Easy",
    datasetId: "shop",
    prompt: "Return the names of all products in the 'Furniture' category.",
    solution: "SELECT name FROM products WHERE category = 'Furniture';",
    orderMatters: false,
  },
  {
    id: "shop-3",
    title: "Orders per customer",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return each customer's name and how many orders they placed. Column order: customer, order count.",
    solution: `SELECT c.name, COUNT(o.id)
FROM customers c JOIN orders o ON o.customer_id = c.id
GROUP BY c.name;`,
    orderMatters: false,
  },
  {
    id: "shop-4",
    title: "Units sold per product",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return each product's name and the total quantity sold across all orders. Column order: product, total quantity.",
    solution: `SELECT p.name, SUM(oi.quantity)
FROM products p JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.name;`,
    orderMatters: false,
  },
  {
    id: "shop-5",
    title: "Revenue per customer",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return each customer's name and their total revenue (sum of price × quantity), rounded to 2 decimals. Column order: customer, revenue.",
    hint: "Chain the joins: customers → orders → order_items → products.",
    solution: `SELECT c.name, ROUND(SUM(p.price * oi.quantity), 2)
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY c.name;`,
    orderMatters: false,
  },
  {
    id: "shop-6",
    title: "Revenue by category",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return each product category and its total revenue (price × quantity), rounded to 2 decimals. Column order: category, revenue.",
    solution: `SELECT p.category, ROUND(SUM(p.price * oi.quantity), 2)
FROM products p JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.category;`,
    orderMatters: false,
  },
  {
    id: "shop-7",
    title: "Best-selling product by revenue",
    difficulty: "Hard",
    datasetId: "shop",
    prompt:
      "Return the single product name with the highest total revenue (price × quantity), and that revenue rounded to 2 decimals. Column order: product, revenue.",
    hint: "Aggregate revenue per product, ORDER BY it DESC, LIMIT 1.",
    solution: `SELECT p.name, ROUND(SUM(p.price * oi.quantity), 2) AS rev
FROM products p JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.name
ORDER BY rev DESC
LIMIT 1;`,
    orderMatters: false,
  },
  {
    id: "shop-8",
    title: "Egyptian customers' spend",
    difficulty: "Hard",
    datasetId: "shop",
    prompt:
      "For customers in country 'EG', return their name and total revenue (price × quantity) rounded to 2 decimals. Column order: customer, revenue.",
    solution: `SELECT c.name, ROUND(SUM(p.price * oi.quantity), 2)
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE c.country = 'EG'
GROUP BY c.name;`,
    orderMatters: false,
  },
  {
    id: "shop-9",
    title: "Egyptian customers",
    difficulty: "Easy",
    datasetId: "shop",
    prompt: "Return the names of all customers from country 'EG'.",
    solution: "SELECT name FROM customers WHERE country = 'EG';",
    orderMatters: false,
  },
  {
    id: "shop-10",
    title: "Customer count",
    difficulty: "Easy",
    datasetId: "shop",
    prompt: "Return the number of customers as a single value.",
    solution: "SELECT COUNT(*) FROM customers;",
    orderMatters: false,
  },
  {
    id: "shop-11",
    title: "Never sold",
    difficulty: "Medium",
    datasetId: "shop",
    prompt: "Return the names of products that have never been ordered.",
    hint: "Anti-join: products whose id is NOT IN the order_items table.",
    solution: `SELECT name FROM products
WHERE id NOT IN (SELECT product_id FROM order_items);`,
    orderMatters: false,
  },
  {
    id: "shop-12",
    title: "Total revenue",
    difficulty: "Easy",
    datasetId: "shop",
    prompt:
      "Return the total revenue across all orders (sum of price × quantity), rounded to 2 decimals, as a single value.",
    solution: `SELECT ROUND(SUM(p.price * oi.quantity), 2)
FROM order_items oi JOIN products p ON p.id = oi.product_id;`,
    orderMatters: false,
  },
  {
    id: "shop-13",
    title: "Items per order",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "For each order, return the order id and how many distinct products it contains. Column order: order id, product count.",
    solution: `SELECT order_id, COUNT(DISTINCT product_id)
FROM order_items
GROUP BY order_id;`,
    orderMatters: false,
  },
  {
    id: "shop-14",
    title: "Biggest spender",
    difficulty: "Hard",
    datasetId: "shop",
    prompt:
      "Return the name of the customer who spent the most in total, and their total spend rounded to 2 decimals. Column order: customer, spend.",
    solution: `SELECT c.name, ROUND(SUM(p.price * oi.quantity), 2) AS spend
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY c.name
ORDER BY spend DESC
LIMIT 1;`,
    orderMatters: false,
  },
  {
    id: "shop-15",
    title: "Revenue by country",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return each country and its total revenue (price × quantity), rounded to 2 decimals. Column order: country, revenue.",
    solution: `SELECT c.country, ROUND(SUM(p.price * oi.quantity), 2)
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY c.country;`,
    orderMatters: false,
  },
  {
    id: "shop-16",
    title: "Premium products",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return the name and price of products priced above the average product price. Column order: name, price.",
    solution: `SELECT name, price FROM products
WHERE price > (SELECT AVG(price) FROM products);`,
    orderMatters: false,
  },
  {
    id: "shop-17",
    title: "Repeat customers",
    difficulty: "Medium",
    datasetId: "shop",
    prompt:
      "Return the names of customers who placed more than one order, along with their order count. Column order: customer, order count.",
    hint: "GROUP BY the customer and filter with HAVING COUNT(*) > 1.",
    solution: `SELECT c.name, COUNT(*)
FROM customers c JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
HAVING COUNT(*) > 1;`,
    orderMatters: false,
  },

  // ---------------- University dataset ----------------
  {
    id: "uni-1",
    title: "All students",
    difficulty: "Easy",
    datasetId: "university",
    prompt: "Return the names of all students.",
    solution: "SELECT name FROM students;",
    orderMatters: false,
  },
  {
    id: "uni-2",
    title: "Honor roll",
    difficulty: "Easy",
    datasetId: "university",
    prompt:
      "Return the name and gpa of students with a GPA of at least 3.5. Column order: name, gpa.",
    solution: "SELECT name, gpa FROM students WHERE gpa >= 3.5;",
    orderMatters: false,
  },
  {
    id: "uni-3",
    title: "Math courses",
    difficulty: "Easy",
    datasetId: "university",
    prompt: "Return the titles of all courses in the 'Math' department.",
    solution: "SELECT title FROM courses WHERE department = 'Math';",
    orderMatters: false,
  },
  {
    id: "uni-4",
    title: "Course count",
    difficulty: "Easy",
    datasetId: "university",
    prompt: "Return the number of courses as a single value.",
    solution: "SELECT COUNT(*) FROM courses;",
    orderMatters: false,
  },
  {
    id: "uni-5",
    title: "Students per major",
    difficulty: "Medium",
    datasetId: "university",
    prompt:
      "Return each major and the number of students in it. Column order: major, student count.",
    solution: "SELECT major, COUNT(*) FROM students GROUP BY major;",
    orderMatters: false,
  },
  {
    id: "uni-6",
    title: "Average score per course",
    difficulty: "Medium",
    datasetId: "university",
    prompt:
      "Return each course title and its average enrollment score, rounded to 1 decimal. Column order: title, average score.",
    solution: `SELECT c.title, ROUND(AVG(e.score), 1)
FROM courses c JOIN enrollments e ON e.course_id = c.id
GROUP BY c.title;`,
    orderMatters: false,
  },
  {
    id: "uni-7",
    title: "Who takes what",
    difficulty: "Medium",
    datasetId: "university",
    prompt:
      "Return each student's name alongside the title of every course they are enrolled in. Column order: student, course.",
    solution: `SELECT s.name, c.title
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id;`,
    orderMatters: false,
  },
  {
    id: "uni-8",
    title: "Empty courses",
    difficulty: "Medium",
    datasetId: "university",
    prompt: "Return the titles of courses that have no enrollments.",
    hint: "Anti-join enrollments, or LEFT JOIN and keep the NULLs.",
    solution: `SELECT title FROM courses
WHERE id NOT IN (SELECT course_id FROM enrollments);`,
    orderMatters: false,
  },
  {
    id: "uni-9",
    title: "Unenrolled students",
    difficulty: "Medium",
    datasetId: "university",
    prompt: "Return the names of students who are not enrolled in any course.",
    solution: `SELECT name FROM students
WHERE id NOT IN (SELECT student_id FROM enrollments);`,
    orderMatters: false,
  },
  {
    id: "uni-10",
    title: "Credit load",
    difficulty: "Medium",
    datasetId: "university",
    prompt:
      "For each enrolled student, return their name and the total credits they are taking (sum of the credits of their courses). Column order: student, total credits.",
    solution: `SELECT s.name, SUM(c.credits)
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
GROUP BY s.name;`,
    orderMatters: false,
  },
  {
    id: "uni-11",
    title: "Top scorer per course",
    difficulty: "Hard",
    datasetId: "university",
    prompt:
      "For each course that has enrollments, return the course title, the top-scoring student's name, and that score. Column order: title, student, score.",
    hint: "RANK() OVER (PARTITION BY course_id ORDER BY score DESC), then keep rank 1.",
    solution: `SELECT c.title, s.name, e.score
FROM (
  SELECT *, RANK() OVER (PARTITION BY course_id ORDER BY score DESC) rk
  FROM enrollments
) e
JOIN courses c ON c.id = e.course_id
JOIN students s ON s.id = e.student_id
WHERE e.rk = 1;`,
    orderMatters: false,
  },
  {
    id: "uni-12",
    title: "Strong majors",
    difficulty: "Hard",
    datasetId: "university",
    prompt:
      "Return each major and its average student GPA, but only for majors whose average GPA exceeds 3.4. Round to 2 decimals. Column order: major, average gpa.",
    hint: "GROUP BY major, then filter groups with HAVING.",
    solution: `SELECT major, ROUND(AVG(gpa), 2)
FROM students
GROUP BY major
HAVING AVG(gpa) > 3.4;`,
    orderMatters: false,
  },
  {
    id: "uni-13",
    title: "Busiest students",
    difficulty: "Hard",
    datasetId: "university",
    prompt:
      "Return the name(s) of the student(s) enrolled in the most courses, along with that count. Column order: student, course count.",
    hint: "Filter to groups whose count equals the maximum count across all students.",
    solution: `SELECT s.name, COUNT(*) AS n
FROM students s JOIN enrollments e ON e.student_id = s.id
GROUP BY s.id
HAVING n = (
  SELECT MAX(cnt) FROM (
    SELECT COUNT(*) cnt FROM enrollments GROUP BY student_id
  )
);`,
    orderMatters: false,
  },
  {
    id: "uni-14",
    title: "Strongest department",
    difficulty: "Medium",
    datasetId: "university",
    prompt:
      "Return the department whose courses have the highest average enrollment score, and that average rounded to 1 decimal. Column order: department, average score.",
    solution: `SELECT c.department, ROUND(AVG(e.score), 1) AS avg_score
FROM courses c JOIN enrollments e ON e.course_id = c.id
GROUP BY c.department
ORDER BY avg_score DESC
LIMIT 1;`,
    orderMatters: false,
  },
  {
    id: "uni-15",
    title: "CS by GPA",
    difficulty: "Medium",
    datasetId: "university",
    prompt:
      "Return the names of students in the 'CS' major, ordered by GPA descending.",
    solution:
      "SELECT name FROM students WHERE major = 'CS' ORDER BY gpa DESC;",
    orderMatters: true,
  },
];

export function challengesByDataset(): Record<string, Challenge[]> {
  const grouped: Record<string, Challenge[]> = {};
  for (const c of CHALLENGES) (grouped[c.datasetId] ??= []).push(c);
  return grouped;
}
