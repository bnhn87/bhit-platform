import type { NextApiRequest, NextApiResponse } from 'next';
import { getNavItemsForRole, getCoreNavItems } from '../../../config/navigation';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(200).json({
        error: 'No token',
        message: 'Please provide an Authorization header with Bearer token'
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(200).json({
        error: 'No authenticated user',
        userError: userError?.message,
      });
    }

    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || 'guest';

    // Get navigation items for role
    const coreItems = getCoreNavItems();
    const roleItems = getNavItemsForRole(role as any);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email
      },
      role: role,
      navigationItems: {
        coreItems: coreItems.map(item => ({ id: item.id, label: item.label, href: item.href })),
        roleItems: roleItems.map(item => ({ id: item.id, label: item.label, href: item.href })),
        totalCoreItems: coreItems.length,
        totalRoleItems: roleItems.length,
        roleItemIds: roleItems.map(item => item.id)
      },
      expectedForDirector: {
        directorItems: "301-315",
        adminItems: "401-410",
        totalExpected: 25
      }
    });

  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}