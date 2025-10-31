import { supabase } from "./supabaseClient";

export type EditField = "title" | "client_name" | "reference" | "status" | string;

export async function logJobEdit(
  jobId: string,
  userId: string,
  field: EditField,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  try {
    // Don't log if values are the same
    if (oldValue === newValue) {
      return;
    }
    
    await supabase
      .from("job_edit_history")
      .insert({
        job_id: jobId,
        user_id: userId,
        field_name: field,
        old_value: oldValue,
        new_value: newValue
      });
  } catch (error) {
    console.error("Failed to log job edit:", error);
    // We don't throw the error as we don't want to break the UI if logging fails
  }
}