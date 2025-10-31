'use client';

import { format } from 'date-fns';
import React, { useState, useEffect } from 'react';

import { Project } from '../types';

interface ProjectDashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string) => void;
}

const ProjectCard = ({ project, onSelectProject }: { project: Project, onSelectProject: (project: Project) => void }) => {
    const createdAtTimestamp = project.createdAt as { toDate?: () => Date } | string | Date;
    const createdAtDate = typeof createdAtTimestamp === 'object' && createdAtTimestamp !== null && 'toDate' in createdAtTimestamp && typeof createdAtTimestamp.toDate === 'function'
        ? createdAtTimestamp.toDate()
        : new Date(createdAtTimestamp as string | Date);
    return (
        <div
            style={{
              background: '#1a1f2e',
              padding: 24,
              borderRadius: 8,
              cursor: 'pointer',
              border: '1px solid #374151',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            onClick={() => onSelectProject(project)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2a2f3e';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1f2e';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <h3 style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#3b82f6',
              margin: '0 0 8px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {project.name}
            </h3>
            <p style={{
              fontSize: 14,
              color: '#9ca3af',
              margin: 0
            }}>
                Created: {isValidDate(createdAtDate) ? format(createdAtDate, 'PP') : '...'}
            </p>
        </div>
    );
};

const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());

export default function ProjectDashboard({ projects, onSelectProject, onCreateProject }: ProjectDashboardProps) {
  const [newProjectName, setNewProjectName] = useState("");
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName);
    setNewProjectName("");
  };

  return (
    <div style={{
      padding: 32,
      maxWidth: 1200,
      margin: '0 auto',
      opacity: isAnimated ? 1 : 0,
      transform: isAnimated ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.5s ease-out'
    }}>
      <div style={{
        background: 'rgba(16, 23, 42, 0.8)',
        padding: 32,
        borderRadius: 12,
        border: '1px solid #374151',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 24,
          color: '#e5e7eb',
          margin: '0 0 24px 0'
        }}>
          Your Projects
        </h2>
        
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32
        }}>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Enter new project name..."
            style={{
              flexGrow: 1,
              padding: 12,
              background: '#374151',
              border: '1px solid #4b5563',
              borderRadius: 8,
              outline: 'none',
              color: '#e5e7eb',
              fontSize: 16,
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#4b5563';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newProjectName.trim()}
            style={{
              padding: '12px 24px',
              background: newProjectName.trim() ? '#3b82f6' : '#6b7280',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={(e) => {
              if (newProjectName.trim()) {
                e.currentTarget.style.background = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (newProjectName.trim()) {
                e.currentTarget.style.background = '#3b82f6';
              }
            }}
          >
            Create Project
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            border: '2px dashed #374151',
            borderRadius: 8,
            color: '#9ca3af'
          }}>
            <p style={{ margin: 0 }}>No projects yet. Create one to get started!</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24
          }}>
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} onSelectProject={onSelectProject} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}