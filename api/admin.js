import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function createToken(username) {
    const payload = {
        username,
        exp: Date.now() + 1000 * 60 * 60 * 12
    };

    const text = Buffer.from(
        JSON.stringify(payload)
    ).toString("base64url");

    const signature = crypto
        .createHmac("sha256", process.env.ADMIN_SECRET)
        .update(text)
        .digest("base64url");

    return `${text}.${signature}`;
}

function verifyToken(token) {
    try {
        if (!token) return null;

        const parts = token.split(".");

        if (parts.length !== 2) {
            return null;
        }

        const [text, signature] = parts;

        const expected = crypto
            .createHmac("sha256", process.env.ADMIN_SECRET)
            .update(text)
            .digest("base64url");

        if (
            !crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expected)
            )
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(text, "base64url").toString()
        );

        if (payload.exp < Date.now()) {
            return null;
        }

        if (
            payload.username !==
            process.env.ADMIN_USERNAME
        ) {
            return null;
        }

        return payload;

    } catch {
        return null;
    }
}

function getToken(req) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    return header.slice(7);
}

function requireAdmin(req, res) {
    const payload = verifyToken(
        getToken(req)
    );

    if (!payload) {
        res.status(401).json({
            error: "관리자 인증이 필요합니다."
        });

        return null;
    }

    return payload;
}

export default async function handler(req, res) {
    try {
        const action = req.query.action;

        // 관리자 로그인
        if (
            req.method === "POST" &&
            action === "login"
        ) {
            const {
                username,
                password
            } = req.body || {};

            if (
                username !== process.env.ADMIN_USERNAME ||
                password !== process.env.ADMIN_PASSWORD
            ) {
                return res.status(401).json({
                    error: "아이디 또는 비밀번호가 틀렸습니다."
                });
            }

            return res.status(200).json({
                token: createToken(username)
            });
        }

        const admin = requireAdmin(req, res);

        if (!admin) {
            return;
        }

        // 신고 목록
        if (
            req.method === "GET" &&
            action === "reports"
        ) {
            const { data, error } = await supabase
                .from("reports")
                .select(`
                    id,
                    post_id,
                    comment_id,
                    reason,
                    status,
                    created_at
                `)
                .order("created_at", {
                    ascending: false
                })
                .limit(500);

            if (error) {
                return res.status(500).json({
                    error: "신고 목록을 불러오지 못했습니다."
                });
            }

            return res.status(200).json(data);
        }

        // 신고 상태 변경
        if (
            req.method === "PATCH" &&
            action === "report"
        ) {
            const id = Number(req.query.id);
            const status = req.body?.status;

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    error: "잘못된 신고입니다."
                });
            }

            if (
                !["pending", "resolved", "ignored"]
                    .includes(status)
            ) {
                return res.status(400).json({
                    error: "잘못된 상태입니다."
                });
            }

            const { error } = await supabase
                .from("reports")
                .update({
                    status
                })
                .eq("id", id);

            if (error) {
                return res.status(500).json({
                    error: "신고 상태 변경 실패"
                });
            }

            return res.status(200).json({
                success: true
            });
        }

        // 게시글 삭제
        if (
            req.method === "DELETE" &&
            action === "post"
        ) {
            const id = Number(req.query.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    error: "잘못된 게시글입니다."
                });
            }

            const { data: post } = await supabase
                .from("posts")
                .select("media_url")
                .eq("id", id)
                .single();

            const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", id);

            if (error) {
                return res.status(500).json({
                    error: "게시글 삭제 실패"
                });
            }

            // Storage 파일 삭제
            if (post?.media_url) {
                try {
                    const marker = "/media/";
                    const index =
                        post.media_url.indexOf(marker);

                    if (index !== -1) {
                        const path =
                            post.media_url.slice(
                                index + marker.length
                            );

                        await supabase.storage
                            .from("media")
                            .remove([path]);
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            return res.status(200).json({
                success: true
            });
        }

        // 댓글 삭제
        if (
            req.method === "DELETE" &&
            action === "comment"
        ) {
            const id = Number(req.query.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    error: "잘못된 댓글입니다."
                });
            }

            const { error } = await supabase
                .from("comments")
                .delete()
                .eq("id", id);

            if (error) {
                return res.status(500).json({
                    error: "댓글 삭제 실패"
                });
            }

            return res.status(200).json({
                success: true
            });
        }

        return res.status(400).json({
            error: "알 수 없는 관리자 명령입니다."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "관리자 API 오류"
        });
    }
}