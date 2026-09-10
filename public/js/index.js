const postList = document.getElementById("postList");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

async function loadPosts(query = "") {
    postList.innerHTML = "<p>불러오는 중...</p>";

    try {
        const url = query
            ? `/api/posts?search=${encodeURIComponent(query)}`
            : "/api/posts";

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "게시글을 불러오지 못했습니다.");
        }

        postList.innerHTML = "";

        if (!data.posts || data.posts.length === 0) {
            postList.innerHTML = "<p>게시글이 없습니다.</p>";
            return;
        }

        data.posts.forEach(post => {
            const item = document.createElement("div");
            item.className = "post-item";

            item.innerHTML = `
                <a href="/post.html?id=${post.id}">
                    <div class="post-title">${escapeHTML(post.title)}</div>
                    <div class="post-info">
                        ${escapeHTML(post.author_name)}
                        · 조회 ${post.views}
                        · ${formatDate(post.created_at)}
                    </div>
                </a>
            `;

            postList.appendChild(item);
        });

    } catch (error) {
        console.error(error);
        postList.innerHTML =
            `<p>게시글을 불러오지 못했습니다.<br>${escapeHTML(error.message)}</p>`;
    }
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function formatDate(date) {
    return new Date(date).toLocaleString("ko-KR");
}

searchButton?.addEventListener("click", () => {
    loadPosts(searchInput.value.trim());
});

searchInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loadPosts(searchInput.value.trim());
    }
});

loadPosts();
