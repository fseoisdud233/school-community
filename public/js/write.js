const form = document.getElementById("writeForm");
const message = document.getElementById("message");
const mediaInput = document.getElementById("media");

form.addEventListener("submit", async event => {
    event.preventDefault();

    const file = mediaInput.files[0];

    if (file && file.size > 10 * 1024 * 1024) {
        message.textContent =
            "파일은 최대 10MB까지 업로드할 수 있습니다.";

        return;
    }

    const formData = new FormData();

    formData.append(
        "authorName",
        document.getElementById("authorName").value
    );

    formData.append(
        "title",
        document.getElementById("title").value
    );

    formData.append(
        "content",
        document.getElementById("content").value
    );

    formData.append(
        "password",
        document.getElementById("password").value
    );

    if (file) {
        formData.append("media", file);
    }

    message.textContent = "작성 중...";

    try {
        const response = await fetch(
            "/api/posts",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        location.href =
            `/post.html?id=${data.id}`;

    } catch (error) {

        message.textContent =
            error.message;

    }
});