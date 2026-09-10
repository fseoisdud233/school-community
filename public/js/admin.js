
const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const logoutButton = document.getElementById("logoutButton");

const reports = document.getElementById("reports");
const adminPosts = document.getElementById("adminPosts");
const adminComments = document.getElementById("adminComments");

const tokenKey = "school_admin_token";


// ========================================
// 토큰
// ========================================

function token() {
    return sessionStorage.getItem(tokenKey);
}

function adminHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token()
    };
}


// ========================================
// HTML 보안 처리
// ========================================

function escapeHTML(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ========================================
// 날짜
// ========================================

function formatDate(date) {
    var d = new Date(date);

    if (isNaN(d.getTime())) {
        return "-";
    }

    return d.toLocaleString("ko-KR");
}


// ========================================
// 로그인
// ========================================

async function login(username, password) {
    var response = await fetch(
        "/api/admin?action=login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        }
    );

    var text = await response.text();
    var data;

    try {
        data = JSON.parse(text);
    } catch (error) {
        console.error("로그인 서버 응답:", text);
        throw new Error("서버 응답을 읽을 수 없습니다.");
    }

    if (!response.ok) {
        throw new Error(
            data.error || "로그인에 실패했습니다."
        );
    }

    if (!data.token) {
        throw new Error("로그인 토큰이 없습니다.");
    }

    sessionStorage.setItem(
        tokenKey,
        data.token
    );
}


// ========================================
// 신고 불러오기
// ========================================

async function loadReports() {
    reports.innerHTML = "불러오는 중...";

    try {
        var response = await fetch(
            "/api/admin?action=reports",
            {
                method: "GET",
                headers: adminHeaders(),
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        var text = await response.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error("신고 서버 응답:", text);
            throw new Error(
                "신고 데이터를 읽을 수 없습니다."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                "신고를 불러오지 못했습니다."
            );
        }

        if (!Array.isArray(data) || data.length === 0) {
            reports.innerHTML =
                '<div class="empty">신고가 없습니다.</div>';
            return;
        }

        var html = "";

        data.forEach(function(report) {
            var target = "알 수 없음";

            if (report.post_id) {
                target = "게시글 #" + report.post_id;
            }

            if (report.comment_id) {
                target = "댓글 #" + report.comment_id;
            }

            html +=
                '<div class="admin-item">' +

                    '<div>' +

                        '<strong>' +
                            "신고 #" + report.id +
                        '</strong>' +

                        '<p>' +
                            "대상: " +
                            escapeHTML(target) +
                        '</p>' +

                        '<p>' +
                            "사유: " +
                            escapeHTML(report.reason) +
                        '</p>' +

                        '<p>' +
                            "상태: " +
                            escapeHTML(report.status) +
                        '</p>' +

                        '<p>' +
                            "신고일: " +
                            formatDate(report.created_at) +
                        '</p>' +

                    '</div>' +

                    '<div class="admin-actions">';

            if (report.post_id) {
                html +=
                    '<button onclick="deleteAdminPost(' +
                    report.post_id +
                    ')">' +
                    '게시글 삭제' +
                    '</button>';
            }

            if (report.comment_id) {
                html +=
                    '<button onclick="deleteAdminComment(' +
                    report.comment_id +
                    ')">' +
                    '댓글 삭제' +
                    '</button>';
            }

            html +=
                    '<button onclick="resolveReport(' +
                    report.id +
                    ')">' +
                    '처리 완료' +
                    '</button>' +

                    '<button onclick="ignoreReport(' +
                    report.id +
                    ')">' +
                    '무시' +
                    '</button>' +

                    '</div>' +

                '</div>';
        });

        reports.innerHTML = html;

    } catch (error) {
        console.error(
            "신고 로드 오류:",
            error
        );

        reports.innerHTML =
            "<p>" +
            escapeHTML(error.message) +
            "</p>";
    }
}


// ========================================
// 게시글 불러오기
// ========================================

async function loadPosts() {
    adminPosts.innerHTML = "불러오는 중...";

    try {
        console.log("게시글 요청 시작");

        var response = await fetch(
            "/api/admin?action=posts",
            {
                method: "GET",
                headers: adminHeaders(),
                cache: "no-store"
            }
        );

        console.log(
            "게시글 응답 상태:",
            response.status
        );

        if (response.status === 401) {
            logout();
            return;
        }

        var text = await response.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error(
                "게시글 서버 응답:",
                text
            );

            throw new Error(
                "게시글 데이터를 읽을 수 없습니다."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                "게시글을 불러오지 못했습니다."
            );
        }

        if (!Array.isArray(data) || data.length === 0) {
            adminPosts.innerHTML =
                '<div class="empty">게시글이 없습니다.</div>';
            return;
        }

        var html = "";

        data.forEach(function(post) {
            html +=
                '<div class="admin-item">' +

                    '<div>' +

                        '<strong>' +
                            escapeHTML(post.title) +
                        '</strong>' +

                        '<p>' +
                            "게시글 번호: #" +
                            post.id +
                        '</p>' +

                        '<p>' +
                            "작성자: " +
                            escapeHTML(post.author_name) +
                        '</p>' +

                        '<p>' +
                            "조회수: " +
                            post.views +
                        '</p>' +

                        '<p>' +
                            "작성일: " +
                            formatDate(post.created_at) +
                        '</p>';

            if (post.media_type) {
                html +=
                        '<p>' +
                            "첨부파일: " +
                            escapeHTML(post.media_type) +
                        '</p>';
            }

            html +=
                    '</div>' +

                    '<div class="admin-actions">' +

                        '<button onclick="deleteAdminPost(' +
                            post.id +
                        ')">' +
                            '게시글 삭제' +
                        '</button>' +

                    '</div>' +

                '</div>';
        });

        adminPosts.innerHTML = html;

    } catch (error) {
        console.error(
            "게시글 로드 오류:",
            error
        );

        adminPosts.innerHTML =
            "<p>" +
            escapeHTML(error.message) +
            "</p>";
    }
}


// ========================================
// 댓글 불러오기
// ========================================

async function loadComments() {
    adminComments.innerHTML = "불러오는 중...";

    try {
        console.log("댓글 요청 시작");

        var response = await fetch(
            "/api/admin?action=comments",
            {
                method: "GET",
                headers: adminHeaders(),
                cache: "no-store"
            }
        );

        console.log(
            "댓글 응답 상태:",
            response.status
        );

        if (response.status === 401) {
            logout();
            return;
        }

        var text = await response.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error(
                "댓글 서버 응답:",
                text
            );

            throw new Error(
                "댓글 데이터를 읽을 수 없습니다."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                "댓글을 불러오지 못했습니다."
            );
        }

        if (!Array.isArray(data) || data.length === 0) {
            adminComments.innerHTML =
                '<div class="empty">댓글이 없습니다.</div>';
            return;
        }

        var html = "";

        data.forEach(function(comment) {
            html +=
                '<div class="admin-item">' +

                    '<div>' +

                        '<strong>' +
                            "댓글 #" + comment.id +
                        '</strong>' +

                        '<p>' +
                            "게시글: #" +
                            comment.post_id +
                        '</p>' +

                        '<p>' +
                            "작성자: " +
                            escapeHTML(comment.author_name) +
                        '</p>' +

                        '<p>' +
                            "내용: " +
                            escapeHTML(comment.content) +
                        '</p>' +

                        '<p>' +
                            "작성일: " +
                            formatDate(comment.created_at) +
                        '</p>' +

                    '</div>' +

                    '<div class="admin-actions">' +

                        '<button onclick="deleteAdminComment(' +
                            comment.id +
                        ')">' +
                            '댓글 삭제' +
                        '</button>' +

                    '</div>' +

                '</div>';
        });

        adminComments.innerHTML = html;

    } catch (error) {
        console.error(
            "댓글 로드 오류:",
            error
        );

        adminComments.innerHTML =
            "<p>" +
            escapeHTML(error.message) +
            "</p>";
    }
}


// ========================================
// 신고 처리
// ========================================

async function resolveReport(id) {
    await updateReport(id, "resolved");
    await loadReports();
}

async function ignoreReport(id) {
    await updateReport(id, "ignored");
    await loadReports();
}

async function updateReport(id, status) {
    try {
        var response = await fetch(
            "/api/admin?action=report&id=" + id,
            {
                method: "PATCH",
                headers: adminHeaders(),
                body: JSON.stringify({
                    status: status
                })
            }
        );

        var text = await response.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(
                "서버 응답을 읽을 수 없습니다."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                "신고 상태 변경에 실패했습니다."
            );
        }

    } catch (error) {
        console.error(
            "신고 처리 오류:",
            error
        );

        alert(error.message);
    }
}


// ========================================
// 게시글 삭제
// ========================================

async function deleteAdminPost(id) {
    if (!confirm(
        "정말 이 게시글을 삭제하시겠습니까?"
    )) {
        return;
    }

    try {
        var response = await fetch(
            "/api/admin?action=post&id=" + id,
            {
                method: "DELETE",
                headers: adminHeaders()
            }
        );

        var text = await response.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(
                "서버 응답을 읽을 수 없습니다."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                "게시글 삭제에 실패했습니다."
            );
        }

        alert("게시글이 삭제되었습니다.");

        await loadPosts();
        await loadReports();

    } catch (error) {
        console.error(
            "게시글 삭제 오류:",
            error
        );

        alert(error.message);
    }
}


// ========================================
// 댓글 삭제
// ========================================

async function deleteAdminComment(id) {
    if (!confirm(
        "정말 이 댓글을 삭제하시겠습니까?"
    )) {
        return;
    }

    try {
        var response = await fetch(
            "/api/admin?action=comment&id=" + id,
            {
                method: "DELETE",
                headers: adminHeaders()
            }
        );

        var text = await response.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(
                "서버 응답을 읽을 수 없습니다."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                "댓글 삭제에 실패했습니다."
            );
        }

        alert("댓글이 삭제되었습니다.");

        await loadComments();
        await loadReports();

    } catch (error) {
        console.error(
            "댓글 삭제 오류:",
            error
        );

        alert(error.message);
    }
}


// ========================================
// 로그아웃
// ========================================

function logout() {
    sessionStorage.removeItem(tokenKey);

    adminSection.classList.add("hidden");
    loginSection.classList.remove("hidden");

    loginMessage.textContent = "";
}


// ========================================
// 관리자 화면
// ========================================

function showAdmin() {
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");

    loadReports();
    loadPosts();
    loadComments();
}


// ========================================
// 로그인 상태 확인
// ========================================

async function checkLogin() {
    if (!token()) {
        return;
    }

    try {
        var response = await fetch(
            "/api/admin?action=reports",
            {
                method: "GET",
                headers: adminHeaders(),
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            sessionStorage.removeItem(tokenKey);
            return;
        }

        if (!response.ok) {
            sessionStorage.removeItem(tokenKey);
            return;
        }

        showAdmin();

    } catch (error) {
        console.error(
            "로그인 확인 오류:",
            error
        );

        sessionStorage.removeItem(tokenKey);
    }
}


// ========================================
// 로그인 이벤트
// ========================================

loginForm.addEventListener(
    "submit",
    async function(event) {
        event.preventDefault();

        loginMessage.textContent = "로그인 중...";

        try {
            var username =
                document.getElementById("username").value.trim();

            var password =
                document.getElementById("password").value;

            await login(
                username,
                password
            );

            loginMessage.textContent = "";

            showAdmin();

        } catch (error) {
            console.error(
                "로그인 오류:",
                error
            );

            loginMessage.textContent =
                error.message;
        }
    }
);


// ========================================
// 로그아웃 버튼
// ========================================

logoutButton.addEventListener(
    "click",
    logout
);


// ========================================
// 시작
// ========================================

checkLogin();
```
