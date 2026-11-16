"""
Seed script to populate the database with categories, sample questions,
and create SQLite sandbox databases for SQL execution.
"""

import sqlite3
import os
import uuid
from datetime import datetime

from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine, Base
from app.models.models import User, Category, Question, DifficultyLevel
from app.services.auth_service import hash_password
from app.config import get_settings

settings = get_settings()

# ── Categories ───────────────────────────────────────────────────────────────

CATEGORIES = [
    {"name": "Basic SELECT", "slug": "basic-select", "description": "Learn the fundamentals of retrieving data", "icon": "Table", "color": "#2563EB", "sort_order": 1},
    {"name": "WHERE Clause", "slug": "where-clause", "description": "Filter data with conditions", "icon": "Filter", "color": "#7C3AED", "sort_order": 2},
    {"name": "ORDER BY", "slug": "order-by", "description": "Sort your query results", "icon": "ArrowUpDown", "color": "#0891B2", "sort_order": 3},
    {"name": "GROUP BY", "slug": "group-by", "description": "Aggregate data into groups", "icon": "LayoutGrid", "color": "#059669", "sort_order": 4},
    {"name": "JOINs", "slug": "joins", "description": "Combine data from multiple tables", "icon": "Link", "color": "#D97706", "sort_order": 5},
    {"name": "Aggregation", "slug": "aggregation", "description": "COUNT, SUM, AVG, MIN, MAX functions", "icon": "Calculator", "color": "#DC2626", "sort_order": 6},
    {"name": "CASE Expressions", "slug": "case-expressions", "description": "Conditional logic in SQL", "icon": "GitBranch", "color": "#4F46E5", "sort_order": 7},
    {"name": "Window Functions", "slug": "window-functions", "description": "Advanced analytical functions", "icon": "Columns", "color": "#BE185D", "sort_order": 8},
    {"name": "CTEs", "slug": "ctes", "description": "Common Table Expressions for readability", "icon": "Layers", "color": "#0D9488", "sort_order": 9},
    {"name": "Subqueries", "slug": "subqueries", "description": "Nested queries for complex logic", "icon": "Box", "color": "#92400E", "sort_order": 10},
]

# ── Schema for sandbox database ─────────────────────────────────────────────

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT CHECK(gender IN ('M','F')),
    birth_date TEXT,
    city TEXT,
    province_id TEXT,
    allergies TEXT,
    height INTEGER,
    weight INTEGER
);

CREATE TABLE IF NOT EXISTS admissions (
    patient_id INTEGER,
    admission_date TEXT,
    discharge_date TEXT,
    diagnosis TEXT,
    attending_doctor_id INTEGER,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    specialty TEXT
);

CREATE TABLE IF NOT EXISTS province_names (
    province_id TEXT PRIMARY KEY,
    province_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date TEXT,
    ship_date TEXT,
    total_amount REAL,
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    city TEXT,
    country TEXT,
    join_date TEXT
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    department TEXT,
    salary REAL,
    hire_date TEXT,
    manager_id INTEGER
);
"""

SAMPLE_DATA_SQL = """
-- Patients
INSERT INTO patients VALUES (1, 'John', 'Smith', 'M', '1990-05-15', 'Toronto', 'ON', 'Penicillin', 175, 80);
INSERT INTO patients VALUES (2, 'Jane', 'Doe', 'F', '1985-08-22', 'Vancouver', 'BC', NULL, 165, 60);
INSERT INTO patients VALUES (3, 'Bob', 'Johnson', 'M', '1978-12-01', 'Calgary', 'AB', 'Sulfa', 180, 90);
INSERT INTO patients VALUES (4, 'Alice', 'Williams', 'F', '1992-03-17', 'Toronto', 'ON', NULL, 160, 55);
INSERT INTO patients VALUES (5, 'Charlie', 'Brown', 'M', '1988-07-30', 'Montreal', 'QC', 'Aspirin', 170, 75);
INSERT INTO patients VALUES (6, 'Diana', 'Ross', 'F', '1995-11-10', 'Ottawa', 'ON', NULL, 168, 62);
INSERT INTO patients VALUES (7, 'Edward', 'Wilson', 'M', '1982-01-25', 'Edmonton', 'AB', 'Codeine', 178, 85);
INSERT INTO patients VALUES (8, 'Fiona', 'Davis', 'F', '1991-06-14', 'Winnipeg', 'MB', NULL, 163, 58);
INSERT INTO patients VALUES (9, 'George', 'Miller', 'M', '1975-09-08', 'Halifax', 'NS', 'Morphine', 185, 95);
INSERT INTO patients VALUES (10, 'Helen', 'Taylor', 'F', '1998-02-28', 'Toronto', 'ON', NULL, 158, 52);
INSERT INTO patients VALUES (11, 'Ivan', 'Anderson', 'M', '1987-04-12', 'Vancouver', 'BC', NULL, 176, 78);
INSERT INTO patients VALUES (12, 'Julia', 'Thomas', 'F', '1993-10-05', 'Calgary', 'AB', 'Penicillin', 167, 65);
INSERT INTO patients VALUES (13, 'Kevin', 'Jackson', 'M', '1980-08-19', 'Toronto', 'ON', NULL, 182, 88);
INSERT INTO patients VALUES (14, 'Laura', 'White', 'F', '1996-12-30', 'Montreal', 'QC', NULL, 162, 56);
INSERT INTO patients VALUES (15, 'Mike', 'Harris', 'M', '1983-06-22', 'Ottawa', 'ON', 'Sulfa', 177, 82);

-- Doctors
INSERT INTO doctors VALUES (1, 'Dr. Sarah', 'Chen', 'Cardiology');
INSERT INTO doctors VALUES (2, 'Dr. James', 'Lee', 'Neurology');
INSERT INTO doctors VALUES (3, 'Dr. Maria', 'Garcia', 'Pediatrics');
INSERT INTO doctors VALUES (4, 'Dr. Robert', 'Kim', 'Orthopedics');
INSERT INTO doctors VALUES (5, 'Dr. Emily', 'Patel', 'General Surgery');

-- Admissions
INSERT INTO admissions VALUES (1, '2024-01-15', '2024-01-20', 'Heart Attack', 1);
INSERT INTO admissions VALUES (2, '2024-01-18', '2024-01-22', 'Migraine', 2);
INSERT INTO admissions VALUES (3, '2024-02-01', '2024-02-05', 'Broken Leg', 4);
INSERT INTO admissions VALUES (4, '2024-02-10', '2024-02-12', 'Appendicitis', 5);
INSERT INTO admissions VALUES (5, '2024-02-15', '2024-02-18', 'Pneumonia', 1);
INSERT INTO admissions VALUES (1, '2024-03-01', '2024-03-04', 'Follow-up', 1);
INSERT INTO admissions VALUES (6, '2024-03-05', '2024-03-08', 'Flu', 3);
INSERT INTO admissions VALUES (7, '2024-03-10', '2024-03-15', 'Back Pain', 4);
INSERT INTO admissions VALUES (8, '2024-03-20', '2024-03-22', 'Allergic Reaction', 3);
INSERT INTO admissions VALUES (9, '2024-04-01', '2024-04-10', 'Stroke', 2);
INSERT INTO admissions VALUES (10, '2024-04-05', '2024-04-07', 'Tonsillitis', 3);
INSERT INTO admissions VALUES (3, '2024-04-15', '2024-04-18', 'Kidney Stones', 5);
INSERT INTO admissions VALUES (11, '2024-05-01', '2024-05-03', 'Bronchitis', 1);
INSERT INTO admissions VALUES (12, '2024-05-10', '2024-05-12', 'Ear Infection', 3);
INSERT INTO admissions VALUES (13, '2024-05-15', '2024-05-20', 'Hernia', 5);
INSERT INTO admissions VALUES (14, '2024-06-01', '2024-06-03', 'UTI', 3);
INSERT INTO admissions VALUES (15, '2024-06-10', '2024-06-14', 'Diabetes', 1);

-- Province Names
INSERT INTO province_names VALUES ('ON', 'Ontario');
INSERT INTO province_names VALUES ('BC', 'British Columbia');
INSERT INTO province_names VALUES ('AB', 'Alberta');
INSERT INTO province_names VALUES ('QC', 'Quebec');
INSERT INTO province_names VALUES ('MB', 'Manitoba');
INSERT INTO province_names VALUES ('NS', 'Nova Scotia');

-- Customers
INSERT INTO customers VALUES (1, 'Alice', 'Johnson', 'alice@email.com', 'New York', 'USA', '2023-01-15');
INSERT INTO customers VALUES (2, 'Bob', 'Smith', 'bob@email.com', 'London', 'UK', '2023-02-20');
INSERT INTO customers VALUES (3, 'Carol', 'Williams', 'carol@email.com', 'Toronto', 'Canada', '2023-03-10');
INSERT INTO customers VALUES (4, 'David', 'Brown', 'david@email.com', 'Sydney', 'Australia', '2023-04-05');
INSERT INTO customers VALUES (5, 'Eve', 'Davis', 'eve@email.com', 'New York', 'USA', '2023-05-12');
INSERT INTO customers VALUES (6, 'Frank', 'Miller', 'frank@email.com', 'London', 'UK', '2023-06-18');
INSERT INTO customers VALUES (7, 'Grace', 'Wilson', 'grace@email.com', 'Vancouver', 'Canada', '2023-07-22');
INSERT INTO customers VALUES (8, 'Henry', 'Moore', 'henry@email.com', 'Melbourne', 'Australia', '2023-08-30');
INSERT INTO customers VALUES (9, 'Ivy', 'Taylor', 'ivy@email.com', 'Chicago', 'USA', '2023-09-14');
INSERT INTO customers VALUES (10, 'Jack', 'Anderson', 'jack@email.com', 'Manchester', 'UK', '2023-10-01');

-- Orders
INSERT INTO orders VALUES (1, 1, '2024-01-05', '2024-01-08', 150.00, 'Delivered');
INSERT INTO orders VALUES (2, 1, '2024-01-15', '2024-01-18', 250.50, 'Delivered');
INSERT INTO orders VALUES (3, 2, '2024-01-20', '2024-01-25', 99.99, 'Delivered');
INSERT INTO orders VALUES (4, 3, '2024-02-01', '2024-02-04', 320.00, 'Delivered');
INSERT INTO orders VALUES (5, 4, '2024-02-10', NULL, 175.25, 'Cancelled');
INSERT INTO orders VALUES (6, 5, '2024-02-15', '2024-02-18', 450.00, 'Delivered');
INSERT INTO orders VALUES (7, 1, '2024-03-01', '2024-03-03', 89.99, 'Delivered');
INSERT INTO orders VALUES (8, 6, '2024-03-10', '2024-03-14', 210.00, 'Delivered');
INSERT INTO orders VALUES (9, 7, '2024-03-15', NULL, 550.00, 'Processing');
INSERT INTO orders VALUES (10, 2, '2024-03-20', '2024-03-22', 180.75, 'Delivered');
INSERT INTO orders VALUES (11, 8, '2024-04-01', '2024-04-05', 325.50, 'Delivered');
INSERT INTO orders VALUES (12, 3, '2024-04-10', '2024-04-12', 425.00, 'Delivered');
INSERT INTO orders VALUES (13, 9, '2024-04-15', NULL, 275.00, 'Shipped');
INSERT INTO orders VALUES (14, 10, '2024-04-20', '2024-04-23', 190.50, 'Delivered');
INSERT INTO orders VALUES (15, 5, '2024-05-01', '2024-05-04', 600.00, 'Delivered');
INSERT INTO orders VALUES (16, 4, '2024-05-10', NULL, 85.00, 'Cancelled');
INSERT INTO orders VALUES (17, 6, '2024-05-15', '2024-05-18', 340.25, 'Delivered');
INSERT INTO orders VALUES (18, 7, '2024-05-20', '2024-05-22', 420.00, 'Delivered');
INSERT INTO orders VALUES (19, 8, '2024-06-01', NULL, 155.75, 'Processing');
INSERT INTO orders VALUES (20, 9, '2024-06-05', '2024-06-08', 290.00, 'Delivered');

-- Employees
INSERT INTO employees VALUES (1, 'Sarah', 'Chen', 'Engineering', 120000, '2020-03-15', NULL);
INSERT INTO employees VALUES (2, 'James', 'Lee', 'Engineering', 95000, '2021-06-01', 1);
INSERT INTO employees VALUES (3, 'Maria', 'Garcia', 'Marketing', 85000, '2021-09-10', 5);
INSERT INTO employees VALUES (4, 'Robert', 'Kim', 'Engineering', 110000, '2019-11-20', 1);
INSERT INTO employees VALUES (5, 'Emily', 'Patel', 'Marketing', 105000, '2020-01-15', NULL);
INSERT INTO employees VALUES (6, 'Daniel', 'Wang', 'Sales', 78000, '2022-02-01', 8);
INSERT INTO employees VALUES (7, 'Lisa', 'Thompson', 'Engineering', 98000, '2021-04-15', 1);
INSERT INTO employees VALUES (8, 'Michael', 'Clark', 'Sales', 115000, '2019-08-10', NULL);
INSERT INTO employees VALUES (9, 'Anna', 'Martinez', 'HR', 82000, '2022-05-20', 11);
INSERT INTO employees VALUES (10, 'Chris', 'Wright', 'Engineering', 105000, '2020-07-01', 1);
INSERT INTO employees VALUES (11, 'Patricia', 'Hall', 'HR', 95000, '2020-12-01', NULL);
INSERT INTO employees VALUES (12, 'Kevin', 'Young', 'Sales', 72000, '2023-01-15', 8);
INSERT INTO employees VALUES (13, 'Nancy', 'King', 'Marketing', 88000, '2021-11-01', 5);
INSERT INTO employees VALUES (14, 'Steven', 'Scott', 'Engineering', 92000, '2022-03-10', 1);
INSERT INTO employees VALUES (15, 'Jennifer', 'Green', 'HR', 78000, '2023-02-15', 11);
"""

# ── Questions (100+) ────────────────────────────────────────────────────────

QUESTIONS = [
    # ── Basic SELECT (10) ────────────────────────────────────────────────────
    {
        "title": "Select All Patients",
        "description": "Write a query to show all columns for all patients in the patients table.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT * FROM patients",
        "hint": "Use SELECT * to retrieve all columns.",
        "tags": "SELECT, basics",
    },
    {
        "title": "Patient Names",
        "description": "Write a query to show the first_name and last_name of all patients.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT first_name, last_name FROM patients",
        "hint": "Specify the column names after SELECT.",
        "tags": "SELECT, columns",
    },
    {
        "title": "Unique Cities",
        "description": "Write a query to show all unique cities from the patients table.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT DISTINCT city FROM patients",
        "hint": "Use the DISTINCT keyword.",
        "tags": "DISTINCT, basics",
    },
    {
        "title": "Patient Count",
        "description": "Write a query to count the total number of patients.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT COUNT(*) AS total_patients FROM patients",
        "hint": "Use the COUNT() function.",
        "tags": "COUNT, basics",
    },
    {
        "title": "All Doctors",
        "description": "Write a query to show the first_name, last_name, and specialty of all doctors.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT first_name, last_name, specialty FROM doctors",
        "hint": "Select specific columns from the doctors table.",
        "tags": "SELECT, doctors",
    },
    {
        "title": "Customer Emails",
        "description": "Show all customer emails and their cities.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT email, city FROM customers",
        "hint": "Select email and city columns from customers.",
        "tags": "SELECT, customers",
    },
    {
        "title": "Employee Departments",
        "description": "Show all unique departments in the employees table.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT DISTINCT department FROM employees",
        "hint": "Use DISTINCT to get unique values.",
        "tags": "DISTINCT, employees",
    },
    {
        "title": "Order Statuses",
        "description": "List all distinct order statuses from the orders table.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT DISTINCT status FROM orders",
        "hint": "Use DISTINCT on the status column.",
        "tags": "DISTINCT, orders",
    },
    {
        "title": "First Five Patients",
        "description": "Show the first 5 patients (all columns) using LIMIT.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT * FROM patients LIMIT 5",
        "hint": "Use LIMIT to restrict results.",
        "tags": "LIMIT, basics",
    },
    {
        "title": "Province Names",
        "description": "Show all province IDs and their full names.",
        "difficulty": "Easy",
        "category_slug": "basic-select",
        "expected_query": "SELECT province_id, province_name FROM province_names",
        "hint": "Query the province_names table.",
        "tags": "SELECT, province",
    },

    # ── WHERE Clause (10) ───────────────────────────────────────────────────
    {
        "title": "Male Patients",
        "description": "Show the first_name and last_name of all male patients.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT first_name, last_name FROM patients WHERE gender = 'M'",
        "hint": "Use WHERE gender = 'M'.",
        "tags": "WHERE, filter",
    },
    {
        "title": "Toronto Patients",
        "description": "Show all patients who live in Toronto.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT * FROM patients WHERE city = 'Toronto'",
        "hint": "Filter by city column.",
        "tags": "WHERE, city",
    },
    {
        "title": "Patients with Allergies",
        "description": "Show patients who have allergies (allergies is not NULL).",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT * FROM patients WHERE allergies IS NOT NULL",
        "hint": "Use IS NOT NULL to find non-null values.",
        "tags": "WHERE, NULL",
    },
    {
        "title": "Heavy Patients",
        "description": "Find patients who weigh more than 80 kg.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT first_name, last_name, weight FROM patients WHERE weight > 80",
        "hint": "Use a comparison operator with WHERE.",
        "tags": "WHERE, comparison",
    },
    {
        "title": "Tall Female Patients",
        "description": "Show female patients taller than 165 cm.",
        "difficulty": "Medium",
        "category_slug": "where-clause",
        "expected_query": "SELECT first_name, last_name, height FROM patients WHERE gender = 'F' AND height > 165",
        "hint": "Combine conditions with AND.",
        "tags": "WHERE, AND",
    },
    {
        "title": "Ontario or BC Patients",
        "description": "Show patients from Ontario or British Columbia.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT * FROM patients WHERE province_id IN ('ON', 'BC')",
        "hint": "Use IN for multiple values.",
        "tags": "WHERE, IN",
    },
    {
        "title": "Penicillin Allergy",
        "description": "Find patients allergic to Penicillin.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT first_name, last_name FROM patients WHERE allergies = 'Penicillin'",
        "hint": "Filter allergies column for 'Penicillin'.",
        "tags": "WHERE, allergies",
    },
    {
        "title": "Name Starting with J",
        "description": "Find patients whose first name starts with 'J'.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT * FROM patients WHERE first_name LIKE 'J%'",
        "hint": "Use LIKE with a wildcard %.",
        "tags": "WHERE, LIKE",
    },
    {
        "title": "Delivered Orders Above 200",
        "description": "Show delivered orders with total amount above $200.",
        "difficulty": "Medium",
        "category_slug": "where-clause",
        "expected_query": "SELECT * FROM orders WHERE status = 'Delivered' AND total_amount > 200",
        "hint": "Combine status and amount conditions.",
        "tags": "WHERE, AND, orders",
    },
    {
        "title": "Patients Born After 1990",
        "description": "Find patients born after January 1, 1990.",
        "difficulty": "Easy",
        "category_slug": "where-clause",
        "expected_query": "SELECT first_name, last_name, birth_date FROM patients WHERE birth_date > '1990-01-01'",
        "hint": "Compare the birth_date column.",
        "tags": "WHERE, date",
    },

    # ── ORDER BY (10) ───────────────────────────────────────────────────────
    {
        "title": "Patients Alphabetically",
        "description": "Show all patient names ordered alphabetically by last name.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT first_name, last_name FROM patients ORDER BY last_name",
        "hint": "Use ORDER BY with the last_name column.",
        "tags": "ORDER BY, sort",
    },
    {
        "title": "Heaviest Patients First",
        "description": "Show patients ordered by weight from heaviest to lightest.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT first_name, last_name, weight FROM patients ORDER BY weight DESC",
        "hint": "Use DESC for descending order.",
        "tags": "ORDER BY, DESC",
    },
    {
        "title": "Newest Orders",
        "description": "Show the 5 most recent orders.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT * FROM orders ORDER BY order_date DESC LIMIT 5",
        "hint": "Combine ORDER BY DESC with LIMIT.",
        "tags": "ORDER BY, LIMIT",
    },
    {
        "title": "Employees by Salary",
        "description": "List employees ordered by salary descending, then by name ascending.",
        "difficulty": "Medium",
        "category_slug": "order-by",
        "expected_query": "SELECT first_name, last_name, salary FROM employees ORDER BY salary DESC, first_name ASC",
        "hint": "You can ORDER BY multiple columns.",
        "tags": "ORDER BY, multiple",
    },
    {
        "title": "Youngest Patients",
        "description": "Show the 3 youngest patients (most recent birth dates).",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT first_name, last_name, birth_date FROM patients ORDER BY birth_date DESC LIMIT 3",
        "hint": "Order by birth_date descending and limit to 3.",
        "tags": "ORDER BY, date",
    },
    {
        "title": "Orders by Amount",
        "description": "List all orders sorted by total_amount ascending. Show order_id, customer_id, and total_amount.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT order_id, customer_id, total_amount FROM orders ORDER BY total_amount ASC",
        "hint": "Use ASC for ascending order.",
        "tags": "ORDER BY, ASC",
    },
    {
        "title": "Doctors Alphabetically",
        "description": "Show doctors sorted by last name alphabetically.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT first_name, last_name, specialty FROM doctors ORDER BY last_name",
        "hint": "ORDER BY last_name.",
        "tags": "ORDER BY, doctors",
    },
    {
        "title": "Longest Admissions",
        "description": "Show admissions sorted by length of stay (discharge - admission) descending. Include patient_id, admission_date, discharge_date, and the length of stay in days.",
        "difficulty": "Medium",
        "category_slug": "order-by",
        "expected_query": "SELECT patient_id, admission_date, discharge_date, JULIANDAY(discharge_date) - JULIANDAY(admission_date) AS stay_days FROM admissions ORDER BY stay_days DESC",
        "hint": "Use JULIANDAY to calculate date differences in SQLite.",
        "tags": "ORDER BY, date calculation",
    },
    {
        "title": "Customers by Join Date",
        "description": "Show customers sorted by their join date from oldest to newest.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT first_name, last_name, join_date FROM customers ORDER BY join_date ASC",
        "hint": "ORDER BY join_date ascending.",
        "tags": "ORDER BY, date",
    },
    {
        "title": "Top Spenders",
        "description": "Show the 5 most expensive orders with customer_id and total_amount.",
        "difficulty": "Easy",
        "category_slug": "order-by",
        "expected_query": "SELECT customer_id, total_amount FROM orders ORDER BY total_amount DESC LIMIT 5",
        "hint": "Order by total_amount descending and limit to 5.",
        "tags": "ORDER BY, LIMIT",
    },

    # ── GROUP BY (10) ───────────────────────────────────────────────────────
    {
        "title": "Patients Per City",
        "description": "Count the number of patients in each city.",
        "difficulty": "Easy",
        "category_slug": "group-by",
        "expected_query": "SELECT city, COUNT(*) AS patient_count FROM patients GROUP BY city",
        "hint": "Use GROUP BY with COUNT().",
        "tags": "GROUP BY, COUNT",
    },
    {
        "title": "Gender Distribution",
        "description": "Show the count of patients by gender.",
        "difficulty": "Easy",
        "category_slug": "group-by",
        "expected_query": "SELECT gender, COUNT(*) AS count FROM patients GROUP BY gender",
        "hint": "Group by gender and count.",
        "tags": "GROUP BY, gender",
    },
    {
        "title": "Average Weight by Gender",
        "description": "Find the average weight of patients grouped by gender.",
        "difficulty": "Easy",
        "category_slug": "group-by",
        "expected_query": "SELECT gender, ROUND(AVG(weight), 1) AS avg_weight FROM patients GROUP BY gender",
        "hint": "Use AVG() with GROUP BY and ROUND().",
        "tags": "GROUP BY, AVG",
    },
    {
        "title": "Orders Per Customer",
        "description": "Show how many orders each customer has placed.",
        "difficulty": "Easy",
        "category_slug": "group-by",
        "expected_query": "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id",
        "hint": "Group by customer_id.",
        "tags": "GROUP BY, orders",
    },
    {
        "title": "Revenue by Status",
        "description": "Calculate the total revenue for each order status.",
        "difficulty": "Medium",
        "category_slug": "group-by",
        "expected_query": "SELECT status, SUM(total_amount) AS total_revenue FROM orders GROUP BY status",
        "hint": "Use SUM() grouped by status.",
        "tags": "GROUP BY, SUM",
    },
    {
        "title": "Employees Per Department",
        "description": "Count the number of employees in each department.",
        "difficulty": "Easy",
        "category_slug": "group-by",
        "expected_query": "SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department",
        "hint": "GROUP BY department with COUNT.",
        "tags": "GROUP BY, department",
    },
    {
        "title": "Admissions Per Doctor",
        "description": "Show how many admissions each doctor has handled.",
        "difficulty": "Medium",
        "category_slug": "group-by",
        "expected_query": "SELECT attending_doctor_id, COUNT(*) AS admission_count FROM admissions GROUP BY attending_doctor_id",
        "hint": "GROUP BY attending_doctor_id.",
        "tags": "GROUP BY, admissions",
    },
    {
        "title": "Cities with Many Patients",
        "description": "Show cities that have more than 2 patients. Use HAVING.",
        "difficulty": "Medium",
        "category_slug": "group-by",
        "expected_query": "SELECT city, COUNT(*) AS patient_count FROM patients GROUP BY city HAVING COUNT(*) > 2",
        "hint": "Use HAVING to filter grouped results.",
        "tags": "GROUP BY, HAVING",
    },
    {
        "title": "Average Salary by Department",
        "description": "Show the average salary for each department, ordered from highest to lowest.",
        "difficulty": "Medium",
        "category_slug": "group-by",
        "expected_query": "SELECT department, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC",
        "hint": "Combine GROUP BY with ORDER BY.",
        "tags": "GROUP BY, AVG, ORDER BY",
    },
    {
        "title": "Customers Per Country",
        "description": "Count customers in each country.",
        "difficulty": "Easy",
        "category_slug": "group-by",
        "expected_query": "SELECT country, COUNT(*) AS customer_count FROM customers GROUP BY country",
        "hint": "GROUP BY country.",
        "tags": "GROUP BY, country",
    },

    # ── JOINs (10) ──────────────────────────────────────────────────────────
    {
        "title": "Patient Admissions",
        "description": "Show each patient's first_name, last_name, and their diagnosis from admissions.",
        "difficulty": "Easy",
        "category_slug": "joins",
        "expected_query": "SELECT p.first_name, p.last_name, a.diagnosis FROM patients p JOIN admissions a ON p.patient_id = a.patient_id",
        "hint": "JOIN patients with admissions on patient_id.",
        "tags": "JOIN, INNER JOIN",
    },
    {
        "title": "Patient Province Names",
        "description": "Show patient first_name, last_name, and their full province name.",
        "difficulty": "Easy",
        "category_slug": "joins",
        "expected_query": "SELECT p.first_name, p.last_name, pn.province_name FROM patients p JOIN province_names pn ON p.province_id = pn.province_id",
        "hint": "Join patients with province_names.",
        "tags": "JOIN, province",
    },
    {
        "title": "Admissions with Doctor Names",
        "description": "Show the patient's last name, diagnosis, and the attending doctor's full name for each admission.",
        "difficulty": "Medium",
        "category_slug": "joins",
        "expected_query": "SELECT p.last_name AS patient_name, a.diagnosis, d.first_name || ' ' || d.last_name AS doctor_name FROM admissions a JOIN patients p ON a.patient_id = p.patient_id JOIN doctors d ON a.attending_doctor_id = d.doctor_id",
        "hint": "You need to join three tables.",
        "tags": "JOIN, multiple tables",
    },
    {
        "title": "Orders with Customer Names",
        "description": "Show order_id, customer first_name, last_name, and total_amount for all orders.",
        "difficulty": "Easy",
        "category_slug": "joins",
        "expected_query": "SELECT o.order_id, c.first_name, c.last_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id",
        "hint": "Join orders with customers.",
        "tags": "JOIN, orders",
    },
    {
        "title": "Patients Without Admissions",
        "description": "Find patients who have never been admitted. Show first_name and last_name.",
        "difficulty": "Medium",
        "category_slug": "joins",
        "expected_query": "SELECT p.first_name, p.last_name FROM patients p LEFT JOIN admissions a ON p.patient_id = a.patient_id WHERE a.patient_id IS NULL",
        "hint": "Use LEFT JOIN and check for NULL.",
        "tags": "LEFT JOIN, NULL",
    },
    {
        "title": "Employee Managers",
        "description": "Show each employee's name and their manager's name. Only include employees who have a manager.",
        "difficulty": "Medium",
        "category_slug": "joins",
        "expected_query": "SELECT e.first_name || ' ' || e.last_name AS employee, m.first_name || ' ' || m.last_name AS manager FROM employees e JOIN employees m ON e.manager_id = m.employee_id",
        "hint": "Use a self-join on the employees table.",
        "tags": "SELF JOIN",
    },
    {
        "title": "Toronto Patient Admissions",
        "description": "Show admission details for patients from Toronto. Include patient name, diagnosis, and admission_date.",
        "difficulty": "Medium",
        "category_slug": "joins",
        "expected_query": "SELECT p.first_name, p.last_name, a.diagnosis, a.admission_date FROM patients p JOIN admissions a ON p.patient_id = a.patient_id WHERE p.city = 'Toronto'",
        "hint": "Join and filter by city.",
        "tags": "JOIN, WHERE",
    },
    {
        "title": "Doctor Patient Counts",
        "description": "Show each doctor's full name and the number of admissions they've handled.",
        "difficulty": "Medium",
        "category_slug": "joins",
        "expected_query": "SELECT d.first_name || ' ' || d.last_name AS doctor_name, COUNT(a.patient_id) AS patient_count FROM doctors d LEFT JOIN admissions a ON d.doctor_id = a.attending_doctor_id GROUP BY d.doctor_id, d.first_name, d.last_name",
        "hint": "LEFT JOIN doctors with admissions and use GROUP BY.",
        "tags": "JOIN, GROUP BY, COUNT",
    },
    {
        "title": "Customer Total Spending",
        "description": "Show each customer's name and total spending across all orders.",
        "difficulty": "Medium",
        "category_slug": "joins",
        "expected_query": "SELECT c.first_name, c.last_name, COALESCE(SUM(o.total_amount), 0) AS total_spent FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name",
        "hint": "Use LEFT JOIN with SUM and GROUP BY.",
        "tags": "JOIN, SUM, COALESCE",
    },
    {
        "title": "Full Patient Info",
        "description": "Show patient first_name, last_name, city, province_name, and their most recent diagnosis. If they have no admissions, show NULL for diagnosis.",
        "difficulty": "Hard",
        "category_slug": "joins",
        "expected_query": "SELECT p.first_name, p.last_name, p.city, pn.province_name, a.diagnosis FROM patients p JOIN province_names pn ON p.province_id = pn.province_id LEFT JOIN (SELECT patient_id, diagnosis, admission_date, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY admission_date DESC) AS rn FROM admissions) a ON p.patient_id = a.patient_id AND a.rn = 1",
        "hint": "Use a subquery with ROW_NUMBER() to get the most recent admission.",
        "tags": "JOIN, subquery, ROW_NUMBER",
    },

    # ── Aggregation (10) ────────────────────────────────────────────────────
    {
        "title": "Total Revenue",
        "description": "Calculate the total revenue from all orders.",
        "difficulty": "Easy",
        "category_slug": "aggregation",
        "expected_query": "SELECT SUM(total_amount) AS total_revenue FROM orders",
        "hint": "Use SUM() on total_amount.",
        "tags": "SUM, aggregation",
    },
    {
        "title": "Average Patient Height",
        "description": "Find the average height of all patients, rounded to 1 decimal.",
        "difficulty": "Easy",
        "category_slug": "aggregation",
        "expected_query": "SELECT ROUND(AVG(height), 1) AS avg_height FROM patients",
        "hint": "Use AVG() with ROUND().",
        "tags": "AVG, ROUND",
    },
    {
        "title": "Min and Max Salary",
        "description": "Find the minimum and maximum salary across all employees.",
        "difficulty": "Easy",
        "category_slug": "aggregation",
        "expected_query": "SELECT MIN(salary) AS min_salary, MAX(salary) AS max_salary FROM employees",
        "hint": "Use MIN() and MAX().",
        "tags": "MIN, MAX",
    },
    {
        "title": "Total Admissions",
        "description": "Count the total number of admissions.",
        "difficulty": "Easy",
        "category_slug": "aggregation",
        "expected_query": "SELECT COUNT(*) AS total_admissions FROM admissions",
        "hint": "Use COUNT(*).",
        "tags": "COUNT",
    },
    {
        "title": "Average Order Value by Country",
        "description": "Find the average order value for each customer country.",
        "difficulty": "Medium",
        "category_slug": "aggregation",
        "expected_query": "SELECT c.country, ROUND(AVG(o.total_amount), 2) AS avg_order_value FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.country",
        "hint": "Join orders with customers and group by country.",
        "tags": "AVG, JOIN, GROUP BY",
    },
    {
        "title": "Heaviest and Lightest by City",
        "description": "For each city, find the max and min weight of patients.",
        "difficulty": "Medium",
        "category_slug": "aggregation",
        "expected_query": "SELECT city, MAX(weight) AS max_weight, MIN(weight) AS min_weight FROM patients GROUP BY city",
        "hint": "GROUP BY city with MAX and MIN.",
        "tags": "MAX, MIN, GROUP BY",
    },
    {
        "title": "High Value Customers",
        "description": "Find customers who have spent more than $500 total. Show name and total spent.",
        "difficulty": "Medium",
        "category_slug": "aggregation",
        "expected_query": "SELECT c.first_name, c.last_name, SUM(o.total_amount) AS total_spent FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.first_name, c.last_name HAVING SUM(o.total_amount) > 500",
        "hint": "Use HAVING to filter aggregated results.",
        "tags": "SUM, HAVING, JOIN",
    },
    {
        "title": "Department Salary Stats",
        "description": "For each department, show employee count, average salary, and total salary.",
        "difficulty": "Medium",
        "category_slug": "aggregation",
        "expected_query": "SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary, SUM(salary) AS total_salary FROM employees GROUP BY department",
        "hint": "Use multiple aggregate functions.",
        "tags": "COUNT, AVG, SUM",
    },
    {
        "title": "Allergy Count",
        "description": "Count how many patients have each type of allergy. Exclude patients with no allergies.",
        "difficulty": "Easy",
        "category_slug": "aggregation",
        "expected_query": "SELECT allergies, COUNT(*) AS count FROM patients WHERE allergies IS NOT NULL GROUP BY allergies",
        "hint": "Filter out NULLs first, then GROUP BY.",
        "tags": "COUNT, GROUP BY, NULL",
    },
    {
        "title": "Specialty Patient Count",
        "description": "For each doctor specialty, count the number of unique patients they've treated.",
        "difficulty": "Hard",
        "category_slug": "aggregation",
        "expected_query": "SELECT d.specialty, COUNT(DISTINCT a.patient_id) AS unique_patients FROM doctors d JOIN admissions a ON d.doctor_id = a.attending_doctor_id GROUP BY d.specialty",
        "hint": "Use COUNT(DISTINCT ...) with JOINs.",
        "tags": "COUNT DISTINCT, JOIN",
    },

    # ── CASE Expressions (10) ───────────────────────────────────────────────
    {
        "title": "Weight Category",
        "description": "Categorize patients by weight: 'Underweight' (<60), 'Normal' (60-80), 'Overweight' (>80). Show first_name, weight, and category.",
        "difficulty": "Easy",
        "category_slug": "case-expressions",
        "expected_query": "SELECT first_name, weight, CASE WHEN weight < 60 THEN 'Underweight' WHEN weight <= 80 THEN 'Normal' ELSE 'Overweight' END AS weight_category FROM patients",
        "hint": "Use CASE WHEN ... THEN ... END.",
        "tags": "CASE, categories",
    },
    {
        "title": "Order Size Label",
        "description": "Label orders as 'Small' (<100), 'Medium' (100-300), or 'Large' (>300) based on total_amount.",
        "difficulty": "Easy",
        "category_slug": "case-expressions",
        "expected_query": "SELECT order_id, total_amount, CASE WHEN total_amount < 100 THEN 'Small' WHEN total_amount <= 300 THEN 'Medium' ELSE 'Large' END AS order_size FROM orders",
        "hint": "Use CASE with ranges.",
        "tags": "CASE, orders",
    },
    {
        "title": "Salary Tier",
        "description": "Classify employees into salary tiers: 'Junior' (<85000), 'Mid' (85000-100000), 'Senior' (>100000).",
        "difficulty": "Easy",
        "category_slug": "case-expressions",
        "expected_query": "SELECT first_name, last_name, salary, CASE WHEN salary < 85000 THEN 'Junior' WHEN salary <= 100000 THEN 'Mid' ELSE 'Senior' END AS salary_tier FROM employees",
        "hint": "Use CASE with salary ranges.",
        "tags": "CASE, salary",
    },
    {
        "title": "Allergy Status",
        "description": "Show each patient's name and whether they have 'Allergies' or 'No Allergies'.",
        "difficulty": "Easy",
        "category_slug": "case-expressions",
        "expected_query": "SELECT first_name, last_name, CASE WHEN allergies IS NOT NULL THEN 'Allergies' ELSE 'No Allergies' END AS allergy_status FROM patients",
        "hint": "Use CASE to check for NULL.",
        "tags": "CASE, NULL",
    },
    {
        "title": "Order Shipping Status",
        "description": "Show order_id and a 'shipped' column: 'Yes' if ship_date is not NULL, 'No' otherwise.",
        "difficulty": "Easy",
        "category_slug": "case-expressions",
        "expected_query": "SELECT order_id, CASE WHEN ship_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS shipped FROM orders",
        "hint": "Check ship_date for NULL.",
        "tags": "CASE, NULL check",
    },
    {
        "title": "Count by Category",
        "description": "Count how many patients fall into each weight category (Underweight, Normal, Overweight) using the same ranges as 'Weight Category'.",
        "difficulty": "Medium",
        "category_slug": "case-expressions",
        "expected_query": "SELECT CASE WHEN weight < 60 THEN 'Underweight' WHEN weight <= 80 THEN 'Normal' ELSE 'Overweight' END AS category, COUNT(*) AS count FROM patients GROUP BY category",
        "hint": "Put CASE inside GROUP BY.",
        "tags": "CASE, GROUP BY, COUNT",
    },
    {
        "title": "Admission Duration Category",
        "description": "Label admissions as 'Short' (1-2 days), 'Medium' (3-5 days), or 'Long' (>5 days) based on stay duration.",
        "difficulty": "Medium",
        "category_slug": "case-expressions",
        "expected_query": "SELECT patient_id, diagnosis, JULIANDAY(discharge_date) - JULIANDAY(admission_date) AS days, CASE WHEN JULIANDAY(discharge_date) - JULIANDAY(admission_date) <= 2 THEN 'Short' WHEN JULIANDAY(discharge_date) - JULIANDAY(admission_date) <= 5 THEN 'Medium' ELSE 'Long' END AS stay_category FROM admissions",
        "hint": "Calculate days first, then categorize.",
        "tags": "CASE, date calculation",
    },
    {
        "title": "Revenue by Order Size",
        "description": "Calculate total revenue for each order size category (Small, Medium, Large).",
        "difficulty": "Medium",
        "category_slug": "case-expressions",
        "expected_query": "SELECT CASE WHEN total_amount < 100 THEN 'Small' WHEN total_amount <= 300 THEN 'Medium' ELSE 'Large' END AS order_size, SUM(total_amount) AS total_revenue, COUNT(*) AS order_count FROM orders GROUP BY order_size",
        "hint": "Combine CASE with SUM in GROUP BY.",
        "tags": "CASE, SUM, GROUP BY",
    },
    {
        "title": "Conditional Aggregation",
        "description": "Show the count of male and female patients in a single row with columns: male_count and female_count.",
        "difficulty": "Medium",
        "category_slug": "case-expressions",
        "expected_query": "SELECT SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) AS male_count, SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END) AS female_count FROM patients",
        "hint": "Use CASE inside SUM for pivot-style results.",
        "tags": "CASE, SUM, pivot",
    },
    {
        "title": "Employee Bonus Calculation",
        "description": "Calculate a bonus for employees: Engineering gets 15%, Sales gets 12%, Marketing gets 10%, HR gets 8% of their salary. Show name, department, salary, and bonus.",
        "difficulty": "Medium",
        "category_slug": "case-expressions",
        "expected_query": "SELECT first_name, last_name, department, salary, ROUND(salary * CASE department WHEN 'Engineering' THEN 0.15 WHEN 'Sales' THEN 0.12 WHEN 'Marketing' THEN 0.10 WHEN 'HR' THEN 0.08 ELSE 0.05 END, 2) AS bonus FROM employees",
        "hint": "Use CASE with department and multiply by salary.",
        "tags": "CASE, calculation",
    },

    # ── Window Functions (10) ───────────────────────────────────────────────
    {
        "title": "Row Numbers",
        "description": "Add row numbers to patients ordered by last_name. Show row_number, first_name, last_name.",
        "difficulty": "Medium",
        "category_slug": "window-functions",
        "expected_query": "SELECT ROW_NUMBER() OVER (ORDER BY last_name) AS row_num, first_name, last_name FROM patients",
        "hint": "Use ROW_NUMBER() OVER (ORDER BY ...).",
        "tags": "ROW_NUMBER, window",
    },
    {
        "title": "Rank by Salary",
        "description": "Rank employees by salary within their department. Show name, department, salary, and rank.",
        "difficulty": "Medium",
        "category_slug": "window-functions",
        "expected_query": "SELECT first_name, last_name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank FROM employees",
        "hint": "Use RANK() with PARTITION BY department.",
        "tags": "RANK, PARTITION BY",
    },
    {
        "title": "Running Total Orders",
        "description": "Show a running total of order amounts ordered by order_date. Include order_id, order_date, total_amount, and running_total.",
        "difficulty": "Medium",
        "category_slug": "window-functions",
        "expected_query": "SELECT order_id, order_date, total_amount, SUM(total_amount) OVER (ORDER BY order_date) AS running_total FROM orders",
        "hint": "Use SUM() OVER (ORDER BY ...) for running total.",
        "tags": "SUM, window, running total",
    },
    {
        "title": "Dense Rank Patients",
        "description": "Dense rank patients by weight (heaviest first). Show first_name, weight, and dense_rank.",
        "difficulty": "Medium",
        "category_slug": "window-functions",
        "expected_query": "SELECT first_name, weight, DENSE_RANK() OVER (ORDER BY weight DESC) AS weight_rank FROM patients",
        "hint": "DENSE_RANK() doesn't skip numbers unlike RANK().",
        "tags": "DENSE_RANK, window",
    },
    {
        "title": "Lead and Lag Orders",
        "description": "For each order, show the previous and next order amounts. Include order_id, total_amount, prev_amount, next_amount.",
        "difficulty": "Hard",
        "category_slug": "window-functions",
        "expected_query": "SELECT order_id, total_amount, LAG(total_amount) OVER (ORDER BY order_date) AS prev_amount, LEAD(total_amount) OVER (ORDER BY order_date) AS next_amount FROM orders",
        "hint": "Use LAG() and LEAD() window functions.",
        "tags": "LAG, LEAD, window",
    },
    {
        "title": "Department Salary Percentile",
        "description": "Show each employee's salary as a percentage of their department's total salary. Show name, department, salary, and pct_of_dept.",
        "difficulty": "Hard",
        "category_slug": "window-functions",
        "expected_query": "SELECT first_name, last_name, department, salary, ROUND(salary * 100.0 / SUM(salary) OVER (PARTITION BY department), 2) AS pct_of_dept FROM employees",
        "hint": "Divide salary by SUM(salary) OVER (PARTITION BY department).",
        "tags": "SUM, PARTITION BY, percentage",
    },
    {
        "title": "Top Earner Per Department",
        "description": "Find the highest-paid employee in each department using window functions.",
        "difficulty": "Hard",
        "category_slug": "window-functions",
        "expected_query": "SELECT first_name, last_name, department, salary FROM (SELECT first_name, last_name, department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) ranked WHERE rn = 1",
        "hint": "Use ROW_NUMBER() in a subquery and filter rn = 1.",
        "tags": "ROW_NUMBER, subquery",
    },
    {
        "title": "Moving Average",
        "description": "Calculate a 3-order moving average of total_amount. Show order_id, total_amount, and moving_avg.",
        "difficulty": "Hard",
        "category_slug": "window-functions",
        "expected_query": "SELECT order_id, total_amount, ROUND(AVG(total_amount) OVER (ORDER BY order_id ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 2) AS moving_avg FROM orders",
        "hint": "Use ROWS BETWEEN for a sliding window.",
        "tags": "AVG, ROWS BETWEEN, moving average",
    },
    {
        "title": "Cumulative Patient Count by City",
        "description": "Show a cumulative count of patients for each city, ordered by patient_id.",
        "difficulty": "Medium",
        "category_slug": "window-functions",
        "expected_query": "SELECT patient_id, first_name, city, COUNT(*) OVER (PARTITION BY city ORDER BY patient_id) AS cumulative_count FROM patients",
        "hint": "Use COUNT() OVER (PARTITION BY city ORDER BY ...).",
        "tags": "COUNT, PARTITION BY, cumulative",
    },
    {
        "title": "NTILE Quartiles",
        "description": "Divide employees into 4 salary quartiles using NTILE. Show name, salary, and quartile.",
        "difficulty": "Medium",
        "category_slug": "window-functions",
        "expected_query": "SELECT first_name, last_name, salary, NTILE(4) OVER (ORDER BY salary) AS quartile FROM employees",
        "hint": "NTILE(4) divides into 4 groups.",
        "tags": "NTILE, quartile",
    },

    # ── CTEs (10) ────────────────────────────────────────────────────────────
    {
        "title": "CTE Patient Summary",
        "description": "Using a CTE, create a patient summary showing patient_id, full_name (first + last), and city.",
        "difficulty": "Easy",
        "category_slug": "ctes",
        "expected_query": "WITH patient_summary AS (SELECT patient_id, first_name || ' ' || last_name AS full_name, city FROM patients) SELECT * FROM patient_summary",
        "hint": "Use WITH ... AS to define a CTE.",
        "tags": "CTE, WITH",
    },
    {
        "title": "High Earners CTE",
        "description": "Using a CTE, find employees earning above the company average salary. Show name, salary, and avg_salary.",
        "difficulty": "Medium",
        "category_slug": "ctes",
        "expected_query": "WITH avg_sal AS (SELECT AVG(salary) AS avg_salary FROM employees) SELECT e.first_name, e.last_name, e.salary, a.avg_salary FROM employees e, avg_sal a WHERE e.salary > a.avg_salary",
        "hint": "Define the average in a CTE, then cross-join.",
        "tags": "CTE, comparison",
    },
    {
        "title": "Department Stats CTE",
        "description": "Using a CTE, create department-level stats (avg salary, count) and then show departments where avg salary exceeds 90000.",
        "difficulty": "Medium",
        "category_slug": "ctes",
        "expected_query": "WITH dept_stats AS (SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department) SELECT * FROM dept_stats WHERE avg_salary > 90000",
        "hint": "Aggregate in CTE, filter in main query.",
        "tags": "CTE, GROUP BY, HAVING",
    },
    {
        "title": "Multiple CTEs",
        "description": "Using multiple CTEs: one for patient counts per city, another for average weight per city. Join them to show city, count, and avg_weight.",
        "difficulty": "Hard",
        "category_slug": "ctes",
        "expected_query": "WITH city_counts AS (SELECT city, COUNT(*) AS patient_count FROM patients GROUP BY city), city_weights AS (SELECT city, ROUND(AVG(weight), 1) AS avg_weight FROM patients GROUP BY city) SELECT cc.city, cc.patient_count, cw.avg_weight FROM city_counts cc JOIN city_weights cw ON cc.city = cw.city",
        "hint": "Define multiple CTEs separated by commas.",
        "tags": "CTE, multiple, JOIN",
    },
    {
        "title": "CTE with Window Function",
        "description": "Using a CTE, rank employees by salary within department, then show only top 2 per department.",
        "difficulty": "Hard",
        "category_slug": "ctes",
        "expected_query": "WITH ranked AS (SELECT first_name, last_name, department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) SELECT first_name, last_name, department, salary FROM ranked WHERE rn <= 2",
        "hint": "Use a window function in the CTE.",
        "tags": "CTE, ROW_NUMBER, filter",
    },
    {
        "title": "Order Summary CTE",
        "description": "Create a CTE that summarizes each customer's total orders and spending, then find customers with more than 2 orders.",
        "difficulty": "Medium",
        "category_slug": "ctes",
        "expected_query": "WITH customer_summary AS (SELECT c.customer_id, c.first_name, c.last_name, COUNT(o.order_id) AS total_orders, SUM(o.total_amount) AS total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name) SELECT * FROM customer_summary WHERE total_orders > 2",
        "hint": "Aggregate in the CTE, filter in main query.",
        "tags": "CTE, aggregation, filter",
    },
    {
        "title": "Admission Analysis CTE",
        "description": "Using a CTE, calculate the average stay duration per doctor, then show doctors with average stay > 3 days.",
        "difficulty": "Hard",
        "category_slug": "ctes",
        "expected_query": "WITH doctor_stays AS (SELECT d.first_name || ' ' || d.last_name AS doctor_name, ROUND(AVG(JULIANDAY(a.discharge_date) - JULIANDAY(a.admission_date)), 1) AS avg_stay FROM doctors d JOIN admissions a ON d.doctor_id = a.attending_doctor_id GROUP BY d.doctor_id, d.first_name, d.last_name) SELECT * FROM doctor_stays WHERE avg_stay > 3",
        "hint": "Calculate stay in CTE, filter in main query.",
        "tags": "CTE, date calculation, AVG",
    },
    {
        "title": "CTE Derived Metrics",
        "description": "Using a CTE, add a 'times_admitted' column to each patient, showing how many times they were admitted.",
        "difficulty": "Medium",
        "category_slug": "ctes",
        "expected_query": "WITH admission_counts AS (SELECT patient_id, COUNT(*) AS times_admitted FROM admissions GROUP BY patient_id) SELECT p.first_name, p.last_name, COALESCE(ac.times_admitted, 0) AS times_admitted FROM patients p LEFT JOIN admission_counts ac ON p.patient_id = ac.patient_id",
        "hint": "Count admissions in CTE, LEFT JOIN to patients.",
        "tags": "CTE, LEFT JOIN, COALESCE",
    },
    {
        "title": "Province Revenue CTE",
        "description": "Using a CTE, find the total number of patients and average weight per province. Show province_name instead of province_id.",
        "difficulty": "Medium",
        "category_slug": "ctes",
        "expected_query": "WITH province_stats AS (SELECT province_id, COUNT(*) AS patient_count, ROUND(AVG(weight), 1) AS avg_weight FROM patients GROUP BY province_id) SELECT pn.province_name, ps.patient_count, ps.avg_weight FROM province_stats ps JOIN province_names pn ON ps.province_id = pn.province_id",
        "hint": "Aggregate by province_id in CTE, join for name.",
        "tags": "CTE, JOIN, aggregation",
    },
    {
        "title": "Chained CTE",
        "description": "Create a chained CTE: first get department stats, then filter departments with more than 3 employees, then join to get individual employees in those departments.",
        "difficulty": "Hard",
        "category_slug": "ctes",
        "expected_query": "WITH dept_stats AS (SELECT department, COUNT(*) AS emp_count FROM employees GROUP BY department), big_depts AS (SELECT department FROM dept_stats WHERE emp_count > 3) SELECT e.first_name, e.last_name, e.department, e.salary FROM employees e JOIN big_depts bd ON e.department = bd.department",
        "hint": "Chain CTEs by referencing one from another.",
        "tags": "CTE, chained, multiple",
    },

    # ── Subqueries (10) ─────────────────────────────────────────────────────
    {
        "title": "Above Average Weight",
        "description": "Find patients whose weight is above the average weight of all patients.",
        "difficulty": "Easy",
        "category_slug": "subqueries",
        "expected_query": "SELECT first_name, last_name, weight FROM patients WHERE weight > (SELECT AVG(weight) FROM patients)",
        "hint": "Use a subquery to calculate the average.",
        "tags": "subquery, scalar",
    },
    {
        "title": "Most Expensive Order Customer",
        "description": "Find the customer who placed the most expensive order. Show customer name and order amount.",
        "difficulty": "Medium",
        "category_slug": "subqueries",
        "expected_query": "SELECT c.first_name, c.last_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.total_amount = (SELECT MAX(total_amount) FROM orders)",
        "hint": "Use MAX in a scalar subquery.",
        "tags": "subquery, MAX",
    },
    {
        "title": "Patients Treated by Cardiologists",
        "description": "Find patients who were treated by a cardiologist. Use a subquery to find cardiologist IDs.",
        "difficulty": "Medium",
        "category_slug": "subqueries",
        "expected_query": "SELECT DISTINCT p.first_name, p.last_name FROM patients p JOIN admissions a ON p.patient_id = a.patient_id WHERE a.attending_doctor_id IN (SELECT doctor_id FROM doctors WHERE specialty = 'Cardiology')",
        "hint": "Use IN with a subquery.",
        "tags": "subquery, IN",
    },
    {
        "title": "Above Department Average",
        "description": "Find employees whose salary is above their department's average.",
        "difficulty": "Hard",
        "category_slug": "subqueries",
        "expected_query": "SELECT e.first_name, e.last_name, e.department, e.salary FROM employees e WHERE e.salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.department = e.department)",
        "hint": "Use a correlated subquery.",
        "tags": "subquery, correlated",
    },
    {
        "title": "Customers Without Orders",
        "description": "Find customers who have never placed an order using a subquery.",
        "difficulty": "Medium",
        "category_slug": "subqueries",
        "expected_query": "SELECT first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM orders)",
        "hint": "Use NOT IN with a subquery.",
        "tags": "subquery, NOT IN",
    },
    {
        "title": "Second Highest Salary",
        "description": "Find the employee(s) with the second highest salary.",
        "difficulty": "Hard",
        "category_slug": "subqueries",
        "expected_query": "SELECT first_name, last_name, salary FROM employees WHERE salary = (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1)",
        "hint": "Use LIMIT with OFFSET in a subquery.",
        "tags": "subquery, LIMIT, OFFSET",
    },
    {
        "title": "EXISTS Example",
        "description": "Show patients who have at least one admission using EXISTS.",
        "difficulty": "Medium",
        "category_slug": "subqueries",
        "expected_query": "SELECT p.first_name, p.last_name FROM patients p WHERE EXISTS (SELECT 1 FROM admissions a WHERE a.patient_id = p.patient_id)",
        "hint": "Use EXISTS with a correlated subquery.",
        "tags": "subquery, EXISTS",
    },
    {
        "title": "Inline View",
        "description": "Using a subquery in the FROM clause, find departments with total salary above 200000.",
        "difficulty": "Hard",
        "category_slug": "subqueries",
        "expected_query": "SELECT department, total_salary FROM (SELECT department, SUM(salary) AS total_salary FROM employees GROUP BY department) dept_totals WHERE total_salary > 200000",
        "hint": "Put the aggregate query in the FROM clause.",
        "tags": "subquery, inline view, FROM",
    },
    {
        "title": "Multi-Admit Patients",
        "description": "Find patients who have been admitted more than once. Use a subquery.",
        "difficulty": "Medium",
        "category_slug": "subqueries",
        "expected_query": "SELECT first_name, last_name FROM patients WHERE patient_id IN (SELECT patient_id FROM admissions GROUP BY patient_id HAVING COUNT(*) > 1)",
        "hint": "GROUP BY in a subquery with HAVING.",
        "tags": "subquery, HAVING, GROUP BY",
    },
    {
        "title": "All Subquery",
        "description": "Find employees whose salary is greater than ALL employees in the Marketing department.",
        "difficulty": "Hard",
        "category_slug": "subqueries",
        "expected_query": "SELECT first_name, last_name, salary FROM employees WHERE salary > ALL (SELECT salary FROM employees WHERE department = 'Marketing')",
        "hint": "Use > ALL (subquery).",
        "tags": "subquery, ALL",
    },
]


def create_sandbox_db(db_path: str):
    """Create and populate a SQLite sandbox database."""
    os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else '.', exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables
    cursor.executescript(SCHEMA_SQL)
    
    # Insert data
    cursor.executescript(SAMPLE_DATA_SQL)
    
    conn.commit()
    conn.close()
    print(f"  ✓ Created sandbox database: {db_path}")


def seed_database():
    """Seed the main database with categories, questions, and create sandbox databases."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing = db.query(Category).count()
        if existing > 0:
            print("Database already seeded. Skipping...")
            return

        print("🌱 Seeding database...")

        # Create admin user
        admin = User(
            name="Admin",
            email="admin@sqlpractice.com",
            password_hash=hash_password("admin123"),
            is_admin=True,
            xp=0,
            streak=0,
        )
        db.add(admin)
        db.commit()
        print("  ✓ Created admin user (admin@sqlpractice.com / admin123)")

        # Create demo user
        demo = User(
            name="Demo User",
            email="demo@sqlpractice.com",
            password_hash=hash_password("demo123"),
            is_admin=False,
            xp=150,
            streak=5,
        )
        db.add(demo)
        db.commit()
        print("  ✓ Created demo user (demo@sqlpractice.com / demo123)")

        # Create categories
        category_map = {}
        for cat_data in CATEGORIES:
            cat = Category(**cat_data)
            db.add(cat)
            db.flush()
            category_map[cat_data["slug"]] = cat.id
        db.commit()
        print(f"  ✓ Created {len(CATEGORIES)} categories")

        # Create shared sandbox database
        sandbox_dir = settings.SANDBOX_DB_DIR
        os.makedirs(sandbox_dir, exist_ok=True)
        shared_db_path = os.path.join(sandbox_dir, "practice.db")
        create_sandbox_db(shared_db_path)

        # Create questions
        for q_data in QUESTIONS:
            cat_slug = q_data.pop("category_slug")
            category_id = category_map.get(cat_slug)
            if not category_id:
                print(f"  ⚠ Category not found for slug: {cat_slug}")
                continue

            question = Question(
                title=q_data["title"],
                description=q_data["description"],
                difficulty=DifficultyLevel(q_data["difficulty"]),
                category_id=category_id,
                schema_sql=SCHEMA_SQL,
                expected_query=q_data["expected_query"],
                hint=q_data.get("hint"),
                tags=q_data.get("tags"),
                sqlite_db_path="practice.db",
                is_published=True,
            )
            db.add(question)

        db.commit()
        print(f"  ✓ Created {len(QUESTIONS)} questions")
        print("✅ Seeding complete!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
