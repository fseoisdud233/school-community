const loginSection =
    document.getElementById("loginSection");

const adminSection =
    document.getElementById("adminSection");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const tokenKey =
    "school_admin_token";

function token() {
    return sessionStorage.getItem(tokenKey);
}

function adminHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization":
            `Bearer ${token()}`
    };
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function login(username, password) {

    const response =
        await fetch(
            "/api/admin?action=login",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(data.error);
    }

    sessionStorage.setItem(
        tokenKey,
        data.token
    );
}

async function loadReports() {

    const response =
        await fetch(
            "/api/admin?action=reports",
            {
                headers: adminHeaders()
            }
        );

    if (response.status === 401) {
        logout();
        return;
    }

    const data =
        await response.json();

    const element =
        document.getElementById("reports");

    if (data.length === 0) {
        element.innerHTML =
            `<div class="empty">신고가 없습니다.</div>`;

        return;
    }

    element.innerHTML =
        data.map(report => `

            <div class="admin-item">

                <div>
                    <strong>
                        신고 #${report.id}
                    </strong>

                    <p>
                        대상:
                        ${
                            report.post_id
                                ? `게시글 #${report.post_id}`
                                : `댓글 #${report.comment_id}`
                        }
                    </p>

                    <p>
                        사유:
                        ${escapeHTML(report.reason)}
                    </p>

                    <p>
                        상태:
                        ${escapeHTML(report.status)}
                    </p>
                </div>

                <div class="admin-actions">

                    ${
                        report.post_id
                        ? `
                            <button
                                onclick="deleteAdminPost(
                                    ${report.post_id}
                                )"
                            >
                                게시글 삭제
                            </button>
                        `
                        : ""
                    }

                    ${
                        report.comment_id
                        ? `
                            <button
                                onclick="deleteAdminComment(
                                    ${report.comment_id}
                                )"
                            >
                                댓글 삭제
                            </button>
                        `
                        : ""
                    }

                    <button
                        onclick="resolveReport(
                            ${report.id}
                        )"
                    >
                        처리 완료
                    </button>

                    <button
                        onclick="ignoreReport(
                            ${report.id}
                        )"
                    >
                        무시
                    </button>

                </div>

            </div>

        `).join("");
}

async function resolveReport(id) {

    await updateReport(id, "resolved");

    loadReports();
}

async function ignoreReport(id) {

    await updateReport(id, "ignored");

    loadReports();
}

async function updateReport(id, status) {

    const response =
        await fetch(
            `/api/admin?action=report&id=${id}`,
            {
                method: "PATCH",

                headers: adminHeaders(),

                body: JSON.stringify({
                    status
                })
            }
        );

    if (!response.ok) {
        const data =
            await response.json();

        alert(data.error);
    }
}

async function deleteAdminPost(id) {

    if (
        !confirm(
            "정말 이 게시글을 삭제하시겠습니까?"
        )
    ) {
        return;
    }

    const response =
        await fetch(
            `/api/admin?action=post&id=${id}`,
            {
                method: "DELETE",
                headers: adminHeaders()
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    alert("게시글이 삭제되었습니다.");

    loadReports();
}

async function deleteAdminComment(id) {

    if (
        !confirm(
            "정말 이 댓글을 삭제하시겠습니까?"
        )
    ) {
        return;
    }

    const response =
        await fetch(
            `/api/admin?action=comment&id=${id}`,
            {
                method: "DELETE",
                headers: adminHeaders()
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    alert("댓글이 삭제되었습니다.");

    loadReports();
}

function logout() {

    sessionStorage.removeItem(tokenKey);

    adminSection.classList.add(
        "hidden"
    );

    loginSection.classList.remove(
        "hidden"
    );
}

async function checkLogin() {

    if (!token()) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/admin?action=reports",
                {
                    headers: adminHeaders()
                }
            );

        if (!response.ok) {
            sessionStorage.removeItem(
                tokenKey
            );

            return;
        }

        showAdmin();

    } catch {
        sessionStorage.removeItem(
            tokenKey
        );
    }
}

function showAdmin() {

    loginSection.classList.add(
        "hidden"
    );

    adminSection.classList.remove(
        "hidden"
    );

    loadReports();
}

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        try {

            await login(
                document
                    .getElementById(
                        "username"
                    ).value,

                document
                    .getElementById(
                        "password"
                    ).value
            );

            showAdmin();

        } catch (error) {

            loginMessage.textContent =
                error.message;

        }
    }
);

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        logout
    );

checkLogin();