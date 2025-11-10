import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // GET - Fetch user's banner preferences
  if (req.method === 'GET') {
    try {
      const { data: preferences, error } = await supabase
        .from('user_banner_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return res.status(500).json({ error: error.message });
      }

      // If no preferences exist, return defaults
      if (!preferences) {
        return res.status(200).json({
          preferences: {
            user_id: user.id,
            show_background: true,
            background_color: 'black',
            text_style: 'CLEAN_NEON',
            text_color: 'neon-blue',
            font_size: 22,
            scroll_speed: 30,
            message_spacing: 96
          }
        });
      }

      return res.status(200).json({ preferences });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  // PUT - Update user's banner preferences
  if (req.method === 'PUT') {
    try {
      const {
        show_background,
        background_color,
        text_style,
        text_color,
        font_size,
        scroll_speed,
        message_spacing
      } = req.body;

      // Validate inputs
      if (font_size && (font_size < 12 || font_size > 48)) {
        return res.status(400).json({ error: 'Font size must be between 12 and 48' });
      }
      if (scroll_speed && (scroll_speed < 10 || scroll_speed > 60)) {
        return res.status(400).json({ error: 'Scroll speed must be between 10 and 60' });
      }
      if (message_spacing && (message_spacing < 48 || message_spacing > 400)) {
        return res.status(400).json({ error: 'Message spacing must be between 48 and 400' });
      }

      const { data, error } = await supabase
        .from('user_banner_preferences')
        .upsert(
          {
            user_id: user.id,
            show_background,
            background_color,
            text_style,
            text_color,
            font_size,
            scroll_speed,
            message_spacing,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ preferences: data });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
