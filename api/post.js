import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    try {
        const id = Number(req.query.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                error: "잘못된 게시글입니다."
            });
        }

        if (req.method === "GET") {
            const { data, error } = await supabase
                .from("posts")
                .select(
                    "id, author_name, title, content, views, media_url, media_type, created_at"
                )
                .eq("id", id)
                .single();

            if (error || !data) {
                return res.status(404).json({
                    error: "게시글을 찾을 수 없습니다."
                });
            }

            await supabase
                .from("posts")
                .update({
                    views: data.views + 1
                })
                .eq("id", id);

            data.views += 1;

            return res.status(200).json(data);
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