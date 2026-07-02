import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { uploadImage } from "@/utils/supabase";

const MAX_SIZE_MB = 3;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// POST /api/forum/upload  (multipart/form-data, field: "file")
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File must be under ${MAX_SIZE_MB}MB` }, { status: 400 });
    }

    const url = await uploadImage(file, "forum");
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("[forum/upload]", e);
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
