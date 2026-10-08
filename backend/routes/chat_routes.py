"""
Closed-Domain Project Chatbot routes â€” Powered strictly by MySQL Database Knowledge & Gemini API.
"""
import os
import uuid
import json
import re
import requests
from flask import Blueprint, request, jsonify, Response, stream_with_context
from db import query, execute
from auth_utils import get_current_user_info, resolve_authorized_shop_id, resolve_authorized_owner_id

chat_bp = Blueprint("chat", __name__)

GEMINI_API_KEY = (os.environ.get("GEMINI_API_KEY") or "AIzaSyDZUJfFUGwzBlb6QbHLWvhggia01BC2CmM").strip().strip('"')
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemma-4-26b-a4b-it").strip()

GEMINI_SYSTEM_INSTRUCTION = (
    "You are a strictly Closed-Domain AI Assistant for Profit Navigator.\n\n"
    "CRITICAL RULE: You MUST ONLY answer questions related to the Profit Navigator project, business performance metrics, sales, revenue, profit, expenses, orders, inventory, transactions, products, shops, and platform features.\n\n"
    "RESPONSE RULES:\n"
    "1. For questions about business performance, sales, revenue, profit, expenses, orders, products, transactions, or platform features, answer using the exact data in PROJECT_CONTEXT (preserve â‚¹ symbol and exact values).\n"
    "2. IF THE USER ASKS ANY GENERAL KNOWLEDGE QUESTION, TRIVIA, SCIENCE, HISTORY, GENERAL CODING, GEOGRAPHY, POLITICS, SPORTS, ENTERTAINMENT, OR ANYTHING UNRELATED TO PROFIT NAVIGATOR OR BUSINESS DATA, YOU MUST POLITELY REFUSE TO ANSWER.\n"
    "3. Respond fluently in the EXACT language/script used by the user in their question (e.g. Telugu, Hindi, Tamil, Gujarati, English, etc.).\n"
    "4. Output ONLY the direct, concise final answer in 1-2 short sentences without internal reasoning."
)


REFUSAL_MESSAGES = {
    "en": "I am a closed-domain AI assistant for Profit Navigator. I can only answer questions related to your project data, business performance, sales, revenue, profit, products, transactions, and platform features.",
    "te": "à°¨à±‡à°¨à±� à°ªà±�à°°à°¾à°«à°¿à°Ÿà±� à°¨à±‡à°µà°¿à°—à±‡à°Ÿà°°à±� à°•à±‹à°¸à°‚ à°®à±‚à°¸à°¿à°µà±‡à°¸à°¿à°¨ (Closed-Domain) AI à°…à°¸à°¿à°¸à±�à°Ÿà±†à°‚à°Ÿà±�â€Œà°¨à°¿. à°®à±€ à°ªà±�à°°à°¾à°œà±†à°•à±�à°Ÿà±� à°¡à±‡à°Ÿà°¾, à°¸à±‡à°²à±�à°¸à±�, à°†à°¦à°¾à°¯à°‚, à°²à°¾à°­à°¾à°²à±�, à°‰à°¤à±�à°ªà°¤à±�à°¤à±�à°²à±� à°®à°°à°¿à°¯à±� à°ªà±�à°²à°¾à°Ÿà±�â€Œà°«à°¾à°°à°®à±� à°«à±€à°šà°°à±�à°²à°•à±� à°¸à°‚à°¬à°‚à°§à°¿à°‚à°šà°¿à°¨ à°ªà±�à°°à°¶à±�à°¨à°²à°•à±� à°®à°¾à°¤à±�à°°à°®à±‡ à°¨à±‡à°¨à±� à°¸à°®à°¾à°§à°¾à°¨à°‚ à°‡à°µà±�à°µà°—à°²à°¨à±�.",
    "hi": "à¤®à¥ˆà¤‚ à¤ªà¥�à¤°à¥‰à¤«à¤¿à¤Ÿ à¤¨à¥‡à¤µà¤¿à¤—à¥‡à¤Ÿà¤° à¤•à¥‡ à¤²à¤¿à¤� à¤�à¤• à¤•à¥�à¤²à¥‹à¤œà¥�à¤¡-à¤¡à¥‹à¤®à¥‡à¤¨ AI à¤¸à¤¹à¤¾à¤¯à¤• à¤¹à¥‚à¤‚à¥¤ à¤®à¥ˆà¤‚ à¤•à¥‡à¤µà¤² à¤†à¤ªà¤•à¥‡ à¤ªà¥�à¤°à¥‹à¤œà¥‡à¤•à¥�à¤Ÿ à¤¡à¥‡à¤Ÿà¤¾, à¤¬à¤¿à¤•à¥�à¤°à¥€, à¤°à¤¾à¤œà¤¸à¥�à¤µ, à¤²à¤¾à¤­, à¤‰à¤¤à¥�à¤ªà¤¾à¤¦à¥‹à¤‚ à¤”à¤° à¤ªà¥�à¤²à¥‡à¤Ÿà¤«à¤¼à¥‰à¤°à¥�à¤® à¤¸à¥�à¤µà¤¿à¤§à¤¾à¤“à¤‚ à¤¸à¥‡ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤ªà¥�à¤°à¤¶à¥�à¤¨à¥‹à¤‚ à¤•à¥‡ à¤‰à¤¤à¥�à¤¤à¤° à¤¦à¥‡ à¤¸à¤•à¤¤à¤¾ à¤¹à¥‚à¤‚à¥¤",
    "gu": "àª¹à«�àª‚ àªªà«�àª°à«‹àª«àª¿àªŸ àª¨à«‡àªµàª¿àª—à«‡àªŸàª° àª®àª¾àªŸà«‡ àª•à«�àª²à«‹àª�à«�àª¡-àª¡à«‹àª®à«‡àª¨ AI àª®àª¦àª¦àª¨à«€àª¶ àª›à«�àª‚. àª¹à«�àª‚ àª«àª•à«�àª¤ àª¤àª®àª¾àª°àª¾ àªªà«�àª°à«‹àªœà«‡àª•à«�àªŸ àª¡à«‡àªŸàª¾, àªµà«‡àªšàª¾àª£, àª†àªµàª•, àª¨àª«à«‹ àª…àª¨à«‡ àªªà«�àª²à«‡àªŸàª«à«‹àª°à«�àª® àª¸à«�àªµàª¿àª§àª¾àª“ àª¸àª‚àª¬àª‚àª§àª¿àª¤ àªªà«�àª°àª¶à«�àª¨à«‹àª¨àª¾ àªœàªµàª¾àª¬ àª†àªªà«€ àª¶àª•à«�àª‚ àª›à«�àª‚.",
    "ta": "à®¨à®¾à®©à¯� à®ªà®¿à®°à®¾à®ƒà®ªà®¿à®Ÿà¯� à®¨à¯‡à®µà®¿à®•à¯‡à®Ÿà¯�à®Ÿà®°à¯�à®•à¯�à®•à®¾à®© à®®à¯‚à®Ÿà®¿à®¯-à®Ÿà¯Šà®®à¯ˆà®©à¯� AI à®‰à®¤à®µà®¿à®¯à®¾à®³à®°à¯�. à®‰à®™à¯�à®•à®³à¯� à®¤à®¿à®Ÿà¯�à®Ÿà®¤à¯� à®¤à®°à®µà¯�, à®µà®¿à®±à¯�à®ªà®©à¯ˆ, à®µà®°à¯�à®µà®¾à®¯à¯�, à®²à®¾à®ªà®®à¯� à®®à®±à¯�à®±à¯�à®®à¯� à®¤à®³à®®à¯� à®…à®®à¯�à®šà®™à¯�à®•à®³à¯� à®¤à¯Šà®Ÿà®°à¯�à®ªà®¾à®© à®•à¯‡à®³à¯�à®µà®¿à®•à®³à¯�à®•à¯�à®•à¯� à®®à®Ÿà¯�à®Ÿà¯�à®®à¯‡ à®Žà®©à¯�à®©à®¾à®²à¯� à®ªà®¤à®¿à®²à®³à®¿à®•à¯�à®• à®®à¯�à®Ÿà®¿à®¯à¯�à®®à¯�.",
    "kn": "à²¨à²¾à²¨à³� à²ªà³�à²°à²¾à²«à²¿à²Ÿà³� à²¨à³‡à²µà²¿à²—à³‡à²Ÿà²°à³�â€Œà²—à²¾à²—à²¿ à²®à³�à²šà³�à²šà²¿à²¦-à²¡à³Šà²®à³‡à²¨à³� (Closed-Domain) AI à²¸à²¹à²¾à²¯à²•. à²¨à²¿à²®à³�à²® à²ªà³�à²°à²¾à²œà³†à²•à³�à²Ÿà³� à²¡à³‡à²Ÿà²¾, à²®à²¾à²°à²¾à²Ÿ, à²†à²¦à²¾à²¯, à²²à²¾à²­, à²‰à²¤à³�à²ªà²¨à³�à²¨à²—à²³à³� à²®à²¤à³�à²¤à³� à²ªà³�à²²à²¾à²Ÿà³�â€Œà²«à²¾à²°à³�à²®à³� à²µà³ˆà²¶à²¿à²·à³�à²Ÿà³�à²¯à²—à²³à²¿à²—à³† à²¸à²‚à²¬à²‚à²§à²¿à²¸à²¿à²¦ à²ªà³�à²°à²¶à³�à²¨à³†à²—à²³à²¿à²—à³† à²®à²¾à²¤à³�à²° à²¨à²¾à²¨à³� à²‰à²¤à³�à²¤à²°à²¿à²¸à²¬à²²à³�à²²à³†.",
    "ml": "à´žà´¾àµ» à´ªàµ�à´°àµ‹à´«à´¿à´±àµ�à´±àµ� à´¨à´¾à´µà´¿à´—àµ‡à´±àµ�à´±à´±à´¿à´¨à´¾à´¯àµ�à´³àµ�à´³ à´•àµ�à´²àµ‹à´¸àµ�à´¡àµ�-à´¡àµŠà´®àµ†à´¯àµ�àµ» AI à´…à´¸à´¿à´¸àµ�à´±àµ�à´±à´¨àµ�à´±à´¾à´£àµ�. à´¨à´¿à´™àµ�à´™à´³àµ�à´Ÿàµ† à´ªàµ�à´°àµ‹à´œà´•àµ�à´±àµ�à´±àµ� à´¡à´¾à´±àµ�à´±, à´µà´¿àµ½à´ªàµ�à´ªà´¨, à´µà´°àµ�à´®à´¾à´¨à´‚, à´²à´¾à´­à´‚, à´‰àµ½à´ªàµ�à´ªà´¨àµ�à´¨à´™àµ�à´™àµ¾, à´ªàµ�à´²à´¾à´±àµ�à´±àµ�â€Œà´«àµ‹à´‚ à´«àµ€à´šàµ�à´šà´±àµ�à´•àµ¾ à´Žà´¨àµ�à´¨à´¿à´µà´¯àµ�à´®à´¾à´¯à´¿ à´¬à´¨àµ�à´§à´ªàµ�à´ªàµ†à´Ÿàµ�à´Ÿ à´šàµ‹à´¦àµ�à´¯à´™àµ�à´™àµ¾à´•àµ�à´•àµ� à´®à´¾à´¤àµ�à´°à´®àµ‡ à´Žà´¨à´¿à´•àµ�à´•àµ� à´‰à´¤àµ�à´¤à´°à´‚ à´¨àµ½à´•à´¾àµ» à´•à´´à´¿à´¯àµ‚.",
    "mr": "à¤®à¥€ à¤ªà¥�à¤°à¥‰à¤«à¤¿à¤Ÿ à¤¨à¥‡à¤µà¥�à¤¹à¤¿à¤—à¥‡à¤Ÿà¤°à¤¸à¤¾à¤ à¥€ à¤•à¥�à¤²à¥‹à¤œà¥�à¤¡-à¤¡à¥‹à¤®à¥‡à¤¨ AI à¤¸à¤¹à¤¾à¤¯à¥�à¤¯à¤• à¤†à¤¹à¥‡. à¤®à¥€ à¤«à¤•à¥�à¤¤ à¤¤à¥�à¤®à¤šà¥�à¤¯à¤¾ à¤ªà¥�à¤°à¥‹à¤œà¥‡à¤•à¥�à¤Ÿ à¤¡à¥‡à¤Ÿà¤¾, à¤µà¤¿à¤•à¥�à¤°à¥€, à¤®à¤¹à¤¸à¥‚à¤², à¤¨à¤«à¤¾, à¤‰à¤¤à¥�à¤ªà¤¾à¤¦à¤¨à¥‡ à¤†à¤£à¤¿ à¤ªà¥�à¤²à¥…à¤Ÿà¤«à¥‰à¤°à¥�à¤® à¤µà¥ˆà¤¶à¤¿à¤·à¥�à¤Ÿà¥�à¤¯à¤¾à¤‚à¤¶à¥€ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤ªà¥�à¤°à¤¶à¥�à¤¨à¤¾à¤‚à¤šà¥€ à¤‰à¤¤à¥�à¤¤à¤°à¥‡ à¤¦à¥‡à¤Š à¤¶à¤•à¤¤à¥‹.",
    "bn": "à¦†à¦®à¦¿ à¦ªà§�à¦°à¦«à¦¿à¦Ÿ à¦¨à§‡à¦­à¦¿à¦—à§‡à¦Ÿà¦¾à¦°à§‡à¦° à¦œà¦¨à§�à¦¯ à¦�à¦•à¦Ÿà¦¿ à¦•à§�à¦²à§‹à¦œà¦¡-à¦¡à§‹à¦®à§‡à¦¨ AI à¦¸à¦¹à¦•à¦¾à¦°à§€à¥¤ à¦†à¦®à¦¿ à¦•à§‡à¦¬à¦² à¦†à¦ªà¦¨à¦¾à¦° à¦ªà§�à¦°à¦œà§‡à¦•à§�à¦Ÿ à¦¡à¦¾à¦Ÿà¦¾, à¦¬à¦¿à¦•à§�à¦°à¦¿, à¦°à¦¾à¦œà¦¸à§�à¦¬, à¦²à¦¾à¦­, à¦ªà¦£à§�à¦¯ à¦�à¦¬à¦‚ à¦ªà§�à¦²à§�à¦¯à¦¾à¦Ÿà¦«à¦°à§�à¦® à¦¬à§ˆà¦¶à¦¿à¦·à§�à¦Ÿà§�à¦¯ à¦¸à¦®à§�à¦ªà¦°à§�à¦•à¦¿à¦¤ à¦ªà§�à¦°à¦¶à§�à¦¨à§‡à¦° à¦‰à¦¤à§�à¦¤à¦° à¦¦à¦¿à¦¤à§‡ à¦ªà¦¾à¦°à¦¿à¥¤"
}

# Domain keywords across English, transliterated regional terms, and regional scripts
PROJECT_KEYWORDS = [
    # English Financial & Business
    "sale", "sales", "revenue", "income", "profit", "net profit", "expense", "expenses", "cost", "costs", "margin", "margins",
    "order", "orders", "customer", "customers", "avg order", "average order",
    # English Products & Inventory
    "product", "products", "item", "items", "inventory", "price", "pricing", "cluster", "star", "cash cow", "underperformer", "question mark",
    # English Transactions
    "transaction", "transactions", "ledger", "date", "category", "income transaction", "expense transaction",
    # English Shops & Roles
    "shop", "shops", "store", "stores", "location", "locations", "manager", "managers", "owner", "owners", "business", "branch",
    # English Analytics & Features & Website Modules
    "forecast", "forecasting", "projection", "trend", "growth", "anomaly"
]

        "cricket", "football", "match", "joke", "riddle", "poem", "recipe", "who is", "who was", "who won",
        "where is", "capital", "planet", "solar system", "math", "equation", "solve equation",
        "python code", "java code", "c++", "algorithm", "fibonacci", "photosynthesis", "history of",
        "science", "geography", "who invented", "when was", "meaning of life", "tell me a story",
        "distance to", "speed of light", "population of", "highest mountain", "longest river",
        # Transliterated & regional off-topic patterns
        "à®ªà®¿à®°à®¤à®®à®°à¯�", "à®®à®¨à¯�à®¤à®¿à®°à®¿", "à®ªà®¿à®°à®šà®¿à®Ÿà¯†à®©à¯�à®Ÿà¯�", "à®µà®¾à®©à®¿à®²à¯ˆ", "à®¤à®¿à®°à¯ˆà®ªà¯�à®ªà®Ÿà®®à¯�", "à®µà®¿à®³à¯ˆà®¯à®¾à®Ÿà¯�à®Ÿà¯�", "à®•à®¤à¯ˆ", "à®ªà®¾à®Ÿà¯�à®Ÿà¯�",
        "à°ªà±�à°°à°§à°¾à°¨ à°®à°‚à°¤à±�à°°à°¿", "à°°à°¾à°·à±�à°Ÿà±�à°°à°ªà°¤à°¿", "à°°à°¾à°œà°§à°¾à°¨à°¿", "à°µà°¾à°¤à°¾à°µà°°à°£à°‚", "à°¸à°¿à°¨à°¿à°®à°¾", "à°ªà°¾à°Ÿ", "à°•à°¥",
        "à¤ªà¥�à¤°à¤§à¤¾à¤¨à¤®à¤‚à¤¤à¥�à¤°à¥€", "à¤°à¤¾à¤·à¥�à¤Ÿà¥�à¤°à¤ªà¤¤à¤¿", "à¤°à¤¾à¤œà¤§à¤¾à¤¨à¥€", "à¤®à¥Œà¤¸à¤®", "à¤«à¤¿à¤²à¥�à¤®", "à¤•à¤¹à¤¾à¤¨à¥€", "à¤•à¤µà¤¿à¤¤à¤¾",
        "àªµàª¡àª¾àªªà«�àª°àª§àª¾àª¨", "àª°àª¾àª·à«�àªŸà«�àª°àªªàª¤àª¿", "àª°àª¾àªœàª§àª¾àª¨à«€", "àª¹àªµàª¾àª®àª¾àª¨", "àª«àª¿àª²à«�àª®", "àªµàª¾àª°à«�àª¤àª¾"
    ]
    if any(pattern in msg_lower for pattern in off_topic_indicators):
        return False

    # Standard greetings & platform conversational starters
    greetings = [
        "hi", "hello", "hey", "namaste", "namaskaram", "good morning", "good evening", 
        "vanakkam", "kem cho", "who are you", "what can you do", "help", "telugu lo matlladu",
        "hindi me bolo", "english"
    ]
    if msg_lower in greetings or any(g in msg_lower for g in ["who are you", "what can you do", "telugu lo matlladu", "hindi me", "speak in"]):
        return True

    # Check if question mentions any project domain keyword
    if any(kw in msg_lower for kw in PROJECT_KEYWORDS):
        return True

    # Short queries (<= 12 chars) without off-topic indicators
    if len(msg_lower) <= 12:
        return True

    # Reject general knowledge / non-project queries
    return False



def get_mysql_project_context(user, last_user_msg, selected_shop_id=None):
    """
    Retrieve project data strictly from MySQL database with role & shop authorization.
    Returns (context_string, error_message, is_unauthorized).
    """
    owner_id = resolve_authorized_owner_id()
    if not owner_id:
        owners = query("SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1")
        if owners:
            owner_id = owners[0]["id"]
        else:
            tx_owners = query("SELECT owner_id FROM transactions WHERE owner_id IS NOT NULL LIMIT 1")
            owner_id = tx_owners[0]["owner_id"] if tx_owners else None

    if user and user.get("role") == "manager":
        assigned_shop_id = resolve_authorized_shop_id()
        if not assigned_shop_id:
            return None, "You don't have access to any assigned shop's information.", True

        s_rows = query(
            "SELECT s.id, s.name, s.location, s.city, b.id as biz_id FROM shops s JOIN businesses b ON s.business_id = b.id WHERE s.id = %s AND s.manager_id = %s",
            (assigned_shop_id, user["id"])
        )
        if not s_rows:
            return None, "Access denied. You don't have access to that shop's information.", True

        shop_name = s_rows[0]["name"]
        biz_id = s_rows[0]["biz_id"]

        # Security check: If Shop Manager asks about another shop, refuse access
        other_shops = query("SELECT name FROM shops WHERE business_id = %s AND id != %s", (biz_id, assigned_shop_id))
        other_names = [r["name"].lower() for r in other_shops]
        msg_lower = last_user_msg.lower()

        if any(name in msg_lower for name in other_names if len(name) > 3) or \
           any(term in msg_lower for term in ["other shop", "another shop", "different shop", "shop b", "all shops"]):
            return None, "Access denied. You don't have access to that shop's information.", True

        tx_stats = query(
            "SELECT "
            "COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as rev, "
            "COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as exp, "
            "COUNT(CASE WHEN type='income' THEN 1 END) as orders "
            "FROM transactions WHERE shop_id = %s",
            (assigned_shop_id,)
        )[0]

        products = query(
            "SELECT name, category, price, units_sold, revenue, cluster FROM products WHERE owner_id = (SELECT owner_id FROM businesses WHERE id = %s) ORDER BY revenue DESC LIMIT 10",
            (biz_id,)
        )
        recent_tx = query(
            "SELECT date, description, category, amount, type FROM transactions WHERE shop_id = %s ORDER BY date DESC LIMIT 8",
            (assigned_shop_id,)
        )
        target_title = f"SHOP '{shop_name.upper()}' (ASSIGNED SHOP FOR MANAGER {user['name']})"

    else:
        # Business Owner / Analyst
        target_shop_id = selected_shop_id
        if target_shop_id and target_shop_id != "all":
            # Context for specific selected shop belonging to this owner
            s_rows = query(
                "SELECT s.id, s.name, s.location, s.city FROM shops s JOIN businesses b ON s.business_id = b.id WHERE s.id = %s AND b.owner_id = %s",
                (target_shop_id, owner_id)
            )
            if s_rows:
                shop_name = s_rows[0]["name"]
                tx_stats = query(
                    "SELECT "
                    "COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as rev, "
                    "COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as exp, "
                    "COUNT(CASE WHEN type='income' THEN 1 END) as orders "
                    "FROM transactions WHERE shop_id = %s AND owner_id = %s",
                    (target_shop_id, owner_id)
                )[0]

                products = query(
                    "SELECT name, category, price, units_sold, revenue, cluster FROM products WHERE owner_id = %s ORDER BY revenue DESC LIMIT 10",
                    (owner_id,)
                )
                recent_tx = query(
                    "SELECT date, description, category, amount, type FROM transactions WHERE shop_id = %s AND owner_id = %s ORDER BY date DESC LIMIT 8",
                    (target_shop_id, owner_id)
                )
                target_title = f"SELECTED SHOP '{shop_name.upper()}'"
            else:
                target_shop_id = "all"

        if not target_shop_id or target_shop_id == "all":
            # Aggregate strictly across authorized shops of current Business Owner
            tx_stats = query(
                "SELECT "
                "COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as rev, "
                "COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as exp, "
                "COUNT(CASE WHEN type='income' THEN 1 END) as orders "
                "FROM transactions WHERE owner_id = %s",
                (owner_id,)
            )[0]

            products = query(
                "SELECT name, category, price, units_sold, revenue, cluster FROM products WHERE owner_id = %s ORDER BY revenue DESC LIMIT 10",
                (owner_id,)
            )
            recent_tx = query(
                "SELECT date, description, category, amount, type FROM transactions WHERE owner_id = %s ORDER BY date DESC LIMIT 8",
                (owner_id,)
            )
            shops = query(
                "SELECT s.name, s.location, u.name as manager_name FROM shops s JOIN businesses b ON s.business_id = b.id LEFT JOIN users u ON s.manager_id = u.id WHERE b.owner_id = %s",
                (owner_id,)
            )
            target_title = f"ALL AUTHORIZED SHOPS COMBINED ({len(shops)} STORE LOCATIONS)"

    rev = float(tx_stats["rev"])
    exp = float(tx_stats["exp"])
    profit = rev - exp
    orders = int(tx_stats["orders"])
    avg_order = (rev / orders) if orders > 0 else 0.0

    lines = [
        f"PROJECT_CONTEXT (SOURCE OF TRUTH FROM MYSQL DATABASE FOR {target_title}):\n",
        f"1. FINANCIAL PERFORMANCE METRICS:",
        f"   - Total Revenue: â‚¹{rev:,.2f}",
        f"   - Total Expenses: â‚¹{exp:,.2f}",
        f"   - Net Profit: â‚¹{profit:,.2f}",
        f"   - Total Orders: {orders:,}",
        f"   - Average Order Value: â‚¹{avg_order:,.2f}\n",
    ]

    if products:
        lines.append("2. PRODUCT CATALOG & CLUSTER PERFORMANCE:")
        for p in products:
            lines.append(
                f"   - Product Name: {p['name']} | Category: {p['category']} | Price: â‚¹{float(p['price']):,.2f} | Units Sold: {p['units_sold']:,} | Revenue: â‚¹{float(p['revenue']):,.2f} | Cluster: {p['cluster']}"
            )
        lines.append("")

    if recent_tx:
        lines.append("3. RECENT TRANSACTION RECORDS:")
        for t in recent_tx:
            lines.append(
                f"   - Date: {t['date']} | Description: {t['description']} | Category: {t['category']} | Amount: â‚¹{float(t['amount']):,.2f} | Type: {t['type'].upper()}"
            )
        lines.append("")

    lines.append(
        "4. PROFIT NAVIGATOR WEBSITE INFORMATION & MODULES:\n"
        "   - Application Name: Profit Navigator (Lumina Analytics Platform)\n"
        "   - Purpose: Multi-shop financial analytics, Prophet forecasting, Isolation Forest anomaly detection, K-Means product clustering, XGBoost price optimization.\n"
        "   - User Roles:\n"
        "     * Business Owner: Oversees all shop branches, views combined store performance, manages shop managers, and sets RBAC access permissions.\n"
        "     * Shop Manager: Controls assigned shop branch operations, records daily income/expenses, manages inventory catalog.\n"
        "     * Financial Analyst: Configures page visibility overrides, conducts deep analytics, tests ML models.\n"
        "   - Key Website Pages & Modules:\n"
        "     * Dashboard (/): Executive KPI summary, net profit trends, top selling products.\n"
        "     * Transactions (/transactions): Ledger table, add income/expense dialog, category filters.\n"
        "     * Products (/products): Product catalog management, pricing, cluster tags (Star, Cash Cow, Underperformer, Question Mark).\n"
        "     * Forecasting (/forecasting): Time-series revenue and expense projections powered by Prophet AI.\n"
        "     * Anomalies (/anomalies): Machine learning anomaly detection & fraud/outlier alerts.\n"
        "     * Pricing (/pricing): XGBoost dynamic price optimization recommendations.\n"
        "     * Insights & Simulate (/insights, /simulate): Interactive scenario simulation & AI business recommendations.\n"
        "     * Tutorials (/tutorials): Interactive system feature walkthroughs and platform guide.\n"
    )

    return "\n".join(lines), None, False



@chat_bp.route("/history", methods=["GET"])
def chat_history():
    """GET /api/chat/history?session_id=default â€” fetch chat history for authorized user."""
    session_id = request.args.get("session_id", "default")
    user = get_current_user_info()
    current_user_id = user["id"] if user else resolve_authorized_owner_id()

    if current_user_id:
        rows = query(
            "SELECT role, content FROM chat_messages WHERE session_id = %s AND (user_id = %s OR user_id IS NULL) ORDER BY created_at ASC",
            (session_id, current_user_id),
        )
    else:
        rows = query(
            "SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY created_at ASC",
            (session_id,),
        )
    return jsonify(rows)


@chat_bp.route("/sessions", methods=["GET"])
def chat_sessions():
    """GET /api/chat/sessions â€” Returns active chat sessions for current user with first message preview & timestamp."""
    try:
        user = get_current_user_info()
        current_user_id = user["id"] if user else resolve_authorized_owner_id()

        if current_user_id:
            rows = query(
                """
                SELECT 
                    session_id,
                    MIN(created_at) as created_at,
                    MAX(created_at) as updated_at,
                    COUNT(*) as message_count,
                    (
                        SELECT content FROM chat_messages cm2 
                        WHERE cm2.session_id = cm.session_id AND (cm2.user_id = %s OR cm2.user_id IS NULL) AND cm2.role = 'user' 
                        ORDER BY cm2.created_at ASC LIMIT 1
                    ) as preview
                FROM chat_messages cm
                WHERE cm.user_id = %s OR cm.user_id IS NULL
                GROUP BY session_id
                ORDER BY MAX(created_at) DESC
                """,
                (current_user_id, current_user_id)
            )
        else:
            rows = query(
                """
                SELECT 
                    session_id,
                    MIN(created_at) as created_at,
                    MAX(created_at) as updated_at,
                    COUNT(*) as message_count,
                    (
                        SELECT content FROM chat_messages cm2 
                        WHERE cm2.session_id = cm.session_id AND cm2.role = 'user' 
                        ORDER BY cm2.created_at ASC LIMIT 1
                    ) as preview
                FROM chat_messages cm
                GROUP BY session_id
                ORDER BY MAX(created_at) DESC
                """
            )
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chat_bp.route("/session/<session_id>", methods=["DELETE"])
def delete_chat_session(session_id):
    """DELETE /api/chat/session/<session_id> â€” Delete all messages for a session."""
    try:
        user = get_current_user_info()
        current_user_id = user["id"] if user else resolve_authorized_owner_id()

        if current_user_id:
            execute("DELETE FROM chat_messages WHERE session_id = %s AND (user_id = %s OR user_id IS NULL)", (session_id, current_user_id))
        else:
            execute("DELETE FROM chat_messages WHERE session_id = %s", (session_id,))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chat_bp.route("/save", methods=["POST"])
def save_message():
    """POST /api/chat/save â€” save a single chat message."""
    body = request.get_json(force=True)
    user = get_current_user_info()
    current_user_id = user["id"] if user else resolve_authorized_owner_id()
    mid = str(uuid.uuid4())
    execute(
        "INSERT INTO chat_messages (id, role, content, user_id, session_id) VALUES (%s, %s, %s, %s, %s)",
        (mid, body["role"], body["content"], current_user_id, body.get("session_id", "default")),
    )
    return jsonify({"id": mid}), 201


@chat_bp.route("/", methods=["POST"])
def chat_stream():
    """
    POST /api/chat â€” Closed-Domain Project Chatbot using MySQL database knowledge & Gemini API.
    Enforces closed-domain project restriction, role authorization, and multilingual groundings.
    """
    body = request.get_json(force=True)
    messages = body.get("messages", [])
    session_id = body.get("session_id", "default")
    selected_shop_id = body.get("selected_shop_id")

    if not messages:
        return jsonify({"error": "messages array is required"}), 400

    user = get_current_user_info()
    current_user_id = user["id"] if user else resolve_authorized_owner_id()
    last_user_msg = messages[-1]["content"] if messages else ""
    preferred_language = body.get("preferred_language") or body.get("language")
    lang = detect_language(last_user_msg, preferred_language)

    # 0. Enforce strict Closed-Domain restriction: reject general knowledge questions
    if not is_project_relevant(last_user_msg):
        refusal_text = REFUSAL_MESSAGES.get(lang, REFUSAL_MESSAGES["en"])
        def generate_refusal():
            yield f"data: {json.dumps({'choices': [{'delta': {'content': refusal_text}}]})}\n\n"
            yield "data: [DONE]\n\n"
            mid = str(uuid.uuid4())
            try:
                execute(
                    "INSERT INTO chat_messages (id, role, content, user_id, session_id) VALUES (%s, %s, %s, %s, %s)",
                    (mid, "assistant", refusal_text, current_user_id, session_id),
                )
            except Exception:
                pass
        return Response(stream_with_context(generate_refusal()), content_type="text/event-stream; charset=utf-8")

    # 1. Retrieve project context strictly from MySQL database with authorization
    project_context, err_msg, is_unauthorized = get_mysql_project_context(user, last_user_msg, selected_shop_id)

    if is_unauthorized or err_msg:
        def generate_auth_error():
            yield f"data: {json.dumps({'choices': [{'delta': {'content': err_msg}}]})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(generate_auth_error()), content_type="text/event-stream; charset=utf-8", status=403 if is_unauthorized else 200)

    # 2. Call Gemini API with grounded PROJECT_CONTEXT
    LANGUAGE_NAMES = {
        "te": "Telugu (తెలుగు)",
        "hi": "Hindi (हिंदी)",
        "ta": "Tamil (தமிழ்)",
        "gu": "Gujarati (ગુજરાતી)",
        "kn": "Kannada (ಕನ್ನಡ)",
        "ml": "Malayalam (മലയാളം)",
        "mr": "Marathi (मराठी)",
        "bn": "Bengali (বাংলা)",
        "en": "English"
    }

    target_lang_name = LANGUAGE_NAMES.get(lang, "the user's language")

    prompt_text = (
        f"You are a strictly Closed-Domain AI Assistant for Profit Navigator.\n\n"
        f"MANDATORY LANGUAGE RULE: You MUST write your complete response ONLY in {target_lang_name} using its native script.\n"
        f"DO NOT respond in English unless the target language is English.\n"
        f"Translate all numbers, business metrics, and insights fluently into {target_lang_name}.\n"
        f"Preserve currency amounts with ₹ symbol.\n\n"
        f"{project_context}\n\n"
        f"USER QUESTION: {last_user_msg}\n\n"
        f"REPLY INSTRUCTION: Provide a direct, concise, and helpful answer in 1 to 3 sentences written entirely in {target_lang_name} native script based strictly on PROJECT_CONTEXT."
    )




    gemini_key = GEMINI_API_KEY
    candid_models = [
        GEMINI_MODEL,
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.6-flash",
        "gemma-4-26b-a4b-it",
    ]
    seen = set()
    model_list = []
    for m in candid_models:
        clean_m = m.replace("models/", "").strip()
        if clean_m and clean_m not in seen:
            seen.add(clean_m)
            model_list.append(clean_m)

    def generate():
        full_content = ""
        for m in model_list:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
            try:
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": prompt_text}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300}
                    },
                    timeout=15
                )

                if resp.status_code == 200:
                    res_data = resp.json()
                    candidates = res_data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            text = parts[0].get("text", "")
                            if text:
                                full_content = text
                                chunk_size = 18
                                for i in range(0, len(text), chunk_size):
                                    chunk = text[i:i + chunk_size]
                                    yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]})}\n\n"
                                yield "data: [DONE]\n\n"

                                # Save assistant message to MySQL database with current_user_id
                                mid = str(uuid.uuid4())
                                try:
                                    execute(
                                        "INSERT INTO chat_messages (id, role, content, user_id, session_id) VALUES (%s, %s, %s, %s, %s)",
                                        (mid, "assistant", full_content, current_user_id, session_id),
                                    )
                                except Exception:
                                    pass
                                return
            except Exception:
                continue

        # Fallback if all models fail
        refusal_text = REFUSAL_MESSAGES.get(lang, REFUSAL_MESSAGES["en"])
        full_content = refusal_text
        yield f"data: {json.dumps({'choices': [{'delta': {'content': refusal_text}}]})}\n\n"
        yield "data: [DONE]\n\n"

        mid = str(uuid.uuid4())
        try:
            execute(
                "INSERT INTO chat_messages (id, role, content, user_id, session_id) VALUES (%s, %s, %s, %s, %s)",
                (mid, "assistant", full_content, current_user_id, session_id),
            )
        except Exception:
            pass

    return Response(
        stream_with_context(generate()),
        content_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
