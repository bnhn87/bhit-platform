/**
 * StatusManager — Global status management and on-hold alert system
 * 
 * Provides centralized status management with automatic on-hold alert generation
 * for dashboards, today view, and jobs list components.
 */

import React, { createContext, useContext, useCallback, useReducer } from "react";

import { JobStatus } from "../jobs/StatusPill";

interface Job {
  id: string;
  title: string;
  status: JobStatus;
  updatedAt: Date;
  clientName?: string;
  priority?: "low" | "medium" | "high";
}

interface OnHoldAlert {
  jobId: string;
  jobTitle: string;
  timestamp: Date;
  dismissed: boolean;
}

interface StatusState {
  jobs: Record<string, Job>;
  onHoldAlerts: Record<string, OnHoldAlert>;
  alertsVisible: boolean;
}

type StatusAction =
  | { type: "UPDATE_JOB_STATUS"; payload: { jobId: string; status: JobStatus; jobTitle?: string } }
  | { type: "ADD_JOB"; payload: Job }
  | { type: "REMOVE_JOB"; payload: { jobId: string } }
  | { type: "DISMISS_ALERT"; payload: { jobId: string } }
  | { type: "SHOW_ALERTS" }
  | { type: "HIDE_ALERTS" }
  | { type: "CLEAR_ALL_ALERTS" };

const initialState: StatusState = {
  jobs: {},
  onHoldAlerts: {},
  alertsVisible: true,
};

function statusReducer(state: StatusState, action: StatusAction): StatusState {
  switch (action.type) {
    case "UPDATE_JOB_STATUS": {
      const { jobId, status, jobTitle } = action.payload;
      const existingJob = state.jobs[jobId];
      
      const updatedJob: Job = {
        ...existingJob,
        id: jobId,
        title: jobTitle || existingJob?.title || `Job ${jobId}`,
        status,
        updatedAt: new Date(),
      };

      const newJobs = { ...state.jobs, [jobId]: updatedJob };
      let newAlerts = { ...state.onHoldAlerts };

      // Add on-hold alert if status becomes "snagging"
      if (status === "snagging") {
        newAlerts[jobId] = {
          jobId,
          jobTitle: updatedJob.title,
          timestamp: new Date(),
          dismissed: false,
        };
      } else {
        // Remove on-hold alert if status changes from "snagging"
        delete newAlerts[jobId];
      }

      return {
        ...state,
        jobs: newJobs,
        onHoldAlerts: newAlerts,
      };
    }

    case "ADD_JOB": {
      const job = action.payload;
      const newJobs = { ...state.jobs, [job.id]: job };
      let newAlerts = { ...state.onHoldAlerts };

      // Add alert if job starts with snagging status
      if (job.status === "snagging") {
        newAlerts[job.id] = {
          jobId: job.id,
          jobTitle: job.title,
          timestamp: new Date(),
          dismissed: false,
        };
      }

      return {
        ...state,
        jobs: newJobs,
        onHoldAlerts: newAlerts,
      };
    }

    case "REMOVE_JOB": {
      const { jobId } = action.payload;
      const newJobs = { ...state.jobs };
      const newAlerts = { ...state.onHoldAlerts };
      
      delete newJobs[jobId];
      delete newAlerts[jobId];

      return {
        ...state,
        jobs: newJobs,
        onHoldAlerts: newAlerts,
      };
    }

    case "DISMISS_ALERT": {
      const { jobId } = action.payload;
      const newAlerts = { ...state.onHoldAlerts };
      
      if (newAlerts[jobId]) {
        newAlerts[jobId] = { ...newAlerts[jobId], dismissed: true };
      }

      return {
        ...state,
        onHoldAlerts: newAlerts,
      };
    }

    case "SHOW_ALERTS":
      return { ...state, alertsVisible: true };

    case "HIDE_ALERTS":
      return { ...state, alertsVisible: false };

    case "CLEAR_ALL_ALERTS": {
      const newAlerts = Object.keys(state.onHoldAlerts).reduce((acc, jobId) => {
        acc[jobId] = { ...state.onHoldAlerts[jobId], dismissed: true };
        return acc;
      }, {} as Record<string, OnHoldAlert>);

      return {
        ...state,
        onHoldAlerts: newAlerts,
      };
    }

    default:
      return state;
  }
}

interface StatusContextValue {
  state: StatusState;
  updateJobStatus: (jobId: string, status: JobStatus, jobTitle?: string) => void;
  addJob: (job: Job) => void;
  removeJob: (jobId: string) => void;
  dismissAlert: (jobId: string) => void;
  showAlerts: () => void;
  hideAlerts: () => void;
  clearAllAlerts: () => void;
  getActiveAlerts: () => OnHoldAlert[];
  getJobsOnHold: () => Job[];
  hasActiveAlerts: boolean;
}

const StatusContext = createContext<StatusContextValue | null>(null);

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(statusReducer, initialState);

  const updateJobStatus = useCallback((jobId: string, status: JobStatus, jobTitle?: string) => {
    dispatch({ type: "UPDATE_JOB_STATUS", payload: { jobId, status, jobTitle } });
  }, []);

  const addJob = useCallback((job: Job) => {
    dispatch({ type: "ADD_JOB", payload: job });
  }, []);

  const removeJob = useCallback((jobId: string) => {
    dispatch({ type: "REMOVE_JOB", payload: { jobId } });
  }, []);

  const dismissAlert = useCallback((jobId: string) => {
    dispatch({ type: "DISMISS_ALERT", payload: { jobId } });
  }, []);

  const showAlerts = useCallback(() => {
    dispatch({ type: "SHOW_ALERTS" });
  }, []);

  const hideAlerts = useCallback(() => {
    dispatch({ type: "HIDE_ALERTS" });
  }, []);

  const clearAllAlerts = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_ALERTS" });
  }, []);

  const getActiveAlerts = useCallback(() => {
    return Object.values(state.onHoldAlerts).filter(alert => !alert.dismissed);
  }, [state.onHoldAlerts]);

  const getJobsOnHold = useCallback(() => {
    return Object.values(state.jobs).filter(job => job.status === "snagging");
  }, [state.jobs]);

  const hasActiveAlerts = getActiveAlerts().length > 0;

  const contextValue: StatusContextValue = {
    state,
    updateJobStatus,
    addJob,
    removeJob,
    dismissAlert,
    showAlerts,
    hideAlerts,
    clearAllAlerts,
    getActiveAlerts,
    getJobsOnHold,
    hasActiveAlerts,
  };

  return (
    <StatusContext.Provider value={contextValue}>
      {children}
    </StatusContext.Provider>
  );
};

export const useStatusManager = (): StatusContextValue => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error("useStatusManager must be used within a StatusProvider");
  }
  return context;
};

// Hook for individual job status management
export const useJobStatus = (jobId: string, initialTitle?: string) => {
  const { state, updateJobStatus } = useStatusManager();
  const job = state.jobs[jobId];

  const setStatus = useCallback((status: JobStatus) => {
    updateJobStatus(jobId, status, initialTitle);
  }, [jobId, updateJobStatus, initialTitle]);

  return {
    status: job?.status || "planned",
    setStatus,
    job,
    isOnHold: job?.status === "snagging",
  };
};

export default StatusProvider;