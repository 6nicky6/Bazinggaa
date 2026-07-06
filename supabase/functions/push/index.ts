// Bazingga push sender — fires on new message inserts (DB webhook 'push_on_message').
// Looks up recipients' Expo push tokens and delivers via Expo's push API.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const msg = payload.record;
    if (!msg || payload.type !== 'INSERT') return new Response('ignored', { status: 200 });

    const { data: members } = await supabase
      .from('chat_members').select('user_id')
      .eq('chat_id', msg.chat_id).neq('user_id', msg.sender_id);
    if (!members?.length) return new Response('no members', { status: 200 });

    const ids = members.map((m) => m.user_id);
    const { data: devices } = await supabase
      .from('devices').select('push_token').in('user_id', ids);
    if (!devices?.length) return new Response('no devices', { status: 200 });

    const { data: sender } = await supabase
      .from('profiles').select('name').eq('id', msg.sender_id).maybeSingle();

    const content = msg.content ?? '';
    const body = content.startsWith('⟦bza:') ? '🎙️ Voice note'
      : content.startsWith('⟦bzi⟧') ? '📷 Photo'
      : content.slice(0, 120);

    const notifications = devices.map((d) => ({
      to: d.push_token,
      title: sender?.name ?? 'New message',
      body,
      sound: 'default',
      channelId: 'messages',
      priority: 'high',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    });
    return new Response(await res.text(), { status: 200 });
  } catch (e) {
    // always 200 — a failed push must never retry-storm the webhook
    return new Response(String(e), { status: 200 });
  }
});
