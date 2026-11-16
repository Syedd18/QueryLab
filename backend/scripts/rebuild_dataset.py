"""
Rebuild the QueryLab practice content on a clean, self-contained schema.

What it does:
  1. Builds a fresh SQLite sandbox at sandbox_dbs/practice_v2.db (6 related
     tables + deterministic sample data).
  2. Verifies every question's expected query runs through the real execution
     engine with no error.
  3. If all pass, updates the existing question rows in Supabase in place with
     the new content (title, description, difficulty, category, schema, expected
     query, hint, tags) and points them at practice_v2.db.

Run from backend/ with the venv:
    venv\\Scripts\\python.exe scripts\\rebuild_dataset.py            # verify only
    venv\\Scripts\\python.exe scripts\\rebuild_dataset.py --apply    # verify + write Supabase
"""

import os
import sys
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
socket_timeout = 25

# ── Schema shown to users (Schema tab) ───────────────────────────────────────
SCHEMA_DISPLAY = """CREATE TABLE departments (
    id       INTEGER PRIMARY KEY,
    name     TEXT,
    location TEXT
);

CREATE TABLE employees (
    id            INTEGER PRIMARY KEY,
    name          TEXT,
    department_id INTEGER,   -- -> departments.id
    salary        INTEGER,
    hire_date     TEXT,      -- YYYY-MM-DD
    manager_id    INTEGER,   -- -> employees.id (NULL for managers)
    job_title     TEXT
);

CREATE TABLE customers (
    id          INTEGER PRIMARY KEY,
    name        TEXT,
    country     TEXT,
    signup_date TEXT
);

CREATE TABLE products (
    id       INTEGER PRIMARY KEY,
    name     TEXT,
    category TEXT,
    price    REAL
);

CREATE TABLE orders (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER,     -- -> customers.id
    order_date  TEXT,
    status      TEXT
);

CREATE TABLE order_items (
    id         INTEGER PRIMARY KEY,
    order_id   INTEGER,      -- -> orders.id
    product_id INTEGER,      -- -> products.id
    quantity   INTEGER,
    unit_price REAL
);"""

# ── Data used to build the sandbox (DROP so a re-run rebuilds cleanly) ────────
DEPARTMENTS = [
    (1, "Engineering", "San Francisco"),
    (2, "Sales", "New York"),
    (3, "Marketing", "Chicago"),
    (4, "Support", "Austin"),
    (5, "Finance", "New York"),
    (6, "HR", "Chicago"),
    (7, "Legal", "Boston"),  # no employees (for LEFT JOIN questions)
]

EMPLOYEES = [
    (1, "Alice Johnson", 1, 145000, "2018-03-01", None, "Engineering Manager"),
    (2, "Bob Smith", 1, 120000, "2019-06-15", 1, "Software Engineer"),
    (3, "Carol White", 1, 115000, "2020-01-20", 1, "Software Engineer"),
    (4, "David Brown", 1, 98000, "2021-09-10", 1, "Junior Engineer"),
    (5, "Eve Davis", 2, 130000, "2017-11-05", None, "Sales Director"),
    (6, "Frank Miller", 2, 90000, "2019-02-28", 5, "Sales Rep"),
    (7, "Grace Wilson", 2, 95000, "2020-07-14", 5, "Sales Rep"),
    (8, "Henry Moore", 2, 85000, "2022-03-01", 5, "Sales Rep"),
    (9, "Ivy Taylor", 3, 105000, "2018-08-19", None, "Marketing Manager"),
    (10, "Jack Anderson", 3, 78000, "2021-04-22", 9, "Marketing Analyst"),
    (11, "Karen Thomas", 3, 82000, "2020-10-30", 9, "Content Strategist"),
    (12, "Leo Martin", 4, 70000, "2021-01-11", None, "Support Lead"),
    (13, "Mia Garcia", 4, 60000, "2022-05-17", 12, "Support Agent"),
    (14, "Nina Lopez", 4, 58000, "2023-02-08", 12, "Support Agent"),
    (15, "Oscar Lee", 5, 125000, "2016-12-01", None, "Finance Director"),
    (16, "Paula Hall", 5, 88000, "2019-09-23", 15, "Accountant"),
    (17, "Quinn Young", 5, 92000, "2020-03-14", 15, "Financial Analyst"),
    (18, "Rachel King", 6, 99000, "2017-07-07", None, "HR Manager"),
    (19, "Sam Wright", 6, 65000, "2021-11-19", 18, "Recruiter"),
    (20, "Tina Scott", 1, 110000, "2022-08-25", 1, "Software Engineer"),
]

CUSTOMERS = [
    (1, "Acme Corp", "USA", "2021-01-15"),
    (2, "Globex", "USA", "2021-03-22"),
    (3, "Initech", "Canada", "2020-11-30"),
    (4, "Umbrella", "UK", "2022-02-14"),
    (5, "Hooli", "USA", "2021-07-19"),
    (6, "Stark Industries", "USA", "2020-05-05"),
    (7, "Wayne Enterprises", "USA", "2021-09-09"),
    (8, "Soylent", "Germany", "2022-06-18"),
    (9, "Cyberdyne", "USA", "2021-12-01"),
    (10, "Wonka", "UK", "2020-08-23"),
    (11, "Tyrell", "Germany", "2022-01-10"),  # no orders
    (12, "Nakatomi", "Japan", "2021-04-04"),  # no orders
]

PRODUCTS = [
    (1, "Laptop", "Electronics", 1200.00),
    (2, "Monitor", "Electronics", 300.00),
    (3, "Keyboard", "Accessories", 80.00),
    (4, "Mouse", "Accessories", 40.00),
    (5, "Desk Chair", "Furniture", 250.00),
    (6, "Standing Desk", "Furniture", 600.00),
    (7, "Webcam", "Electronics", 120.00),
    (8, "Headset", "Accessories", 150.00),
    (9, "Notebook", "Office", 15.00),
    (10, "Pen Set", "Office", 25.00),
    (11, "Cable Pack", "Accessories", 20.00),   # never ordered
    (12, "Laptop Stand", "Furniture", 90.00),   # never ordered
]

ORDERS = [
    (1, 1, "2023-01-05", "Completed"),
    (2, 2, "2023-01-12", "Completed"),
    (3, 1, "2023-02-03", "Shipped"),
    (4, 3, "2023-02-15", "Completed"),
    (5, 4, "2023-03-01", "Pending"),
    (6, 5, "2023-03-10", "Completed"),
    (7, 2, "2023-03-22", "Cancelled"),
    (8, 6, "2023-04-02", "Completed"),
    (9, 7, "2023-04-18", "Shipped"),
    (10, 1, "2023-05-07", "Completed"),
    (11, 8, "2023-05-19", "Pending"),
    (12, 9, "2023-06-01", "Completed"),
    (13, 5, "2023-06-14", "Completed"),
    (14, 10, "2023-06-28", "Shipped"),
    (15, 3, "2023-07-09", "Completed"),
]

ORDER_ITEMS = [
    (1, 1, 1, 1, 1200.00), (2, 1, 3, 2, 80.00),
    (3, 2, 2, 2, 300.00), (4, 2, 4, 3, 40.00),
    (5, 3, 5, 4, 250.00),
    (6, 4, 1, 1, 1200.00), (7, 4, 7, 1, 120.00),
    (8, 5, 9, 10, 15.00),
    (9, 6, 6, 1, 600.00), (10, 6, 2, 1, 300.00),
    (11, 7, 8, 2, 150.00),
    (12, 8, 1, 2, 1200.00),
    (13, 9, 3, 1, 80.00), (14, 9, 4, 1, 40.00), (15, 9, 10, 5, 25.00),
    (16, 10, 2, 3, 300.00),
    (17, 11, 5, 2, 250.00),
    (18, 12, 7, 2, 120.00), (19, 12, 8, 1, 150.00),
    (20, 13, 1, 1, 1200.00), (21, 13, 6, 1, 600.00),
    (22, 14, 9, 20, 15.00),
    (23, 15, 2, 1, 300.00), (24, 15, 3, 1, 80.00),
]

SAMPLE_DISPLAY = (
    "-- departments: 7 rows (Engineering, Sales, Marketing, Support, Finance, HR, Legal)\n"
    "-- employees:   20 rows across departments 1-6 (Legal has none); manager_id is self-referential\n"
    "-- customers:   12 rows (USA, Canada, UK, Germany, Japan)\n"
    "-- products:    12 rows (Electronics, Accessories, Furniture, Office)\n"
    "-- orders:      15 rows (status: Completed, Shipped, Pending, Cancelled)\n"
    "-- order_items: 24 rows linking orders to products (quantity, unit_price)\n\n"
    "-- examples:\n"
    "INSERT INTO departments VALUES (1, 'Engineering', 'San Francisco');\n"
    "INSERT INTO employees   VALUES (2, 'Bob Smith', 1, 120000, '2019-06-15', 1, 'Software Engineer');\n"
    "INSERT INTO products    VALUES (1, 'Laptop', 'Electronics', 1200.0);\n"
    "INSERT INTO orders      VALUES (1, 1, '2023-01-05', 'Completed');\n"
    "INSERT INTO order_items VALUES (1, 1, 1, 1, 1200.0);"
)


def build_sandbox(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    for t in ("order_items", "orders", "products", "customers", "employees", "departments"):
        cur.execute(f"DROP TABLE IF EXISTS {t}")
    cur.executescript(SCHEMA_DISPLAY)
    cur.executemany("INSERT INTO departments VALUES (?,?,?)", DEPARTMENTS)
    cur.executemany("INSERT INTO employees VALUES (?,?,?,?,?,?,?)", EMPLOYEES)
    cur.executemany("INSERT INTO customers VALUES (?,?,?,?)", CUSTOMERS)
    cur.executemany("INSERT INTO products VALUES (?,?,?,?)", PRODUCTS)
    cur.executemany("INSERT INTO orders VALUES (?,?,?,?)", ORDERS)
    cur.executemany("INSERT INTO order_items VALUES (?,?,?,?,?)", ORDER_ITEMS)
    conn.commit()
    conn.close()


# ── 100 questions (10 per category) ──────────────────────────────────────────
# Each: (slug, difficulty, title, description, hint, tags, expected_query)
Q = []


def add(slug, diff, title, desc, hint, tags, sql):
    Q.append({
        "slug": slug, "difficulty": diff, "title": title,
        "description": desc, "hint": hint, "tags": tags, "sql": sql.strip(),
    })


# 1) basic-select
add("basic-select", "Easy", "All employees",
    "Return every column for all employees.",
    "Use SELECT * on the employees table.", "select",
    "SELECT * FROM employees")
add("basic-select", "Easy", "Employee names and salaries",
    "Return the name and salary of every employee.",
    "List the two columns after SELECT.", "select",
    "SELECT name, salary FROM employees")
add("basic-select", "Easy", "Distinct job titles",
    "Return each distinct job title held by employees.",
    "Use SELECT DISTINCT.", "select,distinct",
    "SELECT DISTINCT job_title FROM employees")
add("basic-select", "Easy", "All product names",
    "Return the name of every product.",
    "Select a single column.", "select",
    "SELECT name FROM products")
add("basic-select", "Easy", "Distinct customer countries",
    "Return the distinct countries customers come from.",
    "DISTINCT removes duplicates.", "select,distinct",
    "SELECT DISTINCT country FROM customers")
add("basic-select", "Easy", "Products with price alias",
    "Return each product's name and its price, labelling the price column price_usd.",
    "Use AS to alias a column.", "select,alias",
    "SELECT name, price AS price_usd FROM products")
add("basic-select", "Easy", "First five employees by id",
    "Return the id and name of the first five employees ordered by id.",
    "Combine ORDER BY with LIMIT.", "select,limit",
    "SELECT id, name FROM employees ORDER BY id LIMIT 5")
add("basic-select", "Easy", "Distinct department ids",
    "Return the distinct department ids that employees belong to.",
    "SELECT DISTINCT on department_id.", "select,distinct",
    "SELECT DISTINCT department_id FROM employees")
add("basic-select", "Easy", "Customer signup dates",
    "Return each customer's name and signup date.",
    "Two columns from customers.", "select",
    "SELECT name, signup_date FROM customers")
add("basic-select", "Easy", "Product name and category",
    "Return the name and category of every product.",
    "Select two columns from products.", "select",
    "SELECT name, category FROM products")

# 2) where-clause
add("where-clause", "Easy", "High earners",
    "Return the name and salary of employees earning more than 100000.",
    "Filter with WHERE salary > 100000.", "where",
    "SELECT name, salary FROM employees WHERE salary > 100000")
add("where-clause", "Easy", "Employees in department 1",
    "Return the names of employees in department 1.",
    "WHERE department_id = 1.", "where",
    "SELECT name FROM employees WHERE department_id = 1")
add("where-clause", "Easy", "Mid-priced products",
    "Return the name and price of products priced between 100 and 500 inclusive.",
    "Use BETWEEN.", "where,between",
    "SELECT name, price FROM products WHERE price BETWEEN 100 AND 500")
add("where-clause", "Easy", "US customers",
    "Return the names of customers from the USA.",
    "WHERE country = 'USA'.", "where",
    "SELECT name FROM customers WHERE country = 'USA'")
add("where-clause", "Medium", "Recently hired",
    "Return the name and hire date of employees hired after 2021-01-01.",
    "Compare the text date with >.", "where,dates",
    "SELECT name, hire_date FROM employees WHERE hire_date > '2021-01-01'")
add("where-clause", "Easy", "Active orders",
    "Return the id and status of orders whose status is Completed or Shipped.",
    "Use IN with a list.", "where,in",
    "SELECT id, status FROM orders WHERE status IN ('Completed','Shipped')")
add("where-clause", "Easy", "Names starting with A",
    "Return the names of employees whose name starts with the letter A.",
    "Use LIKE 'A%'.", "where,like",
    "SELECT name FROM employees WHERE name LIKE 'A%'")
add("where-clause", "Medium", "Department heads",
    "Return the names of employees who have no manager.",
    "manager_id IS NULL.", "where,null",
    "SELECT name FROM employees WHERE manager_id IS NULL")
add("where-clause", "Easy", "Non-electronics products",
    "Return the name and category of products that are not Electronics.",
    "Use <> or !=.", "where",
    "SELECT name, category FROM products WHERE category <> 'Electronics'")
add("where-clause", "Medium", "North American 2021 signups",
    "Return names of customers from the USA or Canada who signed up during 2021.",
    "Combine IN with a date range using AND.", "where,and,in",
    "SELECT name FROM customers WHERE country IN ('USA','Canada') AND signup_date >= '2021-01-01' AND signup_date < '2022-01-01'")

# 3) order-by
add("order-by", "Easy", "Employees by salary",
    "Return the name and salary of all employees, highest salary first.",
    "ORDER BY salary DESC.", "order-by",
    "SELECT name, salary FROM employees ORDER BY salary DESC")
add("order-by", "Easy", "Products cheapest first",
    "Return the name and price of products, cheapest first.",
    "ORDER BY price ASC.", "order-by",
    "SELECT name, price FROM products ORDER BY price ASC")
add("order-by", "Easy", "Top 3 earners",
    "Return the name and salary of the three highest-paid employees.",
    "ORDER BY DESC then LIMIT 3.", "order-by,limit",
    "SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3")
add("order-by", "Medium", "By department then salary",
    "Return name, department_id and salary ordered by department ascending, then salary descending.",
    "ORDER BY can take two columns.", "order-by",
    "SELECT name, department_id, salary FROM employees ORDER BY department_id ASC, salary DESC")
add("order-by", "Easy", "Five cheapest products",
    "Return the five cheapest products' name and price.",
    "ORDER BY price then LIMIT 5.", "order-by,limit",
    "SELECT name, price FROM products ORDER BY price ASC LIMIT 5")
add("order-by", "Easy", "Customers by signup",
    "Return customer names and signup dates, earliest first.",
    "ORDER BY signup_date ASC.", "order-by",
    "SELECT name, signup_date FROM customers ORDER BY signup_date ASC")
add("order-by", "Easy", "Newest orders",
    "Return order id and date, newest first.",
    "ORDER BY order_date DESC.", "order-by",
    "SELECT id, order_date FROM orders ORDER BY order_date DESC")
add("order-by", "Medium", "Longest-tenured employees",
    "Return the name and hire date of the five longest-tenured employees.",
    "Oldest hire_date first, then LIMIT 5.", "order-by,limit",
    "SELECT name, hire_date FROM employees ORDER BY hire_date ASC LIMIT 5")
add("order-by", "Easy", "Products by category then name",
    "Return product name and category ordered by category, then name.",
    "Two-column ORDER BY.", "order-by",
    "SELECT name, category FROM products ORDER BY category ASC, name ASC")
add("order-by", "Medium", "Second and third highest paid",
    "Return the name and salary of the second and third highest-paid employees.",
    "Use LIMIT with OFFSET.", "order-by,offset",
    "SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 2 OFFSET 1")

# 4) group-by
add("group-by", "Medium", "Employees per department",
    "Return each department_id and its number of employees, ordered by department_id.",
    "GROUP BY department_id with COUNT(*).", "group-by,count",
    "SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id ORDER BY department_id")
add("group-by", "Medium", "Average salary per department",
    "Return department_id and the average salary (rounded to 2 decimals), ordered by department_id.",
    "AVG with GROUP BY, wrap in ROUND.", "group-by,avg",
    "SELECT department_id, ROUND(AVG(salary),2) AS avg_salary FROM employees GROUP BY department_id ORDER BY department_id")
add("group-by", "Easy", "Products per category",
    "Return each category and how many products it has, ordered by category.",
    "GROUP BY category.", "group-by,count",
    "SELECT category, COUNT(*) AS product_count FROM products GROUP BY category ORDER BY category")
add("group-by", "Easy", "Customers per country",
    "Return each country and its customer count, ordered by country.",
    "GROUP BY country.", "group-by,count",
    "SELECT country, COUNT(*) AS customer_count FROM customers GROUP BY country ORDER BY country")
add("group-by", "Easy", "Orders per status",
    "Return each order status and how many orders have it, ordered by status.",
    "GROUP BY status.", "group-by,count",
    "SELECT status, COUNT(*) AS order_count FROM orders GROUP BY status ORDER BY status")
add("group-by", "Medium", "Large departments",
    "Return department_id and employee count for departments with more than 3 employees.",
    "Filter groups with HAVING.", "group-by,having",
    "SELECT department_id, COUNT(*) AS cnt FROM employees GROUP BY department_id HAVING COUNT(*) > 3 ORDER BY department_id")
add("group-by", "Medium", "Top salary per department",
    "Return department_id and the maximum salary in each, ordered by department_id.",
    "MAX with GROUP BY.", "group-by,max",
    "SELECT department_id, MAX(salary) AS max_salary FROM employees GROUP BY department_id ORDER BY department_id")
add("group-by", "Medium", "Units sold per product",
    "Return product_id and total quantity ordered, ordered by product_id.",
    "SUM(quantity) grouped by product_id.", "group-by,sum",
    "SELECT product_id, SUM(quantity) AS total_qty FROM order_items GROUP BY product_id ORDER BY product_id")
add("group-by", "Medium", "Premium categories",
    "Return category and average price for categories whose average price exceeds 100.",
    "HAVING AVG(price) > 100.", "group-by,having",
    "SELECT category, ROUND(AVG(price),2) AS avg_price FROM products GROUP BY category HAVING AVG(price) > 100 ORDER BY category")
add("group-by", "Medium", "Repeat customers",
    "Return customer_id and order count for customers with at least two orders, ordered by customer_id.",
    "HAVING COUNT(*) >= 2.", "group-by,having",
    "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2 ORDER BY customer_id")

# 5) joins
add("joins", "Medium", "Employee departments",
    "Return each employee's name and their department name, ordered by employee id.",
    "JOIN employees to departments on department_id.", "joins,inner",
    "SELECT e.name, d.name AS department FROM employees e JOIN departments d ON e.department_id = d.id ORDER BY e.id")
add("joins", "Medium", "Employees and managers",
    "Return each employee's name and their manager's name, ordered by employee id.",
    "Self-join employees to employees on manager_id.", "joins,self-join",
    "SELECT e.name AS employee, m.name AS manager FROM employees e JOIN employees m ON e.manager_id = m.id ORDER BY e.id")
add("joins", "Medium", "Empty departments",
    "Return the names of departments that have no employees.",
    "LEFT JOIN and keep rows where the employee side is NULL.", "joins,left-join",
    "SELECT d.name FROM departments d LEFT JOIN employees e ON e.department_id = d.id WHERE e.id IS NULL ORDER BY d.id")
add("joins", "Medium", "Orders with customer",
    "Return each order id and the customer name that placed it, ordered by order id.",
    "JOIN orders to customers.", "joins,inner",
    "SELECT o.id AS order_id, c.name AS customer FROM orders o JOIN customers c ON o.customer_id = c.id ORDER BY o.id")
add("joins", "Medium", "Order lines with product",
    "Return order_id, product name and quantity for every order line, ordered by order_items id.",
    "JOIN order_items to products.", "joins,inner",
    "SELECT oi.order_id, p.name AS product, oi.quantity FROM order_items oi JOIN products p ON oi.product_id = p.id ORDER BY oi.id")
add("joins", "Medium", "Headcount by department name",
    "Return each department name and its employee count (0 included), ordered by department id.",
    "LEFT JOIN then GROUP BY, COUNT the employee id.", "joins,group-by",
    "SELECT d.name AS department, COUNT(e.id) AS employee_count FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id, d.name ORDER BY d.id")
add("joins", "Hard", "Order totals",
    "Return each order id and its total value (sum of quantity * unit_price, rounded to 2), ordered by order id.",
    "JOIN orders to order_items, SUM the line totals.", "joins,aggregation",
    "SELECT o.id AS order_id, ROUND(SUM(oi.quantity * oi.unit_price),2) AS total FROM orders o JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id ORDER BY o.id")
add("joins", "Medium", "Orders per customer including zero",
    "Return each customer's name and number of orders, including customers with none, ordered by customer id.",
    "LEFT JOIN customers to orders and COUNT the order id.", "joins,left-join",
    "SELECT c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name ORDER BY c.id")
add("joins", "Medium", "Never-ordered products",
    "Return the names of products that have never appeared in an order, ordered by product id.",
    "LEFT JOIN products to order_items, keep NULL matches.", "joins,left-join",
    "SELECT p.name FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id WHERE oi.id IS NULL ORDER BY p.id")
add("joins", "Medium", "Employees with location",
    "Return each employee's name, department name and department location, ordered by employee id.",
    "JOIN employees to departments and select location.", "joins",
    "SELECT e.name, d.name AS department, d.location FROM employees e JOIN departments d ON e.department_id = d.id ORDER BY e.id")

# 6) aggregation
add("aggregation", "Easy", "Total employees",
    "Return the total number of employees.",
    "COUNT(*).", "aggregation,count",
    "SELECT COUNT(*) AS total_employees FROM employees")
add("aggregation", "Easy", "Average salary",
    "Return the average salary across all employees, rounded to 2 decimals.",
    "ROUND(AVG(salary),2).", "aggregation,avg",
    "SELECT ROUND(AVG(salary),2) AS avg_salary FROM employees")
add("aggregation", "Easy", "Salary range",
    "Return the highest and lowest employee salary.",
    "MAX and MIN in one SELECT.", "aggregation,min,max",
    "SELECT MAX(salary) AS max_salary, MIN(salary) AS min_salary FROM employees")
add("aggregation", "Medium", "Total revenue",
    "Return total revenue across all order lines (sum of quantity * unit_price), rounded to 2 decimals.",
    "SUM a computed expression.", "aggregation,sum",
    "SELECT ROUND(SUM(quantity * unit_price),2) AS total_revenue FROM order_items")
add("aggregation", "Easy", "Distinct countries",
    "Return the number of distinct customer countries.",
    "COUNT(DISTINCT country).", "aggregation,distinct",
    "SELECT COUNT(DISTINCT country) AS country_count FROM customers")
add("aggregation", "Easy", "Average product price",
    "Return the average product price, rounded to 2 decimals.",
    "ROUND(AVG(price),2).", "aggregation,avg",
    "SELECT ROUND(AVG(price),2) AS avg_price FROM products")
add("aggregation", "Medium", "Payroll per department",
    "Return department_id and the total salary paid in each, ordered by department_id.",
    "SUM(salary) grouped by department.", "aggregation,sum",
    "SELECT department_id, SUM(salary) AS total_salary FROM employees GROUP BY department_id ORDER BY department_id")
add("aggregation", "Easy", "Completed order count",
    "Return how many orders have the status Completed.",
    "COUNT with a WHERE filter.", "aggregation,count",
    "SELECT COUNT(*) AS completed_orders FROM orders WHERE status = 'Completed'")
add("aggregation", "Hard", "Largest order value",
    "Return the value of the single largest order (max of per-order totals), rounded to 2 decimals.",
    "Aggregate per order in a subquery, then take the MAX.", "aggregation,subquery",
    "SELECT ROUND(MAX(order_total),2) AS largest_order FROM (SELECT order_id, SUM(quantity * unit_price) AS order_total FROM order_items GROUP BY order_id)")
add("aggregation", "Hard", "Average items per order",
    "Return the average number of line items per order, rounded to 2 decimals.",
    "Count items per order in a subquery, then AVG.", "aggregation,subquery",
    "SELECT ROUND(AVG(item_count),2) AS avg_items FROM (SELECT order_id, COUNT(*) AS item_count FROM order_items GROUP BY order_id)")

# 7) case-expressions
add("case-expressions", "Medium", "Salary band",
    "Return each employee's name and a salary_band of 'High' when salary is at least 100000, otherwise 'Low', ordered by id.",
    "CASE WHEN salary >= 100000 THEN 'High' ELSE 'Low' END.", "case",
    "SELECT name, CASE WHEN salary >= 100000 THEN 'High' ELSE 'Low' END AS salary_band FROM employees ORDER BY id")
add("case-expressions", "Medium", "Price tiers",
    "Return each product's name and a tier: 'Budget' under 50, 'Mid' under 300, otherwise 'Premium'. Order by id.",
    "Chain multiple WHEN branches.", "case",
    "SELECT name, CASE WHEN price < 50 THEN 'Budget' WHEN price < 300 THEN 'Mid' ELSE 'Premium' END AS tier FROM products ORDER BY id")
add("case-expressions", "Medium", "High vs low earners",
    "Return the count of high earners (salary >= 100000) and low earners in one row.",
    "SUM a CASE expression for each bucket.", "case,conditional-aggregation",
    "SELECT SUM(CASE WHEN salary >= 100000 THEN 1 ELSE 0 END) AS high_earners, SUM(CASE WHEN salary < 100000 THEN 1 ELSE 0 END) AS low_earners FROM employees")
add("case-expressions", "Medium", "Order state label",
    "Return order id and a state: 'Done' for Completed, 'In transit' for Shipped, otherwise 'Open'. Order by id.",
    "CASE can switch on a column's value.", "case",
    "SELECT id, CASE status WHEN 'Completed' THEN 'Done' WHEN 'Shipped' THEN 'In transit' ELSE 'Open' END AS state FROM orders ORDER BY id")
add("case-expressions", "Medium", "Tenure labels",
    "Return each employee's name and a tenure label: 'Veteran' hired before 2019, 'Experienced' before 2022, else 'New'. Order by id.",
    "Compare hire_date text in CASE branches.", "case,dates",
    "SELECT name, CASE WHEN hire_date < '2019-01-01' THEN 'Veteran' WHEN hire_date < '2022-01-01' THEN 'Experienced' ELSE 'New' END AS tenure FROM employees ORDER BY id")
add("case-expressions", "Hard", "Products per tier",
    "Return each price tier (Budget < 50, Mid < 300, else Premium) and how many products fall in it, ordered by tier.",
    "GROUP BY the CASE expression.", "case,group-by",
    "SELECT CASE WHEN price < 50 THEN 'Budget' WHEN price < 300 THEN 'Mid' ELSE 'Premium' END AS tier, COUNT(*) AS cnt FROM products GROUP BY tier ORDER BY tier")
add("case-expressions", "Medium", "Domestic vs international",
    "Return each customer's name and 'Domestic' if country is USA else 'International'. Order by id.",
    "Simple two-branch CASE.", "case",
    "SELECT name, CASE WHEN country = 'USA' THEN 'Domestic' ELSE 'International' END AS region FROM customers ORDER BY id")
add("case-expressions", "Hard", "Compared to average",
    "Return each employee's name, salary and whether it is 'Above avg' or 'Below avg' versus the overall average, ordered by id.",
    "Use a scalar subquery inside CASE.", "case,subquery",
    "SELECT name, salary, CASE WHEN salary > (SELECT AVG(salary) FROM employees) THEN 'Above avg' ELSE 'Below avg' END AS vs_avg FROM employees ORDER BY id")
add("case-expressions", "Medium", "Completed orders per customer",
    "Return customer_id and the number of their Completed orders, ordered by customer_id.",
    "SUM a CASE grouped by customer.", "case,conditional-aggregation",
    "SELECT customer_id, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed FROM orders GROUP BY customer_id ORDER BY customer_id")
add("case-expressions", "Medium", "Expensive flag",
    "Return each product's name and 'Expensive' when price is over 1000 else 'Affordable', ordered by id.",
    "Two-branch CASE on price.", "case",
    "SELECT name, CASE WHEN price > 1000 THEN 'Expensive' ELSE 'Affordable' END AS label FROM products ORDER BY id")

# 8) window-functions
add("window-functions", "Medium", "Rank by salary",
    "Return each employee's name, salary and overall salary rank (1 = highest). Order by rank then id.",
    "RANK() OVER (ORDER BY salary DESC).", "window,rank",
    "SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS salary_rank FROM employees ORDER BY salary_rank, id")
add("window-functions", "Hard", "Salary order within department",
    "Return name, department_id and a row number per department ordered by salary descending.",
    "ROW_NUMBER with PARTITION BY department_id.", "window,row-number",
    "SELECT name, department_id, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees ORDER BY department_id, rn")
add("window-functions", "Medium", "Dense price rank",
    "Return product name, price and a dense rank by price descending. Order by rank then id.",
    "DENSE_RANK() OVER (ORDER BY price DESC).", "window,dense-rank",
    "SELECT name, price, DENSE_RANK() OVER (ORDER BY price DESC) AS price_rank FROM products ORDER BY price_rank, id")
add("window-functions", "Hard", "Running revenue",
    "Return each order id, its date, its total, and a running total of order values ordered by date then id.",
    "Aggregate per order in a CTE, then SUM(total) OVER (ORDER BY ...).", "window,cte,running-total",
    "WITH order_totals AS (SELECT o.id, o.order_date, SUM(oi.quantity * oi.unit_price) AS total FROM orders o JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, o.order_date) SELECT id, order_date, total, SUM(total) OVER (ORDER BY order_date, id) AS running_total FROM order_totals ORDER BY order_date, id")
add("window-functions", "Hard", "Salary vs department average",
    "Return name, department_id, salary and the department's average salary (rounded) alongside each row. Order by department then id.",
    "AVG(salary) OVER (PARTITION BY department_id).", "window,avg",
    "SELECT name, department_id, salary, ROUND(AVG(salary) OVER (PARTITION BY department_id),2) AS dept_avg FROM employees ORDER BY department_id, id")
add("window-functions", "Hard", "Gap to previous salary",
    "Return name, salary and the difference from the previous lower salary (ordered by salary). Order by salary then id.",
    "Use LAG(salary) OVER (ORDER BY salary).", "window,lag",
    "SELECT name, salary, salary - LAG(salary) OVER (ORDER BY salary) AS diff_from_prev FROM employees ORDER BY salary, id")
add("window-functions", "Hard", "Next salary up",
    "Return name, salary and the next higher salary using LEAD, ordered by salary then id.",
    "LEAD(salary) OVER (ORDER BY salary).", "window,lead",
    "SELECT name, salary, LEAD(salary) OVER (ORDER BY salary) AS next_salary FROM employees ORDER BY salary, id")
add("window-functions", "Hard", "Top earner per department",
    "Return the name, department_id and salary of the highest-paid employee in each department, ordered by department_id.",
    "Rank inside a CTE and keep rn = 1.", "window,cte",
    "WITH ranked AS (SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees) SELECT name, department_id, salary FROM ranked WHERE rn = 1 ORDER BY department_id")
add("window-functions", "Hard", "Salary quartiles",
    "Return name, salary and the salary quartile (1-4, 1 = highest) using NTILE, ordered by salary descending then id.",
    "NTILE(4) OVER (ORDER BY salary DESC).", "window,ntile",
    "SELECT name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees ORDER BY salary DESC, id")
add("window-functions", "Hard", "Cumulative hires",
    "Return each employee's name, hire date and the cumulative number of employees hired up to and including that date, ordered by hire date then id.",
    "COUNT(*) OVER (ORDER BY hire_date).", "window,running-total",
    "SELECT name, hire_date, COUNT(*) OVER (ORDER BY hire_date) AS hired_so_far FROM employees ORDER BY hire_date, id")

# 9) ctes
add("ctes", "Medium", "High earners CTE",
    "Using a CTE of employees earning at least 100000, return their name and salary ordered by salary descending.",
    "Define WITH high AS (...) then select from it.", "cte",
    "WITH high AS (SELECT name, salary FROM employees WHERE salary >= 100000) SELECT name, salary FROM high ORDER BY salary DESC")
add("ctes", "Medium", "Above average via CTE",
    "Using a CTE holding the average salary, return the name and salary of employees above it, highest first.",
    "Cross join the one-row CTE and filter.", "cte",
    "WITH avg_sal AS (SELECT AVG(salary) AS a FROM employees) SELECT e.name, e.salary FROM employees e, avg_sal WHERE e.salary > avg_sal.a ORDER BY e.salary DESC")
add("ctes", "Medium", "Department averages",
    "Using a CTE of per-department average salary, return department name and average salary (rounded), ordered by department id.",
    "GROUP in the CTE, then JOIN to departments.", "cte,join",
    "WITH dept_avg AS (SELECT department_id, AVG(salary) AS avg_sal FROM employees GROUP BY department_id) SELECT d.name, ROUND(da.avg_sal,2) AS avg_salary FROM dept_avg da JOIN departments d ON d.id = da.department_id ORDER BY d.id")
add("ctes", "Hard", "Big orders",
    "Using a CTE of per-order totals, return order_id and total (rounded) for orders over 1000, highest first.",
    "Aggregate in the CTE, filter in the outer query.", "cte",
    "WITH ot AS (SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id) SELECT order_id, ROUND(total,2) AS total FROM ot WHERE total > 1000 ORDER BY total DESC")
add("ctes", "Hard", "Staffed departments",
    "Using a CTE of employee counts per department, return department name and count for departments with at least 3 employees, ordered by department id.",
    "Two CTEs or one CTE plus a filter.", "cte",
    "WITH dept_counts AS (SELECT department_id, COUNT(*) AS cnt FROM employees GROUP BY department_id) SELECT d.name, dc.cnt FROM dept_counts dc JOIN departments d ON d.id = dc.department_id WHERE dc.cnt >= 3 ORDER BY d.id")
add("ctes", "Medium", "Order counts CTE",
    "Using a CTE of order counts per customer, return customer name and order count, most orders first then customer id.",
    "GROUP in the CTE then JOIN customers.", "cte,join",
    "WITH oc AS (SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY customer_id) SELECT c.name, oc.orders FROM oc JOIN customers c ON c.id = oc.customer_id ORDER BY oc.orders DESC, c.id")
add("ctes", "Hard", "Revenue per product",
    "Using a CTE of revenue per product, return product name and revenue (rounded), highest first.",
    "SUM(quantity*unit_price) per product in the CTE.", "cte",
    "WITH rev AS (SELECT product_id, SUM(quantity * unit_price) AS revenue FROM order_items GROUP BY product_id) SELECT p.name, ROUND(r.revenue,2) AS revenue FROM rev r JOIN products p ON p.id = r.product_id ORDER BY r.revenue DESC")
add("ctes", "Medium", "Manager names via CTE",
    "Using a CTE of employee id and name, return each employee and their manager's name, ordered by employee id.",
    "Join employees to the CTE on manager_id.", "cte,self-join",
    "WITH mgr AS (SELECT id, name FROM employees) SELECT e.name AS employee, m.name AS manager FROM employees e JOIN mgr m ON e.manager_id = m.id ORDER BY e.id")
add("ctes", "Medium", "Monthly orders",
    "Using a CTE, return each year-month and the number of orders placed, ordered by month.",
    "strftime('%Y-%m', order_date) groups by month.", "cte,dates",
    "WITH monthly AS (SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS cnt FROM orders GROUP BY month) SELECT month, cnt FROM monthly ORDER BY month")
add("ctes", "Hard", "Best-selling product",
    "Using a CTE of revenue per product, return the single product name and revenue (rounded) with the highest revenue.",
    "Order the CTE result and LIMIT 1.", "cte",
    "WITH rev AS (SELECT product_id, SUM(quantity * unit_price) AS revenue FROM order_items GROUP BY product_id) SELECT p.name, ROUND(r.revenue,2) AS revenue FROM rev r JOIN products p ON p.id = r.product_id ORDER BY r.revenue DESC LIMIT 1")

# 10) subqueries
add("subqueries", "Medium", "Above-average salary",
    "Return the name and salary of employees who earn more than the overall average, highest first.",
    "Compare salary to a scalar subquery.", "subquery",
    "SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC")
add("subqueries", "Medium", "Above-average price",
    "Return the name and price of products priced above the average product price, highest first.",
    "WHERE price > (SELECT AVG(price) ...).", "subquery",
    "SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products) ORDER BY price DESC")
add("subqueries", "Medium", "New York staff",
    "Return the names of employees who work in departments located in New York, ordered by id.",
    "Use IN with a subquery over departments.", "subquery,in",
    "SELECT name FROM employees WHERE department_id IN (SELECT id FROM departments WHERE location = 'New York') ORDER BY id")
add("subqueries", "Medium", "Customers who ordered",
    "Return the names of customers who have placed at least one order, ordered by id.",
    "IN a subquery of customer_id from orders.", "subquery,in",
    "SELECT name FROM customers WHERE id IN (SELECT DISTINCT customer_id FROM orders) ORDER BY id")
add("subqueries", "Medium", "Customers without orders",
    "Return the names of customers who have never placed an order, ordered by id.",
    "NOT IN a subquery of customer_id from orders.", "subquery,not-in",
    "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders) ORDER BY id")
add("subqueries", "Medium", "Top paid employee",
    "Return the name and salary of the employee(s) earning the maximum salary.",
    "Compare salary to (SELECT MAX(salary) ...).", "subquery",
    "SELECT name, salary FROM employees WHERE salary = (SELECT MAX(salary) FROM employees)")
add("subqueries", "Hard", "Above own department average",
    "Return the name and salary of employees who earn more than the average salary of their own department, ordered by id.",
    "Use a correlated subquery filtered on the outer department_id.", "subquery,correlated",
    "SELECT name, salary FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.department_id = e.department_id) ORDER BY id")
add("subqueries", "Medium", "Departments with staff",
    "Return the names of departments that have at least one employee, ordered by id.",
    "Use EXISTS with a correlated subquery.", "subquery,exists",
    "SELECT name FROM departments d WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id) ORDER BY id")
add("subqueries", "Hard", "Pricier than all accessories",
    "Return the name and price of products that cost more than every Accessories product, cheapest first.",
    "Compare price to the MAX price of Accessories.", "subquery",
    "SELECT name, price FROM products WHERE price > (SELECT MAX(price) FROM products WHERE category = 'Accessories') ORDER BY price")
add("subqueries", "Hard", "Average order total",
    "Return the average order total (rounded to 2 decimals) using a subquery of per-order totals.",
    "Aggregate per order in a FROM subquery, then AVG.", "subquery,from",
    "SELECT ROUND(AVG(total),2) AS avg_order_total FROM (SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id)")


def verify(db_rel: str) -> list:
    """Run every expected query through the real engine; return list of failures."""
    from app.services.sql_engine import execute_sql
    failures = []
    for i, q in enumerate(Q):
        res = execute_sql(q["sql"], db_rel)
        if res["error"]:
            failures.append((i, q["slug"], q["title"], res["error"]))
        elif res["row_count"] == 0:
            failures.append((i, q["slug"], q["title"], "returned 0 rows"))
    return failures


def apply_to_supabase():
    import socket
    socket.setdefaulttimeout(socket_timeout)
    from app.database.session import SessionLocal, engine, Base
    import app.models.models  # noqa: F401
    from app.models.models import Question, Category, DifficultyLevel

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        cats = {c.slug: c.id for c in db.query(Category).all()}
        missing = sorted({q["slug"] for q in Q} - set(cats))
        if missing:
            print("ERROR: categories missing in DB:", missing)
            return 1

        existing = db.query(Question).order_by(Question.created_at, Question.id).all()
        print(f"existing questions: {len(existing)} | new questions: {len(Q)}")

        for i, q in enumerate(Q):
            fields = dict(
                title=q["title"],
                description=q["description"],
                difficulty=DifficultyLevel(q["difficulty"]),
                category_id=cats[q["slug"]],
                schema_sql=SCHEMA_DISPLAY,
                sample_data_sql=SAMPLE_DISPLAY,
                expected_query=q["sql"],
                hint=q["hint"],
                tags=q["tags"],
                sqlite_db_path="practice_v2.db",
                is_published=True,
                sort_order=i,
            )
            if i < len(existing):
                row = existing[i]
                for k, v in fields.items():
                    setattr(row, k, v)
            else:
                db.add(Question(**fields))
        # Hide any surplus old rows beyond our 100.
        for row in existing[len(Q):]:
            row.is_published = False
        db.commit()
        print(f"updated {min(len(existing), len(Q))}, inserted {max(0, len(Q) - len(existing))}, "
              f"hidden {max(0, len(existing) - len(Q))}")
        print("published questions now:", db.query(Question).filter(Question.is_published == True).count())
    finally:
        db.close()
    return 0


def main() -> int:
    from app.config import get_settings
    settings = get_settings()
    db_rel = "practice_v2.db"
    full = os.path.join(settings.SANDBOX_DB_DIR, db_rel)
    print("Building sandbox:", full)
    build_sandbox(full)

    print(f"Verifying {len(Q)} questions...")
    failures = verify(db_rel)
    if failures:
        print(f"\n{len(failures)} FAILURES:")
        for i, slug, title, err in failures:
            print(f"  [{i}] {slug} / {title} -> {err}")
        print("\nAborting: Supabase not touched.")
        return 1
    print(f"All {len(Q)} expected queries run cleanly.")

    if "--apply" in sys.argv:
        print("\nApplying to Supabase...")
        return apply_to_supabase()
    print("\n(dry run) pass --apply to write these into Supabase.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
