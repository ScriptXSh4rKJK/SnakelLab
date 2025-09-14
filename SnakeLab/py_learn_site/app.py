# moved password reset helpers/routes below after app initialization
from flask import Flask, render_template, request, redirect, url_for, session, g, flash
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime
import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from datetime import timedelta
import smtplib
from email.message import EmailMessage

# Flask application factory
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev_secret")
# Cookie/security flags
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    # In dev/local HTTP, do not set Secure so cookies are accepted by the browser
    SESSION_COOKIE_SECURE=True if os.environ.get("SESSION_SECURE", "0") == "1" else False,
    PERMANENT_SESSION_LIFETIME=timedelta(days=int(os.environ.get("SESSION_DAYS", "14"))),
)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# CSRF protection
csrf = CSRFProtect(app)

# Rate limiting
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour"])  # global sane default

def ts() -> str:
    return datetime.utcnow().isoformat() + "Z"

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
            provider TEXT NOT NULL,        -- 'local'
            email TEXT,
            password_hash TEXT,
            provider_id TEXT,              -- legacy
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
@limiter.limit("10/minute")
@csrf.exempt
def auth_local():
    # Simple local sign-in/sign-up: stores password hash locally in SQLite
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    mode = request.form.get("mode") or "login"  # 'login' | 'register'
    remember = (request.form.get("remember") == "on")
    confirm = request.form.get("confirm") or ""
    if not email or not password:
        return ("Missing email or password", 400)
    if mode == "register":
        if len(password) < 6:
            return ("Password must be at least 6 characters", 400)
        if confirm != password:
            return ("Passwords do not match", 400)
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE provider='local' AND email=?", (email,))
    row = cur.fetchone()
    if mode == "register":
        if row:
            return ("User exists", 400)
        db.execute(
            "INSERT INTO users(provider,email,password_hash,display,created_at) VALUES (?,?,?,?,?)",
            ("local", email, generate_password_hash(password), email.split("@")[0], ts()),
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
    session.permanent = True if remember else False
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

# ---- Password reset flow ----
def signer():
    return URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="pwd-reset")

def send_mail(to_email: str, subject: str, body: str):
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    pwd = os.environ.get("SMTP_PASS")
    sender = os.environ.get("SMTP_FROM", user or "no-reply@example.com")
    if not host or not user or not pwd:
        print("[MAIL] To:", to_email)
        print("[MAIL] Subject:", subject)
        print("[MAIL] Body:\n", body)
        return
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(host, port) as s:
        s.starttls()
        s.login(user, pwd)
        s.send_message(msg)


@app.route("/forgot", methods=["GET", "POST"]) 
@limiter.limit("5/hour")
@csrf.exempt
def forgot_password():
    if request.method == "GET":
        return render_template("forgot.html")
    email = (request.form.get("email") or "").strip().lower()
    if not email:
        return ("Missing email", 400)
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE provider='local' AND email=?", (email,))
    row = cur.fetchone()
    # Always respond success to avoid user enumeration
    if row:
        token = signer().dumps({"email": email})
        reset_url = url_for("reset_password", token=token, _external=True)
        send_mail(email, "Password reset", f"Reset your password: {reset_url}\nThis link is valid for 1 hour.")
    return redirect(url_for("login_page"))


@app.route("/reset/<token>", methods=["GET", "POST"]) 
@limiter.limit("10/hour")
@csrf.exempt
def reset_password(token: str):
    if request.method == "GET":
        return render_template("reset.html", token=token)
    password = request.form.get("password") or ""
    confirm = request.form.get("confirm") or ""
    if len(password) < 6 or password != confirm:
        return ("Invalid password or mismatch", 400)
    try:
        data = signer().loads(token, max_age=3600)
        email = (data or {}).get("email")
    except (BadSignature, SignatureExpired):
        return ("Invalid or expired token", 400)
    db = get_db()
    db.execute("UPDATE users SET password_hash=? WHERE provider='local' AND email=?", (generate_password_hash(password), email))
    db.commit()
    return redirect(url_for("login_page"))


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


@socketio.on("latency_ping")
def on_latency(data):
    # Echo back timestamp for client to measure latency
    t = data.get("t") if isinstance(data, dict) else None
    emit("latency_pong", {"t": t}, to=request.sid)


if __name__ == "__main__":
    # Run with Werkzeug in dev (threading long-polling)
    debug_flag = os.environ.get("FLASK_DEBUG", "0") == "1"
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=debug_flag, allow_unsafe_werkzeug=True)
