/**
 * Build Targets Page - Progress tracking for job product completion
 * Shows build targets with completion progress and daily reporting
 * Director-only editing with comprehensive progress visualization
 */

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback } from "react";

import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

// Types for build targets
interface BuildTarget {
  id: string;
  job_id: string;
  product_code: string;
  description: string;
  total_quantity: number;
  build_order: number;
  target_completion_date: string | null;
  is_priority: boolean;
  created_at: string;
}

interface CompletionSummary {
  target_id: string;
  completed_quantity: number;
  remaining_quantity: number;
  completion_percentage: number;
  last_completion_date: string | null;
}

interface DailyCompletion {
  id: string;
  target_id: string;
  work_date: string;
  quantity_completed: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface JobBasicInfo {
  id: string;
  title: string;
  reference: string;
  client_name: string;
  status: string;
}

interface NewCompletion {
  target_id: string;
  work_date: string;
  quantity_completed: number;
  notes: string;
}

export default function BuildTargetsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { role, loading: roleLoading } = useUserRole();
  
  // State management
  const [jobInfo, setJobInfo] = useState<JobBasicInfo | null>(null);
  const [targets, setTargets] = useState<BuildTarget[]>([]);
  const [completions, setCompletions] = useState<Record<string, CompletionSummary>>({});
  const [dailyCompletions, setDailyCompletions] = useState<Record<string, DailyCompletion[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_isAddingCompletion, setIsAddingCompletion] = useState<string | null>(null);
  
  const [newCompletion, setNewCompletion] = useState<NewCompletion>({
    target_id: '',
    work_date: new Date().toISOString().split('T')[0],
    quantity_completed: 1,
    notes: ''
  });

  const canManage = role === 'director';

  // Load job data
  const loadJobData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load basic job info
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, reference, client_name, status')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJobInfo(jobData);

      // Load build targets
      const { data: targetsData, error: targetsError } = await supabase
        .from('job_build_targets')
        .select('*')
        .eq('job_id', id)
        .order('build_order', { ascending: true });

      if (targetsError) throw targetsError;
      setTargets(targetsData || []);

      // Load completion summaries using the view
      const { data: completionData, error: completionError } = await supabase
        .from('v_job_completion')
        .select('*')
        .eq('job_id', id);

      if (completionError) throw completionError;
      
      // Convert to record for easy lookup
      const completionRecord: Record<string, CompletionSummary> = {};
      (completionData || []).forEach(comp => {
        if (comp.target_id) {
          completionRecord[comp.target_id] = {
            target_id: comp.target_id,
            completed_quantity: comp.completed_quantity || 0,
            remaining_quantity: comp.remaining_quantity || 0,
            completion_percentage: comp.completion_percentage || 0,
            last_completion_date: comp.last_completion_date
          };
        }
      });
      setCompletions(completionRecord);

      // Load daily completions
      const { data: dailyData, error: dailyError } = await supabase
        .from('day_product_completions')
        .select('*')
        .eq('job_id', id)
        .order('work_date', { ascending: false });

      if (dailyError) throw dailyError;
      
      // Group by target_id
      const dailyRecord: Record<string, DailyCompletion[]> = {};
      (dailyData || []).forEach(daily => {
        if (!dailyRecord[daily.target_id]) {
          dailyRecord[daily.target_id] = [];
        }
        dailyRecord[daily.target_id].push(daily);
      });
      setDailyCompletions(dailyRecord);

    } catch (err) {
      // console.error('Error loading build targets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load build targets');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  // Add completion record
  const handleAddCompletion = async () => {
    if (!id || !canManage || !newCompletion.target_id) return;

    try {
      const target = targets.find(t => t.id === newCompletion.target_id);
      if (!target) throw new Error('Target not found');

      const { error } = await supabase.rpc('record_daily_completion', {
        p_job_id: id,
        p_product_code: target.product_code,
        p_work_date: newCompletion.work_date,
        p_quantity_completed: newCompletion.quantity_completed,
        p_notes: newCompletion.notes || null
      });

      if (error) throw error;

      // Reset form and reload data
      setNewCompletion({
        target_id: '',
        work_date: new Date().toISOString().split('T')[0],
        quantity_completed: 1,
        notes: ''
      });
      setIsAddingCompletion(null);
      await loadJobData();

    } catch (err) {
      // console.error('Error adding completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to add completion');
    }
  };

  // Get completion percentage with fallback
  const getCompletionPercentage = (targetId: string): number => {
    const completion = completions[targetId];
    return completion ? completion.completion_percentage : 0;
  };

  // Get remaining quantity
  const getRemainingQuantity = (target: BuildTarget): number => {
    const completion = completions[target.id];
    return completion ? completion.remaining_quantity : target.total_quantity;
  };

  // Get completed quantity
  const getCompletedQuantity = (targetId: string): number => {
    const completion = completions[targetId];
    return completion ? completion.completed_quantity : 0;
  };

  if (roleLoading || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: theme.colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: theme.colors.text }}>Loading build targets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: theme.colors.bg,
        padding: '2rem'
      }}>
        <div style={{ 
          color: theme.colors.danger,
          backgroundColor: theme.colors.panel,
          padding: '1rem',
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.colors.border}`
        }}>
          <h2>Error Loading Build Targets</h2>
          <p>{error}</p>
          <button 
            onClick={loadJobData}
            style={{
              padding: '8px 16px',
              backgroundColor: theme.colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: theme.radii.sm,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  const overallProgress = targets.length > 0 
    ? targets.reduce((sum, target) => sum + getCompletionPercentage(target.id), 0) / targets.length
    : 0;

  const totalItems = targets.reduce((sum, target) => sum + target.total_quantity, 0);
  const completedItems = targets.reduce((sum, target) => sum + getCompletedQuantity(target.id), 0);

  return (
    <>
      <Head>
        <title>{jobInfo ? `Build Targets - ${jobInfo.reference} • BHIT Work OS` : "Build Targets • BHIT Work OS"}</title>
      </Head>

      <main style={{ 
        minHeight: '100vh',
        background: theme.colors.bg,
        color: theme.colors.text,
        padding: '1rem'
      }}>
        {/* Header */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <Link href={`/job/${id}`} style={{
              color: theme.colors.textSubtle,
              textDecoration: 'none',
              fontSize: '14px'
            }}>
              ← Back to Job
            </Link>
          </div>
          
          {jobInfo && (
            <div style={{
              backgroundColor: theme.colors.panel,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.xl,
              padding: '1.5rem',
              boxShadow: theme.shadow
            }}>
              <h1 style={{ 
                margin: 0, 
                marginBottom: '0.5rem',
                fontSize: '1.75rem',
                fontWeight: 700 
              }}>
                Build Targets
              </h1>
              <div style={{ 
                color: theme.colors.textSubtle,
                fontSize: '1rem'
              }}>
                {jobInfo.reference} • {jobInfo.client_name} • {jobInfo.title}
              </div>
            </div>
          )}
        </div>

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '2rem'
        }}>
          {/* Left Sidebar - Overall Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Overall Progress Card */}
            <div style={{
              backgroundColor: theme.colors.panel,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.xl,
              padding: '1.5rem',
              boxShadow: theme.shadow
            }}>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '1rem',
                fontSize: '1.25rem',
                fontWeight: 600 
              }}>
                Overall Progress
              </h2>
              
              {/* Circular Progress */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `conic-gradient(${theme.colors.accentAlt} ${overallProgress * 3.6}deg, ${theme.colors.muted} 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.panel,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700
                  }}>
                    {Math.round(overallProgress)}%
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <span style={{ color: theme.colors.textSubtle }}>Total Products</span>
                  <span style={{ fontWeight: 600 }}>{targets.length}</span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <span style={{ color: theme.colors.textSubtle }}>Total Items</span>
                  <span style={{ fontWeight: 600 }}>{totalItems}</span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <span style={{ color: theme.colors.textSubtle }}>Completed</span>
                  <span style={{ 
                    fontWeight: 600,
                    color: theme.colors.accentAlt 
                  }}>
                    {completedItems}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <span style={{ color: theme.colors.textSubtle }}>Remaining</span>
                  <span style={{ 
                    fontWeight: 600,
                    color: theme.colors.warn 
                  }}>
                    {totalItems - completedItems}
                  </span>
                </div>
              </div>
            </div>

            {/* Add Completion Form */}
            {canManage && (
              <div style={{
                backgroundColor: theme.colors.panel,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.xl,
                padding: '1.5rem',
                boxShadow: theme.shadow
              }}>
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: 600 
                }}>
                  Record Progress
                </h3>
                
                {targets.length === 0 ? (
                  <div style={{ color: theme.colors.textSubtle, fontSize: '0.9rem' }}>
                    No build targets available. Build targets are created automatically when a job is created from a quote.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Product Selection */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.25rem',
                        fontSize: '0.85rem',
                        color: theme.colors.textSubtle 
                      }}>
                        Product
                      </label>
                      <select
                        value={newCompletion.target_id}
                        onChange={(e) => setNewCompletion({...newCompletion, target_id: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: theme.colors.muted,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radii.sm,
                          color: theme.colors.text,
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="">Select product...</option>
                        {targets.map(target => (
                          <option key={target.id} value={target.id}>
                            {target.product_code} - {target.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.25rem',
                        fontSize: '0.85rem',
                        color: theme.colors.textSubtle 
                      }}>
                        Work Date
                      </label>
                      <input
                        type="date"
                        value={newCompletion.work_date}
                        onChange={(e) => setNewCompletion({...newCompletion, work_date: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: theme.colors.muted,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radii.sm,
                          color: theme.colors.text,
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.25rem',
                        fontSize: '0.85rem',
                        color: theme.colors.textSubtle 
                      }}>
                        Quantity Completed
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newCompletion.quantity_completed}
                        onChange={(e) => setNewCompletion({...newCompletion, quantity_completed: parseInt(e.target.value) || 1})}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: theme.colors.muted,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radii.sm,
                          color: theme.colors.text,
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.25rem',
                        fontSize: '0.85rem',
                        color: theme.colors.textSubtle 
                      }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={newCompletion.notes}
                        onChange={(e) => setNewCompletion({...newCompletion, notes: e.target.value})}
                        placeholder="Any notes about this completion..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: theme.colors.muted,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radii.sm,
                          color: theme.colors.text,
                          fontSize: '0.9rem',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleAddCompletion}
                      disabled={!newCompletion.target_id}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: newCompletion.target_id ? theme.colors.accentAlt : theme.colors.muted,
                        color: 'white',
                        border: 'none',
                        borderRadius: theme.radii.sm,
                        cursor: newCompletion.target_id ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        opacity: newCompletion.target_id ? 1 : 0.6
                      }}
                    >
                      Record Progress
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content - Build Targets List */}
          <div style={{
            backgroundColor: theme.colors.panel,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.xl,
            padding: '1.5rem',
            boxShadow: theme.shadow
          }}>
            <h2 style={{ 
              margin: 0, 
              marginBottom: '1.5rem',
              fontSize: '1.25rem',
              fontWeight: 600 
            }}>
              Product Targets ({targets.length})
            </h2>

            {targets.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '3rem 1rem',
                color: theme.colors.textSubtle 
              }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  No build targets found
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Build targets are automatically created when a job is created from a SmartQuote.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {targets.map((target) => {
                  const completionPercentage = getCompletionPercentage(target.id);
                  const _remaining = getRemainingQuantity(target);
                  const completed = getCompletedQuantity(target.id);
                  const dailyHistory = dailyCompletions[target.id] || [];
                  
                  return (
                    <div
                      key={target.id}
                      style={{
                        backgroundColor: theme.colors.panelAlt,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.lg,
                        padding: '1.5rem'
                      }}
                    >
                      {/* Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '1rem' 
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <h3 style={{ 
                              margin: 0,
                              fontSize: '1.1rem',
                              fontWeight: 600
                            }}>
                              {target.product_code}
                            </h3>
                            {target.is_priority && (
                              <span style={{
                                padding: '2px 6px',
                                backgroundColor: theme.colors.warn,
                                color: 'white',
                                fontSize: '0.7rem',
                                borderRadius: theme.radii.sm,
                                fontWeight: 600,
                                textTransform: 'uppercase'
                              }}>
                                PRIORITY
                              </span>
                            )}
                            <span style={{
                              padding: '2px 6px',
                              backgroundColor: theme.colors.muted,
                              color: theme.colors.textSubtle,
                              fontSize: '0.7rem',
                              borderRadius: theme.radii.sm,
                              fontWeight: 500
                            }}>
                              Order #{target.build_order}
                            </span>
                          </div>
                          <div style={{ 
                            color: theme.colors.textSubtle,
                            fontSize: '0.9rem',
                            marginBottom: '0.5rem'
                          }}>
                            {target.description}
                          </div>
                        </div>
                        
                        <div style={{ 
                          textAlign: 'right',
                          minWidth: '120px'
                        }}>
                          <div style={{ 
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: completionPercentage >= 100 ? theme.colors.accentAlt : theme.colors.accent,
                            marginBottom: '0.25rem'
                          }}>
                            {Math.round(completionPercentage)}%
                          </div>
                          <div style={{ 
                            fontSize: '0.8rem',
                            color: theme.colors.textSubtle 
                          }}>
                            {completed} of {target.total_quantity} complete
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{
                        height: '8px',
                        backgroundColor: theme.colors.muted,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(completionPercentage, 100)}%`,
                          backgroundColor: completionPercentage >= 100 ? theme.colors.accentAlt : theme.colors.accent,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      {/* Recent Activity */}
                      {dailyHistory.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <h4 style={{ 
                            margin: 0, 
                            marginBottom: '0.5rem',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: theme.colors.textSubtle
                          }}>
                            Recent Progress ({dailyHistory.length} entries)
                          </h4>
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.25rem',
                            maxHeight: '120px',
                            overflowY: 'auto'
                          }}>
                            {dailyHistory.slice(0, 3).map((daily) => (
                              <div
                                key={daily.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem',
                                  backgroundColor: theme.colors.muted,
                                  borderRadius: theme.radii.sm,
                                  fontSize: '0.8rem'
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 600 }}>
                                    +{daily.quantity_completed}
                                  </span>
                                  {daily.notes && (
                                    <span style={{ 
                                      marginLeft: '0.5rem',
                                      color: theme.colors.textSubtle,
                                      fontStyle: 'italic'
                                    }}>
                                      &quot;{daily.notes}&quot;
                                    </span>
                                  )}
                                </div>
                                <span style={{ color: theme.colors.textSubtle }}>
                                  {new Date(daily.work_date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}