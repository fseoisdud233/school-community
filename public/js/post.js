const params = new URLSearchParams(
    location.search
);

const postId = Number(
    params.get("id")
);

const postElement =
    document.getElementById("post");

const commentList =
    document.getElementById("commentList");

const commentForm =
    document.getElementById("commentForm");

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(date) {
    return new Date(date).toLocaleString("ko-KR");
}

async function loadPost() {

    const response =
        await fetch(
            `/api/post?id=${postId}`
        );

    const data =
        await response.json();

    if (!response.ok) {
        postElement.innerHTML =
            `<div class="error">${escapeHTML(data.error)}</div>`;

        return;
    }

    let media = "";

    if (
        data.media_type === "image" &&
        data.media_url
    ) {
        media = `
            <div class="post-media">
                <img
                    src="${escapeHTML(data.media_url)}"
                    loading="lazy"
                    alt="첨부 이미지"
                >
            </div>
        `;
    }

    if (
        data.media_type === "video" &&
        data.media_url
    ) {
        media = `
            <div class="post-media">
                <video
                    controls
                    preload="metadata"
                >
                    <source
                        src="${escapeHTML(data.media_url)}"
                    >
                </video>
            </div>
        `;
    }

    postElement.innerHTML = `

        <div class="card">

            <h1>
                ${escapeHTML(data.title)}
            </h1>

            <div class="post-meta">
                ${escapeHTML(data.author_name)}
                · ${formatDate(data.created_at)}
                · 조회 ${data.views}
            </div>

            <div class="post-content">
                ${escapeHTML(data.content)
                    .replaceAll("\n", "<br>")}
            </div>

            ${media}

            <div class="post-actions">

                <button id="deletePost">
                    게시글 삭제
                </button>

                <button id="reportPost">
                    신고
                </button>

            </div>

        </div>
    `;

    document
        .getElementById("deletePost")
        .addEventListener("click", deletePost);

    document
        .getElementById("reportPost")
        .addEventListener("click", reportPost);
}

async function deletePost() {

    const password =
        prompt("게시글 삭제 비밀번호:");

    if (password === null) return;

    const response =
        await fetch(
            `/api/posts?id=${postId}`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    password
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    alert("게시글이 삭제되었습니다.");

    location.href = "/";
}

async function reportPost() {

    const reason =
        prompt("신고 사유:");

    if (!reason) return;

    const response =
        await fetch(
            "/api/reports",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    postId,
                    reason
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    alert("신고가 접수되었습니다.");
}

async function loadComments() {

    const response =
        await fetch(
            `/api/comments?postId=${postId}`
        );

    const data =
        await response.json();

    if (!response.ok) {
        commentList.textContent =
            data.error;

        return;
    }

    if (data.length === 0) {
        commentList.innerHTML =
            `<div class="empty">댓글이 없습니다.</div>`;

        return;
    }

    commentList.innerHTML =
        data.map(comment => `

            <div class="comment">

                <div class="comment-meta">

                    <strong>
                        ${escapeHTML(
                            comment.author_name
                        )}
                    </strong>

                    <span>
                        ${formatDate(
                            comment.created_at
                        )}
                    </span>

                </div>

                <div class="comment-content">
                    ${escapeHTML(
                        comment.content
                    ).replaceAll("\n", "<br>")}
                </div>

                <div class="comment-actions">

                    <button
                        onclick="deleteComment(${comment.id})"
                    >
                        삭제
                    </button>

                    <button
                        onclick="reportComment(${comment.id})"
                    >
                        신고
                    </button>

                </div>

            </div>

        `).join("");
}

async function deleteComment(id) {

    const password =
        prompt("댓글 삭제 비밀번호:");

    if (password === null) return;

    const response =
        await fetch(
            `/api/comments?id=${id}`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    password
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    loadComments();
}

async function reportComment(id) {

    const reason =
        prompt("신고 사유:");

    if (!reason) return;

    const response =
        await fetch(
            "/api/reports",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    commentId: id,
                    reason
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    alert("신고가 접수되었습니다.");
}

commentForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const response =
            await fetch(
                `/api/comments?postId=${postId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        authorName:
                            document
                                .getElementById(
                                    "commentAuthor"
                                ).value,

                        password:
                            document
                                .getElementById(
                                    "commentPassword"
                                ).value,

                        content:
                            document
                                .getElementById(
                                    "commentContent"
                                ).value

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            alert(data.error);
            return;
        }

        document
            .getElementById("commentContent")
            .value = "";

        loadComments();
    }
);

loadPost();
loadComments();