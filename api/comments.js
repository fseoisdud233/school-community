import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function valid(value, min, max) {
    return (
        typeof value === "string" &&
        value.trim().length >= min &&
        value.trim().length <= max
    );
}

export default async function handler(req, res) {
    try {
        const postId = Number(req.query.postId);

        if (!Number.isInteger(postId)) {
            return res.status(400).json({
                error: "잘못된 게시글입니다."
            });
        }

        if (req.method === "GET") {
            const { data, error } = await supabase
                .from("comments")
                .select(
                    "id, post_id, author_name, content, created_at"
                )
                .eq("post_id", postId)
                .order("created_at", { ascending: true })
                .limit(500);

            if (error) {
                return res.status(500).json({
                    error: "댓글을 불러오지 못했습니다."
                });
            }

            return res.status(200).json(data);
        }

        if (req.method === "POST") {
            const {
                authorName,
                content,
                password
            } = req.body || {};

            if (!valid(authorName, 1, 20)) {
                return res.status(400).json({
                    error: "닉네임은 1~20자여야 합니다."
                });
            }

            if (!valid(content, 1, 1000)) {
                return res.status(400).json({
                    error: "댓글은 1~1000자여야 합니다."
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

            const passwordHash = await bcrypt.hash(password, 12);

            const { data, error } = await supabase
                .from("comments")
                .insert({
                    post_id: postId,
                    author_name: authorName.trim(),
                    content: content.trim(),
                    password_hash: passwordHash
                })
                .select(
                    "id, post_id, author_name, content, created_at"
                )
                .single();

            if (error) {
                return res.status(500).json({
                    error: "댓글 작성에 실패했습니다."
                });
            }

            return res.status(201).json(data);
        }

        if (req.method === "DELETE") {
            const commentId = Number(req.query.id);
            const password = req.body?.password || "";

            if (!Number.isInteger(commentId)) {
                return res.status(400).json({
                    error: "잘못된 댓글입니다."
                });
            }

            const { data: comment, error } = await supabase
                .from("comments")
                .select("id, password_hash")
                .eq("id", commentId)
                .single();

            if (error || !comment) {
                return res.status(404).json({
                    error: "댓글을 찾을 수 없습니다."
                });
            }

            const match = await bcrypt.compare(
                password,
                comment.password_hash
            );

            if (!match) {
                return res.status(403).json({
                    error: "비밀번호가 틀렸습니다."
                });
            }

            const { error: deleteError } = await supabase
                .from("comments")
                .delete()
                .eq("id", commentId);

            if (deleteError) {
                return res.status(500).json({
                    error: "댓글 삭제에 실패했습니다."
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
            error: "서버 오류"
        });
    }
}