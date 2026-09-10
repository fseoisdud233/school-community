import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import multer from "multer";
import crypto from "crypto";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "video/mp4",
            "video/webm",
            "video/ogg"
        ];

        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("지원하지 않는 파일 형식입니다."));
        }

        cb(null, true);
    }
});

function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        upload.single("media")(req, {}, (err) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

function validString(value, min, max) {
    return (
        typeof value === "string" &&
        value.trim().length >= min &&
        value.trim().length <= max
    );
}

function clean(value) {
    return value.trim();
}

function extension(type) {
    const map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "ogv"
    };

    return map[type] || "bin";
}

export default async function handler(req, res) {
    try {
        if (req.method === "GET") {
            const q = typeof req.query.q === "string"
                ? req.query.q.trim()
                : "";

            let query = supabase
                .from("posts")
                .select(
                    "id, author_name, title, content, views, media_type, created_at"
                )
                .order("created_at", { ascending: false })
                .limit(100);

            if (q) {
                query = query.or(
                    `title.ilike.%${q}%,content.ilike.%${q}%,author_name.ilike.%${q}%`
                );
            }

            const { data, error } = await query;

            if (error) {
                console.error(error);
                return res.status(500).json({
                    error: "게시글을 불러오지 못했습니다."
                });
            }

            return res.status(200).json(data);
        }

        if (req.method === "POST") {
            await parseMultipart(req);

            const authorName = clean(req.body?.authorName || "");
            const title = clean(req.body?.title || "");
            const content = clean(req.body?.content || "");
            const password = req.body?.password || "";

            if (!validString(authorName, 1, 20)) {
                return res.status(400).json({
                    error: "닉네임은 1~20자여야 합니다."
                });
            }

            if (!validString(title, 1, 100)) {
                return res.status(400).json({
                    error: "제목은 1~100자여야 합니다."
                });
            }

            if (!validString(content, 1, 5000)) {
                return res.status(400).json({
                    error: "내용은 1~5000자여야 합니다."
                });
            }

            if (
                typeof password !== "string" ||
                password.length < 4 ||
                password.length > 100
            ) {
                return res.status(400).json({
                    error: "비밀번호는 4~100자여야 합니다."
                });
            }

            let mediaUrl = null;
            let mediaType = null;

            if (req.file) {
                const fileName =
                    crypto.randomBytes(16).toString("hex") +
                    "." +
                    extension(req.file.mimetype);

                const path = `posts/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("media")
                    .upload(path, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false
                    });

                if (uploadError) {
                    console.error(uploadError);

                    return res.status(500).json({
                        error: "파일 업로드에 실패했습니다."
                    });
                }

                const { data: publicData } = supabase.storage
                    .from("media")
                    .getPublicUrl(path);

                mediaUrl = publicData.publicUrl;
                mediaType = req.file.mimetype.startsWith("image/")
                    ? "image"
                    : "video";
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const { data, error } = await supabase
                .from("posts")
                .insert({
                    author_name: authorName,
                    title,
                    content,
                    password_hash: passwordHash,
                    media_url: mediaUrl,
                    media_type: mediaType
                })
                .select("id")
                .single();

            if (error) {
                console.error(error);

                return res.status(500).json({
                    error: "게시글 작성에 실패했습니다."
                });
            }

            return res.status(201).json({
                id: data.id
            });
        }

        if (req.method === "DELETE") {
            const id = Number(req.query.id);
            const password = req.body?.password || "";

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    error: "잘못된 게시글입니다."
                });
            }

            const { data: post, error: findError } = await supabase
                .from("posts")
                .select("id, password_hash, media_url")
                .eq("id", id)
                .single();

            if (findError || !post) {
                return res.status(404).json({
                    error: "게시글을 찾을 수 없습니다."
                });
            }

            const match = await bcrypt.compare(
                password,
                post.password_hash
            );

            if (!match) {
                return res.status(403).json({
                    error: "비밀번호가 틀렸습니다."
                });
            }

            const { error: deleteError } = await supabase
                .from("posts")
                .delete()
                .eq("id", id);

            if (deleteError) {
                console.error(deleteError);

                return res.status(500).json({
                    error: "삭제하지 못했습니다."
                });
            }

            return res.status(200).json({
                success: true
            });
        }

        return res.status(405).json({
            error: "Method Not Allowed"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: error.message || "서버 오류"
        });
    }
}