import {createClient} from '@supabase/supabase-js'

const bucket = 'fantasy-hub';

const url = process.env.SUPABASE_URL as string;
const key = process.env.SUPABASE_KEY as string;
// Service role key bypasses RLS — only used server-side for storage writes
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? key) as string;

const supabase = createClient(url, key);
const supabaseAdmin = createClient(url, serviceKey);

export const uploadImage = async (image: File, folder = 'general') => {
    const timestamp = Date.now()
    const newName = `${folder}/${timestamp}-${image.name}`
    const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(newName, image, {cacheControl: '3600'});

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Image upload failed');
    return supabase.storage.from(bucket).getPublicUrl(newName).data.publicUrl;
}