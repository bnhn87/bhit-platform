import { createClient } from '@supabase/supabase-js';

/**
 * Centralized Activity Logger
 * Logs all user actions and system events to activity_log table
 */

// Only create admin client if service role key is available (server-side)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  : null;

export type ActivityType =
  // Job activities
  | 'job_created'
  | 'job_updated'
  | 'job_status_changed'
  | 'job_deleted'
  | 'job_restored'
  | 'job_hard_deleted'
  // Quote activities
  | 'quote_created'
  | 'quote_updated'
  | 'quote_approved'
  | 'quote_rejected'
  | 'quote_sent'
  // User activities
  | 'user_created'
  | 'user_updated'
  | 'user_login'
  | 'user_logout'
  | 'user_deactivated'
  | 'user_activated'
  | 'permissions_updated'
  | 'password_reset'
  // Document activities
  | 'document_uploaded'
  | 'document_deleted'
  | 'drawing_uploaded'
  | 'photo_uploaded'
  // Task activities
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  // Other
  | 'note_added'
  | 'system_event';

interface LogActivityParams {
  text: string;
  activity_type: ActivityType;
  user_id?: string;
  job_id?: string;
  quote_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the database
 * This is the main function used throughout the app
 */
export async function logActivity(params: LogActivityParams): Promise<boolean> {
  try {
    // Skip logging if no admin client (client-side or missing service key)
    if (!supabaseAdmin) {
      // Only log in development mode to avoid console spam
      if (process.env.NODE_ENV === 'development') {
        console.debug('Activity logging skipped (client-side or no service key)');
      }
      return true; // Return true to not break app flow
    }

    const { error } = await supabaseAdmin
      .from('activity_log')
      .insert({
        text: params.text,
        activity_type: params.activity_type,
        user_id: params.user_id || null,
        job_id: params.job_id || null,
        quote_id: params.quote_id || null,
        metadata: params.metadata || null,
        occurred_at: new Date().toISOString()
      });

    if (error) {
      // Only log error in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to log activity (non-critical):', error.message);
      }
      return false;
    }

    return true;
  } catch (error: unknown) {
    // Silent fail for activity logging - it's not critical
    if (process.env.NODE_ENV === 'development') {
      console.warn('Activity logger exception (non-critical):', error);
    }
    return false;
  }
}

/**
 * Specialized logging functions for common activities
 */

export async function logJobCreated(jobId: string, jobTitle: string, userId?: string) {
  return logActivity({
    text: `New job created: ${jobTitle}`,
    activity_type: 'job_created',
    job_id: jobId,
    user_id: userId
  });
}

export async function logJobStatusChanged(
  jobId: string,
  jobTitle: string,
  oldStatus: string,
  newStatus: string,
  userId?: string
) {
  return logActivity({
    text: `Job "${jobTitle}" status changed from ${oldStatus} to ${newStatus}`,
    activity_type: 'job_status_changed',
    job_id: jobId,
    user_id: userId,
    metadata: { old_status: oldStatus, new_status: newStatus }
  });
}

export async function logJobUpdated(jobId: string, jobTitle: string, userId?: string, changes?: Record<string, any>) {
  return logActivity({
    text: `Job "${jobTitle}" updated`,
    activity_type: 'job_updated',
    job_id: jobId,
    user_id: userId,
    metadata: changes
  });
}

export async function logJobDeleted(jobId: string, jobTitle: string, userId?: string) {
  return logActivity({
    text: `Job "${jobTitle}" moved to trash`,
    activity_type: 'job_deleted',
    job_id: jobId,
    user_id: userId
  });
}

export async function logJobRestored(jobId: string, jobTitle: string, userId?: string) {
  return logActivity({
    text: `Job "${jobTitle}" restored from trash`,
    activity_type: 'job_restored',
    job_id: jobId,
    user_id: userId
  });
}

export async function logJobHardDeleted(jobId: string, jobTitle: string, userId?: string) {
  return logActivity({
    text: `Job "${jobTitle}" permanently deleted`,
    activity_type: 'job_hard_deleted',
    job_id: jobId,
    user_id: userId
  });
}

export async function logQuoteCreated(quoteId: string, quoteRef: string, userId?: string) {
  return logActivity({
    text: `New quote created: ${quoteRef}`,
    activity_type: 'quote_created',
    quote_id: quoteId,
    user_id: userId
  });
}

export async function logQuoteApproved(quoteId: string, quoteRef: string, userId?: string) {
  return logActivity({
    text: `Quote ${quoteRef} approved`,
    activity_type: 'quote_approved',
    quote_id: quoteId,
    user_id: userId
  });
}

export async function logUserCreated(newUserId: string, email: string, role: string, createdBy?: string) {
  return logActivity({
    text: `New user created: ${email} (${role})`,
    activity_type: 'user_created',
    user_id: createdBy,
    metadata: { new_user_id: newUserId, email, role }
  });
}

export async function logPermissionsUpdated(targetUserId: string, email: string, updatedBy?: string) {
  return logActivity({
    text: `Permissions updated for ${email}`,
    activity_type: 'permissions_updated',
    user_id: updatedBy,
    metadata: { target_user_id: targetUserId }
  });
}

export async function logPasswordReset(targetUserId: string, email: string, resetBy?: string) {
  return logActivity({
    text: `Password reset for ${email}`,
    activity_type: 'password_reset',
    user_id: resetBy,
    metadata: { target_user_id: targetUserId }
  });
}

export async function logDocumentUploaded(
  documentName: string,
  jobId?: string,
  userId?: string
) {
  return logActivity({
    text: `Document uploaded: ${documentName}`,
    activity_type: 'document_uploaded',
    job_id: jobId,
    user_id: userId,
    metadata: { document_name: documentName }
  });
}

export async function logNoteAdded(content: string, jobId?: string, userId?: string) {
  const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
  return logActivity({
    text: `Note added: ${preview}`,
    activity_type: 'note_added',
    job_id: jobId,
    user_id: userId
  });
}

export async function logTaskCompleted(taskTitle: string, jobId?: string, userId?: string) {
  return logActivity({
    text: `Task completed: ${taskTitle}`,
    activity_type: 'task_completed',
    job_id: jobId,
    user_id: userId
  });
}
