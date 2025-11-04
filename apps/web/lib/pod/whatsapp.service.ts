// WhatsApp Service - Generate WhatsApp deep links for POD requests
import { supabaseAdmin } from '../supabaseAdmin';
import type { IssueType, WHATSAPP_TEMPLATES } from './types';

export class WhatsAppService {
  /**
   * Create WhatsApp request and generate link
   */
  static async createRequest(params: {
    podId: string;
    phoneNumber: string;
    contactName?: string;
    issueType: IssueType;
    customMessage?: string;
    userId: string;
    supplierId?: string;
  }) {
    // Generate message from template
    const message = this.generateMessage(
      params.issueType,
      params.contactName,
      params.customMessage
    );

    // Store request in database
    const { data: request, error } = await supabaseAdmin
      .from('pod_whatsapp_requests')
      .insert({
        pod_id: params.podId,
        phone_number: params.phoneNumber,
        contact_name: params.contactName,
        issue_type: params.issueType,
        message_template: params.issueType,
        message_sent: message,
        requested_by: params.userId,
        supplier_id: params.supplierId
      })
      .select()
      .single();

    if (error) throw error;

    // Update POD status
    await supabaseAdmin
      .from('delivery_pods')
      .update({ status: 'whatsapp_requested' })
      .eq('id', params.podId);

    // Generate WhatsApp link
    const whatsappLink = this.generateWhatsAppLink(params.phoneNumber, message);

    return {
      whatsapp_link: whatsappLink,
      request_id: request.id,
      message
    };
  }

  /**
   * Generate WhatsApp deep link
   */
  static generateWhatsAppLink(phoneNumber: string, message: string): string {
    // Remove spaces and special characters from phone number
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  }

  /**
   * Generate message from template
   */
  static generateMessage(
    issueType: IssueType,
    contactName?: string,
    customMessage?: string
  ): string {
    const templates: Record<IssueType, string> = {
      signature_unclear: `Hi${contactName ? ` ${contactName}` : ''}, we've received your POD but the signature is unclear. Could you please send a clearer photo? Thanks, BHIT Team`,
      signature_missing: `Hi${contactName ? ` ${contactName}` : ''}, we've received your POD but there's no signature. Could you please send a signed copy? Thanks, BHIT Team`,
      date_missing: `Hi${contactName ? ` ${contactName}` : ''}, we've received your POD but the delivery date is missing. Could you please confirm the date? Thanks, BHIT Team`,
      poor_quality: `Hi${contactName ? ` ${contactName}` : ''}, we've received your POD but the image quality is too low to read. Could you please send a clearer photo? Thanks, BHIT Team`,
      vehicle_missing: `Hi${contactName ? ` ${contactName}` : ''}, we've received your POD but vehicle details are missing. Could you please provide this information? Thanks, BHIT Team`,
      items_not_visible: `Hi${contactName ? ` ${contactName}` : ''}, we've received your POD but the items list isn't visible. Could you please send a clearer photo? Thanks, BHIT Team`,
      custom: customMessage || 'Hi, we need some additional information about your delivery. Thanks, BHIT Team'
    };

    return templates[issueType];
  }

  /**
   * Get pending WhatsApp requests
   */
  static async getPendingRequests() {
    const { data, error } = await supabaseAdmin
      .from('pod_whatsapp_requests')
      .select('*, pod:delivery_pods(*), supplier:suppliers(*)')
      .is('response_received_at', null)
      .order('requested_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Mark request as responded
   */
  static async markResponseReceived(requestId: string, replacementPodId?: string) {
    const { error } = await supabaseAdmin
      .from('pod_whatsapp_requests')
      .update({
        response_received_at: new Date().toISOString(),
        replacement_pod_id: replacementPodId
      })
      .eq('id', requestId);

    if (error) throw error;
    return { success: true };
  }
}
