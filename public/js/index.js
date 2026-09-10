```javascript
const postList = document.getElementById("postList");
const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");
const resetButton = document.getElementById("resetButton");

async function loadPosts(query = "") {
    postList.innerHTML = "<p>불러오는 중...</p>";

    try {
        const url = query
            ? `/api/posts?q=${encodeURIComponent(query)}`
            : "/api/posts";

        const res = await fetch(url, {
            cache: "no-store"
        });

        const data = await res.json();

        console.log("게시글 데이터:", data);

        if (!res.ok) {
            throw new Error(
                data.error || "게시글을 불러오지 못했습니다."
            );
        }

        postList.innerHTML = "";

        // API는 배열을 직접 반환함
        if (!Array.isArray(data) || data.length === 0) {
            postList.innerHTML = "<p>게시글이 없습니다.</p>";
            return;
        }

        data.forEach(post => {
            const item = document.createElement("div");
            item.className = "post-item";

            item.innerHTML = `
                <a href="/post.html?id=${post.id}">
                    <div class="post-title">
                        ${escapeHTML(post.title)}
                    </div>

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
        console.error("게시글 로드 오류:", error);

        postList.innerHTML = `
            <p>
                게시글을 불러오지 못했습니다.<br>
                ${escapeHTML(error.message)}
            </p>
        `;
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


// 검색
searchForm?.addEventListener("submit", event => {
    event.preventDefault();

    const query = searchInput.value.trim();

    loadPosts(query);
});


// 전체글
resetButton?.addEventListener("click", () => {
    searchInput.value = "";
    loadPosts();
});


// 페이지 처음 열었을 때
loadPosts();
```
