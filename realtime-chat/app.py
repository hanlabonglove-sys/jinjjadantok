import os
import sqlite3
from datetime import datetime

from flask import Flask, render_template, jsonify, send_from_directory, request
from flask_socketio import SocketIO, emit


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


DB_FILE = "chat.db"

# Render 환경변수에서 관리자 비밀번호를 가져옴
ADMIN_PASSWORD = os.environ.get(
    "ADMIN_PASSWORD",
    "change-this-password"
)

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
# 메인
# ==========================================

@app.route("/")
def index():

    return render_template("index.html")


# ==========================================
# 이전 메시지
# ==========================================

@app.route("/api/messages")
def messages():

    conn = get_db()

    rows = conn.execute("""
        SELECT id, nickname, message, time
        FROM messages
        ORDER BY id ASC
        LIMIT 100
    """).fetchall()

    conn.close()

    return jsonify([
        {
            "id": row["id"],
            "nickname": row["nickname"],
            "message": row["message"],
            "time": row["time"]
        }
        for row in rows
    ])


# ==========================================
# robots.txt
# ==========================================

@app.route("/robots.txt")
def robots():

    return send_from_directory(
        "static",
        "robots.txt"
    )


# ==========================================
# sitemap.xml
# ==========================================

@app.route("/sitemap.xml")
def sitemap():

    return send_from_directory(
        "static",
        "sitemap.xml"
    )


# ==========================================
# Google Search Console
# ==========================================

# Google HTML 인증을 사용하지 않으므로
# 별도 라우트는 필요 없음.


# ==========================================
# 접속
# ==========================================

@socketio.on("connect")
def handle_connect():

    sid = request.sid

    online_users[sid] = "익명"

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

    sid = request.sid

    if sid in online_users:
        del online_users[sid]

    socketio.emit(
        "online_count",
        {
            "count": len(online_users)
        }
    )


# ==========================================
# 닉네임
# ==========================================

@socketio.on("set_nickname")
def set_nickname(data):

    nickname = str(
        data.get("nickname", "익명")
    ).strip()

    if not nickname:
        nickname = "익명"

    nickname = nickname[:20]

    online_users[request.sid] = nickname


    emit(
        "nickname_saved",
        {
            "nickname": nickname
        }
    )


    socketio.emit(
        "online_count",
        {
            "count": len(online_users)
        }
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


    # ======================================
    # 욕설 필터
    # ======================================

    banned_words = [
        "씨발",
        "시발",
        "병신",
        "좆",
        "개새끼",
        "ㅅㅂ",
        "ㅄ",
        "fuck",
        "shit"
    ]


    filtered_message = message

    for word in banned_words:

        filtered_message = filtered_message.replace(
            word,
            "*" * len(word)
        )


    # ======================================
    # 시간
    # ======================================

    now = datetime.now().strftime(
        "%Y-%m-%d %H:%M"
    )


    # ======================================
    # DB 저장
    # ======================================

    conn = get_db()

    cursor = conn.execute(
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

    message_id = cursor.lastrowid

    conn.commit()
    conn.close()


    # ======================================
    # 모든 사용자에게 전송
    # ======================================

    socketio.emit(
        "new_message",
        {
            "id": message_id,
            "nickname": nickname,
            "message": filtered_message,
            "time": now
        }
    )


# ==========================================
# 관리자 로그인
# ==========================================

@socketio.on("admin_login")
def admin_login(data):

    password = str(
        data.get("password", "")
    )


    if password == ADMIN_PASSWORD:

        emit(
            "admin_login_result",
            {
                "success": True
            }
        )

    else:

        emit(
            "admin_login_result",
            {
                "success": False
            }
        )


# ==========================================
# 관리자 메시지 삭제
# ==========================================

@socketio.on("delete_message")
def delete_message(data):

    password = str(
        data.get("password", "")
    )

    message_id = data.get("id")


    # 관리자 비밀번호 확인
    if password != ADMIN_PASSWORD:
        return


    try:

        message_id = int(message_id)

    except (TypeError, ValueError):

        return


    conn = get_db()

    cursor = conn.execute(
        """
        DELETE FROM messages
        WHERE id = ?
        """,
        (message_id,)
    )

    deleted = cursor.rowcount > 0

    conn.commit()
    conn.close()


    if not deleted:
        return


    # 모든 사람에게 삭제 알림
    socketio.emit(
        "message_deleted",
        {
            "id": message_id
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
