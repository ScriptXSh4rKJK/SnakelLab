from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime
import os

# Flask application factory
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev_secret")

# Socket.IO for global chat (use threading mode to avoid eventlet issues on Python 3.13)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# In-memory chat history (simple persistence for dev)
MESSAGES = []  # list[dict]
MAX_MESSAGES = 500


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/app")
def app_page():
    return render_template("index.html")


@socketio.on("connect")
def handle_connect():
    emit("system", {"text": "Connected to server", "ts": datetime.utcnow().isoformat() + "Z"})


@socketio.on("join")
def on_join(data):
    # one global room
    room = "global"
    join_room(room)
    username = (data or {}).get("username") or "guest"
    display = (data or {}).get("display") or username
    avatar = (data or {}).get("avatar")
    # send history to the newly joined client (no join announcement)
    emit("history", MESSAGES)


@socketio.on("message")
def on_message(data):
    room = "global"
    text = (data or {}).get("text", "")
    username = (data or {}).get("username") or "guest"
    display = (data or {}).get("display") or username
    avatar = (data or {}).get("avatar")
    msg = {
        "username": username,
        "display": display,
        "text": text,
        "ts": datetime.utcnow().isoformat() + "Z",
        "avatar": avatar,
    }
    # store and trim
    MESSAGES.append(msg)
    if len(MESSAGES) > MAX_MESSAGES:
        del MESSAGES[: len(MESSAGES) - MAX_MESSAGES]
    emit(
        "chat",
        msg,
        to=room,
    )


if __name__ == "__main__":
    # Run with Werkzeug in dev (threading long-polling)
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True, allow_unsafe_werkzeug=True)
