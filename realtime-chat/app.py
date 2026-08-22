import os
import sqlite3
import uuid
from datetime import datetime

from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key")

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

DATABASE = "chat.db"

# 현재 접속 중인 사용자
online_users = {}


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL,
            message TEXT NOT NULL,
            time TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def get_recent_messages(limit=100):
    conn = get_db()

    rows = conn.execute("""
        SELECT id, nickname, message, time
        FROM messages
        ORDER BY id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    conn.close()

    messages = [dict(row) for row in rows]
    messages.reverse()

    return messages


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/messages")
def messages():
    return jsonify(get_recent_messages())


@socketio.on("connect")
def handle_connect():
    user_id = str(uuid.uuid4())

    online_users[request_id()] = {
        "id": user_id,
        "nickname": "익명"
    }

    emit("connected", {
        "user_id": user_id,
        "online": len(online_users)
    })

    emit("online_count", {
        "count": len(online_users)
    }, broadcast=True)


@socketio.on("set_nickname")
def handle_nickname(data):
    nickname = str(data.get("nickname", "")).strip()

    if not nickname:
        nickname = "익명"

    # 너무 긴 닉네임 방지
    nickname = nickname[:20]

    sid = request_id()

    if sid in online_users:
        online_users[sid]["nickname"] = nickname

    emit("nickname_set", {
        "nickname": nickname
    })


@socketio.on("send_message")
def handle_message(data):
    message = str(data.get("message", "")).strip()
    nickname = str(data.get("nickname", "익명")).strip()

    if not message:
        return

    nickname = nickname[:20]
    message = message[:500]

    now = datetime.now().strftime("%H:%M")

    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO messages (nickname, message, time)
        VALUES (?, ?, ?)
    """, (nickname, message, now))

    message_id = cursor.lastrowid

    conn.commit()
    conn.close()

    payload = {
        "id": message_id,
        "nickname": nickname,
        "message": message,
        "time": now
    }

    emit("new_message", payload, broadcast=True)


@socketio.on("disconnect")
def handle_disconnect():
    sid = request_id()

    if sid in online_users:
        del online_users[sid]

    emit("online_count", {
        "count": len(online_users)
    }, broadcast=True)


def request_id():
    """
    Socket.IO의 현재 연결 ID를 가져옵니다.
    """
    from flask import request
    return request.sid


if __name__ == "__main__":
    init_db()

    port = int(os.environ.get("PORT", 5000))

    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=True
    )