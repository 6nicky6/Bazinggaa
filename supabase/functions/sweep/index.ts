// Bazingga NIGHTLY TEST-DATA SWEEP — testing phase only.
// *** REMOVE THIS FUNCTION + THE 'nightly-sweep' CRON JOB BEFORE PLAY STORE LAUNCH ***
// Clears: inline media messages (heavy base64), uploaded chat media in storage
// (keeps avatars), the calls log, and expired moments. Text chats survive.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  const report: Record<string, unknown> = { at: new Date().toISOString() };
  try {
    const a = await supabase.from('messages').delete({ count: 'exact' }).like('content', '⟦bza:*');
    const b = await supabase.from('messages').delete({ count: 'exact' }).like('content', '⟦bzi⟧*');
    const c = await supabase.from('messages').delete({ count: 'exact' }).not('audio_url', 'is', null);
    const d = await supabase.from('messages').delete({ count: 'exact' }).not('image_url', 'is', null);
    report.mediaMessages = (a.count ?? 0) + (b.count ?? 0) + (c.count ?? 0) + (d.count ?? 0);

    const e = await supabase.from('calls').delete({ count: 'exact' }).gte('started_at', '1970-01-01');
    report.calls = e.count ?? 0;

    const f = await supabase.from('moments').delete({ count: 'exact' }).lt('expires_at', new Date().toISOString());
    report.expiredMoments = f.count ?? 0;

    let removed = 0;
    const { data: root } = await supabase.storage.from('media').list('', { limit: 1000 });
    for (const entry of root ?? []) {
      if (!entry.name || entry.name.startsWith('avatars-')) continue;
      const { data: files } = await supabase.storage.from('media').list(entry.name, { limit: 1000 });
      const paths = (files ?? []).filter((x) => x.name).map((x) => entry.name + '/' + x.name);
      if (paths.length) {
        const { error } = await supabase.storage.from('media').remove(paths);
        if (!error) removed += paths.length;
      }
    }
    report.storageFilesRemoved = removed;

    return new Response(JSON.stringify(report), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    report.error = String(err);
    return new Response(JSON.stringify(report), { status: 200 });
  }
});
