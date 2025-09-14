from flask import Flask, render_template, request, redirect, url_for, session, g
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime
import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth
from werkzeug.middleware.proxy_fix import ProxyFix

# Flask application factory
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev_secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

# OAuth (Google)
oauth = OAuth(app)
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

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

# ---- Auth & DB ----
DB_PATH = os.path.join(os.path.dirname(__file__), "auth.db")

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,        -- 'local' | 'google'
            email TEXT,
            password_hash TEXT,
            provider_id TEXT,              -- google sub/id
            display TEXT,
            created_at TEXT
        )
        """
    )
    db.commit()

@app.before_request
def ensure_db():
    init_db()

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

@app.route("/auth/local", methods=["POST"]) 
def auth_local():
    # Simple local sign-in/sign-up: stores password hash locally in SQLite
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    mode = request.form.get("mode") or "login"  # 'login' | 'register'
    if not email or not password:
        return ("Missing email or password", 400)
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE provider='local' AND email=?", (email,))
    row = cur.fetchone()
    if mode == "register":
        if row:
            return ("User exists", 400)
        db.execute(
            "INSERT INTO users(provider,email,password_hash,display,created_at) VALUES (?,?,?,?,?)",
            ("local", email, generate_password_hash(password), email.split("@")[0], datetime.utcnow().isoformat()+"Z"),
        )
        db.commit()
    else:
        if not row or not check_password_hash(row["password_hash"], password):
            return ("Invalid credentials", 401)
    # set session
    if not row:
        cur = db.execute("SELECT * FROM users WHERE provider='local' AND email=?", (email,))
        row = cur.fetchone()
    session["uid"] = row["id"]
    session["provider"] = row["provider"]
    session["display"] = row["display"]
    session["email"] = row["email"]
    return redirect(url_for("app_page") + "?theme=navy")

@app.route("/auth/google")
def auth_google_start():
    if "google" not in oauth._clients:
        return ("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.", 500)
    # Build absolute redirect URI with explicit https to avoid proxy scheme issues
    # Example: https://<host>/auth/google/callback
    callback_path = url_for("auth_google_callback", _external=False)
    redirect_uri = f"https://{request.host}{callback_path}"
    return oauth.google.authorize_redirect(redirect_uri)

@app.route("/auth/google/callback")
def auth_google_callback():
    if "google" not in oauth._clients:
        return ("Google OAuth is not configured.", 500)
    token = oauth.google.authorize_access_token()
    # Try to read user info (OpenID Connect)
    userinfo = token.get("userinfo")
    if not userinfo:
        # Fallback to userinfo endpoint
        userinfo = oauth.google.parse_id_token(token)
    if not userinfo:
        return ("Failed to retrieve Google user info", 400)

    google_sub = userinfo.get("sub") or ""
    email = (userinfo.get("email") or "").lower().strip()
    display = (userinfo.get("name") or (email.split("@")[0] if email else ""))
    if not email:
        return ("Google account has no email", 400)

    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE provider='google' AND email=?", (email,))
    row = cur.fetchone()
    if not row:
        db.execute(
            "INSERT INTO users(provider,email,provider_id,display,created_at) VALUES (?,?,?,?,?)",
            ("google", email, google_sub, display, datetime.utcnow().isoformat()+"Z"),
        )
        db.commit()
        cur = db.execute("SELECT * FROM users WHERE provider='google' AND email=?", (email,))
        row = cur.fetchone()
    session["uid"] = row["id"]
    session["provider"] = row["provider"]
    session["display"] = row["display"]
    session["email"] = row["email"]
    return redirect(url_for("app_page") + "?theme=navy")

@app.route("/api/me")
def api_me():
    if "uid" not in session:
        return {"auth": False}
    return {
        "auth": True,
        "uid": session.get("uid"),
        "provider": session.get("provider"),
        "display": session.get("display"),
        "email": session.get("email"),
    }


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
