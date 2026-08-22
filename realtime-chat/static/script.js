const socket = io();

const messages = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const nicknameModal = document.getElementById("nicknameModal");
const nicknameForm = document.getElementById("nicknameForm");
const nicknameInput = document.getElementById("nicknameInput");

const onlineCount = document.getElementById("onlineCount");


let nickname = localStorage.getItem("chat_nickname");

let myUserId = null;


/* -------------------------
   닉네임
------------------------- */

if (nickname) {
    nicknameModal.classList.add("hidden");
} else {
    nicknameModal.classList.remove("hidden");
    nicknameInput.focus();
}


nicknameForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const value = nicknameInput.value.trim();

    if (!value) {
        nicknameInput.focus();
        return;
    }

    nickname = value.substring(0, 20);

    localStorage.setItem(
        "chat_nickname",
        nickname
    );

    socket.emit("set_nickname", {
        nickname: nickname
    });

    nicknameModal.classList.add("hidden");

    messageInput.focus();
});


/* -------------------------
   서버 연결
------------------------- */

socket.on("connected", function (data) {

    myUserId = data.user_id;

    onlineCount.textContent = data.online;

    if (nickname) {
        socket.emit("set_nickname", {
            nickname: nickname
        });
    }

    loadMessages();
});


/* -------------------------
   접속자 수
------------------------- */

socket.on("online_count", function (data) {

    onlineCount.textContent = data.count;

});


/* -------------------------
   이전 메시지
------------------------- */

async function loadMessages() {

    try {

        const response = await fetch("/api/messages");

        const data = await response.json();

        messages.innerHTML = "";

        data.forEach(function (message) {
            addMessage(message);
        });

        scrollToBottom();

    } catch (error) {

        console.error(
            "메시지를 불러오지 못했습니다.",
            error
        );

    }
}


/* -------------------------
   새 메시지
------------------------- */

socket.on("new_message", function (message) {

    addMessage(message);

    scrollToBottom();

});


/* -------------------------
   메시지 추가
------------------------- */

function addMessage(message) {

    const wrapper = document.createElement("div");

    const isMine =
        message.nickname === nickname;

    wrapper.className =
        "message " +
        (isMine ? "mine" : "other");


    const nicknameElement =
        document.createElement("div");

    nicknameElement.className = "nickname";

    nicknameElement.textContent =
        message.nickname;


    const bubble =
        document.createElement("div");

    bubble.className = "bubble";

    // textContent를 사용해서 HTML 삽입 공격 방지
    bubble.textContent =
        message.message;


    const time =
        document.createElement("div");

    time.className = "time";

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


    messages.appendChild(wrapper);
}


/* -------------------------
   메시지 보내기
------------------------- */

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


/* -------------------------
   자동 스크롤
------------------------- */

function scrollToBottom() {

    const chat =
        document.querySelector(".chat");

    chat.scrollTop =
        chat.scrollHeight;
}