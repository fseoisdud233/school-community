import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method Not Allowed"
            });
        }

        const {
            postId,
            commentId,
            reason
        } = req.body || {};

        if (
            !postId &&
            !commentId
        ) {
            return res.status(400).json({
                error: "신고 대상이 없습니다."
            });
        }

        if (
            typeof reason !== "string" ||
            reason.trim().length < 1 ||
            reason.trim().length > 500
        ) {
            return res.status(400).json({
                error: "신고 사유가 올바르지 않습니다."
            });
        }

        const { error } = await supabase
            .from("reports")
            .insert({
                post_id: postId ? Number(postId) : null,
                comment_id: commentId ? Number(commentId) : null,
                reason: reason.trim()
            });

        if (error) {
            console.error(error);

            return res.status(500).json({
                error: "신고에 실패했습니다."
            });
        }

        return res.status(201).json({
            success: true
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "서버 오류"
        });
    }
}