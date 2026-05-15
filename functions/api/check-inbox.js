/**
 * Cloudflare Pages Function: GET /api/check-inbox
 * Lists all files in the Supabase Storage "inbox/" prefix that haven't been processed.
 * The frontend uses this to find new files to scan automatically.
 */
export async function onRequest(context) {
  const { env } = context;

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // List files in the inbox/ folder of the receipts bucket
    const listRes = await fetch(`${supabaseUrl}/storage/v1/object/list/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ prefix: 'inbox/', limit: 50, offset: 0 }),
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      return new Response(JSON.stringify({ error: `Supabase list error: ${err}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const files = await listRes.json();

    // Filter out folders (id === null means it's a folder placeholder)
    const imageFiles = files.filter(f => f.id !== null && f.name !== '.emptyFolderPlaceholder');

    // Build public URLs for each file
    const items = imageFiles.map(f => ({
      name: f.name,
      path: `inbox/${f.name}`,
      publicUrl: `${supabaseUrl}/storage/v1/object/public/receipts/inbox/${f.name}`,
      createdAt: f.created_at,
    }));

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
