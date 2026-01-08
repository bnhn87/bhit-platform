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
      className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{
        background: 'var(--panel)',
        padding: 24,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={() => onSelectProject(project)}
    >
      <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
      <h3 style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: 'var(--accent)',
        margin: '0 0 8px 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {project.name}
      </h3>
      <p style={{
        fontSize: 14,
        color: 'var(--muted)',
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
        background: 'var(--panel)',
        padding: 32,
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 24,
          color: 'var(--text)',
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
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 16,
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.boxShadow = '0 0 0 2px rgba(243, 139, 0, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newProjectName.trim()}
            style={{
              padding: '12px 24px',
              background: newProjectName.trim() ? 'var(--accent)' : 'var(--muted)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: 16,
              cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: newProjectName.trim() ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (newProjectName.trim()) {
                e.currentTarget.style.background = 'var(--accentAlt)';
              }
            }}
            onMouseLeave={(e) => {
              if (newProjectName.trim()) {
                e.currentTarget.style.background = 'var(--accent)';
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
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--muted)'
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