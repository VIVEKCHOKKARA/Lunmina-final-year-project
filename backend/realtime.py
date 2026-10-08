"""
Real-time layer — shared Flask-SocketIO instance.

Kept in its own module to avoid circular imports: routes import `socketio`
from here, and app.py initialises it with the Flask app.

Uses async_mode="threading" so it runs on the standard Werkzeug dev server
(no eventlet/gevent needed) — simplest setup on Windows.
"""
from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def emit_change(resource: str, action: str = "update", payload: dict | None = None):
    """
    Broadcast a data change to all connected clients.

    Frontend listens for the "data_changed" event and refetches the
    affected resource (transactions, products, pricing, tutorials, visibility).
    """
    data = {"resource": resource, "action": action}
    if payload:
        data.update(payload)
    try:
        socketio.emit("data_changed", data)
    except Exception:
        # Never let a websocket emit failure break an API request.
        pass
