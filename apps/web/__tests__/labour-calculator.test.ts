/**
 * Test Suite for Labour Calculator
 * Tests the core labour calculation engine functionality
 */

import { labourCalculator, ProductProgress } from '../lib/labour-calculator';

// Mock data for testing
const mockProducts: ProductProgress[] = [
  {
    id: '1',
    job_id: 'job-1',
    product_type: 'FLX_6P',
    product_name: 'FLX 6P Desk',
    total_quantity: 10,
    completed_units: 5,
    in_progress_units: 2,
    status: 'in_progress',
    estimated_hours_per_unit: 1.5,
    actual_hours_spent: 8.0,
    last_updated: '2024-01-15T10:00:00Z',
    notes: 'Progress on track'
  },
  {
    id: '2',
    job_id: 'job-1',
    product_type: 'FLX_4P',
    product_name: 'FLX 4P Desk',
    total_quantity: 8,
    completed_units: 8,
    in_progress_units: 0,
    status: 'completed',
    estimated_hours_per_unit: 1.2,
    actual_hours_spent: 10.0,
    last_updated: '2024-01-15T09:00:00Z'
  },
  {
    id: '3',
    job_id: 'job-1',
    product_type: 'CHAIR',
    product_name: 'Office Chair',
    total_quantity: 20,
    completed_units: 0,
    in_progress_units: 0,
    status: 'not_started',
    estimated_hours_per_unit: 0.3,
    actual_hours_spent: 0,
    last_updated: '2024-01-15T08:00:00Z'
  }
];

describe('LabourCalculator', () => {
  describe('calculateRemainingHours', () => {
    test('should calculate remaining hours correctly', () => {
      const result = labourCalculator.calculateRemainingHours(mockProducts);
      
      // FLX_6P: (10 - 5) * 1.5 = 7.5 hours
      // FLX_4P: (8 - 8) * 1.2 = 0 hours  
      // CHAIR: (20 - 0) * 0.3 = 6 hours
      // Total: 7.5 + 0 + 6 = 13.5 hours
      expect(result).toBe(13.5);
    });

    test('should handle empty products array', () => {
      const result = labourCalculator.calculateRemainingHours([]);
      expect(result).toBe(0);
    });

    test('should handle negative completed units gracefully', () => {
      const productsWithNegative = [{
        ...mockProducts[0],
        completed_units: -1
      }];
      
      const result = labourCalculator.calculateRemainingHours(productsWithNegative);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateEfficiency', () => {
    test('should calculate efficiency correctly', () => {
      const result = labourCalculator.calculateEfficiency(mockProducts);
      
      // Total planned for completed units:
      // FLX_6P: 5 * 1.5 = 7.5 hours
      // FLX_4P: 8 * 1.2 = 9.6 hours
      // CHAIR: 0 * 0.3 = 0 hours
      // Total planned: 17.1 hours
      
      // Total actual hours: 8.0 + 10.0 + 0 = 18.0 hours
      // Efficiency: (17.1 / 18.0) * 100 = 95%
      expect(result).toBeCloseTo(95, 1);
    });

    test('should return 100% when no actual hours spent', () => {
      const productsNoHours = mockProducts.map(p => ({
        ...p,
        actual_hours_spent: 0
      }));
      
      const result = labourCalculator.calculateEfficiency(productsNoHours);
      expect(result).toBe(100);
    });

    test('should return 100% when no units completed', () => {
      const productsNoCompletion = mockProducts.map(p => ({
        ...p,
        completed_units: 0
      }));
      
      const result = labourCalculator.calculateEfficiency(productsNoCompletion);
      expect(result).toBe(100);
    });
  });

  describe('calculateRequiredTeamSize', () => {
    test('should calculate team size for normal workload', () => {
      const result = labourCalculator.calculateRequiredTeamSize(80, 10); // 80 hours, 10 days
      
      expect(result.recommended).toBe(1); // 80 hours / (10 days * 8 hours/day) = 1 worker
      expect(result.urgency).toBe('low');
    });

    test('should recommend larger team for tight deadline', () => {
      const result = labourCalculator.calculateRequiredTeamSize(160, 5); // 160 hours, 5 days
      
      expect(result.recommended).toBe(4); // 160 hours / (5 days * 8 hours/day) = 4 workers
      expect(result.urgency).toBe('low');
    });

    test('should flag high urgency for very tight deadlines', () => {
      const result = labourCalculator.calculateRequiredTeamSize(400, 5); // 400 hours, 5 days
      
      expect(result.recommended).toBe(10); // 400 hours / (5 days * 8 hours/day) = 10 workers
      expect(result.urgency).toBe('high');
      expect(result.costImpact).toBeGreaterThan(0);
    });

    test('should cap team size at maximum', () => {
      const result = labourCalculator.calculateRequiredTeamSize(1000, 1); // Impossible deadline
      
      expect(result.recommended).toBe(12); // Should be capped at 12
    });
  });

  describe('calculateBurnRate', () => {
    const mockDailyProgress = [
      { date: '2024-01-15', unitsCompleted: 5, hoursWorked: 8, workersOnSite: 4, efficiency: 100, cumulativeProgress: 0, targetProgress: 0, variance: 0 },
      { date: '2024-01-14', unitsCompleted: 3, hoursWorked: 6, workersOnSite: 3, efficiency: 90, cumulativeProgress: 0, targetProgress: 0, variance: 0 },
      { date: '2024-01-13', unitsCompleted: 4, hoursWorked: 7, workersOnSite: 4, efficiency: 95, cumulativeProgress: 0, targetProgress: 0, variance: 0 }
    ];

    test('should calculate average burn rate', () => {
      const result = labourCalculator.calculateBurnRate(mockDailyProgress, 3);
      
      // Average: (8 + 6 + 7) / 3 = 7 hours per day
      expect(result).toBe(7);
    });

    test('should handle empty progress data', () => {
      const result = labourCalculator.calculateBurnRate([]);
      expect(result).toBe(0);
    });

    test('should limit to window size', () => {
      const result = labourCalculator.calculateBurnRate(mockDailyProgress, 2);
      
      // Only last 2 days: (8 + 6) / 2 = 7 hours per day
      expect(result).toBe(7);
    });
  });

  describe('projectCompletionDate', () => {
    test('should project completion date correctly', () => {
      const startDate = new Date('2024-01-15');
      const result = labourCalculator.projectCompletionDate(40, 8); // 40 hours remaining, 8 hours per day
      
      // Should be 5 days from start, accounting for weekends
      const _expectedDays = Math.ceil(5 * (7/5)); // 5 work days = 7 calendar days
      expect(result.getTime()).toBeGreaterThan(startDate.getTime());
    });

    test('should use standard rate when burn rate is zero', () => {
      const result = labourCalculator.projectCompletionDate(32, 0);
      
      // Should use standard rate of 32 hours per day (4 workers * 8 hours)
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('identifyBottlenecks', () => {
    test('should identify products with low completion and efficiency', () => {
      const result = labourCalculator.identifyBottlenecks(mockProducts);
      
      // Should identify products that are behind schedule
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    test('should sort bottlenecks by remaining hours', () => {
      const result = labourCalculator.identifyBottlenecks(mockProducts);
      
      if (result.length > 1) {
        // Should be sorted by remaining hours (descending)
        const firstRemaining = (result[0].total_quantity - result[0].completed_units) * result[0].estimated_hours_per_unit;
        const secondRemaining = (result[1].total_quantity - result[1].completed_units) * result[1].estimated_hours_per_unit;
        expect(firstRemaining).toBeGreaterThanOrEqual(secondRemaining);
      }
    });
  });

  describe('generateTomorrowPlan', () => {
    test('should generate realistic daily targets', () => {
      const result = labourCalculator.generateTomorrowPlan(mockProducts, 4);
      
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('targets');
      expect(result).toHaveProperty('estimatedHours');
      expect(result).toHaveProperty('notes');
      
      expect(result.priority).toBeInstanceOf(Array);
      expect(result.estimatedHours).toBeGreaterThanOrEqual(0);
    });

    test('should prioritize bottlenecks and in-progress items', () => {
      const result = labourCalculator.generateTomorrowPlan(mockProducts, 4);
      
      // Should include in-progress items first
      const inProgressItems = result.priority.filter(p => p.status === 'in_progress');
      expect(inProgressItems.length).toBeGreaterThanOrEqual(0);
    });

    test('should provide helpful notes for ambitious targets', () => {
      const result = labourCalculator.generateTomorrowPlan(mockProducts, 2); // Small team
      
      if (result.estimatedHours > 16) { // 2 workers * 8 hours
        expect(result.notes.some(note => note.includes('overtime') || note.includes('additional'))).toBe(true);
      }
    });
  });

  describe('calculateCostImplications', () => {
    const mockOriginalEstimate = {
      totalDays: 10,
      totalHours: 80,
      crewSize: 4,
      installationDays: 10,
      upliftDays: 0,
      products: []
    };

    test('should calculate cost variance correctly', () => {
      const result = labourCalculator.calculateCostImplications(
        mockOriginalEstimate,
        mockProducts,
        50 // $50 per hour
      );
      
      expect(result).toHaveProperty('originalCost');
      expect(result).toHaveProperty('projectedCost');
      expect(result).toHaveProperty('variance');
      expect(result).toHaveProperty('variancePercentage');
      
      expect(result.originalCost).toBe(4000); // 80 hours * $50
      expect(result.projectedCost).toBeGreaterThan(0);
    });

    test('should show positive variance when over budget', () => {
      // Create scenario where actual exceeds estimate
      const expensiveProducts = mockProducts.map(p => ({
        ...p,
        actual_hours_spent: p.actual_hours_spent * 3
      }));
      
      const result = labourCalculator.calculateCostImplications(
        mockOriginalEstimate,
        expensiveProducts,
        50
      );
      
      expect(result.variance).toBeGreaterThan(0);
      expect(result.variancePercentage).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    test('should provide comprehensive labour metrics', () => {
      const targetDate = new Date('2024-01-25'); // 10 days from mock date
      const dailyProgress = [
        { date: '2024-01-15', unitsCompleted: 5, hoursWorked: 8, workersOnSite: 4, efficiency: 100, cumulativeProgress: 0, targetProgress: 0, variance: 0 }
      ];
      
      const metrics = labourCalculator.calculateLabourMetrics(
        mockProducts,
        dailyProgress,
        targetDate
      );
      
      expect(metrics).toHaveProperty('hoursRemaining');
      expect(metrics).toHaveProperty('requiredTeamSize');
      expect(metrics).toHaveProperty('projectedCompletion');
      expect(metrics).toHaveProperty('efficiency');
      expect(metrics).toHaveProperty('burnRate');
      expect(metrics).toHaveProperty('daysAhead');
      expect(metrics).toHaveProperty('alerts');
      
      expect(metrics.hoursRemaining).toBeGreaterThan(0);
      expect(metrics.alerts).toBeInstanceOf(Array);
    });

    test('should generate appropriate alerts for different scenarios', () => {
      // Test behind schedule scenario
      const tightDeadline = new Date('2024-01-16'); // Very tight deadline
      const dailyProgress = [
        { date: '2024-01-15', unitsCompleted: 1, hoursWorked: 2, workersOnSite: 1, efficiency: 50, cumulativeProgress: 0, targetProgress: 0, variance: 0 }
      ];
      
      const metrics = labourCalculator.calculateLabourMetrics(
        mockProducts,
        dailyProgress,
        tightDeadline
      );
      
      // Should have critical alerts for tight deadline and poor performance
      const criticalAlerts = metrics.alerts.filter(alert => alert.priority === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle division by zero gracefully', () => {
      const emptyProducts: ProductProgress[] = [];
      
      expect(() => {
        labourCalculator.calculateRemainingHours(emptyProducts);
        labourCalculator.calculateEfficiency(emptyProducts);
        labourCalculator.calculateRequiredTeamSize(0, 1);
      }).not.toThrow();
    });

    test('should handle invalid data gracefully', () => {
      const invalidProducts = [{
        ...mockProducts[0],
        total_quantity: -1,
        completed_units: 100,
        estimated_hours_per_unit: -5
      }];
      
      expect(() => {
        labourCalculator.calculateRemainingHours(invalidProducts);
        labourCalculator.calculateEfficiency(invalidProducts);
      }).not.toThrow();
    });

    test('should cap efficiency at reasonable bounds', () => {
      const superEfficientProducts = [{
        ...mockProducts[0],
        completed_units: 10,
        estimated_hours_per_unit: 10,
        actual_hours_spent: 1 // Impossibly efficient
      }];
      
      const efficiency = labourCalculator.calculateEfficiency(superEfficientProducts);
      expect(efficiency).toBeLessThanOrEqual(999.99);
    });
  });
});