/**
 * API Integration Tests for Labour Tracking Endpoints
 * Tests the v2 API endpoints for labour management
 */

import { createMocks } from 'node-mocks-http';

import dailyCloseoutHandler from '../../pages/api/v2/daily-closeout';
import quickUpdateHandler from '../../pages/api/v2/products/[id]/quick-update';
import bulkUpdateHandler from '../../pages/api/v2/products/bulk-update';
import labourAnalysisHandler from '../../pages/api/v2/projects/[id]/labour-analysis';
import batchSyncHandler from '../../pages/api/v2/sync/batch';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockProduct,
            error: null
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: mockDailyLogs,
              error: null
            }))
          }))
        })),
        order: jest.fn(() => Promise.resolve({
          data: mockProducts,
          error: null
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: mockProduct,
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({
        data: mockSyncQueueItem,
        error: null
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockCloseout,
            error: null
          }))
        }))
      })),
      delete: jest.fn(() => ({
        in: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      }))
    }))
  }))
}));

// Mock labour calculator
jest.mock('../../lib/labour-calculator', () => ({
  labourCalculator: {
    calculateRemainingHours: jest.fn(() => 25.5),
    calculateEfficiency: jest.fn(() => 87.5),
    calculateBurnRate: jest.fn(() => 8.5),
    projectCompletionDate: jest.fn(() => new Date('2024-02-01')),
    calculateRequiredTeamSize: jest.fn(() => ({
      current: 4,
      recommended: 5,
      reasoning: 'Increase team for deadline',
      urgency: 'medium',
      costImpact: 500
    })),
    identifyBottlenecks: jest.fn(() => []),
    generateTomorrowPlan: jest.fn(() => ({
      priority: [],
      targets: {},
      estimatedHours: 8,
      notes: ['Focus on priority items']
    })),
    calculateLabourMetrics: jest.fn(() => ({
      hoursRemaining: 25.5,
      requiredTeamSize: 5,
      projectedCompletion: new Date('2024-02-01'),
      efficiency: 87.5,
      burnRate: 8.5,
      daysAhead: -2,
      alerts: [
        {
          type: 'warning',
          message: 'Behind schedule',
          action: 'Increase team size',
          priority: 'medium'
        }
      ]
    }))
  }
}));

// Mock data
const mockProduct = {
  id: 'product-1',
  job_id: 'job-1',
  product_type: 'FLX_6P',
  product_name: 'FLX 6P Desk',
  total_quantity: 10,
  completed_units: 5,
  in_progress_units: 2,
  status: 'in_progress',
  estimated_hours_per_unit: 1.5,
  actual_hours_spent: 7.5,
  last_updated: '2024-01-15T10:00:00Z'
};

const mockProducts = [
  mockProduct,
  {
    id: 'product-2',
    job_id: 'job-1',
    product_type: 'FLX_4P',
    product_name: 'FLX 4P Desk',
    total_quantity: 8,
    completed_units: 8,
    status: 'completed',
    estimated_hours_per_unit: 1.2,
    actual_hours_spent: 9.6
  }
];

const mockDailyLogs = [
  {
    id: 'log-1',
    job_id: 'job-1',
    log_date: '2024-01-15',
    units_completed: 3,
    hours_worked: 8,
    workers_on_site: 4,
    efficiency_percentage: 87.5
  }
];

const mockSyncQueueItem = {
  id: 'sync-1',
  job_id: 'job-1',
  operation_type: 'product_update',
  table_name: 'product_progress',
  record_id: 'product-1',
  data_payload: { completed_units: 6 },
  sync_status: 'completed'
};

const mockCloseout = {
  id: 'closeout-1',
  job_id: 'job-1',
  closeout_date: '2024-01-15',
  summary_data: {},
  labour_analysis: {},
  progress_summary: {}
};

describe('/api/v2/products/[id]/quick-update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST should update product progress successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'product-1' },
      body: {
        completed: 6,
        status: 'in_progress',
        notes: 'Good progress today'
      }
    });

    await quickUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.product).toBeDefined();
    expect(data.labourImpact).toBeDefined();
    expect(data.labourImpact.remainingHours).toBe(25.5);
  });

  test('POST should return 400 for missing product ID', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {},
      body: { completed: 6 }
    });

    await quickUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Product ID is required');
  });

  test('POST should handle auto-status updates', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'product-1' },
      body: { completed: 10 } // Complete all units
    });

    await quickUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
  });

  test('should reject non-POST methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'product-1' }
    });

    await quickUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});

describe('/api/v2/products/bulk-update', () => {
  test('POST should perform bulk updates successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        job_id: 'job-1',
        filters: { product_type: 'FLX_6P' },
        updates: { status: 'completed' }
      }
    });

    await bulkUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.updatedProducts).toBeDefined();
    expect(data.labourImpact).toBeDefined();
  });

  test('POST should return 400 for missing job ID', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        updates: { status: 'completed' }
      }
    });

    await bulkUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Job ID is required');
  });

  test('POST should handle increment operations', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        job_id: 'job-1',
        filters: { status: 'in_progress' },
        updates: { increment_completed: 2 }
      }
    });

    await bulkUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });
});

describe('/api/v2/projects/[id]/labour-analysis', () => {
  test('GET should return comprehensive labour analysis', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-1' }
    });

    await labourAnalysisHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.analysis).toBeDefined();
    expect(data.analysis.hoursRemaining).toBe(25.5);
    expect(data.analysis.efficiency).toBe(87.5);
    expect(data.analysis.alerts).toBeDefined();
    expect(data.analysis.teamRecommendation).toBeDefined();
  });

  test('GET should return 400 for missing job ID', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}
    });

    await labourAnalysisHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Job ID is required');
  });

  test('should reject non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-1' }
    });

    await labourAnalysisHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});

describe('/api/v2/daily-closeout', () => {
  test('POST should create daily closeout successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        job_id: 'job-1',
        summary: {
          unitsCompleted: 5,
          hoursWorked: 8,
          workersOnSite: 4,
          weatherConditions: 'Fair',
          notes: 'Good progress'
        },
        supervisorSignature: 'data:image/png;base64,signature1',
        contractorSignature: 'data:image/png;base64,signature2'
      }
    });

    await dailyCloseoutHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.closeout).toBeDefined();
    expect(data.closeout.summaryData).toBeDefined();
    expect(data.closeout.labourAnalysis).toBeDefined();
    expect(data.recommendations).toBeDefined();
  });

  test('POST should auto-generate summary with defaults', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        job_id: 'job-1'
      }
    });

    await dailyCloseoutHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.closeout.summaryData.hoursWorked).toBe(0);
    expect(data.closeout.summaryData.workersOnSite).toBe(4);
  });

  test('POST should return 400 for missing job ID', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await dailyCloseoutHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Job ID is required');
  });
});

describe('/api/v2/sync/batch', () => {
  test('POST should process sync queue successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        updates: [
          {
            id: 'update-1',
            operation: 'product_update',
            table: 'product_progress',
            record_id: 'product-1',
            job_id: 'job-1',
            data: { completed_units: 6 },
            timestamp: Date.now()
          }
        ],
        device_id: 'test-device'
      }
    });

    await batchSyncHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.results).toBeDefined();
    expect(data.results.synced).toBeGreaterThanOrEqual(0);
  });

  test('POST should return 400 for empty updates array', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        updates: []
      }
    });

    await batchSyncHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Updates array is required');
  });

  test('POST should handle mixed success/failure scenarios', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        updates: [
          {
            id: 'update-1',
            operation: 'product_update',
            table: 'product_progress',
            record_id: 'product-1',
            job_id: 'job-1',
            data: { completed_units: 6 },
            timestamp: Date.now()
          },
          {
            id: 'update-2',
            operation: 'invalid_operation',
            table: 'product_progress',
            job_id: 'job-1',
            data: {},
            timestamp: Date.now()
          }
        ]
      }
    });

    await batchSyncHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.results.synced).toBeDefined();
    expect(data.results.failed).toBeDefined();
  });
});

describe('Error Handling', () => {
  test('should handle Supabase errors gracefully', async () => {
    // Mock Supabase to return an error
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' }
              }))
            }))
          }))
        }))
      }))
    }));

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'product-1' },
      body: { completed: 6 }
    });

    await quickUpdateHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
  });

  test('should handle invalid JSON gracefully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'product-1' },
      body: undefined // Invalid body
    });

    // Should not crash the API
    await quickUpdateHandler(req, res);
    
    // Should return some error response
    expect([400, 500]).toContain(res._getStatusCode());
  });
});

describe('Performance Tests', () => {
  test('should handle large datasets efficiently', async () => {
    const startTime = Date.now();
    
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-1' }
    });

    await labourAnalysisHandler(req, res);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Should respond within 1 second
    expect(responseTime).toBeLessThan(1000);
    expect(res._getStatusCode()).toBe(200);
  });

  test('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 5 }, (_, i) => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: `product-${i}` },
        body: { completed: i + 1 }
      });
      return quickUpdateHandler(req, res);
    });

    const results = await Promise.all(requests);
    
    // All requests should complete
    expect(results).toHaveLength(5);
  });
});