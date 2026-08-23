const socket = io();


let nickname =
    localStorage.getItem("nickname") || "";


let adminPassword =
    sessionStorage.getItem("adminPassword") || "";


let isAdmin =
    adminPassword !== "";



const messages =
    document.getElementById("messages");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const onlineCount =
    document.getElementById("onlineCount");

const currentNickname =
    document.getElementById("currentNickname");



const nicknameModal =
    document.getElementById("nicknameModal");

const nicknameForm =
    document.getElementById("nicknameForm");

const nicknameInput =
    document.getElementById("nicknameInput");



const changeNicknameModal =
    document.getElementById(
        "changeNicknameModal"
    );

const changeNicknameForm =
    document.getElementById(
        "changeNicknameForm"
    );

const changeNicknameInput =
    document.getElementById(
        "changeNicknameInput"
    );



const adminButton =
    document.getElementById(
        "adminButton"
    );

const adminModal =
    document.getElementById(
        "adminModal"
    );

const adminForm =
    document.getElementById(
        "adminForm"
    );

const adminPasswordInput =
    document.getElementById(
        "adminPassword"
    );

const adminStatus =
    document.getElementById(
        "adminStatus"
    );



/* ==========================================
   NICKNAME UI
========================================== */

function updateNicknameUI() {

    currentNickname.textContent =
        nickname || "익명";
}



/* ==========================================
   FIRST NICKNAME
========================================== */

if (!nickname) {

    nicknameModal.classList.remove(
        "hidden"
    );

} else {

    nicknameModal.classList.add(
        "hidden"
    );

    updateNicknameUI();


    socket.emit(
        "set_nickname",
        {
            nickname: nickname
        }
    );
}



/* ==========================================
   NICKNAME FORM
========================================== */

nicknameForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const value =
            nicknameInput.value.trim();


        if (!value) {
            return;
        }


        nickname =
            value.substring(
                0,
                20
            );


        localStorage.setItem(
            "nickname",
            nickname
        );


        updateNicknameUI();


        socket.emit(
            "set_nickname",
            {
                nickname: nickname
            }
        );


        nicknameModal.classList.add(
            "hidden"
        );


        messageInput.focus();

    }
);



/* ==========================================
   CHANGE NICKNAME
========================================== */

document
    .getElementById(
        "nicknameButton"
    )
    .addEventListener(
        "click",
        function() {

            changeNicknameInput.value =
                nickname;


            changeNicknameModal.classList.remove(
                "hidden"
            );


            changeNicknameInput.focus();

        }
    );



changeNicknameForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const value =
            changeNicknameInput.value.trim();


        if (!value) {
            return;
        }


        nickname =
            value.substring(
                0,
                20
            );


        localStorage.setItem(
            "nickname",
            nickname
        );


        updateNicknameUI();


        socket.emit(
            "set_nickname",
            {
                nickname: nickname
            }
        );


        changeNicknameModal.classList.add(
            "hidden"
        );

    }
);



/* ==========================================
   SEND MESSAGE
========================================== */

messageForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const message =
            messageInput.value.trim();


        if (!message) {
            return;
        }


        socket.emit(
            "send_message",
            {
                nickname:
                    nickname || "익명",

                message:
                    message
            }
        );


        messageInput.value = "";

        messageInput.focus();

    }
);



/* ==========================================
   ADD MESSAGE
========================================== */

function addMessage(data) {

    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        "message";


    messageElement.dataset.id =
        data.id;



    const top =
        document.createElement(
            "div"
        );


    top.className =
        "message-top";



    const name =
        document.createElement(
            "strong"
        );


    name.textContent =
        data.nickname;



    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        data.time;



    top.appendChild(
        name
    );


    top.appendChild(
        time
    );



    const text =
        document.createElement(
            "div"
        );


    text.className =
        "message-text";


    text.textContent =
        data.message;



    messageElement.appendChild(
        top
    );


    messageElement.appendChild(
        text
    );



    /* 관리자 삭제 버튼 */

    if (isAdmin) {

        addDeleteButton(
            messageElement,
            data.id
        );

    }



    messages.appendChild(
        messageElement
    );


    messages.scrollTop =
        messages.scrollHeight;
}



/* ==========================================
   DELETE BUTTON
========================================== */

function addDeleteButton(
    messageElement,
    messageId
) {

    if (
        messageElement.querySelector(
            ".delete-button"
        )
    ) {

        return;
    }


    const button =
        document.createElement(
            "button"
        );


    button.className =
        "delete-button";


    button.textContent =
        "삭제";


    button.type =
        "button";


    /*
     * 확인창 없음.
     * 클릭하면 바로 삭제 요청.
     */

    button.addEventListener(
        "click",
        function() {

            if (!isAdmin) {
                return;
            }


            socket.emit(
                "delete_message",
                {
                    id:
                        messageId,

                    password:
                        adminPassword
                }
            );

        }
    );


    messageElement.appendChild(
        button
    );
}



/* ==========================================
   NEW MESSAGE
========================================== */

socket.on(
    "new_message",
    function(data) {

        addMessage(
            data
        );

    }
);



/* ==========================================
   DELETE MESSAGE
========================================== */

socket.on(
    "message_deleted",
    function(data) {

        const element =
            document.querySelector(
                `.message[data-id="${data.id}"]`
            );


        if (element) {

            element.remove();

        }

    }
);



/* ==========================================
   LOAD OLD MESSAGES
========================================== */

async function loadMessages() {

    try {

        const response =
            await fetch(
                "/api/messages"
            );


        const data =
            await response.json();


        messages.innerHTML =
            "";


        data.forEach(
            function(message) {

                addMessage(
                    message
                );

            }
        );


    } catch (error) {

        console.error(
            "메시지 불러오기 실패:",
            error
        );

    }
}


loadMessages();



/* ==========================================
   ONLINE COUNT
========================================== */

socket.on(
    "online_count",
    function(data) {

        onlineCount.textContent =
            data.count;

    }
);



/* ==========================================
   ADMIN BUTTON
========================================== */

adminButton.addEventListener(
    "click",
    function() {

        adminModal.classList.remove(
            "hidden"
        );


        adminPasswordInput.focus();

    }
);



/* ==========================================
   ADMIN LOGIN
========================================== */

adminForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const password =
            adminPasswordInput.value;


        if (!password) {
            return;
        }


        socket.emit(
            "admin_login",
            {
                password:
                    password
            }
        );

    }
);



/* ==========================================
   ADMIN LOGIN RESULT
========================================== */

socket.on(
    "admin_login_result",
    function(data) {

        if (data.success) {

            isAdmin =
                true;


            adminPassword =
                adminPasswordInput.value;


            sessionStorage.setItem(
                "adminPassword",
                adminPassword
            );


            adminStatus.textContent =
                "관리자로 로그인되었습니다.";


            adminStatus.className =
                "admin-status success";


            adminModal.classList.add(
                "hidden"
            );


            /*
             * 이미 있는 메시지에도
             * 삭제 버튼 추가
             */

            document
                .querySelectorAll(
                    ".message"
                )
                .forEach(
                    function(element) {

                        addDeleteButton(
                            element,
                            element.dataset.id
                        );

                    }
                );


            adminPasswordInput.value =
                "";


        } else {

            adminStatus.textContent =
                "관리자 비밀번호가 틀렸습니다.";


            adminStatus.className =
                "admin-status error";

        }

    }
);
