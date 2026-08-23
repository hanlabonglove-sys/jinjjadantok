/* =========================
   Socket.IO 연결
========================= */

const socket = io({
    transports: ["polling", "websocket"]
});


/* =========================
   HTML 요소
========================= */

const messages =
    document.getElementById("messages");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const nicknameModal =
    document.getElementById("nicknameModal");

const nicknameForm =
    document.getElementById("nicknameForm");

const nicknameInput =
    document.getElementById("nicknameInput");

const changeNicknameModal =
    document.getElementById("changeNicknameModal");

const changeNicknameForm =
    document.getElementById("changeNicknameForm");

const changeNicknameInput =
    document.getElementById("changeNicknameInput");

const nicknameButton =
    document.getElementById("nicknameButton");

const currentNickname =
    document.getElementById("currentNickname");

const onlineCount =
    document.getElementById("onlineCount");


/* =========================
   상태
========================= */

let nickname =
    localStorage.getItem("chat_nickname") || "";

let connected = false;


/* =========================
   닉네임 표시
========================= */

function updateNicknameDisplay() {

    currentNickname.textContent =
        nickname || "익명";
}


/* 처음 표시 */

updateNicknameDisplay();


/* =========================
   최초 닉네임
========================= */

if (nickname) {

    nicknameModal.classList.add("hidden");

} else {

    nicknameModal.classList.remove("hidden");

    setTimeout(function () {

        nicknameInput.focus();

    }, 300);
}


/* =========================
   최초 닉네임 등록
========================= */

nicknameForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const value =
            nicknameInput.value.trim();

        if (!value) {

            nicknameInput.focus();

            return;
        }

        nickname =
            value.substring(0, 20);

        localStorage.setItem(
            "chat_nickname",
            nickname
        );

        updateNicknameDisplay();


        if (connected) {

            socket.emit(
                "set_nickname",
                {
                    nickname: nickname
                }
            );
        }


        nicknameModal.classList.add(
            "hidden"
        );

        messageInput.focus();
    }
);


/* =========================
   닉네임 변경 버튼
========================= */

nicknameButton.addEventListener(
    "click",
    function () {

        changeNicknameInput.value =
            nickname;

        changeNicknameModal.classList.remove(
            "hidden"
        );

        setTimeout(function () {

            changeNicknameInput.focus();

            changeNicknameInput.select();

        }, 50);
    }
);


/* =========================
   닉네임 변경
========================= */

changeNicknameForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const newNickname =
            changeNicknameInput.value.trim();

        if (!newNickname) {

            changeNicknameInput.focus();

            return;
        }

        nickname =
            newNickname.substring(0, 20);


        localStorage.setItem(
            "chat_nickname",
            nickname
        );


        updateNicknameDisplay();


        if (connected) {

            socket.emit(
                "set_nickname",
                {
                    nickname: nickname
                }
            );
        }


        changeNicknameModal.classList.add(
            "hidden"
        );

        messageInput.focus();
    }
);


/* =========================
   Socket.IO 연결
========================= */

socket.on(
    "connect",
    function () {

        connected = true;

        console.log(
            "Socket.IO connected:",
            socket.id
        );


        if (nickname) {

            socket.emit(
                "set_nickname",
                {
                    nickname: nickname
                }
            );
        }


        loadMessages();
    }
);


/* =========================
   연결 종료
========================= */

socket.on(
    "disconnect",
    function () {

        connected = false;

        console.log(
            "Socket.IO disconnected"
        );
    }
);


/* =========================
   연결 오류
========================= */

socket.on(
    "connect_error",
    function (error) {

        console.error(
            "Socket.IO connection error:",
            error
        );
    }
);


/* =========================
   연결 완료
========================= */

socket.on(
    "connected",
    function (data) {

        onlineCount.textContent =
            data.online;
    }
);


/* =========================
   접속자 수
========================= */

socket.on(
    "online_count",
    function (data) {

        onlineCount.textContent =
            data.count;
    }
);


/* =========================
   이전 채팅 불러오기
========================= */

async function loadMessages() {

    try {

        const response =
            await fetch("/api/messages");

        if (!response.ok) {

            throw new Error(
                "메시지 요청 실패"
            );
        }


        const data =
            await response.json();


        messages.innerHTML = "";


        data.forEach(
            function (message) {

                addMessage(message);
            }
        );


        scrollToBottom();

    } catch (error) {

        console.error(
            "메시지를 불러오지 못했습니다:",
            error
        );
    }
}


/* =========================
   실시간 메시지
========================= */

socket.on(
    "new_message",
    function (message) {

        addMessage(message);

        scrollToBottom();
    }
);


/* =========================
   메시지 표시
========================= */

function addMessage(message) {

    const wrapper =
        document.createElement("div");


    const isMine =
        message.nickname === nickname;


    wrapper.className =
        "message " +
        (
            isMine
                ? "mine"
                : "other"
        );


    /* 닉네임 */

    const nicknameElement =
        document.createElement("div");

    nicknameElement.className =
        "nickname";

    nicknameElement.textContent =
        message.nickname;


    /* 메시지 */

    const bubble =
        document.createElement("div");

    bubble.className =
        "bubble";

    /*
       textContent를 사용하기 때문에
       사용자가 HTML/스크립트를 입력해도
       코드로 실행되지 않음
    */

    bubble.textContent =
        message.message;


    /* 시간 */

    const time =
        document.createElement("div");

    time.className =
        "time";

    time.textContent =
        message.time;


    wrapper.appendChild(
        nicknameElement
    );

    wrapper.appendChild(
        bubble
    );

    wrapper.appendChild(
        time
    );


    messages.appendChild(
        wrapper
    );
}


/* =========================
   메시지 전송
========================= */

messageForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const message =
            messageInput.value.trim();


        if (!message) {

            return;
        }


        if (!nickname) {

            nicknameModal.classList.remove(
                "hidden"
            );

            return;
        }


        if (!connected) {

            alert(
                "서버와 연결되지 않았습니다."
            );

            return;
        }


        socket.emit(
            "send_message",
            {
                nickname: nickname,
                message: message
            }
        );


        messageInput.value = "";

        messageInput.focus();
    }
);


/* =========================
   Enter로 전송
========================= */

messageInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            messageForm.requestSubmit();
        }
    }
);


/* =========================
   모달 바깥 클릭
========================= */

changeNicknameModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            changeNicknameModal
        ) {

            changeNicknameModal.classList.add(
                "hidden"
            );

            messageInput.focus();
        }
    }
);


/* =========================
   ESC로 닫기
========================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key !== "Escape") {
            return;
        }


        if (
            !changeNicknameModal.classList.contains(
                "hidden"
            )
        ) {

            changeNicknameModal.classList.add(
                "hidden"
            );

            messageInput.focus();
        }
    }
);


/* =========================
   자동 스크롤
========================= */

function scrollToBottom() {

    const chat =
        document.querySelector(".chat");


    chat.scrollTop =
        chat.scrollHeight;
}