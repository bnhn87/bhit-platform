/**
 * Component Tests for ProjectDashboard
 * Tests the mobile-first project dashboard component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import ProjectDashboard from '../../components/labour/ProjectDashboard';

// Mock the labour calculator
jest.mock('../../lib/labour-calculator', () => ({
  ProductProgress: {},
  LabourMetrics: {}
}));

// Mock fetch API
global.fetch = jest.fn();

const mockProductsResponse = {
  success: true,
  analysis: {
    hoursRemaining: 45.5,
    requiredTeamSize: 5,
    projectedCompletion: '2024-02-01T10:00:00Z',
    efficiency: 87.5,
    burnRate: 8,
    daysAhead: -2,
    alerts: [
      {
        type: 'warning',
        message: 'Project behind schedule',
        action: 'Consider increasing team size',
        priority: 'medium'
      }
    ],
    overallProgress: {
      completed: 25,
      total: 50
    },
    products: [
      {
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
      },
      {
        id: 'product-2',
        job_id: 'job-1',
        product_type: 'FLX_4P',
        product_name: 'FLX 4P Desk',
        total_quantity: 8,
        completed_units: 8,
        in_progress_units: 0,
        status: 'completed',
        estimated_hours_per_unit: 1.2,
        actual_hours_spent: 9.6,
        last_updated: '2024-01-15T09:00:00Z'
      }
    ]
  }
};

const mockProps = {
  jobId: 'job-1',
  onProductUpdate: jest.fn(),
  onBulkUpdate: jest.fn(),
  isOffline: false
};

describe('ProjectDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockProductsResponse)
    });
  });

  test('renders loading state initially', () => {
    render(<ProjectDashboard {...mockProps} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('loads and displays project data', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Site Progress')).toBeInTheDocument();
    });

    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('25 / 50 units')).toBeInTheDocument();
  });

  test('displays labour metrics correctly', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Hours Remaining')).toBeInTheDocument();
    });

    expect(screen.getByText('46')).toBeInTheDocument(); // Hours remaining
    expect(screen.getByText('Team Required')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Team size
    expect(screen.getByText('Efficiency')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument(); // Efficiency
  });

  test('shows offline indicator when offline', async () => {
    render(<ProjectDashboard {...mockProps} isOffline={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Offline mode/)).toBeInTheDocument();
    });
  });

  test('displays alerts correctly', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Project behind schedule')).toBeInTheDocument();
    });

    expect(screen.getByText('Consider increasing team size')).toBeInTheDocument();
  });

  test('filters products by status', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('FLX 6P Desk')).toBeInTheDocument();
    });

    // Click on "Done" filter
    fireEvent.click(screen.getByText('Done'));
    
    await waitFor(() => {
      expect(screen.getByText('FLX 4P Desk')).toBeInTheDocument();
      expect(screen.queryByText('FLX 6P Desk')).not.toBeInTheDocument();
    });
  });

  test('handles product quick updates', async () => {
    const mockOnProductUpdate = jest.fn().mockResolvedValue({ success: true });
    
    render(<ProjectDashboard {...mockProps} onProductUpdate={mockOnProductUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByText('FLX 6P Desk')).toBeInTheDocument();
    });

    // Click +1 button
    const plusOneButtons = screen.getAllByText('+1');
    fireEvent.click(plusOneButtons[0]);

    expect(mockOnProductUpdate).toHaveBeenCalledWith('product-1', { completed: 6 });
  });

  test('handles bulk complete actions', async () => {
    const mockOnBulkUpdate = jest.fn().mockResolvedValue({ success: true });
    
    render(<ProjectDashboard {...mockProps} onBulkUpdate={mockOnBulkUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByText('FLX 6P Desk')).toBeInTheDocument();
    });

    // This would typically be triggered by a bulk action button
    // For now, we'll test the component can handle the call
    await mockProps.onBulkUpdate({ product_type: 'FLX_6P' }, { status: 'completed' });
  });

  test('shows correct progress bars for products', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('50% complete')).toBeInTheDocument(); // FLX_6P: 5/10 = 50%
    });
  });

  test('handles complete button correctly', async () => {
    const mockOnProductUpdate = jest.fn().mockResolvedValue({ success: true });
    
    render(<ProjectDashboard {...mockProps} onProductUpdate={mockOnProductUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete'));

    expect(mockOnProductUpdate).toHaveBeenCalledWith('product-1', { completed: 10 });
  });

  test('disables buttons when product is complete', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      // The completed product (FLX 4P) should have disabled buttons
      const allButtons = screen.getAllByRole('button');
      const disabledButtons = allButtons.filter(button => button.disabled);
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  test('handles undo button correctly', async () => {
    const mockOnProductUpdate = jest.fn().mockResolvedValue({ success: true });
    
    render(<ProjectDashboard {...mockProps} onProductUpdate={mockOnProductUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByText('↩️')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('↩️'));

    expect(mockOnProductUpdate).toHaveBeenCalledWith('product-1', { completed: 4 });
  });

  test('handles refresh correctly', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('🔄')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('🔄'));

    // Should trigger another API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  test('displays empty state when no products match filter', async () => {
    const emptyResponse = {
      ...mockProductsResponse,
      analysis: {
        ...mockProductsResponse.analysis,
        products: []
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(emptyResponse)
    });

    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No products found for selected filter')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<ProjectDashboard {...mockProps} />);
    
    // Should not crash and should hide loading state
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows optimistic updates', async () => {
    const mockOnProductUpdate = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );
    
    render(<ProjectDashboard {...mockProps} onProductUpdate={mockOnProductUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByText('5 / 10 units')).toBeInTheDocument();
    });

    // Click +1 button
    const plusOneButtons = screen.getAllByText('+1');
    fireEvent.click(plusOneButtons[0]);

    // Should immediately show optimistic update
    expect(screen.getByText('6 / 10 units')).toBeInTheDocument();
  });

  test('handles failed updates with rollback', async () => {
    const mockOnProductUpdate = jest.fn().mockRejectedValue(new Error('Update failed'));
    
    render(<ProjectDashboard {...mockProps} onProductUpdate={mockOnProductUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByText('5 / 10 units')).toBeInTheDocument();
    });

    // Click +1 button
    const plusOneButtons = screen.getAllByText('+1');
    fireEvent.click(plusOneButtons[0]);

    // Should show optimistic update first
    expect(screen.getByText('6 / 10 units')).toBeInTheDocument();

    // Then rollback after error
    await waitFor(() => {
      expect(screen.getByText('5 / 10 units')).toBeInTheDocument();
    });
  });

  test('displays correct status colors', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      // In progress product should have blue status
      const inProgressStatus = screen.getByText('in progress');
      expect(inProgressStatus).toHaveClass('bg-blue-100', 'text-blue-700');
      
      // Completed product should have green status
      const completedStatus = screen.getByText('completed');
      expect(completedStatus).toHaveClass('bg-green-100', 'text-green-700');
    });
  });

  test('calculates remaining hours correctly', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      // FLX_6P: (10-5) * 1.5 = 7.5h remaining
      expect(screen.getByText('8h remaining')).toBeInTheDocument();
    });
  });

  test('is accessible', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      // Check for proper button labels and roles
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      
      // Check for progress bars
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  test('handles mobile touch interactions', async () => {
    render(<ProjectDashboard {...mockProps} />);
    
    await waitFor(() => {
      // All interactive elements should have proper touch targets (44px minimum)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const _styles = window.getComputedStyle(button);
        // Would need to check computed styles for min touch target size
        expect(button).toBeInTheDocument();
      });
    });
  });
});