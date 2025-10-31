import React, { useState, useEffect, useCallback } from 'react';

import { LabourMetrics, TeamRecommendation } from '../../lib/labour-calculator';

interface LabourDashboardProps {
  jobId: string;
  targetCompletionDate?: Date;
}

interface LabourData {
  metrics: LabourMetrics;
  teamRecommendation: TeamRecommendation;
  dailyTrends: {
    last7Days: Array<{
      date: string;
      hoursWorked: number;
      workersOnSite: number;
      efficiency: number;
    }>;
    averageEfficiency: number;
    averageWorkersOnSite: number;
  };
  costAnalysis?: {
    originalCost: number;
    projectedCost: number;
    variance: number;
    variancePercentage: number;
  };
  isLoading: boolean;
}

export default function LabourDashboard({ jobId, targetCompletionDate: _targetCompletionDate }: LabourDashboardProps) {
  const [data, setData] = useState<LabourData>({
    metrics: {
      hoursRemaining: 0,
      requiredTeamSize: 4,
      projectedCompletion: new Date(),
      efficiency: 100,
      burnRate: 32,
      daysAhead: 0,
      alerts: []
    },
    teamRecommendation: {
      current: 4,
      recommended: 4,
      reasoning: 'Standard team size',
      urgency: 'low',
      costImpact: 0
    },
    dailyTrends: {
      last7Days: [],
      averageEfficiency: 100,
      averageWorkersOnSite: 4
    },
    isLoading: true
  });

  const loadLabourData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`/api/v2/projects/${jobId}/labour-analysis`);
      const analysisData = await response.json();

      if (analysisData.success) {
        setData(prev => ({
          ...prev,
          metrics: analysisData.analysis,
          teamRecommendation: analysisData.analysis.teamRecommendation || prev.teamRecommendation,
          dailyTrends: analysisData.analysis.dailyTrends || prev.dailyTrends,
          costAnalysis: analysisData.analysis.costAnalysis,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Failed to load labour data:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [jobId]);

  useEffect(() => {
    loadLabourData();
  }, [jobId, loadLabourData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const projectedDays = Math.ceil(
    (new Date(data.metrics.projectedCompletion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Labour Analysis</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Workers On-Site</div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(data.dailyTrends.averageWorkersOnSite)}
            </div>
            <div className="text-xs text-gray-500">7-day average</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Hours Logged Today</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.dailyTrends.last7Days[0]?.hoursWorked || 0}
            </div>
            <div className="text-xs text-gray-500">Latest day</div>
          </div>
        </div>
      </div>

      {/* Projections */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Projections</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Completion Date</span>
            <span className="font-medium">
              {formatDate(data.metrics.projectedCompletion)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Days to Complete</span>
            <span className="font-medium">
              {projectedDays} days
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">At Current Pace</span>
            <span className={`font-medium ${
              data.metrics.daysAhead >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data.metrics.daysAhead > 0 ? `${data.metrics.daysAhead} days ahead` : 
               data.metrics.daysAhead < 0 ? `${Math.abs(data.metrics.daysAhead)} days behind` : 
               'On schedule'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Recommendations */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Team Sizing</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            data.teamRecommendation.urgency === 'high' ? 'bg-red-100 text-red-700' :
            data.teamRecommendation.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {data.teamRecommendation.urgency} priority
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Team</span>
            <span className="font-medium">{data.teamRecommendation.current} workers</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Recommended</span>
            <span className="font-medium text-blue-600">
              {data.teamRecommendation.recommended} workers
            </span>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-700">
              {data.teamRecommendation.reasoning}
            </div>
            {data.teamRecommendation.costImpact > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                Additional cost: {formatCurrency(data.teamRecommendation.costImpact)}/day
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Efficiency Tracking */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Efficiency Tracking</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Overall Efficiency</span>
              <span className={`font-medium ${
                data.metrics.efficiency >= 100 ? 'text-green-600' :
                data.metrics.efficiency >= 85 ? 'text-blue-600' :
                data.metrics.efficiency >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {Math.round(data.metrics.efficiency)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  data.metrics.efficiency >= 100 ? 'bg-green-500' :
                  data.metrics.efficiency >= 85 ? 'bg-blue-500' :
                  data.metrics.efficiency >= 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(data.metrics.efficiency, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            {data.metrics.efficiency >= 100 && '🚀 Excellent performance!'}
            {data.metrics.efficiency >= 85 && data.metrics.efficiency < 100 && '✅ Good efficiency'}
            {data.metrics.efficiency >= 70 && data.metrics.efficiency < 85 && '⚠️ Below target efficiency'}
            {data.metrics.efficiency < 70 && '🔴 Poor efficiency - review processes'}
          </div>
        </div>
      </div>

      {/* Daily Trends */}
      {data.dailyTrends.last7Days.length > 0 && (
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Last 7 Days</h3>
          
          <div className="space-y-3">
            {data.dailyTrends.last7Days.slice(0, 5).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-600">{formatDate(day.date)}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {day.workersOnSite} workers
                  </span>
                  <span className="text-sm text-gray-500">
                    {day.hoursWorked}h
                  </span>
                  <span className={`text-sm font-medium ${
                    day.efficiency >= 100 ? 'text-green-600' :
                    day.efficiency >= 85 ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {Math.round(day.efficiency)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Analysis */}
      {data.costAnalysis && (
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Original Budget</span>
              <span className="font-medium">
                {formatCurrency(data.costAnalysis.originalCost)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Projected Cost</span>
              <span className="font-medium">
                {formatCurrency(data.costAnalysis.projectedCost)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Variance</span>
              <span className={`font-medium ${
                data.costAnalysis.variance >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data.costAnalysis.variance >= 0 ? '+' : ''}
                {formatCurrency(data.costAnalysis.variance)}
                {' '}({data.costAnalysis.variancePercentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {data.metrics.alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
          {data.metrics.alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                alert.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className={`font-medium ${
                alert.type === 'error' ? 'text-red-700' :
                alert.type === 'warning' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {alert.message}
              </div>
              {alert.action && (
                <div className={`text-sm mt-1 ${
                  alert.type === 'error' ? 'text-red-600' :
                  alert.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {alert.action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}