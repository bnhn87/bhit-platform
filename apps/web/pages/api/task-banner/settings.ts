// API Route: Task Banner Settings
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { UpdateSettingsRequest } from '@/lib/taskBanner/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET: Fetch banner settings (singleton)
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Use 'as any' to bypass TypeScript cache issues with newly created table
    const { data: settings, error } = await supabaseAdmin
      .from('task_banner_settings' as any)
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Error in GET /api/task-banner/settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT: Update banner settings (admin only)
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('[Task Banner Settings] No authorization header');
      return res.status(401).json({ error: 'Unauthorized - No auth header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Task Banner Settings] Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[Task Banner Settings] User ID:', user.id, 'Email:', user.email);

    // Check if user is admin/director
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('[Task Banner Settings] Profile lookup:', {
      userId: user.id,
      profile,
      profileError,
      hasProfile: !!profile,
      role: profile?.role
    });

    if (profileError) {
      console.error('[Task Banner Settings] Profile error:', profileError);
      return res.status(500).json({
        error: `Profile lookup failed: ${profileError.message}. Please run diagnose-and-fix-permissions.sql`
      });
    }

    if (!profile) {
      console.error('[Task Banner Settings] No profile found for user:', user.id);
      return res.status(403).json({
        error: 'No profile found. Please run diagnose-and-fix-permissions.sql in Supabase'
      });
    }

    const roleLower = profile.role?.toLowerCase();
    if (!['director', 'admin'].includes(roleLower)) {
      console.error('[Task Banner Settings] Invalid role:', profile.role);
      return res.status(403).json({
        error: `Forbidden - Your role is '${profile.role}'. Only directors/admins can save settings.`
      });
    }

    console.log('[Task Banner Settings] ✅ Permission check passed for user:', user.email);

    const updateData: UpdateSettingsRequest = req.body;

    // Build update object
    const updates: any = {};
    if (updateData.show_background !== undefined) updates.show_background = updateData.show_background;
    if (updateData.background_color !== undefined) updates.background_color = updateData.background_color;
    if (updateData.text_style !== undefined) updates.text_style = updateData.text_style;
    if (updateData.text_color !== undefined) updates.text_color = updateData.text_color;
    if (updateData.font_size !== undefined) updates.font_size = updateData.font_size;
    if (updateData.scroll_speed !== undefined) updates.scroll_speed = updateData.scroll_speed;
    if (updateData.message_spacing !== undefined) updates.message_spacing = updateData.message_spacing;
    if (updateData.empty_message !== undefined) updates.empty_message = updateData.empty_message;

    // Get the singleton settings ID first
    const { data: currentSettings, error: selectError } = await supabaseAdmin
      .from('task_banner_settings' as any)
      .select('id')
      .limit(1)
      .single();

    console.log('[Task Banner Settings] Current settings lookup:', {
      currentSettings,
      selectError,
      hasSettings: !!currentSettings
    });

    // If no settings exist, create them with defaults first
    if (!currentSettings || selectError?.code === 'PGRST116') {
      console.log('[Task Banner Settings] No settings found, creating default record...');

      const { data: newSettings, error: insertError } = await supabaseAdmin
        .from('task_banner_settings' as any)
        .insert({
          show_background: true,
          background_color: 'black',
          text_style: 'CLEAN_NEON',
          text_color: 'neon-blue',
          font_size: 22,
          scroll_speed: 30,
          message_spacing: 96,
          empty_message: 'NO ACTIVE TASKS - ALL CLEAR'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Task Banner Settings] Failed to create default settings:', insertError);
        return res.status(500).json({
          error: `Failed to create settings: ${insertError.message}`
        });
      }

      console.log('[Task Banner Settings] Created default settings, now updating...');

      // Now update the newly created settings
      const { data: updatedSettings, error: updateError } = await supabaseAdmin
        .from('task_banner_settings' as any)
        .update(updates)
        .eq('id', newSettings.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Task Banner Settings] Error updating new settings:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({ success: true, settings: updatedSettings });
    }

    // Update existing settings
    const { data: updatedSettings, error } = await supabaseAdmin
      .from('task_banner_settings' as any)
      .update(updates)
      .eq('id', currentSettings.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('Error in PUT /api/task-banner/settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
