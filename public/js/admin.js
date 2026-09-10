const loginSection =
    document.getElementById("loginSection");

const adminSection =
    document.getElementById("adminSection");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const logoutButton =
    document.getElementById("logoutButton");

const reports =
    document.getElementById("reports");

const adminPosts =
    document.getElementById("adminPosts");

const adminComments =
    document.getElementById("adminComments");


const TOKEN_KEY =
    "admin_token";


// =========================
// 토큰
// =========================

function getToken() {
    return localStorage.getItem(
        TOKEN_KEY
    );
}


function setToken(token) {
    localStorage.setItem(
        TOKEN_KEY,
        token
    );
}


function removeToken() {
    localStorage.removeItem(
        TOKEN_KEY
    );
}


// =========================
// API 요청
// =========================

async function api(
    url,
    options = {}
) {

    const token =
        getToken();


    const headers = {
        ...(options.headers || {})
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    if (
        options.body &&
        typeof options.body !==
            "string"
    ) {

        headers["Content-Type"] =
            "application/json";

        options.body =
            JSON.stringify(
                options.body
            );
    }


    const res =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    const text =
        await res.text();


    let data;


    try {

        data =
            JSON.parse(text);

    }

    catch {

        throw new Error(
            "서버 응답을 읽을 수 없습니다."
        );

    }


    if (
        res.status === 401
    ) {

        removeToken();

        showLogin();

        throw new Error(
            "관리자 로그인이 필요합니다."
        );

    }


    if (!res.ok) {

        throw new Error(
            data.error ||
            "요청에 실패했습니다."
        );

    }


    return data;
}


// =========================
// 로그인 화면
// =========================

function showLogin() {

    loginSection.classList.remove(
        "hidden"
    );

    adminSection.classList.add(
        "hidden"
    );

    logoutButton.style.display =
        "none";
}


// =========================
// 관리자 화면
// =========================

function showAdmin() {

    loginSection.classList.add(
        "hidden"
    );

    adminSection.classList.remove(
        "hidden"
    );

    logoutButton.style.display =
        "block";


    loadAll();

}


// =========================
// 로그인
// =========================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        loginMessage.textContent =
            "로그인 중...";


        const username =
            document
                .getElementById(
                    "username"
                )
                .value
                .trim();


        const password =
            document
                .getElementById(
                    "password"
                )
                .value;


        try {

            const data =
                await api(
                    "/api/admin?action=login",
                    {
                        method: "POST",
                        body: {
                            username,
                            password
                        }
                    }
                );


            setToken(
                data.token
            );


            loginMessage.textContent =
                "로그인 성공";


            showAdmin();

        }

        catch (error) {

            loginMessage.textContent =
                error.message;

        }

    }
);


// =========================
// 로그아웃
// =========================

logoutButton.addEventListener(
    "click",
    () => {

        removeToken();

        showLogin();

    }
);


// =========================
// 신고 불러오기
// =========================

async function loadReports() {

    reports.innerHTML =
        "불러오는 중...";


    try {

        const data =
            await api(
                "/api/admin?action=reports"
            );


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            reports.innerHTML =
                "<p>신고가 없습니다.</p>";

            return;
        }


        reports.innerHTML = "";


        data.forEach(report => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "admin-item";


            item.innerHTML = `
                <div>
                    <strong>
                        신고 #${report.id}
                    </strong>
                </div>

                <div>
                    게시글:
                    ${report.post_id ?? "-"}
                    · 댓글:
                    ${report.comment_id ?? "-"}
                </div>

                <div>
                    사유:
                    ${escapeHTML(
                        report.reason
                    )}
                </div>

                <div>
                    상태:
                    ${escapeHTML(
                        report.status
                    )}
                </div>

                <button
                    data-id="${report.id}"
                    data-status="resolved"
                    class="report-resolve"
                >
                    처리
                </button>

                <button
                    data-id="${report.id}"
                    data-status="ignored"
                    class="report-ignore"
                >
                    무시
                </button>
            `;


            reports.appendChild(item);

        });


        document
            .querySelectorAll(
                ".report-resolve, .report-ignore"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await changeReport(
                            button.dataset.id,
                            button.dataset.status
                        );

                    }
                );

            });

    }

    catch (error) {

        reports.innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;

    }
}


// =========================
// 신고 상태 변경
// =========================

async function changeReport(
    id,
    status
) {

    try {

        await api(
            `/api/admin?action=report&id=${id}`,
            {
                method: "PATCH",
                body: {
                    status
                }
            }
        );


        loadReports();

    }

    catch (error) {

        alert(
            error.message
        );

    }
}


// =========================
// 게시글 불러오기
// =========================

async function loadPosts() {

    adminPosts.innerHTML =
        "불러오는 중...";


    try {

        const data =
            await api(
                "/api/admin?action=posts"
            );


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            adminPosts.innerHTML =
                "<p>게시글이 없습니다.</p>";

            return;
        }


        adminPosts.innerHTML = "";


        data.forEach(post => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "admin-item";


            item.innerHTML = `
                <div>
                    <strong>
                        ${escapeHTML(
                            post.title
                        )}
                    </strong>
                </div>

                <div>
                    작성자:
                    ${escapeHTML(
                        post.author_name
                    )}
                </div>

                <div>
                    조회수:
                    ${post.views}
                </div>

                <div>
                    ${formatDate(
                        post.created_at
                    )}
                </div>

                <button
                    class="delete-post"
                    data-id="${post.id}"
                >
                    게시글 삭제
                </button>
            `;


            adminPosts.appendChild(
                item
            );

        });


        document
            .querySelectorAll(
                ".delete-post"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const ok =
                            confirm(
                                "이 게시글을 삭제할까요?"
                            );


                        if (!ok) {
                            return;
                        }


                        try {

                            await api(
                                `/api/admin?action=post&id=${button.dataset.id}`,
                                {
                                    method:
                                        "DELETE"
                                }
                            );


                            loadPosts();

                        }

                        catch (error) {

                            alert(
                                error.message
                            );

                        }

                    }
                );

            });

    }

    catch (error) {

        adminPosts.innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;

    }
}


// =========================
// 댓글 불러오기
// =========================

async function loadComments() {

    adminComments.innerHTML =
        "불러오는 중...";


    try {

        const data =
            await api(
                "/api/admin?action=comments"
            );


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            adminComments.innerHTML =
                "<p>댓글이 없습니다.</p>";

            return;
        }


        adminComments.innerHTML = "";


        data.forEach(comment => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "admin-item";


            item.innerHTML = `
                <div>
                    <strong>
                        댓글 #${comment.id}
                    </strong>
                </div>

                <div>
                    게시글:
                    ${comment.post_id}
                </div>

                <div>
                    작성자:
                    ${escapeHTML(
                        comment.author_name
                    )}
                </div>

                <div>
                    ${escapeHTML(
                        comment.content
                    )}
                </div>

                <div>
                    ${formatDate(
                        comment.created_at
                    )}
                </div>

                <button
                    class="delete-comment"
                    data-id="${comment.id}"
                >
                    댓글 삭제
                </button>
            `;


            adminComments.appendChild(
                item
            );

        });


        document
            .querySelectorAll(
                ".delete-comment"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const ok =
                            confirm(
                                "이 댓글을 삭제할까요?"
                            );


                        if (!ok) {
                            return;
                        }


                        try {

                            await api(
                                `/api/admin?action=comment&id=${button.dataset.id}`,
                                {
                                    method:
                                        "DELETE"
                                }
                            );


                            loadComments();

                        }

                        catch (error) {

                            alert(
                                error.message
                            );

                        }

                    }
                );

            });

    }

    catch (error) {

        adminComments.innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;

    }
}


// =========================
// 전체 불러오기
// =========================

async function loadAll() {

    await Promise.all([
        loadReports(),
        loadPosts(),
        loadComments()
    ]);

}


// =========================
// HTML escape
// =========================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


// =========================
// 날짜
// =========================

function formatDate(date) {

    return new Date(date)
        .toLocaleString(
            "ko-KR"
        );

}


// =========================
// 시작
// =========================

logoutButton.style.display =
    "none";


if (getToken()) {

    showAdmin();

} else {

    showLogin();

}
