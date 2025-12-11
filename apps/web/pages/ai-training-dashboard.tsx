// AI Training Dashboard - Watch the AI learn in real-time
// Shows active learning requests, patterns, predictions, and anomalies

import { Brain, TrendingUp, AlertTriangle, Sparkles, Target, CheckCircle, XCircle, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import Layout from '../components/Layout';
import {
  getLearningInsights,
  detectCorrectionPatterns,
  getPendingLearningRequests,
  resolveActiveLearningRequest,
  type LearningInsights,
  type CorrectionPattern,
  type ActiveLearningRequest,
} from '../lib/aiLearningEngine';
import { theme } from '../lib/theme';
import { getDashboardButtonStyle, getDashboardCardStyle } from '../modules/smartquote/utils/dashboardStyles';

export default function AITrainingDashboard() {
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [patterns, setPatterns] = useState<CorrectionPattern[]>([]);
  const [learningRequests, setLearningRequests] = useState<ActiveLearningRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ActiveLearningRequest | null>(null);
  const [userCorrection, setUserCorrection] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [insightsData, patternsData, requestsData] = await Promise.all([
        getLearningInsights(),
        detectCorrectionPatterns(2),
        getPendingLearningRequests(20),
      ]);

      setInsights(insightsData);
      setPatterns(patternsData);
      setLearningRequests(requestsData);
    } catch (error) {
      console.error('Error loading AI training data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    if (!userCorrection.trim()) {
      alert('Please provide a correction');
      return;
    }

    try {
      await resolveActiveLearningRequest(requestId, userCorrection);
      setSelectedRequest(null);
      setUserCorrection('');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error resolving request:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          color: theme.colors.textSubtle,
        }}>
          <Brain size={48} style={{ animation: 'pulse 2s infinite' }} />
          <span style={{ marginLeft: '1rem', fontSize: '1.25rem' }}>Loading AI insights...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: theme.colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <Brain size={32} />
            AI Training Dashboard
          </h1>
          <p style={{ color: theme.colors.textSubtle, marginTop: '0.5rem' }}>
            Watch the AI learn from every correction and improve automatically
          </p>
        </div>

        {/* Top Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            ...getDashboardCardStyle(),
            padding: '1.5rem',
            background: `linear-gradient(135deg, ${theme.colors.accent}20 0%, ${theme.colors.panel} 100%)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: theme.colors.textSubtle }}>Total Corrections</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: theme.colors.text }}>
                  {insights?.total_corrections || 0}
                </p>
              </div>
              <Brain size={32} color={theme.colors.accent} />
            </div>
            <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle, marginTop: '0.5rem' }}>
              AI learns from each one
            </p>
          </div>

          <div style={{
            ...getDashboardCardStyle(),
            padding: '1.5rem',
            background: `linear-gradient(135deg, #10b98120 0%, ${theme.colors.panel} 100%)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: theme.colors.textSubtle }}>Patterns Detected</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: theme.colors.text }}>
                  {insights?.patterns_detected || 0}
                </p>
              </div>
              <Target size={32} color="#10b981" />
            </div>
            <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle, marginTop: '0.5rem' }}>
              Auto-fixes available
            </p>
          </div>

          <div style={{
            ...getDashboardCardStyle(),
            padding: '1.5rem',
            background: `linear-gradient(135deg, #f59e0b20 0%, ${theme.colors.panel} 100%)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: theme.colors.textSubtle }}>Pending Help</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: theme.colors.text }}>
                  {insights?.active_learning_pending || 0}
                </p>
              </div>
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle, marginTop: '0.5rem' }}>
              AI needs human help
            </p>
          </div>

          <div style={{
            ...getDashboardCardStyle(),
            padding: '1.5rem',
            background: insights?.accuracy_trend === 'improving'
              ? `linear-gradient(135deg, #10b98120 0%, ${theme.colors.panel} 100%)`
              : insights?.accuracy_trend === 'declining'
              ? `linear-gradient(135deg, #ef444420 0%, ${theme.colors.panel} 100%)`
              : `linear-gradient(135deg, ${theme.colors.accentAlt}20 0%, ${theme.colors.panel} 100%)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: theme.colors.textSubtle }}>Accuracy Trend</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme.colors.text, textTransform: 'capitalize' }}>
                  {insights?.accuracy_trend || 'stable'}
                </p>
              </div>
              {insights?.accuracy_trend === 'improving' ? (
                <TrendingUp size={32} color="#10b981" />
              ) : insights?.accuracy_trend === 'declining' ? (
                <AlertTriangle size={32} color="#ef4444" />
              ) : (
                <CheckCircle size={32} color={theme.colors.accentAlt} />
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle, marginTop: '0.5rem' }}>
              {insights?.accuracy_trend === 'improving' && '✅ Getting better!'}
              {insights?.accuracy_trend === 'declining' && '⚠️ Needs attention'}
              {insights?.accuracy_trend === 'stable' && 'Maintaining performance'}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {insights && insights.recommendations.length > 0 && (
          <div style={{
            ...getDashboardCardStyle(),
            padding: '1.5rem',
            marginBottom: '2rem',
            background: `linear-gradient(135deg, ${theme.colors.accent}10 0%, ${theme.colors.panel} 100%)`,
            border: `1px solid ${theme.colors.accent}40`,
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: theme.colors.text,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Sparkles size={20} color={theme.colors.accent} />
              AI Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insights.recommendations.map((rec, i) => (
                <div key={i} style={{
                  padding: '0.75rem',
                  background: theme.colors.panel,
                  borderRadius: theme.radii.sm,
                  borderLeft: `3px solid ${theme.colors.accent}`,
                }}>
                  <p style={{ color: theme.colors.text, fontSize: '0.875rem' }}>{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Active Learning Requests */}
          <div style={{ ...getDashboardCardStyle(), padding: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: theme.colors.text,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertTriangle size={20} color="#f59e0b" />
              AI Needs Help ({learningRequests.length})
            </h3>

            {learningRequests.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: theme.colors.textSubtle,
              }}>
                <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No pending requests - AI is confident!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                {learningRequests.map(req => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    style={{
                      padding: '1rem',
                      background: selectedRequest?.id === req.id ? `${theme.colors.accent}20` : theme.colors.panel,
                      border: `1px solid ${selectedRequest?.id === req.id ? theme.colors.accent : theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: theme.colors.text, fontSize: '0.875rem' }}>
                          {req.field_name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: theme.radii.sm,
                        fontSize: '0.75rem',
                        background: req.confidence < 50 ? '#ef444420' : '#f59e0b20',
                        color: req.confidence < 50 ? '#ef4444' : '#f59e0b',
                      }}>
                        {req.confidence}% confidence
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: theme.colors.text, marginBottom: '0.5rem' }}>
                      Extracted: <strong>{req.extracted_value}</strong>
                    </p>
                    {req.context && (
                      <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle }}>
                        {req.context}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Request Dialog */}
            {selectedRequest && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: `${theme.colors.accent}10`,
                border: `1px solid ${theme.colors.accent}`,
                borderRadius: theme.radii.md,
              }}>
                <h4 style={{ color: theme.colors.text, marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Help the AI learn:
                </h4>
                <input
                  type="text"
                  value={userCorrection}
                  onChange={(e) => setUserCorrection(e.target.value)}
                  placeholder="Enter correct value"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: theme.colors.panel,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.text,
                    marginBottom: '0.75rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleResolveRequest(selectedRequest.id)}
                    style={{
                      ...getDashboardButtonStyle('primary'),
                      flex: 1,
                      fontSize: '0.875rem',
                    }}
                  >
                    <CheckCircle size={14} />
                    Teach AI
                  </button>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    style={{
                      ...getDashboardButtonStyle('secondary'),
                      fontSize: '0.875rem',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detected Patterns */}
          <div style={{ ...getDashboardCardStyle(), padding: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: theme.colors.text,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Target size={20} color="#10b981" />
              Learned Patterns ({patterns.length})
            </h3>

            {patterns.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: theme.colors.textSubtle,
              }}>
                <Brain size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>AI is still learning - make corrections to detect patterns</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                {patterns.slice(0, 10).map((pattern, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '1rem',
                      background: theme.colors.panel,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: theme.colors.text, fontSize: '0.875rem' }}>
                          {pattern.field_name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle, textTransform: 'capitalize' }}>
                          {pattern.pattern_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: theme.radii.sm,
                          fontSize: '0.75rem',
                          background: '#10b98120',
                          color: '#10b981',
                          display: 'inline-block',
                        }}>
                          {pattern.confidence}% confident
                        </p>
                        <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle, marginTop: '0.25rem' }}>
                          {pattern.occurrences} times
                        </p>
                      </div>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '0.5rem',
                      alignItems: 'center',
                      marginTop: '0.75rem',
                    }}>
                      <div style={{
                        padding: '0.5rem',
                        background: '#ef444410',
                        border: '1px solid #ef444440',
                        borderRadius: theme.radii.sm,
                        fontSize: '0.75rem',
                        textAlign: 'center',
                      }}>
                        {pattern.example_original}
                      </div>
                      <span style={{ color: theme.colors.accent }}>→</span>
                      <div style={{
                        padding: '0.5rem',
                        background: '#10b98110',
                        border: '1px solid #10b98140',
                        borderRadius: theme.radii.sm,
                        fontSize: '0.75rem',
                        textAlign: 'center',
                      }}>
                        {pattern.example_corrected}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Problem Fields */}
        {insights && insights.top_problem_fields.length > 0 && (
          <div style={{ ...getDashboardCardStyle(), padding: '1.5rem', marginTop: '2rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: theme.colors.text,
              marginBottom: '1rem',
            }}>
              Fields Needing Most Attention
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {insights.top_problem_fields.map(({ field, corrections }) => (
                <div key={field} style={{
                  padding: '1rem',
                  background: theme.colors.panel,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii.sm,
                }}>
                  <p style={{ fontWeight: 600, color: theme.colors.text, marginBottom: '0.5rem' }}>
                    {field}
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme.colors.accent }}>
                    {corrections}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: theme.colors.textSubtle }}>
                    corrections made
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
