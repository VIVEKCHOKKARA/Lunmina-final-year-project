"""
Database connection pool for MySQL (Lumina).
"""
import mysql.connector
from mysql.connector import pooling

DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "Lumina",
    # Store/retrieve multilingual text (Telugu, Hindi, etc.) correctly.
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}

# Connection pool — reuses connections across requests
_pool = pooling.MySQLConnectionPool(
    pool_name="lumina_pool",
    pool_size=10,
    pool_reset_session=True,
    **DB_CONFIG,
)


def get_connection():
    """Get a connection from the pool."""
    return _pool.get_connection()


def query(sql, params=None, dictionary=True):
    """Execute a SELECT and return all rows as dicts."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=dictionary)
        cursor.execute(sql, params or ())
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


def execute(sql, params=None):
    """Execute an INSERT / UPDATE / DELETE and return lastrowid."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params or ())
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        return last_id
    finally:
        conn.close()


def execute_many(sql, data):
    """Execute a batch INSERT."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.executemany(sql, data)
        conn.commit()
        cursor.close()
    finally:
        conn.close()
