import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useHasInvoiceAccess } from '@/hooks/useHasInvoiceAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabaseClient';

interface InvoiceJob {
  id: string;
  reference: string;
  location: string;
  client_name: string;
  end_user?: string;
  quoted_amount: number;
  additions: number;
  total_amount: number;
  status: 'planned' | 'in_progress' | 'snagging' | 'completed';
  progress: number;
  last_invoice_date?: string;
  total_invoiced: number;
  invoice_status: 'ready' | 'partial' | 'none';
  created_at: string;
  updated_at: string;
}

interface InvoiceFilters {
  fromWeek: string;
  toWeek: string;
  statusFilter: 'all' | 'complete' | 'live' | 'partial' | 'scheduled';
  searchTerm: string;
}

interface InvoiceSummary {
  selectedJobs: number;
  completeJobs: { count: number; amount: number };
  partialJobs: { count: number; amount: number };
  scheduledJobs: { count: number; amount: number };
  totalAdditions: number;
  subtotal: number;
  vat: number;
  total: number;
}

const InvoiceScheduleTab: React.FC = () => {
  const { hasAccess: hasInvoiceAccess, loading: permissionLoading } = useHasInvoiceAccess();
  const { role } = useUserRole();

  const [jobs, setJobs] = useState<InvoiceJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InvoiceFilters>({
    fromWeek: getCurrentWeek(),
    toWeek: getCurrentWeek(),
    statusFilter: 'all',
    searchTerm: ''
  });

  function getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((now.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  const loadInvoiceData = useCallback(async () => {
    try {
      setLoading(true);

      // Build query based on filters
      let query = supabase
        .from('jobs')
        .select(`
          id,
          reference,
          title,
          client_name,
          status,
          created_at,
          updated_at,
          quotes (
            quoted_total,
            materials_cost,
            misc_cost
          )
        `);

      // Apply status filter
      if (filters.statusFilter !== 'all') {
        if (filters.statusFilter === 'complete') {
          query = query.eq('status', 'completed');
        } else if (filters.statusFilter === 'live') {
          query = query.in('status', ['in_progress', 'snagging']);
        } else if (filters.statusFilter === 'scheduled') {
          query = query.eq('status', 'planned');
        }
      }

      // Apply search filter
      if (filters.searchTerm) {
        query = query.or(`reference.ilike.%${filters.searchTerm}%,client_name.ilike.%${filters.searchTerm}%,title.ilike.%${filters.searchTerm}%`);
      }

      const { data: jobsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data for invoice interface
      const transformedJobs: InvoiceJob[] = (jobsData || []).map(job => {
        const quote = job.quotes?.[0];
        const quotedAmount = quote?.quoted_total || 0;
        const additions = (quote?.materials_cost || 0) + (quote?.misc_cost || 0);

        // Calculate progress based on status
        let progress = 0;
        let invoiceStatus: 'ready' | 'partial' | 'none' = 'none';

        switch (job.status) {
          case 'completed':
            progress = 100;
            invoiceStatus = 'ready';
            break;
          case 'snagging':
            progress = 95;
            invoiceStatus = 'partial';
            break;
          case 'in_progress':
            progress = Math.floor(Math.random() * 70) + 20; // Mock progress
            invoiceStatus = 'partial';
            break;
          default:
            progress = 0;
            invoiceStatus = 'none';
        }

        return {
          id: job.id,
          reference: job.reference || `JOB-${job.id.slice(0, 8)}`,
          location: job.title || 'Location not specified',
          client_name: job.client_name || 'Unknown Client',
          end_user: job.client_name, // Using client_name as end_user for now
          quoted_amount: quotedAmount,
          additions: additions,
          total_amount: quotedAmount + additions,
          status: (job.status as 'planned' | 'in_progress' | 'snagging' | 'completed') || 'planned',
          progress,
          last_invoice_date: undefined, // Would come from invoice table
          total_invoiced: 0, // Would come from invoice table
          invoice_status: invoiceStatus,
          created_at: job.created_at,
          updated_at: job.updated_at
        };
      });

      setJobs(transformedJobs);
    } catch (error: unknown) {
      console.error('Error loading invoice data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (hasInvoiceAccess) {
      loadInvoiceData();
    }
  }, [hasInvoiceAccess, loadInvoiceData]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Apply status filter
      if (filters.statusFilter === 'complete' && job.status !== 'completed') return false;
      if (filters.statusFilter === 'live' && !['in_progress', 'snagging'].includes(job.status)) return false;
      if (filters.statusFilter === 'partial' && job.invoice_status !== 'partial') return false;
      if (filters.statusFilter === 'scheduled' && job.status !== 'planned') return false;

      return true;
    });
  }, [jobs, filters]);

  const invoiceSummary = useMemo((): InvoiceSummary => {
    const selectedJobsList = filteredJobs.filter(job => selectedJobs.has(job.id));

    const completeJobs = selectedJobsList.filter(job => job.status === 'completed');
    const partialJobs = selectedJobsList.filter(job => job.invoice_status === 'partial');
    const scheduledJobs = selectedJobsList.filter(job => job.status === 'planned');

    const completeAmount = completeJobs.reduce((sum, job) => sum + job.total_amount, 0);
    const partialAmount = partialJobs.reduce((sum, job) => sum + (job.total_amount * job.progress / 100), 0);
    const scheduledAmount = scheduledJobs.reduce((sum, job) => sum + job.total_amount, 0);
    const totalAdditions = selectedJobsList.reduce((sum, job) => sum + job.additions, 0);

    const subtotal = completeAmount + partialAmount + scheduledAmount;
    const vat = subtotal * 0.20; // 20% VAT
    const total = subtotal + vat;

    return {
      selectedJobs: selectedJobsList.length,
      completeJobs: { count: completeJobs.length, amount: completeAmount },
      partialJobs: { count: partialJobs.length, amount: partialAmount },
      scheduledJobs: { count: scheduledJobs.length, amount: scheduledAmount },
      totalAdditions,
      subtotal,
      vat,
      total
    };
  }, [filteredJobs, selectedJobs]);

  const handleJobSelection = (jobId: string, selected: boolean) => {
    const newSelection = new Set(selectedJobs);
    if (selected) {
      newSelection.add(jobId);
    } else {
      newSelection.delete(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const handleSelectAll = () => {
    const allInvoiceableJobs = filteredJobs.filter(job => job.invoice_status !== 'none');
    if (selectedJobs.size === allInvoiceableJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(allInvoiceableJobs.map(job => job.id)));
    }
  };

  const getStatusBadge = (status: string, _progress: number) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge complete">✓ Complete</span>;
      case 'in_progress':
        return <span className="status-badge live">⚡ Live</span>;
      case 'snagging':
        return <span className="status-badge partial">◐ Snagging</span>;
      case 'planned':
        return <span className="status-badge scheduled">📅 Scheduled</span>;
      default:
        return <span className="status-badge planned">○ Planned</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const markJobComplete = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      // Refresh the jobs list
      await loadInvoiceData();

      // Show success message
      alert('Job marked as complete successfully!');
    } catch (error: unknown) {
      console.error('Error marking job complete:', error);
      alert('Failed to mark job as complete. Please try again.');
    }
  };

  const generateExportPreview = () => {
    const selectedJobsList = filteredJobs.filter(job => selectedJobs.has(job.id));
    let preview = `WEEK    DATE    ORDER_REF    CLIENT    AMOUNT    DESCRIPTION\n`;

    selectedJobsList.forEach(job => {
      const amount = job.invoice_status === 'partial'
        ? job.total_amount * job.progress / 100
        : job.total_amount;

      const description = job.invoice_status === 'partial'
        ? `${job.end_user} - Partial (${job.progress}%)`
        : `${job.end_user} - Complete`;

      preview += `${filters.fromWeek}    ${new Date().toISOString().split('T')[0]}    ${job.reference}    ${job.client_name}    ${formatCurrency(amount)}    ${description}\n`;
    });

    preview += `\nTOTALS:\n`;
    preview += `Subtotal: ${formatCurrency(invoiceSummary.subtotal)}\n`;
    preview += `VAT (20%): ${formatCurrency(invoiceSummary.vat)}\n`;
    preview += `Total: ${formatCurrency(invoiceSummary.total)}\n`;

    return preview;
  };

  if (permissionLoading) {
    return <div className="loading">Checking permissions...</div>;
  }

  if (!hasInvoiceAccess) {
    return (
      <div className="access-denied">
        <h3>Access Restricted</h3>
        <p>You don&apos;t have permission to access invoice schedules. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="invoice-schedule">
      <style jsx>{`
        .invoice-schedule {
          height: 100vh;
          background: #0a0a0a;
          color: #fafafa;
          padding: 24px;
          overflow-y: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px 24px;
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }

        .title-section h1 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.8px;
          margin-bottom: 6px;
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .permission-badge {
          background: rgba(37, 99, 235, 0.2);
          border: 1px solid rgba(37, 99, 235, 0.3);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          color: #60a5fa;
          margin-left: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .title-section p {
          color: #888;
          font-size: 14px;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 12px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #fafafa;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(8px);
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover {
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
          transform: translateY(-2px);
        }

        .btn-success {
          background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .btn-success:hover {
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
          transform: translateY(-2px);
        }

        .btn-export {
          background: rgba(249, 115, 22, 0.15);
          border-color: rgba(249, 115, 22, 0.4);
          color: #fb923c;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
        }

        .btn-export:hover {
          background: rgba(249, 115, 22, 0.25);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.25);
          transform: translateY(-2px);
        }

        .nav-path {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #888;
        }

        .nav-link {
          color: #60a5fa;
          text-decoration: none;
        }

        .filters {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 20px;
          align-items: flex-end;
          backdrop-filter: blur(12px);
          box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.05);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .filter-input {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.03);
          color: #fafafa;
          font-size: 13px;
          width: 160px;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .filter-input:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .table-container {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 24px;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.05);
        }

        .table-header {
          background: rgba(255,255,255,0.03);
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          display: flex;
          justify-content: space-between;
          align-items: center;
          backdrop-filter: blur(8px);
        }

        .table-title-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .table-actions {
          display: flex;
          gap: 12px;
        }

        .table-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .table-info {
          font-size: 13px;
          color: #888;
        }

        .table-wrapper {
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .data-table th {
          background: rgba(255,255,255,0.05);
          color: #a1a1aa;
          padding: 16px 18px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          font-weight: 700;
          position: sticky;
          top: 0;
          z-index: 1;
          backdrop-filter: blur(8px);
        }

        .data-table td {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
          font-size: 13px;
        }

        .data-table tr:hover {
          background: rgba(255,255,255,0.03);
          transition: background-color 0.2s ease;
        }

        .data-table tr.selected {
          background: rgba(37, 99, 235, 0.12);
          border-left: 4px solid #3b82f6;
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1);
        }

        .data-table tr.selected:hover {
          background: rgba(37, 99, 235, 0.15);
        }

        .checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(4px);
        }

        .checkbox:hover {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(59, 130, 246, 0.05);
          transform: scale(1.05);
        }

        .checkbox.checked {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: #2563eb;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .job-ref {
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
          font-weight: 800;
          color: #60a5fa;
          font-size: 13px;
          background: rgba(96, 165, 250, 0.08);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(96, 165, 250, 0.2);
          backdrop-filter: blur(4px);
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(4px);
          border: 1px solid;
        }

        .status-badge.complete {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
        }

        .status-badge.live {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
          color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
        }

        .status-badge.partial {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }

        .status-badge.planned {
          background: rgba(156, 163, 175, 0.15);
          border-color: rgba(156, 163, 175, 0.3);
          color: #9ca3af;
        }

        .status-badge.scheduled {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
          color: #8b5cf6;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
        }

        .amount {
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
          font-weight: 700;
          color: #10b981;
          text-align: right;
          font-size: 14px;
        }

        .additions {
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
          font-size: 12px;
          color: #fb923c;
          text-align: right;
          font-weight: 600;
        }

        .location-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .location-name {
          font-weight: 500;
          color: #fafafa;
        }

        .end-user {
          font-size: 11px;
          color: #a1a1aa;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .client-cell {
          font-weight: 500;
        }

        .client-name {
          color: #fafafa;
        }

        .summary-grand-total {
          font-size: 18px;
          font-weight: 800;
          color: #22c55e;
          border-bottom: none;
          padding-top: 16px;
          margin-top: 8px;
          border-top: 2px solid rgba(34, 197, 94, 0.2);
        }

        .grand-total-amount {
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
          font-size: 20px;
          font-weight: 800;
          color: #22c55e;
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
        }

        .progress {
          text-align: center;
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
          overflow: hidden;
          backdrop-filter: blur(4px);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
          transition: width 0.3s ease;
          box-shadow: 0 1px 3px rgba(34, 197, 94, 0.3);
        }

        .progress-text {
          font-size: 11px;
          color: #a1a1aa;
          font-weight: 600;
          min-width: 32px;
        }

        .invoiced {
          text-align: center;
          font-size: 16px;
        }

        .invoice-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-weight: 700;
          transition: all 0.2s;
        }

        .invoice-indicator.ready {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 2px solid rgba(34, 197, 94, 0.4);
        }

        .invoice-indicator.partial {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 2px solid rgba(245, 158, 11, 0.4);
        }

        .invoice-indicator.none {
          background: rgba(156, 163, 175, 0.1);
          color: #9ca3af;
          border: 2px solid rgba(156, 163, 175, 0.2);
        }

        .bottom-panel {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          min-height: 320px;
        }

        .selection-panel, .export-panel {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 0 rgba(255,255,255,0.05);
        }

        .export-panel {
          flex: 1.2;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .selected-count {
          background: rgba(37, 99, 235, 0.12);
          border: 1px solid rgba(37, 99, 235, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          font-size: 15px;
          font-weight: 600;
          color: #60a5fa;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .selected-count::before {
          content: '✓';
          background: #3b82f6;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 14px;
          font-weight: 500;
        }

        .amount-positive {
          color: #22c55e;
          font-weight: 700;
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
        }

        .amount-partial {
          color: #f59e0b;
          font-weight: 700;
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
        }

        .amount-additions {
          color: #fb923c;
          font-weight: 700;
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
        }

        .amount-scheduled {
          color: #8b5cf6;
          font-weight: 700;
          font-family: 'Monaco', 'Menlo', 'SF Mono', monospace;
        }

        .summary-total {
          font-weight: 700;
          font-size: 16px;
          background: rgba(255,255,255,0.03);
          margin: 16px -24px -24px -24px;
          padding: 20px 24px;
          border-radius: 0 0 16px 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
        }

        .export-preview {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 11px;
          color: #888;
          max-height: 180px;
          overflow-y: auto;
          margin-bottom: 16px;
          white-space: pre-wrap;
        }

        .export-actions {
          display: flex;
          gap: 8px;
        }

        .btn-small {
          padding: 10px 16px;
          font-size: 12px;
          flex: 1;
          text-align: center;
          font-weight: 600;
          border-radius: 8px;
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn:disabled:hover {
          transform: none;
          box-shadow: none;
          background: rgba(255,255,255,0.02);
        }

        .loading, .access-denied {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #888;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(59, 130, 246, 0.2);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          color: #a1a1aa;
          font-size: 14px;
          font-weight: 500;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          font-size: 32px;
          opacity: 0.6;
        }

        .empty-text {
          color: #a1a1aa;
          font-size: 16px;
          font-weight: 600;
        }

        .empty-hint {
          color: #71717a;
          font-size: 13px;
        }

        .actions {
          text-align: center;
          width: 120px;
        }

        .btn-action {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .btn-complete {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          border: 1px solid rgba(34, 197, 94, 0.3);
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
        }

        .btn-complete:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }

        .btn-complete:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="title-section">
          <h1>
            Invoice Schedule
            <span className="permission-badge">⚙️ Configurable Access</span>
          </h1>
          <p>Generate invoice schedules from live job data • Export to client-ready format</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-export">📊 Export to Excel</button>
          <button className="btn">💾 Save Template</button>
          <button className="btn btn-primary">📤 Send to Accounting</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-path">
        <a href="#" className="nav-link">Labour Calendar</a> → <strong>Invoice Schedule</strong>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">Week Range</label>
          <input
            type="week"
            className="filter-input"
            value={filters.fromWeek}
            onChange={(e) => setFilters({...filters, fromWeek: e.target.value})}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">To Week</label>
          <input
            type="week"
            className="filter-input"
            value={filters.toWeek}
            onChange={(e) => setFilters({...filters, toWeek: e.target.value})}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Status Filter</label>
          <select
            className="filter-input"
            value={filters.statusFilter}
            onChange={(e) => setFilters({...filters, statusFilter: e.target.value as typeof filters.statusFilter})}
          >
            <option value="all">All Invoiceable</option>
            <option value="complete">Complete Only</option>
            <option value="live">Live Jobs</option>
            <option value="partial">Partial Invoice Available</option>
            <option value="scheduled">Scheduled Jobs</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Job ref, client..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
          />
        </div>
        <button className="btn btn-primary" onClick={loadInvoiceData}>
          🔍 Apply Filters
        </button>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <div className="table-header">
          <div className="table-title-section">
            <h3 className="table-title">Jobs Available for Invoicing</h3>
            <div className="table-info">
              Showing {filteredJobs.length} jobs • {selectedJobs.size} selected
            </div>
          </div>
          <div className="table-actions">
            <button
              className="btn btn-small"
              onClick={handleSelectAll}
              disabled={filteredJobs.filter(job => job.invoice_status !== 'none').length === 0}
            >
              {selectedJobs.size > 0 ? '❌ Clear All' : '✓ Select All'}
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '40px'}}>
                  <div className="checkbox" onClick={handleSelectAll}>
                    {selectedJobs.size > 0 && '✓'}
                  </div>
                </th>
                <th>Reference</th>
                <th>Location</th>
                <th>Client Name</th>
                <th>Quoted Amount</th>
                <th>Additions</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Total Invoiced</th>
                <th>Ready to Invoice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{textAlign: 'center', padding: '60px'}}>
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <div className="loading-text">Loading invoice data...</div>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{textAlign: 'center', padding: '60px', color: '#888'}}>
                    <div className="empty-state">
                      <div className="empty-icon">📊</div>
                      <div className="empty-text">No jobs found matching current filters</div>
                      <div className="empty-hint">Try adjusting your search criteria</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => (
                  <tr
                    key={job.id}
                    className={selectedJobs.has(job.id) ? 'selected' : ''}
                  >
                    <td>
                      <div
                        className={`checkbox ${selectedJobs.has(job.id) ? 'checked' : ''}`}
                        onClick={() => handleJobSelection(job.id, !selectedJobs.has(job.id))}
                      >
                        {selectedJobs.has(job.id) && '✓'}
                      </div>
                    </td>
                    <td><span className="job-ref">{job.reference}</span></td>
                    <td>
                      <div className="location-cell">
                        <div className="location-name">{job.location}</div>
                        {job.end_user && job.end_user !== job.client_name && (
                          <div className="end-user">👤 {job.end_user}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="client-cell">
                        <div className="client-name">{job.client_name}</div>
                      </div>
                    </td>
                    <td className="amount">{formatCurrency(job.quoted_amount)}</td>
                    <td className="additions">{formatCurrency(job.additions)}</td>
                    <td className="amount">{formatCurrency(job.total_amount)}</td>
                    <td>{getStatusBadge(job.status, job.progress)}</td>
                    <td className="progress">
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{width: `${job.progress}%`}}
                          ></div>
                        </div>
                        <span className="progress-text">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="invoiced">{formatCurrency(job.total_invoiced)}</td>
                    <td className="invoiced">
                      <span className={`invoice-indicator ${job.invoice_status}`}>
                        {job.invoice_status === 'ready' ? '✓' :
                         job.invoice_status === 'partial' ? '◐' : '○'}
                      </span>
                    </td>
                    <td className="actions">
                      {job.status !== 'completed' && role === 'director' && (
                        <button
                          className="btn-action btn-complete"
                          onClick={() => {
                            if (confirm(`Mark "${job.reference}" as complete? This will update the job status.`)) {
                              markJobComplete(job.id);
                            }
                          }}
                          title="Mark job as complete"
                        >
                          ✅ Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bottom-panel">
        {/* Selection Summary */}
        <div className="selection-panel">
          <h3 className="panel-title">Invoice Summary</h3>

          <div className="selected-count">
            <strong>{invoiceSummary.selectedJobs} jobs selected</strong> for {filters.fromWeek} invoice
          </div>

          <div className="summary-item">
            <span>✓ Complete Jobs ({invoiceSummary.completeJobs.count}):</span>
            <span className="amount-positive">{formatCurrency(invoiceSummary.completeJobs.amount)}</span>
          </div>
          <div className="summary-item">
            <span>◐ Partial Invoice ({invoiceSummary.partialJobs.count}):</span>
            <span className="amount-partial">{formatCurrency(invoiceSummary.partialJobs.amount)}</span>
          </div>
          <div className="summary-item">
            <span>📅 Scheduled Jobs ({invoiceSummary.scheduledJobs.count}):</span>
            <span className="amount-scheduled">{formatCurrency(invoiceSummary.scheduledJobs.amount)}</span>
          </div>
          <div className="summary-item">
            <span>➕ Total Additions:</span>
            <span className="amount-additions">{formatCurrency(invoiceSummary.totalAdditions)}</span>
          </div>

          <div className="summary-total">
            <div className="summary-item">
              <span>{filters.fromWeek} Total:</span>
              <span>{formatCurrency(invoiceSummary.subtotal)}</span>
            </div>
            <div className="summary-item">
              <span>VAT (20%):</span>
              <span>{formatCurrency(invoiceSummary.vat)}</span>
            </div>
            <div className="summary-item summary-grand-total">
              <span>💰 Total Invoice Amount:</span>
              <span className="grand-total-amount">{formatCurrency(invoiceSummary.total)}</span>
            </div>
          </div>
        </div>

        {/* Export Preview */}
        <div className="export-panel">
          <h3 className="panel-title">Export Preview</h3>

          <div className="export-preview">
            {selectedJobs.size > 0 ? generateExportPreview() : 'Select jobs to preview export...'}
          </div>

          <div className="export-actions">
            <button
              className="btn btn-small btn-export"
              onClick={() => navigator.clipboard.writeText(generateExportPreview())}
              disabled={selectedJobs.size === 0}
            >
              📋 Copy to Clipboard
            </button>
            <button className="btn btn-small btn-success" disabled={selectedJobs.size === 0}>
              📊 Export Excel
            </button>
            <button className="btn btn-small btn-primary" disabled={selectedJobs.size === 0}>
              📤 Send to Accounting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceScheduleTab;