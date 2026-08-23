import os
import sqlite3
from datetime import datetime

from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit


# ==========================================
# Flask
# ==========================================

app = Flask(__name__)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "jinjjadantok-secret-key"
)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)


# ==========================================
# 설정
# ==========================================

DB_FILE = "chat.db"

online_users = {}


# ==========================================
# DB
# ==========================================

def get_db():

    conn = sqlite3.connect(
        DB_FILE,
        check_same_thread=False
    )

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


init_db()


# ==========================================
# 메인 페이지
# ==========================================

@app.route("/")
def index():

    return render_template(
        "index.html"
    )


# ==========================================
# 이전 메시지
# ==========================================

@app.route("/api/messages")
def get_messages():

    conn = get_db()

    rows = conn.execute("""
        SELECT
            nickname,
            message,
            time
        FROM messages
        ORDER BY id ASC
        LIMIT 100
    """).fetchall()

    conn.close()

    result = []

    for row in rows:

        result.append({
            "nickname": row["nickname"],
            "message": row["message"],
            "time": row["time"]
        })

    return jsonify(result)


# ==========================================
# robots.txt
# ==========================================

@app.route("/robots.txt")
def robots():

    return app.send_static_file(
        "robots.txt"
    )


# ==========================================
# sitemap.xml
# ==========================================

@app.route("/sitemap.xml")
def sitemap():

    return app.send_static_file(
        "sitemap.xml"
    )


# ==========================================
# 닉네임 설정
# ==========================================

@socketio.on("set_nickname")
def set_nickname(data):

    nickname = str(
        data.get("nickname", "익명")
    ).strip()

    if not nickname:

        nickname = "익명"

    nickname = nickname[:20]

    online_users[
        __import__("flask").request.sid
    ] = nickname

    emit(
        "online_count",
        {
            "count": len(online_users)
        },
        broadcast=True
    )


# ==========================================
# 메시지 전송
# ==========================================

@socketio.on("send_message")
def send_message(data):

    nickname = str(
        data.get("nickname", "익명")
    ).strip()

    message = str(
        data.get("message", "")
    ).strip()


    if not nickname:

        nickname = "익명"


    if not message:

        return


    nickname = nickname[:20]
    message = message[:500]


    # 기본적인 욕설 필터

    banned_words = [
        "씨발",
        "시발",
        "병신",
        "좆",
        "개새끼",
        "ㅅㅂ",
        "ㅄ"
    ]


    filtered_message = message

    for word in banned_words:

        filtered_message = filtered_message.replace(
            word,
            "*" * len(word)
        )


    now = datetime.now().strftime(
        "%Y-%m-%d %H:%M"
    )


    conn = get_db()

    conn.execute(
        """
        INSERT INTO messages
        (nickname, message, time)
        VALUES (?, ?, ?)
        """,
        (
            nickname,
            filtered_message,
            now
        )
    )

    conn.commit()
    conn.close()


    new_message = {

        "nickname": nickname,

        "message": filtered_message,

        "time": now
    }


    socketio.emit(
        "new_message",
        new_message
    )


# ==========================================
# 접속
# ==========================================

@socketio.on("connect")
def handle_connect():

    sid = __import__("flask").request.sid

    online_users[sid] = "익명"


    emit(
        "connected",
        {
            "online": len(online_users)
        }
    )


    emit(
        "online_count",
        {
            "count": len(online_users)
        },
        broadcast=True
    )


# ==========================================
# 접속 종료
# ==========================================

@socketio.on("disconnect")
def handle_disconnect():

    sid = __import__("flask").request.sid

    if sid in online_users:

        del online_users[sid]


    socketio.emit(
        "online_count",
        {
            "count": len(online_users)
        }
    )


# ==========================================
# 실행
# ==========================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            10000
        )
    )

    socketio.run(
        app,
        host="0.0.0.0",
        port=port
    )
