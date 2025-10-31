/**
 * Document Selection Service
 * Manages which documents are selected for which modules within a job
 */

const STORAGE_KEY_PREFIX = 'job_document_selections_';

export type ModuleType = 'taskGeneration' | 'smartQuote' | 'floorPlanner';

export interface DocumentSelection {
  documentId: string;
  documentTitle: string;
  moduleName: ModuleType;
  selectedAt: string;
}

export class DocumentSelectionService {
  private getStorageKey(jobId: string): string {
    return `${STORAGE_KEY_PREFIX}${jobId}`;
  }

  // Get all document selections for a job
  getSelections(jobId: string): DocumentSelection[] {
    if (typeof localStorage === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.getStorageKey(jobId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Get document selections for a specific module
  getSelectionsForModule(jobId: string, moduleName: ModuleType): DocumentSelection[] {
    return this.getSelections(jobId).filter(sel => sel.moduleName === moduleName);
  }

  // Add a document selection for a module
  addSelection(jobId: string, documentId: string, documentTitle: string, moduleName: ModuleType): void {
    if (typeof localStorage === 'undefined') return;

    const selections = this.getSelections(jobId);
    
    // Remove any existing selection for this document and module
    const filtered = selections.filter(sel => 
      !(sel.documentId === documentId && sel.moduleName === moduleName)
    );

    // Add the new selection
    filtered.push({
      documentId,
      documentTitle,
      moduleName,
      selectedAt: new Date().toISOString()
    });

    localStorage.setItem(this.getStorageKey(jobId), JSON.stringify(filtered));
  }

  // Remove a document selection
  removeSelection(jobId: string, documentId: string, moduleName: ModuleType): void {
    if (typeof localStorage === 'undefined') return;

    const selections = this.getSelections(jobId);
    const filtered = selections.filter(sel => 
      !(sel.documentId === documentId && sel.moduleName === moduleName)
    );

    localStorage.setItem(this.getStorageKey(jobId), JSON.stringify(filtered));
  }

  // Clear all selections for a job
  clearSelections(jobId: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.getStorageKey(jobId));
  }

  // Clear selections for a specific module
  clearModuleSelections(jobId: string, moduleName: ModuleType): void {
    if (typeof localStorage === 'undefined') return;

    const selections = this.getSelections(jobId);
    const filtered = selections.filter(sel => sel.moduleName !== moduleName);
    
    localStorage.setItem(this.getStorageKey(jobId), JSON.stringify(filtered));
  }
}

// Export singleton instance
export const documentSelectionService = new DocumentSelectionService();