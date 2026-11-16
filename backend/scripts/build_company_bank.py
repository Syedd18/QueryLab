"""
Build a large, company-tagged SQL interview bank on two verified schemas, and
load it into Supabase.

- Schema A ("practice_v2.db"): companies/employees/orders (reused from
  rebuild_dataset) — salary, department, product and order questions.
- Schema B ("practice_tech.db"): a tech-analytics schema (users, posts, follows,
  sessions, events, transactions, subscriptions) — DAU/MAU, retention, revenue,
  ranking and window questions in the style common at large tech companies.

Every question's expected query is executed through the real engine first; only
if all pass are the questions written to Supabase. Questions are ORIGINAL (not
copied from any proprietary site); they cover the same topics and company
associations that interview-prep sites are known for.

Run from backend/ with the venv:
    venv\\Scripts\\python.exe scripts\\build_company_bank.py            # verify only
    venv\\Scripts\\python.exe scripts\\build_company_bank.py --apply    # verify + write Supabase
"""

import os
import re
import sys
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import rebuild_dataset as base  # noqa: E402

# ── Company pools (broad coverage across many industries) ────────────────────
POOL_BIG = [  # big tech, enterprise software, retail, consulting, telecom, auto, CPG
    "Amazon", "Microsoft", "Oracle", "IBM", "Walmart", "Salesforce", "Adobe",
    "Apple", "Nvidia", "SAP", "Cisco", "Accenture", "Target", "Costco",
    "Home Depot", "Best Buy", "Nike", "Starbucks", "FedEx", "UPS", "Deloitte",
    "PwC", "KPMG", "Capgemini", "Intel", "AMD", "Qualcomm", "Dell", "HP",
    "VMware", "ServiceNow", "Workday", "Verizon", "AT&T", "Comcast", "Tesla",
    "Ford", "General Motors", "Siemens", "Bosch", "Samsung", "Sony",
    "Procter & Gamble", "Unilever", "Coca-Cola", "PepsiCo", "Boeing",
]
POOL_TECH = [  # consumer internet, media, gaming, mobility, travel, Indian startups
    "Meta", "Google", "Netflix", "TikTok", "Snap", "Pinterest", "Reddit",
    "LinkedIn", "Spotify", "Uber", "Airbnb", "DoorDash", "Instacart", "Lyft",
    "Twitch", "Dropbox", "Zoom", "Slack", "Atlassian", "Twilio", "Datadog",
    "MongoDB", "Cloudflare", "Palantir", "Snowflake", "Databricks", "Expedia",
    "Booking.com", "Yelp", "Zillow", "Wayfair", "Etsy", "eBay", "Disney",
    "Electronic Arts", "Activision", "Riot Games", "Roblox", "Unity", "Flipkart",
    "Swiggy", "Zomato", "Ola", "Paytm", "Razorpay", "Freshworks", "Zoho",
    "TCS", "Infosys", "Wipro", "Cognizant",
]
POOL_FIN = [  # banks, fintech, payments, insurance, healthcare
    "Stripe", "PayPal", "Visa", "Mastercard", "Robinhood", "Coinbase",
    "Goldman Sachs", "JPMorgan", "Block", "Plaid", "Shopify", "Affirm",
    "American Express", "Capital One", "Wells Fargo", "Citibank",
    "Morgan Stanley", "BlackRock", "Intuit", "Fidelity", "Nubank", "Revolut",
    "Klarna", "SoFi", "Chime", "UnitedHealth", "CVS Health", "Cigna",
    "Johnson & Johnson", "Pfizer", "Delta Air Lines", "American Airlines",
    "Marriott", "McDonald's",
]
ALLCO = POOL_BIG + POOL_TECH + POOL_FIN

# Rotating counter so company coverage spreads across the whole bank.
_pick_n = [0]


def pick(pool, idx, k=2):
    """Pick k companies: (k-1) from the topic pool plus one from the global set,
    rotating by a running counter so every company gets used across the bank."""
    c = _pick_n[0]
    _pick_n[0] += 1
    names = [pool[(idx + c + j) % len(pool)] for j in range(max(1, k - 1))]
    names.append(ALLCO[(c * 7 + idx) % len(ALLCO)])
    # de-dupe while preserving order
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return ", ".join(out)


# ── Tech schema (shown to users) ─────────────────────────────────────────────
TECH_SCHEMA_DISPLAY = """CREATE TABLE users (
    id          INTEGER PRIMARY KEY,
    name        TEXT,
    country     TEXT,
    signup_date TEXT,     -- YYYY-MM-DD
    plan        TEXT      -- free | pro | enterprise
);

CREATE TABLE posts (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER,   -- -> users.id
    created_at TEXT,       -- YYYY-MM-DD
    likes      INTEGER
);

CREATE TABLE follows (
    follower_id INTEGER,   -- -> users.id
    followee_id INTEGER    -- -> users.id
);

CREATE TABLE sessions (
    id           INTEGER PRIMARY KEY,
    user_id      INTEGER,  -- -> users.id
    started_at   TEXT,      -- YYYY-MM-DD
    duration_min INTEGER,
    device       TEXT       -- ios | android | web
);

CREATE TABLE events (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER,   -- -> users.id
    event_name TEXT,       -- login | view | click | purchase | share
    created_at TEXT        -- YYYY-MM-DD
);

CREATE TABLE transactions (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER,   -- -> users.id
    amount     REAL,
    created_at TEXT,       -- YYYY-MM-DD
    status     TEXT        -- completed | refunded | failed
);

CREATE TABLE subscriptions (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER,   -- -> users.id
    plan       TEXT,
    started_at TEXT,
    ended_at   TEXT,       -- NULL if active
    mrr        REAL
);"""

TECH_SAMPLE_DISPLAY = (
    "-- users: 24 rows (countries: USA, UK, Canada, Germany, India, Brazil; plans: free/pro/enterprise)\n"
    "-- posts: 60 rows · follows: 48 edges · sessions: 60 rows (ios/android/web)\n"
    "-- events: 90 rows (login/view/click/purchase/share) · transactions: 48 rows (completed/refunded/failed)\n"
    "-- subscriptions: 20 rows (mrr per active/ended plan)\n\n"
    "INSERT INTO users VALUES (1, 'User 1', 'USA', '2022-01-10', 'pro');\n"
    "INSERT INTO posts VALUES (1, 3, '2023-02-14', 57);\n"
    "INSERT INTO transactions VALUES (1, 5, 120.0, '2023-03-02', 'completed');"
)

COUNTRIES = ["USA", "USA", "UK", "Canada", "Germany", "India", "USA", "Brazil"]
PLANS = ["free", "free", "pro", "enterprise", "free", "pro", "free", "enterprise"]
DEVICES = ["ios", "android", "web"]
EVENTS = ["login", "view", "click", "purchase", "share"]
STATUSES = ["completed", "completed", "refunded", "completed", "failed"]
MONTHS = ["01", "02", "03", "04", "05", "06"]


def build_tech_db(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    for t in ("subscriptions", "transactions", "events", "sessions", "follows", "posts", "users"):
        cur.execute(f"DROP TABLE IF EXISTS {t}")
    cur.executescript(TECH_SCHEMA_DISPLAY)

    users = []
    for i in range(1, 25):
        country = COUNTRIES[i % len(COUNTRIES)]
        plan = PLANS[i % len(PLANS)]
        month = MONTHS[i % len(MONTHS)]
        year = "2022" if i % 2 == 0 else "2023"
        day = f"{(i % 27) + 1:02d}"
        users.append((i, f"User {i}", country, f"{year}-{month}-{day}", plan))
    cur.executemany("INSERT INTO users VALUES (?,?,?,?,?)", users)

    posts = []
    for pid in range(1, 61):
        uid = ((pid * 7) % 24) + 1
        month = MONTHS[pid % len(MONTHS)]
        day = f"{(pid % 27) + 1:02d}"
        likes = (pid * 13) % 120
        posts.append((pid, uid, f"2023-{month}-{day}", likes))
    cur.executemany("INSERT INTO posts VALUES (?,?,?,?)", posts)

    follows = []
    for k in range(48):
        follower = (k % 24) + 1
        followee = ((k * 5 + 3) % 24) + 1
        if follower != followee:
            follows.append((follower, followee))
    cur.executemany("INSERT INTO follows VALUES (?,?)", follows)

    sessions = []
    for sid in range(1, 61):
        uid = ((sid * 3) % 24) + 1
        month = MONTHS[sid % len(MONTHS)]
        day = f"{(sid % 27) + 1:02d}"
        dur = (sid * 11) % 55 + 5
        dev = DEVICES[sid % 3]
        sessions.append((sid, uid, f"2023-{month}-{day}", dur, dev))
    cur.executemany("INSERT INTO sessions VALUES (?,?,?,?,?)", sessions)

    events = []
    for eid in range(1, 91):
        uid = ((eid * 2) % 24) + 1
        ev = EVENTS[eid % len(EVENTS)]
        # cluster into few dates so DAU-style queries are meaningful
        day = f"{(eid % 10) + 1:02d}"
        events.append((eid, uid, ev, f"2023-03-{day}"))
    cur.executemany("INSERT INTO events VALUES (?,?,?,?)", events)

    txns = []
    for tid in range(1, 49):
        uid = ((tid * 4) % 24) + 1
        amt = float((tid * 37) % 500 + 10)
        month = MONTHS[tid % len(MONTHS)]
        day = f"{(tid % 27) + 1:02d}"
        status = STATUSES[tid % len(STATUSES)]
        txns.append((tid, uid, amt, f"2023-{month}-{day}", status))
    cur.executemany("INSERT INTO transactions VALUES (?,?,?,?,?)", txns)

    subs = []
    plan_names = ["pro", "enterprise", "pro", "free"]
    for sid in range(1, 21):
        uid = ((sid * 6) % 24) + 1
        plan = plan_names[sid % len(plan_names)]
        mrr = float({"free": 0, "pro": 20, "enterprise": 100}[plan])
        ended = None if sid % 3 else f"2023-0{(sid % 6) + 1}-15"
        subs.append((sid, uid, plan, "2022-06-01", ended, mrr))
    cur.executemany("INSERT INTO subscriptions VALUES (?,?,?,?,?,?)", subs)

    conn.commit()
    conn.close()


# ── Detailed description generation ──────────────────────────────────────────
SCENARIO = {
    "practice_v2.db": (
        "You are a data analyst working with a company's internal operations database. "
        "It stores departments and their office locations, employees (including each person's "
        "salary, hire date, job title and the manager they report to), the customer list, the "
        "product catalogue, customer orders, and the individual line items that make up each order."
    ),
    "practice_tech.db": (
        "You are on the analytics team of a large consumer technology product. The data warehouse "
        "records registered users (with their country, signup date and subscription plan), the posts "
        "they publish, the follow relationships between them, in-app sessions, product usage events, "
        "payment transactions, and subscription records with monthly recurring revenue."
    ),
}


def _depth0_positions(sql, token):
    positions, depth, i, n = [], 0, 0, len(sql)
    up, tok = sql.upper(), token.upper()
    while i < n:
        ch = sql[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif depth == 0 and up.startswith(tok, i):
            before = sql[i - 1] if i > 0 else " "
            after = sql[i + len(tok)] if i + len(tok) < n else " "
            if not (before.isalnum() or before == "_") and not (after.isalnum() or after == "_"):
                positions.append(i)
        i += 1
    return positions


def _outer_columns(sql):
    sel = _depth0_positions(sql, "SELECT")
    if not sel:
        return ["the requested values"], False
    start = sel[-1] + len("SELECT")
    frm = next((p for p in _depth0_positions(sql, "FROM") if p > start), None)
    coltext = sql[start:frm if frm is not None else len(sql)].strip()
    distinct = False
    if coltext.upper().startswith("DISTINCT"):
        distinct, coltext = True, coltext[len("DISTINCT"):].strip()
    items, depth, cur = [], 0, ""
    for ch in coltext:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            items.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        items.append(cur)
    names = []
    for it in items:
        t = " ".join(it.split())
        if t == "*":
            names.append("all columns")
        elif re.search(r"\bAS\b\s+([A-Za-z_]\w*)\s*$", t, re.IGNORECASE):
            names.append(re.search(r"\bAS\b\s+([A-Za-z_]\w*)\s*$", t, re.IGNORECASE).group(1))
        elif "(" in t:
            names.append(t)
        elif "." in t:
            names.append(t.split(".")[-1])
        else:
            names.append(t)
    return names, distinct


def _order_clause(sql):
    pos = _depth0_positions(sql, "ORDER BY")
    if not pos:
        return None
    start = pos[-1] + len("ORDER BY")
    end = next((p for p in _depth0_positions(sql, "LIMIT") if p > start), len(sql))
    return sql[start:end].strip().rstrip(";").strip()


def _humanize_order(clause):
    out = []
    for p in [c.strip() for c in clause.split(",") if c.strip()]:
        toks = p.split()
        col = toks[0].split(".")[-1]
        if len(toks) > 1 and toks[-1].upper() == "DESC":
            col += " (highest first)"
        elif len(toks) > 1 and toks[-1].upper() == "ASC":
            col += " (lowest first)"
        out.append(col)
    return ", then by ".join(out)


def _limit_info(sql):
    pos = _depth0_positions(sql, "LIMIT")
    if not pos:
        return None
    m = re.search(r"LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?", sql[pos[-1]:], re.IGNORECASE)
    if not m:
        return None
    n, off = int(m.group(1)), m.group(2)
    if off:
        return f"Return only {n} row(s), skipping the first {off}."
    return f"Return only the top {n} row(s)."


def build_rich(task, sql, db):
    cols, distinct = _outer_columns(sql)
    out = ["Scenario", SCENARIO.get(db, ""), "", "Task", task.strip().rstrip(".") + ".", "", "Requirements"]
    if cols == ["all columns"]:
        out.append("- Return every column of the relevant table.")
    else:
        out.append("- Your result must contain the column(s): " + ", ".join(cols) + ".")
    if distinct:
        out.append("- Return distinct (de-duplicated) rows only.")
    if "ROUND(" in sql.upper():
        out.append("- Round any computed numeric values to 2 decimal places.")
    oc = _order_clause(sql)
    if oc:
        out.append("- Order the output by " + _humanize_order(oc) + ".")
    li = _limit_info(sql)
    if li:
        out.append("- " + li)
    out += ["", "Expected output",
            "A result set with exactly the columns and ordering described above; column names should match those requested."]
    return "\n".join(out)


# ── Question assembly ────────────────────────────────────────────────────────
QUESTIONS = []


def add(db, slug, diff, title, task, hint, tags, companies, sql):
    QUESTIONS.append({
        "db": db, "slug": slug, "difficulty": diff, "title": title,
        "description": build_rich(task, sql, db), "hint": hint, "tags": tags,
        "companies": companies, "sql": sql.strip(),
    })


def build_questions():
    # 1) Reuse the verified 100 on practice_v2.db, tagging each with companies.
    for i, q in enumerate(base.Q):
        pool = POOL_BIG if i % 3 else (POOL_TECH if i % 2 else POOL_FIN)
        add("practice_v2.db", q["slug"], q["difficulty"], q["title"], q["description"],
            q["hint"], q["tags"], pick(pool, i, 2), q["sql"])

    # 2) Templated extras on practice_v2.db (salary / dept / product families).
    depts = [(1, "Engineering"), (2, "Sales"), (3, "Marketing"), (4, "Support"), (5, "Finance"), (6, "HR")]
    for k, (did, dname) in enumerate(depts):
        add("practice_v2.db", "where-clause", "Easy", f"Employees in {dname}",
            f"Return the names of employees in the {dname} department (department_id {did}), ordered by id.",
            "Filter on department_id.", "where", pick(POOL_BIG, k, 2),
            f"SELECT name FROM employees WHERE department_id = {did} ORDER BY id")
        add("practice_v2.db", "group-by", "Medium", f"Average salary in {dname}",
            f"Return the average salary (rounded to 2 decimals) of the {dname} department.",
            "AVG with a WHERE filter.", "aggregation", pick(POOL_BIG, k + 3, 2),
            f"SELECT ROUND(AVG(salary),2) AS avg_salary FROM employees WHERE department_id = {did}")

    for n in range(2, 9):
        add("practice_v2.db", "subqueries", "Medium" if n <= 4 else "Hard",
            f"{_ord(n)} highest salary",
            f"Return the {_ord(n).lower()} highest distinct salary among employees.",
            "Order distinct salaries descending and use OFFSET.", "subquery,top-n",
            pick(POOL_BIG, n, 2),
            f"SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET {n - 1}")

    for k, cat in enumerate(["Electronics", "Accessories", "Furniture", "Office"]):
        add("practice_v2.db", "where-clause", "Easy", f"{cat} products",
            f"Return the name and price of products in the {cat} category, cheapest first.",
            "Filter products by category.", "where", pick(POOL_BIG, k + 1, 2),
            f"SELECT name, price FROM products WHERE category = '{cat}' ORDER BY price ASC")

    for n in [3, 5, 10]:
        add("practice_v2.db", "order-by", "Easy", f"Top {n} paid employees",
            f"Return the name and salary of the {n} highest-paid employees.",
            "ORDER BY DESC then LIMIT.", "order-by,top-n", pick(POOL_BIG, n, 2),
            f"SELECT name, salary FROM employees ORDER BY salary DESC LIMIT {n}")

    # 3) Tech-analytics questions on practice_tech.db.
    T = "practice_tech.db"

    # Counts per table
    for k, (tbl, label) in enumerate([("users", "users"), ("posts", "posts"), ("sessions", "sessions"),
                                      ("events", "events"), ("transactions", "transactions")]):
        add(T, "aggregation", "Easy", f"Total {label}",
            f"Return the total number of {label}.", "COUNT(*).", "aggregation,count",
            pick(POOL_TECH, k, 2), f"SELECT COUNT(*) AS total FROM {tbl}")

    # Distinct values
    for k, (col, tbl, label) in enumerate([("country", "users", "countries"), ("plan", "users", "plans"),
                                           ("device", "sessions", "devices"), ("event_name", "events", "event types"),
                                           ("status", "transactions", "transaction statuses")]):
        add(T, "basic-select", "Easy", f"Distinct {label}",
            f"Return the distinct {label} present in the data.", "SELECT DISTINCT.", "select,distinct",
            pick(POOL_TECH, k + 2, 2), f"SELECT DISTINCT {col} FROM {tbl} ORDER BY {col}")

    # Users per country / plan
    add(T, "group-by", "Easy", "Users per country",
        "Return each country and its number of users, most users first.",
        "GROUP BY country.", "group-by,count", pick(POOL_TECH, 0, 2),
        "SELECT country, COUNT(*) AS user_count FROM users GROUP BY country ORDER BY user_count DESC, country")
    add(T, "group-by", "Easy", "Users per plan",
        "Return each plan and its number of users, ordered by plan.",
        "GROUP BY plan.", "group-by,count", pick(POOL_FIN, 0, 2),
        "SELECT plan, COUNT(*) AS user_count FROM users GROUP BY plan ORDER BY plan")
    for k, country in enumerate(["USA", "UK", "Canada", "Germany", "India", "Brazil"]):
        add(T, "where-clause", "Easy", f"Users from {country}",
            f"Return the names of users from {country}, ordered by id.",
            "Filter users by country.", "where", pick(POOL_TECH, k, 2),
            f"SELECT name FROM users WHERE country = '{country}' ORDER BY id")
    for k, plan in enumerate(["free", "pro", "enterprise"]):
        add(T, "where-clause", "Easy", f"Users on the {plan} plan",
            f"Return the names of users on the {plan} plan, ordered by id.",
            "Filter users by plan.", "where", pick(POOL_FIN, k, 2),
            f"SELECT name FROM users WHERE plan = '{plan}' ORDER BY id")

    # Posts analytics
    add(T, "joins", "Medium", "Posts per user",
        "Return each user's name and how many posts they have made, most posts first, then user id.",
        "LEFT JOIN users to posts and COUNT.", "joins,group-by", pick(POOL_TECH, 1, 2),
        "SELECT u.name, COUNT(p.id) AS posts FROM users u LEFT JOIN posts p ON p.user_id = u.id GROUP BY u.id, u.name ORDER BY posts DESC, u.id")
    for n in [3, 5, 10]:
        add(T, "window-functions", "Medium", f"Top {n} creators by posts",
            f"Return the {n} users with the most posts (name and post count), most first.",
            "Aggregate posts per user, order, LIMIT.", "group-by,top-n", pick(POOL_TECH, n, 2),
            f"SELECT u.name, COUNT(p.id) AS posts FROM users u JOIN posts p ON p.user_id = u.id GROUP BY u.id, u.name ORDER BY posts DESC, u.id LIMIT {n}")
    for n in [5, 10]:
        add(T, "order-by", "Easy", f"Top {n} posts by likes",
            f"Return the id and likes of the {n} most-liked posts, most liked first.",
            "ORDER BY likes DESC, LIMIT.", "order-by,top-n", pick(POOL_TECH, n + 1, 2),
            f"SELECT id, likes FROM posts ORDER BY likes DESC, id LIMIT {n}")
    add(T, "aggregation", "Easy", "Average likes per post",
        "Return the average number of likes per post, rounded to 2 decimals.",
        "ROUND(AVG(likes),2).", "aggregation,avg", pick(POOL_TECH, 3, 2),
        "SELECT ROUND(AVG(likes),2) AS avg_likes FROM posts")
    add(T, "group-by", "Medium", "Monthly post volume",
        "Return each year-month and the number of posts created, ordered by month.",
        "Group by strftime('%Y-%m').", "group-by,dates", pick(POOL_TECH, 4, 2),
        "SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS posts FROM posts GROUP BY month ORDER BY month")
    add(T, "subqueries", "Medium", "Posts above average likes",
        "Return the id and likes of posts with more likes than the average post, most liked first.",
        "Compare likes to a scalar subquery.", "subquery", pick(POOL_TECH, 5, 2),
        "SELECT id, likes FROM posts WHERE likes > (SELECT AVG(likes) FROM posts) ORDER BY likes DESC, id")

    # Events / DAU / MAU
    add(T, "group-by", "Medium", "Events per type",
        "Return each event_name and how many times it occurred, most frequent first.",
        "GROUP BY event_name.", "group-by,count", pick(POOL_TECH, 6, 2),
        "SELECT event_name, COUNT(*) AS cnt FROM events GROUP BY event_name ORDER BY cnt DESC, event_name")
    add(T, "aggregation", "Medium", "Daily active users (peak day)",
        "Return the date with the most distinct active users, and that user count.",
        "Group events by date, count distinct users, order, LIMIT 1.", "aggregation,distinct", pick(POOL_TECH, 7, 2),
        "SELECT created_at AS date, COUNT(DISTINCT user_id) AS dau FROM events GROUP BY created_at ORDER BY dau DESC, created_at LIMIT 1")
    add(T, "group-by", "Medium", "Daily active users over time",
        "Return each date and its number of distinct active users, ordered by date.",
        "COUNT(DISTINCT user_id) grouped by date.", "group-by,distinct", pick(POOL_TECH, 8, 2),
        "SELECT created_at AS date, COUNT(DISTINCT user_id) AS dau FROM events GROUP BY created_at ORDER BY created_at")
    add(T, "aggregation", "Medium", "Monthly active users",
        "Return the number of distinct users who triggered any event in March 2023.",
        "COUNT(DISTINCT user_id) with a date filter.", "aggregation,distinct", pick(POOL_TECH, 9, 2),
        "SELECT COUNT(DISTINCT user_id) AS mau FROM events WHERE created_at >= '2023-03-01' AND created_at < '2023-04-01'")
    add(T, "subqueries", "Medium", "Users who purchased",
        "Return the names of users who have at least one 'purchase' event, ordered by id.",
        "IN a subquery of user_id from events.", "subquery,in", pick(POOL_FIN, 1, 2),
        "SELECT name FROM users WHERE id IN (SELECT user_id FROM events WHERE event_name = 'purchase') ORDER BY id")
    add(T, "subqueries", "Medium", "Users who never logged in",
        "Return the names of users with no 'login' event, ordered by id.",
        "NOT IN a subquery.", "subquery,not-in", pick(POOL_TECH, 2, 2),
        "SELECT name FROM users WHERE id NOT IN (SELECT user_id FROM events WHERE event_name = 'login') ORDER BY id")

    # Sessions
    add(T, "group-by", "Easy", "Sessions per device",
        "Return each device and its session count, most sessions first.",
        "GROUP BY device.", "group-by,count", pick(POOL_TECH, 3, 2),
        "SELECT device, COUNT(*) AS sessions FROM sessions GROUP BY device ORDER BY sessions DESC, device")
    add(T, "group-by", "Medium", "Average session length per device",
        "Return each device and the average session duration in minutes (rounded to 2), ordered by device.",
        "AVG(duration_min) grouped by device.", "group-by,avg", pick(POOL_TECH, 4, 2),
        "SELECT device, ROUND(AVG(duration_min),2) AS avg_minutes FROM sessions GROUP BY device ORDER BY device")
    add(T, "aggregation", "Easy", "Total time in app",
        "Return the total session duration (minutes) across all sessions.",
        "SUM(duration_min).", "aggregation,sum", pick(POOL_TECH, 5, 2),
        "SELECT SUM(duration_min) AS total_minutes FROM sessions")
    add(T, "joins", "Medium", "Longest session per user",
        "Return each user's name and their longest session duration, longest first, then user id.",
        "JOIN then MAX(duration_min) grouped by user.", "joins,aggregation", pick(POOL_TECH, 6, 2),
        "SELECT u.name, MAX(s.duration_min) AS longest FROM users u JOIN sessions s ON s.user_id = u.id GROUP BY u.id, u.name ORDER BY longest DESC, u.id")

    # Transactions / revenue (fintech flavor)
    add(T, "aggregation", "Medium", "Total completed revenue",
        "Return the total amount of completed transactions, rounded to 2 decimals.",
        "SUM with a status filter.", "aggregation,sum", pick(POOL_FIN, 0, 2),
        "SELECT ROUND(SUM(amount),2) AS revenue FROM transactions WHERE status = 'completed'")
    add(T, "group-by", "Medium", "Revenue by status",
        "Return each transaction status and the total amount (rounded), ordered by status.",
        "SUM(amount) grouped by status.", "group-by,sum", pick(POOL_FIN, 1, 2),
        "SELECT status, ROUND(SUM(amount),2) AS total FROM transactions GROUP BY status ORDER BY status")
    add(T, "group-by", "Medium", "Monthly revenue",
        "Return each year-month and its completed revenue (rounded), ordered by month.",
        "Filter completed, group by month.", "group-by,dates", pick(POOL_FIN, 2, 2),
        "SELECT strftime('%Y-%m', created_at) AS month, ROUND(SUM(amount),2) AS revenue FROM transactions WHERE status = 'completed' GROUP BY month ORDER BY month")
    add(T, "ctes", "Hard", "Running monthly revenue",
        "Return each month and a running total of completed revenue, ordered by month.",
        "Aggregate per month in a CTE, then SUM() OVER (ORDER BY month).", "cte,window,running-total",
        pick(POOL_FIN, 3, 2),
        "WITH m AS (SELECT strftime('%Y-%m', created_at) AS month, SUM(amount) AS rev FROM transactions WHERE status = 'completed' GROUP BY month) SELECT month, ROUND(rev,2) AS revenue, ROUND(SUM(rev) OVER (ORDER BY month),2) AS running_total FROM m ORDER BY month")
    add(T, "window-functions", "Hard", "Top spenders",
        "Return each user's name and total completed spend, highest first, with a spend rank.",
        "SUM per user, RANK() OVER (ORDER BY spend DESC).", "window,rank", pick(POOL_FIN, 4, 2),
        "WITH s AS (SELECT user_id, SUM(amount) AS spend FROM transactions WHERE status = 'completed' GROUP BY user_id) SELECT u.name, ROUND(s.spend,2) AS spend, RANK() OVER (ORDER BY s.spend DESC) AS spend_rank FROM s JOIN users u ON u.id = s.user_id ORDER BY spend_rank, u.id")
    for n in range(2, 7):
        add(T, "subqueries", "Medium", f"{_ord(n)} largest transaction",
            f"Return the {_ord(n).lower()} largest distinct transaction amount.",
            "Order distinct amounts descending with OFFSET.", "subquery,top-n", pick(POOL_FIN, n, 2),
            f"SELECT DISTINCT amount FROM transactions ORDER BY amount DESC LIMIT 1 OFFSET {n - 1}")
    add(T, "aggregation", "Easy", "Average transaction value",
        "Return the average transaction amount, rounded to 2 decimals.",
        "ROUND(AVG(amount),2).", "aggregation,avg", pick(POOL_FIN, 5, 2),
        "SELECT ROUND(AVG(amount),2) AS avg_amount FROM transactions")
    add(T, "case-expressions", "Medium", "Refund rate by user",
        "Return each user_id and how many of their transactions were refunded, highest first.",
        "SUM a CASE grouped by user.", "case,conditional-aggregation", pick(POOL_FIN, 6, 2),
        "SELECT user_id, SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refunds FROM transactions GROUP BY user_id ORDER BY refunds DESC, user_id")

    # Subscriptions / MRR
    add(T, "aggregation", "Medium", "Total MRR",
        "Return the total MRR across active subscriptions (those with no end date), rounded to 2 decimals.",
        "SUM(mrr) where ended_at IS NULL.", "aggregation,sum", pick(POOL_FIN, 7, 2),
        "SELECT ROUND(SUM(mrr),2) AS mrr FROM subscriptions WHERE ended_at IS NULL")
    add(T, "group-by", "Medium", "MRR by plan",
        "Return each plan and its total active MRR (rounded), ordered by plan.",
        "Filter active, group by plan.", "group-by,sum", pick(POOL_FIN, 8, 2),
        "SELECT plan, ROUND(SUM(mrr),2) AS mrr FROM subscriptions WHERE ended_at IS NULL GROUP BY plan ORDER BY plan")
    add(T, "where-clause", "Medium", "Churned subscriptions",
        "Return the ids of subscriptions that have ended (ended_at is not null), ordered by id.",
        "Filter where ended_at IS NOT NULL.", "where,null", pick(POOL_FIN, 9, 2),
        "SELECT id FROM subscriptions WHERE ended_at IS NOT NULL ORDER BY id")

    # Follows / graph
    add(T, "group-by", "Medium", "Most followed users",
        "Return each user's name and their follower count, most followers first, then id.",
        "COUNT follows grouped by followee_id, join users.", "joins,group-by", pick(POOL_TECH, 10, 2),
        "SELECT u.name, COUNT(f.follower_id) AS followers FROM users u LEFT JOIN follows f ON f.followee_id = u.id GROUP BY u.id, u.name ORDER BY followers DESC, u.id")
    add(T, "group-by", "Medium", "Most active followers",
        "Return each user's name and how many people they follow, most first, then id.",
        "COUNT follows grouped by follower_id.", "joins,group-by", pick(POOL_TECH, 11, 2),
        "SELECT u.name, COUNT(f.followee_id) AS following FROM users u LEFT JOIN follows f ON f.follower_id = u.id GROUP BY u.id, u.name ORDER BY following DESC, u.id")

    # Window functions on users/posts
    add(T, "window-functions", "Hard", "Rank posts by likes within user",
        "Return user_id, post id and likes with a per-user rank by likes (1 = most liked). Order by user then rank.",
        "ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY likes DESC).", "window,row-number",
        pick(POOL_TECH, 12, 2),
        "SELECT user_id, id AS post_id, likes, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY likes DESC, id) AS rn FROM posts ORDER BY user_id, rn")
    add(T, "window-functions", "Hard", "Each user's best post",
        "Return the user_id, post id and likes of each user's most-liked post, ordered by user id.",
        "Rank within user and keep rn = 1.", "window,cte", pick(POOL_TECH, 13, 2),
        "WITH ranked AS (SELECT user_id, id, likes, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY likes DESC, id) AS rn FROM posts) SELECT user_id, id AS post_id, likes FROM ranked WHERE rn = 1 ORDER BY user_id")
    add(T, "case-expressions", "Medium", "Classify users by plan tier",
        "Return each user's name and a tier: 'Paid' for pro or enterprise, else 'Free'. Order by id.",
        "CASE on plan.", "case", pick(POOL_TECH, 14, 2),
        "SELECT name, CASE WHEN plan IN ('pro','enterprise') THEN 'Paid' ELSE 'Free' END AS tier FROM users ORDER BY id")
    add(T, "ctes", "Hard", "Engaged users",
        "Using a CTE of event counts per user, return the names of users with more than 3 events, most active first.",
        "Count events per user in a CTE, filter, join users.", "cte", pick(POOL_TECH, 15, 2),
        "WITH ec AS (SELECT user_id, COUNT(*) AS events FROM events GROUP BY user_id) SELECT u.name, ec.events FROM ec JOIN users u ON u.id = ec.user_id WHERE ec.events > 3 ORDER BY ec.events DESC, u.id")

    build_more()


def build_more():
    V2 = "practice_v2.db"
    T = "practice_tech.db"

    # ── V2 families ─────────────────────────────────────────────────────────
    for y in ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"]:
        add(V2, "where-clause", "Easy", f"Employees hired in {y}",
            f"Management wants a roster of everyone who joined the company during {y}. Return the name and hire date of each such employee.",
            "Filter on the year part of hire_date with strftime.", "where,dates", pick(POOL_BIG, int(y)),
            f"SELECT name, hire_date FROM employees WHERE strftime('%Y', hire_date) = '{y}' ORDER BY id")

    for s in ["Completed", "Shipped", "Pending", "Cancelled"]:
        add(V2, "where-clause", "Easy", f"{s} orders",
            f"The fulfilment team needs every order currently in the '{s}' state. Return the order id and its order date.",
            "Filter orders by status.", "where", pick(POOL_BIG, len(s)),
            f"SELECT id, order_date FROM orders WHERE status = '{s}' ORDER BY id")

    for c in ["USA", "Canada", "UK", "Germany", "Japan"]:
        add(V2, "where-clause", "Easy", f"Customers in {c}",
            f"The regional sales lead for {c} wants a list of the customers based there. Return their names.",
            "Filter customers by country.", "where", pick(POOL_BIG, len(c)),
            f"SELECT name FROM customers WHERE country = '{c}' ORDER BY id")

    for t in [50, 100, 200, 500, 1000]:
        add(V2, "where-clause", "Easy", f"Products over ${t}",
            f"Merchandising is reviewing premium stock. Return the name and price of every product that costs more than {t}, most expensive first.",
            "Filter and order by price.", "where,order-by", pick(POOL_BIG, t),
            f"SELECT name, price FROM products WHERE price > {t} ORDER BY price DESC, id")
    for t in [50, 100, 300]:
        add(V2, "where-clause", "Easy", f"Products under ${t}",
            f"Finance is compiling an entry-price catalogue. Return the name and price of products that cost less than {t}, cheapest first.",
            "Filter and order by price.", "where,order-by", pick(POOL_BIG, t + 1),
            f"SELECT name, price FROM products WHERE price < {t} ORDER BY price ASC, id")

    for mid in [1, 5, 9, 12, 15, 18]:
        add(V2, "joins", "Medium", f"Direct reports of employee {mid}",
            f"HR is preparing an org chart. Return the names of employees who report directly to the employee whose id is {mid}.",
            "Filter on manager_id.", "where", pick(POOL_BIG, mid),
            f"SELECT name FROM employees WHERE manager_id = {mid} ORDER BY id")

    for t in [60000, 70000, 80000, 90000, 100000, 120000]:
        add(V2, "aggregation", "Easy", f"Headcount earning over {t}",
            f"For a compensation review, determine how many employees earn more than {t}. Return a single count.",
            "COUNT with a WHERE filter.", "aggregation,count", pick(POOL_BIG, t // 1000),
            f"SELECT COUNT(*) AS cnt FROM employees WHERE salary > {t}")

    for jt in ["Software Engineer", "Sales Rep", "Support Agent"]:
        add(V2, "where-clause", "Easy", f"All {jt}s",
            f"Return the names of every employee whose job title is exactly '{jt}'.",
            "Filter on job_title.", "where", pick(POOL_BIG, len(jt)),
            f"SELECT name FROM employees WHERE job_title = '{jt}' ORDER BY id")

    for cat in ["Electronics", "Accessories", "Furniture", "Office"]:
        add(V2, "aggregation", "Easy", f"Priciest {cat} item",
            f"Return the highest price among products in the {cat} category.",
            "MAX with a filter.", "aggregation,max", pick(POOL_BIG, len(cat)),
            f"SELECT MAX(price) AS max_price FROM products WHERE category = '{cat}'")
        add(V2, "aggregation", "Easy", f"Cheapest {cat} item",
            f"Return the lowest price among products in the {cat} category.",
            "MIN with a filter.", "aggregation,min", pick(POOL_BIG, len(cat) + 1),
            f"SELECT MIN(price) AS min_price FROM products WHERE category = '{cat}'")

    for n in [3, 5, 10]:
        add(V2, "joins", "Hard", f"Top {n} customers by spend",
            f"The finance team wants the {n} highest-value customers. Return each customer's name and their total order value (sum of quantity times unit price across all their order items), highest first.",
            "Join customers to orders to order_items, SUM per customer, order, LIMIT.", "joins,aggregation,top-n",
            pick(POOL_BIG, n),
            f"SELECT c.name, ROUND(SUM(oi.quantity*oi.unit_price),2) AS total FROM customers c JOIN orders o ON o.customer_id=c.id JOIN order_items oi ON oi.order_id=o.id GROUP BY c.id, c.name ORDER BY total DESC, c.id LIMIT {n}")
    for n in [3, 5, 10]:
        add(V2, "joins", "Hard", f"Top {n} products by revenue",
            f"Return the {n} products that generated the most revenue (sum of quantity times unit price), with their name and total revenue, highest first.",
            "Join order_items to products, SUM, order, LIMIT.", "joins,aggregation,top-n",
            pick(POOL_BIG, n + 1),
            f"SELECT p.name, ROUND(SUM(oi.quantity*oi.unit_price),2) AS revenue FROM products p JOIN order_items oi ON oi.product_id=p.id GROUP BY p.id, p.name ORDER BY revenue DESC, p.id LIMIT {n}")

    for m in ["01", "02", "03", "04", "05", "06", "07"]:
        add(V2, "where-clause", "Easy", f"Orders placed in 2023-{m}",
            f"Return the ids of all orders placed during the month 2023-{m}.",
            "Filter on the year-month of order_date.", "where,dates", pick(POOL_BIG, int(m)),
            f"SELECT id FROM orders WHERE strftime('%Y-%m', order_date) = '2023-{m}' ORDER BY id")

    for a, b in [(50000, 80000), (80000, 100000), (100000, 130000), (130000, 200000)]:
        add(V2, "where-clause", "Easy", f"Salaries from {a} to {b}",
            f"Return the name and salary of employees whose salary is between {a} and {b} inclusive, highest paid first.",
            "Use BETWEEN.", "where,between", pick(POOL_BIG, a // 1000),
            f"SELECT name, salary FROM employees WHERE salary BETWEEN {a} AND {b} ORDER BY salary DESC, id")

    for loc in ["San Francisco", "New York", "Chicago", "Austin", "Boston"]:
        add(V2, "where-clause", "Easy", f"Departments in {loc}",
            f"Return the names of departments located in {loc}.",
            "Filter departments by location.", "where", pick(POOL_BIG, len(loc)),
            f"SELECT name FROM departments WHERE location = '{loc}' ORDER BY id")
    for loc in ["San Francisco", "New York", "Chicago"]:
        add(V2, "joins", "Medium", f"Employees based in {loc}",
            f"Return the names of employees whose department is located in {loc}.",
            "Join employees to departments and filter on location.", "joins", pick(POOL_BIG, len(loc) + 2),
            f"SELECT e.name FROM employees e JOIN departments d ON e.department_id=d.id WHERE d.location = '{loc}' ORDER BY e.id")

    for pid in [1, 2, 3, 5]:
        add(V2, "joins", "Hard", f"Buyers of product {pid}",
            f"Return the distinct names of customers who have ever ordered the product whose id is {pid}.",
            "Join customers to orders to order_items and filter on product_id; de-duplicate.", "joins,subquery",
            pick(POOL_BIG, pid),
            f"SELECT DISTINCT c.name FROM customers c JOIN orders o ON o.customer_id=c.id JOIN order_items oi ON oi.order_id=o.id WHERE oi.product_id={pid} ORDER BY c.name")

    add(V2, "joins", "Medium", "Headcount by office location",
        "Return each office location and the number of employees working there, busiest office first.",
        "Join employees to departments, group by location.", "joins,group-by", pick(POOL_BIG, 3),
        "SELECT d.location, COUNT(e.id) AS headcount FROM departments d LEFT JOIN employees e ON e.department_id=d.id GROUP BY d.location ORDER BY headcount DESC, d.location")
    add(V2, "group-by", "Medium", "Average salary by job title",
        "Return each job title and the average salary (rounded to two decimals) of the employees who hold it, highest paid title first.",
        "Group by job_title.", "group-by,avg", pick(POOL_BIG, 4),
        "SELECT job_title, ROUND(AVG(salary),2) AS avg_salary FROM employees GROUP BY job_title ORDER BY avg_salary DESC, job_title")

    for did in [1, 2, 3, 4, 5, 6]:
        add(V2, "order-by", "Easy", f"Department {did} pay ranking",
            f"Return the name and salary of employees in department {did}, highest paid first.",
            "Filter by department and order by salary.", "where,order-by", pick(POOL_BIG, did),
            f"SELECT name, salary FROM employees WHERE department_id={did} ORDER BY salary DESC, id")
        add(V2, "subqueries", "Hard", f"Above department {did} average",
            f"Return the name and salary of employees in department {did} who earn more than the average salary of that same department.",
            "Use a subquery that computes the department's average salary.", "subquery", pick(POOL_BIG, did + 1),
            f"SELECT name, salary FROM employees WHERE department_id={did} AND salary > (SELECT AVG(salary) FROM employees WHERE department_id={did}) ORDER BY salary DESC, id")

    for cid in [1, 2, 3, 5]:
        add(V2, "where-clause", "Easy", f"Orders from customer {cid}",
            f"Return the id and order date of all orders placed by the customer whose id is {cid}, newest first.",
            "Filter orders by customer_id.", "where,order-by", pick(POOL_BIG, cid),
            f"SELECT id, order_date FROM orders WHERE customer_id={cid} ORDER BY order_date DESC, id")

    for letter in ["A", "J", "M", "S"]:
        add(V2, "where-clause", "Easy", f"Employees whose name starts with {letter}",
            f"Return the names of employees whose name begins with the letter '{letter}'.",
            "Use LIKE with a wildcard.", "where,like", pick(POOL_BIG, ord(letter)),
            f"SELECT name FROM employees WHERE name LIKE '{letter}%' ORDER BY id")

    # ── TECH families ───────────────────────────────────────────────────────
    for ev in ["view", "click", "share"]:
        add(T, "subqueries", "Medium", f"Users who triggered a {ev}",
            f"The growth team is segmenting users by behaviour. Return the names of users who have at least one '{ev}' event.",
            "Use IN with a subquery over the events table.", "subquery,in", pick(POOL_TECH, len(ev)),
            f"SELECT name FROM users WHERE id IN (SELECT user_id FROM events WHERE event_name='{ev}') ORDER BY id")
    for ev in ["view", "click", "share", "purchase"]:
        add(T, "subqueries", "Medium", f"Users with no {ev} event",
            f"For a re-engagement campaign, return the names of users who have never triggered a '{ev}' event.",
            "Use NOT IN with a subquery.", "subquery,not-in", pick(POOL_TECH, len(ev) + 1),
            f"SELECT name FROM users WHERE id NOT IN (SELECT user_id FROM events WHERE event_name='{ev}') ORDER BY id")

    for dev in ["ios", "android", "web"]:
        add(T, "where-clause", "Easy", f"{dev} sessions",
            f"Return the id and duration in minutes of sessions that occurred on {dev}, longest first.",
            "Filter sessions by device.", "where,order-by", pick(POOL_TECH, len(dev)),
            f"SELECT id, duration_min FROM sessions WHERE device='{dev}' ORDER BY duration_min DESC, id")

    for st in ["completed", "refunded", "failed"]:
        add(T, "where-clause", "Easy", f"{st.title()} transactions",
            f"Return the id and amount of transactions with status '{st}', largest amount first.",
            "Filter transactions by status.", "where,order-by", pick(POOL_FIN, len(st)),
            f"SELECT id, amount FROM transactions WHERE status='{st}' ORDER BY amount DESC, id")

    for t in [20, 50, 80, 100]:
        add(T, "where-clause", "Easy", f"Posts over {t} likes",
            f"Return the id and like count of posts with more than {t} likes, most liked first.",
            "Filter and order by likes.", "where,order-by", pick(POOL_TECH, t),
            f"SELECT id, likes FROM posts WHERE likes > {t} ORDER BY likes DESC, id")

    for y in ["2022", "2023"]:
        add(T, "where-clause", "Easy", f"Users who joined in {y}",
            f"Return the names of users who signed up during {y}.",
            "Filter on the year of signup_date.", "where,dates", pick(POOL_TECH, int(y)),
            f"SELECT name FROM users WHERE strftime('%Y', signup_date)='{y}' ORDER BY id")

    add(T, "group-by", "Medium", "Sessions per month",
        "Return each year-month and the number of sessions started in it, ordered by month.",
        "Group sessions by month.", "group-by,dates", pick(POOL_TECH, 1),
        "SELECT strftime('%Y-%m', started_at) AS month, COUNT(*) AS sessions FROM sessions GROUP BY month ORDER BY month")
    add(T, "group-by", "Medium", "New users per month",
        "Return each signup year-month and the number of users who joined, ordered by month.",
        "Group users by signup month.", "group-by,dates", pick(POOL_TECH, 2),
        "SELECT strftime('%Y-%m', signup_date) AS month, COUNT(*) AS new_users FROM users GROUP BY month ORDER BY month")
    add(T, "group-by", "Medium", "Transactions per month",
        "Return each year-month and the number of transactions in it, ordered by month.",
        "Group transactions by month.", "group-by,dates", pick(POOL_FIN, 3),
        "SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS txns FROM transactions GROUP BY month ORDER BY month")
    add(T, "group-by", "Medium", "Average amount by status",
        "Return each transaction status and the average amount (rounded to two decimals), ordered by status.",
        "AVG grouped by status.", "group-by,avg", pick(POOL_FIN, 4),
        "SELECT status, ROUND(AVG(amount),2) AS avg_amount FROM transactions GROUP BY status ORDER BY status")

    for n in [3, 5, 10]:
        add(T, "joins", "Hard", f"Top {n} most-followed users",
            f"Return the {n} users with the most followers, showing each user's name and follower count, most followers first.",
            "Count follows by followee, join users, order, LIMIT.", "joins,top-n", pick(POOL_TECH, n),
            f"SELECT u.name, COUNT(f.follower_id) AS followers FROM users u JOIN follows f ON f.followee_id=u.id GROUP BY u.id, u.name ORDER BY followers DESC, u.id LIMIT {n}")
    for n in [3, 5, 10]:
        add(T, "joins", "Hard", f"Top {n} spenders",
            f"Return the {n} users with the highest completed spend, showing each user's name and total spend, highest first.",
            "Sum completed transactions per user, join, order, LIMIT.", "joins,top-n", pick(POOL_FIN, n),
            f"SELECT u.name, ROUND(SUM(t.amount),2) AS spend FROM users u JOIN transactions t ON t.user_id=u.id AND t.status='completed' GROUP BY u.id, u.name ORDER BY spend DESC, u.id LIMIT {n}")

    for n in range(2, 7):
        add(T, "subqueries", "Medium", f"{_ord(n)} most-liked value",
            f"Return the {_ord(n).lower()} highest distinct like count across all posts.",
            "Order distinct like counts descending and use OFFSET.", "subquery,top-n", pick(POOL_TECH, n),
            f"SELECT DISTINCT likes FROM posts ORDER BY likes DESC LIMIT 1 OFFSET {n-1}")

    for n in [2, 3, 5]:
        add(T, "group-by", "Medium", f"Users with more than {n} posts",
            f"Return the user_id and post count of users who have published more than {n} posts, most prolific first.",
            "GROUP BY user_id with HAVING.", "group-by,having", pick(POOL_TECH, n + 1),
            f"SELECT user_id, COUNT(*) AS posts FROM posts GROUP BY user_id HAVING COUNT(*) > {n} ORDER BY posts DESC, user_id")

    for t in [30, 45]:
        add(T, "where-clause", "Easy", f"Sessions over {t} minutes",
            f"Return the id, user_id and duration of sessions longer than {t} minutes, longest first.",
            "Filter and order by duration.", "where,order-by", pick(POOL_TECH, t),
            f"SELECT id, user_id, duration_min FROM sessions WHERE duration_min > {t} ORDER BY duration_min DESC, id")

    add(T, "group-by", "Medium", "Country with the most users",
        "Return the single country that has the most users, along with that user count.",
        "Group by country, order by count, LIMIT 1.", "group-by,top-n", pick(POOL_TECH, 5),
        "SELECT country, COUNT(*) AS users FROM users GROUP BY country ORDER BY users DESC, country LIMIT 1")
    add(T, "aggregation", "Easy", "Average posts per author",
        "Return the average number of posts per user, counting only users who have posted, rounded to two decimals.",
        "Count posts per user in a subquery, then AVG.", "aggregation,subquery", pick(POOL_TECH, 6),
        "SELECT ROUND(AVG(cnt),2) AS avg_posts FROM (SELECT user_id, COUNT(*) AS cnt FROM posts GROUP BY user_id)")
    add(T, "aggregation", "Easy", "Longest session overall",
        "Return the longest single session duration in minutes across all users.",
        "MAX(duration_min).", "aggregation,max", pick(POOL_TECH, 7),
        "SELECT MAX(duration_min) AS longest FROM sessions")
    add(T, "aggregation", "Easy", "Largest transaction",
        "Return the largest single transaction amount recorded.",
        "MAX(amount).", "aggregation,max", pick(POOL_FIN, 5),
        "SELECT MAX(amount) AS max_amount FROM transactions")
    add(T, "subqueries", "Medium", "Above-average transactions",
        "Return the id and amount of transactions whose amount exceeds the overall average transaction amount, largest first.",
        "Compare amount to a scalar subquery.", "subquery", pick(POOL_FIN, 6),
        "SELECT id, amount FROM transactions WHERE amount > (SELECT AVG(amount) FROM transactions) ORDER BY amount DESC, id")

    add(T, "window-functions", "Hard", "Rank countries by user base",
        "Return each country, its user count, and a rank by user count (1 = most users). Order by rank then country.",
        "Aggregate per country then RANK() OVER (ORDER BY users DESC).", "window,rank", pick(POOL_TECH, 8),
        "WITH c AS (SELECT country, COUNT(*) AS users FROM users GROUP BY country) SELECT country, users, RANK() OVER (ORDER BY users DESC) AS rnk FROM c ORDER BY rnk, country")
    add(T, "window-functions", "Hard", "Like quartiles of posts",
        "Return each post id, its like count, and the quartile (1-4, where 1 is the most liked) assigned by NTILE. Order by likes descending, then id.",
        "NTILE(4) OVER (ORDER BY likes DESC).", "window,ntile", pick(POOL_TECH, 9),
        "SELECT id, likes, NTILE(4) OVER (ORDER BY likes DESC, id) AS quartile FROM posts ORDER BY likes DESC, id")
    add(T, "case-expressions", "Medium", "Paid versus free split",
        "Return two numbers in one row: the count of paid users (on the pro or enterprise plan) and the count of free users.",
        "SUM a CASE expression for each bucket.", "case,conditional-aggregation", pick(POOL_FIN, 7),
        "SELECT SUM(CASE WHEN plan IN ('pro','enterprise') THEN 1 ELSE 0 END) AS paid, SUM(CASE WHEN plan='free' THEN 1 ELSE 0 END) AS free FROM users")

    for c in ["USA", "UK", "Canada", "Germany", "India", "Brazil"]:
        add(T, "joins", "Medium", f"Posts from {c} users",
            f"Return how many posts were created by users located in {c}.",
            "Join posts to users and filter by country.", "joins,aggregation", pick(POOL_TECH, len(c)),
            f"SELECT COUNT(*) AS posts FROM posts p JOIN users u ON u.id=p.user_id WHERE u.country='{c}'")
    for c in ["USA", "UK", "Germany"]:
        add(T, "joins", "Medium", f"Sessions from {c} users",
            f"Return the total number of app sessions started by users located in {c}.",
            "Join sessions to users and filter by country.", "joins,aggregation", pick(POOL_TECH, len(c) + 1),
            f"SELECT COUNT(*) AS sessions FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.country='{c}'")

    for n in [3, 5, 10]:
        add(T, "joins", "Medium", f"Top {n} users by sessions",
            f"Return the {n} users with the most app sessions, showing each user's name and session count, most first.",
            "Join users to sessions, count, order, LIMIT.", "joins,top-n", pick(POOL_TECH, n + 2),
            f"SELECT u.name, COUNT(s.id) AS sessions FROM users u JOIN sessions s ON s.user_id=u.id GROUP BY u.id, u.name ORDER BY sessions DESC, u.id LIMIT {n}")
    for n in [3, 5, 10]:
        add(T, "joins", "Medium", f"Top {n} users by events",
            f"Return the {n} most active users by event count, showing each user's name and event count, most first.",
            "Join users to events, count, order, LIMIT.", "joins,top-n", pick(POOL_TECH, n + 3),
            f"SELECT u.name, COUNT(e.id) AS events FROM users u JOIN events e ON e.user_id=u.id GROUP BY u.id, u.name ORDER BY events DESC, u.id LIMIT {n}")

    for pl in ["free", "pro", "enterprise"]:
        add(T, "aggregation", "Easy", f"{pl.title()} user count",
            f"Return how many users are on the {pl} plan.",
            "COUNT with a WHERE filter.", "aggregation,count", pick(POOL_FIN, len(pl)),
            f"SELECT COUNT(*) AS cnt FROM users WHERE plan='{pl}'")

    for ev in ["login", "view", "click", "purchase", "share"]:
        add(T, "aggregation", "Easy", f"Number of {ev} events",
            f"Return the total number of '{ev}' events recorded.",
            "COUNT with a WHERE filter.", "aggregation,count", pick(POOL_TECH, len(ev) + 4),
            f"SELECT COUNT(*) AS cnt FROM events WHERE event_name='{ev}'")

    add(T, "group-by", "Medium", "Users by country and plan",
        "Return each country and plan combination with its user count, ordered by country then plan.",
        "GROUP BY two columns.", "group-by", pick(POOL_TECH, 11),
        "SELECT country, plan, COUNT(*) AS users FROM users GROUP BY country, plan ORDER BY country, plan")
    add(T, "joins", "Hard", "Users who posted and paid",
        "Return the names of users who have published at least one post and also have at least one completed transaction, ordered by id.",
        "Intersect two subqueries with IN.", "subquery,in", pick(POOL_FIN, 8),
        "SELECT name FROM users WHERE id IN (SELECT user_id FROM posts) AND id IN (SELECT user_id FROM transactions WHERE status='completed') ORDER BY id")
    add(T, "ctes", "Hard", "Revenue leaderboard",
        "Using a CTE of completed spend per user, return each user's name and spend for users who have spent more than 200, highest first.",
        "Aggregate completed spend per user in a CTE, filter, join users.", "cte", pick(POOL_FIN, 9),
        "WITH s AS (SELECT user_id, SUM(amount) AS spend FROM transactions WHERE status='completed' GROUP BY user_id) SELECT u.name, ROUND(s.spend,2) AS spend FROM s JOIN users u ON u.id=s.user_id WHERE s.spend > 200 ORDER BY s.spend DESC, u.id")

    build_more2()


def build_more2():
    V2 = "practice_v2.db"
    T = "practice_tech.db"

    # ── V2: per-department aggregates & ranks ───────────────────────────────
    for did in [1, 2, 3, 4, 5, 6]:
        add(V2, "group-by", "Easy", f"Headcount of department {did}",
            f"Return how many employees work in department {did}.",
            "COUNT with a filter.", "aggregation,count", pick(POOL_BIG, did),
            f"SELECT COUNT(*) AS cnt FROM employees WHERE department_id={did}")
        add(V2, "aggregation", "Medium", f"Payroll of department {did}",
            f"Return the total salary paid to employees in department {did}.",
            "SUM with a filter.", "aggregation,sum", pick(POOL_BIG, did + 1),
            f"SELECT SUM(salary) AS payroll FROM employees WHERE department_id={did}")
        add(V2, "aggregation", "Easy", f"Highest salary in department {did}",
            f"Return the highest salary paid within department {did}.",
            "MAX with a filter.", "aggregation,max", pick(POOL_BIG, did + 2),
            f"SELECT MAX(salary) AS max_salary FROM employees WHERE department_id={did}")
        add(V2, "aggregation", "Easy", f"Lowest salary in department {did}",
            f"Return the lowest salary paid within department {did}.",
            "MIN with a filter.", "aggregation,min", pick(POOL_BIG, did + 3),
            f"SELECT MIN(salary) AS min_salary FROM employees WHERE department_id={did}")
        add(V2, "subqueries", "Hard", f"Top earner of department {did}",
            f"Return the name and salary of the employee(s) earning the maximum salary in department {did}.",
            "Compare salary to a scalar subquery scoped to the department.", "subquery", pick(POOL_BIG, did + 4),
            f"SELECT name, salary FROM employees WHERE department_id={did} AND salary=(SELECT MAX(salary) FROM employees WHERE department_id={did})")
        add(V2, "subqueries", "Medium", f"Below-average earners in department {did}",
            f"Return the name and salary of employees in department {did} who earn less than that department's average salary, lowest first.",
            "Use a subquery for the department average.", "subquery", pick(POOL_BIG, did + 5),
            f"SELECT name, salary FROM employees WHERE department_id={did} AND salary < (SELECT AVG(salary) FROM employees WHERE department_id={did}) ORDER BY salary ASC, id")
        add(V2, "order-by", "Easy", f"Longest-serving in department {did}",
            f"Return the name and hire date of the longest-tenured employee in department {did}.",
            "Order by hire_date ascending and take one.", "order-by,limit", pick(POOL_BIG, did + 6),
            f"SELECT name, hire_date FROM employees WHERE department_id={did} ORDER BY hire_date ASC, id LIMIT 1")
        add(V2, "where-clause", "Easy", f"Employees outside department {did}",
            f"Return the names of employees who are not in department {did}.",
            "Use <> on department_id.", "where", pick(POOL_BIG, did + 7),
            f"SELECT name FROM employees WHERE department_id <> {did} ORDER BY id")

    for y in ["2019", "2020", "2021", "2022"]:
        add(V2, "where-clause", "Easy", f"Hired before {y}",
            f"Return the name and hire date of employees hired before January 1 {y}, earliest first.",
            "Compare hire_date to a date string.", "where,dates", pick(POOL_BIG, int(y)),
            f"SELECT name, hire_date FROM employees WHERE hire_date < '{y}-01-01' ORDER BY hire_date, id")
        add(V2, "where-clause", "Easy", f"Hired on or after {y}",
            f"Return the name and hire date of employees hired on or after January 1 {y}, earliest first.",
            "Compare hire_date to a date string.", "where,dates", pick(POOL_BIG, int(y) + 1),
            f"SELECT name, hire_date FROM employees WHERE hire_date >= '{y}-01-01' ORDER BY hire_date, id")

    for did in [1, 2, 3]:
        for n in [2, 3]:
            add(V2, "subqueries", "Hard", f"{_ord(n)} highest salary in department {did}",
                f"Return the {_ord(n).lower()} highest distinct salary within department {did}.",
                "Order the department's distinct salaries and use OFFSET.", "subquery,top-n", pick(POOL_BIG, did * n),
                f"SELECT DISTINCT salary FROM employees WHERE department_id={did} ORDER BY salary DESC LIMIT 1 OFFSET {n-1}")

    for n in [3, 5, 10]:
        add(V2, "joins", "Hard", f"Top {n} customers by order count",
            f"Return the {n} customers who placed the most orders, with name and order count, most first.",
            "Count orders per customer, order, LIMIT.", "joins,top-n", pick(POOL_BIG, n + 2),
            f"SELECT c.name, COUNT(o.id) AS orders FROM customers c JOIN orders o ON o.customer_id=c.id GROUP BY c.id, c.name ORDER BY orders DESC, c.id LIMIT {n}")

    for d in ["2023-03-01", "2023-05-01", "2023-06-01"]:
        add(V2, "where-clause", "Easy", f"Orders before {d}",
            f"Return the ids of orders placed before {d}.",
            "Compare order_date to a date string.", "where,dates", pick(POOL_BIG, len(d)),
            f"SELECT id FROM orders WHERE order_date < '{d}' ORDER BY order_date, id")
        add(V2, "where-clause", "Easy", f"Orders on or after {d}",
            f"Return the ids of orders placed on or after {d}.",
            "Compare order_date to a date string.", "where,dates", pick(POOL_BIG, len(d) + 1),
            f"SELECT id FROM orders WHERE order_date >= '{d}' ORDER BY order_date, id")

    add(V2, "basic-select", "Easy", "Distinct order statuses",
        "Return the distinct order statuses that appear in the orders table.",
        "SELECT DISTINCT.", "select,distinct", pick(POOL_BIG, 1),
        "SELECT DISTINCT status FROM orders ORDER BY status")
    add(V2, "basic-select", "Easy", "Distinct product categories",
        "Return the distinct product categories in the catalogue.",
        "SELECT DISTINCT.", "select,distinct", pick(POOL_BIG, 2),
        "SELECT DISTINCT category FROM products ORDER BY category")
    add(V2, "basic-select", "Easy", "Distinct office locations",
        "Return the distinct office locations across all departments.",
        "SELECT DISTINCT.", "select,distinct", pick(POOL_BIG, 3),
        "SELECT DISTINCT location FROM departments ORDER BY location")
    add(V2, "aggregation", "Easy", "Number of purchasing customers",
        "Return the number of distinct customers who have placed at least one order.",
        "COUNT(DISTINCT ...).", "aggregation,distinct", pick(POOL_BIG, 4),
        "SELECT COUNT(DISTINCT customer_id) AS buyers FROM orders")
    add(V2, "aggregation", "Easy", "Total number of orders",
        "Return the total number of orders placed.",
        "COUNT(*).", "aggregation,count", pick(POOL_BIG, 5),
        "SELECT COUNT(*) AS orders FROM orders")

    # ── TECH: more families ─────────────────────────────────────────────────
    for t in [50, 100, 200, 300, 400]:
        add(T, "where-clause", "Easy", f"Transactions over ${t}",
            f"Return the id and amount of transactions larger than {t}, largest first.",
            "Filter and order by amount.", "where,order-by", pick(POOL_FIN, t),
            f"SELECT id, amount FROM transactions WHERE amount > {t} ORDER BY amount DESC, id")
    for t in [50, 100, 200]:
        add(T, "where-clause", "Easy", f"Transactions under ${t}",
            f"Return the id and amount of transactions smaller than {t}, smallest first.",
            "Filter and order by amount.", "where,order-by", pick(POOL_FIN, t + 1),
            f"SELECT id, amount FROM transactions WHERE amount < {t} ORDER BY amount ASC, id")

    add(T, "subqueries", "Medium", "Users who never posted",
        "Return the names of users who have never published a post.",
        "Use NOT IN with a subquery.", "subquery,not-in", pick(POOL_TECH, 1),
        "SELECT name FROM users WHERE id NOT IN (SELECT user_id FROM posts) ORDER BY id")
    add(T, "subqueries", "Medium", "Users who never had a session",
        "Return the names of users who have no recorded app sessions.",
        "Use NOT IN with a subquery.", "subquery,not-in", pick(POOL_TECH, 2),
        "SELECT name FROM users WHERE id NOT IN (SELECT user_id FROM sessions) ORDER BY id")
    add(T, "subqueries", "Medium", "Users who never transacted",
        "Return the names of users who have never made a transaction.",
        "Use NOT IN with a subquery.", "subquery,not-in", pick(POOL_FIN, 2),
        "SELECT name FROM users WHERE id NOT IN (SELECT user_id FROM transactions) ORDER BY id")

    for n in [3, 5, 10]:
        add(T, "joins", "Hard", f"Top {n} users by following",
            f"Return the {n} users who follow the most other users, with name and following count, most first.",
            "Count follows by follower, join, order, LIMIT.", "joins,top-n", pick(POOL_TECH, n),
            f"SELECT u.name, COUNT(f.followee_id) AS following FROM users u JOIN follows f ON f.follower_id=u.id GROUP BY u.id, u.name ORDER BY following DESC, u.id LIMIT {n}")

    for m in ["01", "02", "03", "04", "05", "06"]:
        add(T, "where-clause", "Easy", f"Posts created in 2023-{m}",
            f"Return the ids of posts created during month 2023-{m}.",
            "Filter on the post's year-month.", "where,dates", pick(POOL_TECH, int(m)),
            f"SELECT id FROM posts WHERE strftime('%Y-%m', created_at)='2023-{m}' ORDER BY id")

    for c, p in [("USA", "pro"), ("USA", "free"), ("UK", "pro"), ("Germany", "enterprise"), ("Canada", "free"), ("India", "pro")]:
        add(T, "where-clause", "Medium", f"{p.title()} users in {c}",
            f"Return the names of {p}-plan users located in {c}.",
            "Filter on two columns with AND.", "where,and", pick(POOL_TECH, len(c) + len(p)),
            f"SELECT name FROM users WHERE country='{c}' AND plan='{p}' ORDER BY id")

    add(T, "aggregation", "Easy", "Average session duration",
        "Return the average session duration in minutes, rounded to two decimals.",
        "AVG(duration_min).", "aggregation,avg", pick(POOL_TECH, 2),
        "SELECT ROUND(AVG(duration_min),2) AS avg_minutes FROM sessions")
    add(T, "aggregation", "Easy", "Average likes per post",
        "Return the average number of likes per post, rounded to two decimals.",
        "AVG(likes).", "aggregation,avg", pick(POOL_TECH, 3),
        "SELECT ROUND(AVG(likes),2) AS avg_likes FROM posts")
    add(T, "aggregation", "Easy", "Most likes on any post",
        "Return the maximum like count on any single post.",
        "MAX(likes).", "aggregation,max", pick(POOL_TECH, 4),
        "SELECT MAX(likes) AS max_likes FROM posts")
    add(T, "aggregation", "Easy", "Total transaction value",
        "Return the total value of all transactions regardless of status, rounded to two decimals.",
        "SUM(amount).", "aggregation,sum", pick(POOL_FIN, 3),
        "SELECT ROUND(SUM(amount),2) AS total FROM transactions")
    add(T, "aggregation", "Easy", "Distinct active users",
        "Return the number of distinct users who have triggered at least one event.",
        "COUNT(DISTINCT ...).", "aggregation,distinct", pick(POOL_TECH, 5),
        "SELECT COUNT(DISTINCT user_id) AS active_users FROM events")

    add(T, "group-by", "Easy", "Subscriptions per plan",
        "Return each subscription plan and the number of subscriptions on it, ordered by plan.",
        "GROUP BY plan.", "group-by,count", pick(POOL_FIN, 4),
        "SELECT plan, COUNT(*) AS cnt FROM subscriptions GROUP BY plan ORDER BY plan")
    add(T, "aggregation", "Easy", "Active subscription count",
        "Return the number of active subscriptions (those with no end date).",
        "COUNT with a filter.", "aggregation,count", pick(POOL_FIN, 5),
        "SELECT COUNT(*) AS active FROM subscriptions WHERE ended_at IS NULL")
    add(T, "aggregation", "Easy", "Churned subscription count",
        "Return the number of subscriptions that have ended.",
        "COUNT with a filter.", "aggregation,count", pick(POOL_FIN, 6),
        "SELECT COUNT(*) AS churned FROM subscriptions WHERE ended_at IS NOT NULL")

    for n in range(2, 5):
        add(T, "subqueries", "Medium", f"{_ord(n)} largest completed payment",
            f"Return the {_ord(n).lower()} highest distinct amount among completed transactions.",
            "Filter to completed, take distinct amounts, OFFSET.", "subquery,top-n", pick(POOL_FIN, n),
            f"SELECT DISTINCT amount FROM transactions WHERE status='completed' ORDER BY amount DESC LIMIT 1 OFFSET {n-1}")

    add(T, "window-functions", "Hard", "Session rank within user",
        "Return user_id, session id and duration with a per-user rank by duration (1 = longest). Order by user then rank.",
        "ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY duration_min DESC).", "window,row-number", pick(POOL_TECH, 6),
        "SELECT user_id, id AS session_id, duration_min, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY duration_min DESC, id) AS rn FROM sessions ORDER BY user_id, rn")
    add(T, "window-functions", "Hard", "Running daily events",
        "Return each event date, the number of events that day, and a running total of events ordered by date.",
        "Aggregate per date then SUM() OVER (ORDER BY date).", "window,running-total", pick(POOL_TECH, 7),
        "WITH d AS (SELECT created_at AS date, COUNT(*) AS c FROM events GROUP BY created_at) SELECT date, c AS events, SUM(c) OVER (ORDER BY date) AS running_total FROM d ORDER BY date")
    add(T, "window-functions", "Hard", "Cumulative signups over time",
        "Return each user's name, signup date, and the cumulative number of users who had signed up through that date, ordered by signup date then id.",
        "COUNT(*) OVER (ORDER BY signup_date).", "window,running-total", pick(POOL_TECH, 8),
        "SELECT name, signup_date, COUNT(*) OVER (ORDER BY signup_date, id) AS users_so_far FROM users ORDER BY signup_date, id")

    for a, b in [(0, 20), (20, 50), (50, 100)]:
        add(T, "where-clause", "Easy", f"Posts with {a} to {b} likes",
            f"Return the id and likes of posts whose like count is between {a} and {b} inclusive, most liked first.",
            "Use BETWEEN.", "where,between", pick(POOL_TECH, a + b),
            f"SELECT id, likes FROM posts WHERE likes BETWEEN {a} AND {b} ORDER BY likes DESC, id")

    for n in [3, 5, 10]:
        add(T, "joins", "Hard", f"Top {n} users by transaction count",
            f"Return the {n} users with the most transactions, with name and transaction count, most first.",
            "Join users to transactions, count, order, LIMIT.", "joins,top-n", pick(POOL_FIN, n + 1),
            f"SELECT u.name, COUNT(t.id) AS txns FROM users u JOIN transactions t ON t.user_id=u.id GROUP BY u.id, u.name ORDER BY txns DESC, u.id LIMIT {n}")

    add(T, "group-by", "Medium", "Device with the most sessions",
        "Return the device that accounts for the most sessions, and that session count.",
        "Group by device, order, LIMIT 1.", "group-by,top-n", pick(POOL_TECH, 9),
        "SELECT device, COUNT(*) AS sessions FROM sessions GROUP BY device ORDER BY sessions DESC, device LIMIT 1")
    add(T, "group-by", "Medium", "Most common event type",
        "Return the single most frequent event_name and how many times it occurred.",
        "Group by event_name, order, LIMIT 1.", "group-by,top-n", pick(POOL_TECH, 10),
        "SELECT event_name, COUNT(*) AS cnt FROM events GROUP BY event_name ORDER BY cnt DESC, event_name LIMIT 1")
    add(T, "aggregation", "Medium", "Average MRR of active plans",
        "Return the average monthly recurring revenue across active subscriptions, rounded to two decimals.",
        "AVG(mrr) where ended_at IS NULL.", "aggregation,avg", pick(POOL_FIN, 7),
        "SELECT ROUND(AVG(mrr),2) AS avg_mrr FROM subscriptions WHERE ended_at IS NULL")

    # ── Fill to 500+ ────────────────────────────────────────────────────────
    for n in [2, 3]:
        add(V2, "subqueries", "Medium", f"{_ord(n)} lowest salary",
            f"Return the {_ord(n).lower()} lowest distinct salary among all employees.",
            "Order distinct salaries ascending and use OFFSET.", "subquery,top-n", pick(POOL_BIG, n),
            f"SELECT DISTINCT salary FROM employees ORDER BY salary ASC LIMIT 1 OFFSET {n-1}")
    for cat in ["Electronics", "Accessories", "Furniture", "Office"]:
        add(V2, "order-by", "Easy", f"{cat} catalogue by price",
            f"Return the name and price of all {cat} products, most expensive first.",
            "Filter by category and order by price.", "where,order-by", pick(POOL_BIG, len(cat)),
            f"SELECT name, price FROM products WHERE category='{cat}' ORDER BY price DESC, id")
    for y in ["2020", "2021", "2022"]:
        add(V2, "where-clause", "Easy", f"Customers who joined in {y}",
            f"Return the names of customers who signed up during {y}.",
            "Filter on the year of signup_date.", "where,dates", pick(POOL_BIG, int(y)),
            f"SELECT name FROM customers WHERE strftime('%Y', signup_date)='{y}' ORDER BY id")
    for n in [5, 10]:
        add(V2, "order-by", "Easy", f"{n} newest hires",
            f"Return the name and hire date of the {n} most recently hired employees, newest first.",
            "Order by hire_date descending and LIMIT.", "order-by,top-n", pick(POOL_BIG, n),
            f"SELECT name, hire_date FROM employees ORDER BY hire_date DESC, id LIMIT {n}")
    add(V2, "aggregation", "Medium", "Average order value",
        "Return the average total value of an order, computed as the average over each order's total (sum of quantity times unit price), rounded to two decimals.",
        "Aggregate per order in a subquery, then AVG.", "aggregation,subquery", pick(POOL_BIG, 7),
        "SELECT ROUND(AVG(total),2) AS avg_order FROM (SELECT order_id, SUM(quantity*unit_price) AS total FROM order_items GROUP BY order_id)")

    for n in range(2, 5):
        add(T, "subqueries", "Medium", f"{_ord(n)} longest session",
            f"Return the {_ord(n).lower()} longest distinct session duration in minutes.",
            "Order distinct durations descending and use OFFSET.", "subquery,top-n", pick(POOL_TECH, n),
            f"SELECT DISTINCT duration_min FROM sessions ORDER BY duration_min DESC LIMIT 1 OFFSET {n-1}")
    add(T, "group-by", "Medium", "Plan with the most users",
        "Return the single subscription plan with the most users and that count.",
        "Group by plan, order, LIMIT 1.", "group-by,top-n", pick(POOL_FIN, 8),
        "SELECT plan, COUNT(*) AS users FROM users GROUP BY plan ORDER BY users DESC, plan LIMIT 1")
    add(T, "group-by", "Medium", "Busiest signup month",
        "Return the signup year-month in which the most users joined, and that count.",
        "Group by signup month, order, LIMIT 1.", "group-by,top-n", pick(POOL_TECH, 11),
        "SELECT strftime('%Y-%m', signup_date) AS month, COUNT(*) AS c FROM users GROUP BY month ORDER BY c DESC, month LIMIT 1")
    for n in [3, 20]:
        add(T, "order-by", "Easy", f"{n} most-liked posts",
            f"Return the id and likes of the {n} most-liked posts, most liked first.",
            "Order by likes descending and LIMIT.", "order-by,top-n", pick(POOL_TECH, n),
            f"SELECT id, likes FROM posts ORDER BY likes DESC, id LIMIT {n}")
    add(T, "aggregation", "Easy", "Number of user countries",
        "Return the number of distinct countries that users come from.",
        "COUNT(DISTINCT ...).", "aggregation,distinct", pick(POOL_TECH, 12),
        "SELECT COUNT(DISTINCT country) AS countries FROM users")
    add(T, "basic-select", "Easy", "Users who follow someone",
        "Return the distinct ids of users who follow at least one other user, ordered by id.",
        "SELECT DISTINCT follower_id.", "select,distinct", pick(POOL_TECH, 13),
        "SELECT DISTINCT follower_id AS user_id FROM follows ORDER BY user_id")
    add(T, "aggregation", "Easy", "Average transaction amount",
        "Return the average transaction amount across all transactions, rounded to two decimals.",
        "AVG(amount).", "aggregation,avg", pick(POOL_FIN, 9),
        "SELECT ROUND(AVG(amount),2) AS avg_amount FROM transactions")


def _ord(n):
    return {2: "Second", 3: "Third", 4: "Fourth", 5: "Fifth", 6: "Sixth",
            7: "Seventh", 8: "Eighth", 9: "Ninth", 10: "Tenth"}.get(n, f"{n}th")


SCHEMA_FOR = {"practice_v2.db": base.SCHEMA_DISPLAY, "practice_tech.db": TECH_SCHEMA_DISPLAY}
SAMPLE_FOR = {"practice_v2.db": base.SAMPLE_DISPLAY, "practice_tech.db": TECH_SAMPLE_DISPLAY}


def verify():
    from app.services.sql_engine import execute_sql
    failures = []
    for i, q in enumerate(QUESTIONS):
        res = execute_sql(q["sql"], q["db"])
        if res["error"]:
            failures.append((i, q["title"], q["db"], res["error"]))
    return failures


def apply_to_supabase():
    import socket
    socket.setdefaulttimeout(30)
    from sqlalchemy import text
    from app.database.session import SessionLocal, engine, Base
    import app.models.models  # noqa: F401
    from app.models.models import Question, Category, DifficultyLevel

    Base.metadata.create_all(bind=engine)
    # Additive migration: ensure the companies column exists.
    with engine.begin() as con:
        con.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS companies VARCHAR(500)"))
    db = SessionLocal()
    try:
        cats = {c.slug: c.id for c in db.query(Category).all()}
        missing = sorted({q["slug"] for q in QUESTIONS} - set(cats))
        if missing:
            print("ERROR: categories missing:", missing)
            return 1

        existing = db.query(Question).order_by(Question.sort_order, Question.created_at, Question.id).all()
        print(f"existing: {len(existing)} | new total: {len(QUESTIONS)}")

        for i, q in enumerate(QUESTIONS):
            fields = dict(
                title=q["title"], description=q["description"],
                difficulty=DifficultyLevel(q["difficulty"]),
                category_id=cats[q["slug"]],
                schema_sql=SCHEMA_FOR[q["db"]], sample_data_sql=SAMPLE_FOR[q["db"]],
                expected_query=q["sql"], hint=q["hint"], tags=q["tags"],
                companies=q["companies"], sqlite_db_path=q["db"],
                is_published=True, sort_order=i,
            )
            if i < len(existing):
                for k, v in fields.items():
                    setattr(existing[i], k, v)
            else:
                db.add(Question(**fields))
        for row in existing[len(QUESTIONS):]:
            row.is_published = False
        db.commit()
        total = db.query(Question).filter(Question.is_published == True).count()
        with_co = db.query(Question).filter(Question.is_published == True, Question.companies.isnot(None)).count()
        print(f"published: {total} | with companies: {with_co}")
    finally:
        db.close()
    return 0


def main():
    from app.config import get_settings
    settings = get_settings()
    base.build_sandbox(os.path.join(settings.SANDBOX_DB_DIR, "practice_v2.db"))
    build_tech_db(os.path.join(settings.SANDBOX_DB_DIR, "practice_tech.db"))
    build_questions()

    print(f"Total questions: {len(QUESTIONS)}")
    by_db = {}
    for q in QUESTIONS:
        by_db[q["db"]] = by_db.get(q["db"], 0) + 1
    print("by schema:", by_db)

    failures = verify()
    if failures:
        print(f"\n{len(failures)} FAILURES:")
        for i, title, dbf, err in failures[:40]:
            print(f"  [{i}] {title} ({dbf}) -> {err}")
        print("Aborting; Supabase not touched.")
        return 1
    print("All expected queries run cleanly.")

    if "--apply" in sys.argv:
        print("\nApplying to Supabase...")
        return apply_to_supabase()
    print("(dry run) pass --apply to write to Supabase.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
