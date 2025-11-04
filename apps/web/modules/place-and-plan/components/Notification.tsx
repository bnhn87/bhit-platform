
'use client';


import React, { useEffect } from 'react';
import { X, XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

import { NotificationMessage } from '../types';

interface NotificationProps {
  notification: NotificationMessage;
  onDismiss: () => void;
}

const icons = {
  error: <AlertTriangle size={24} />,
  success: <CheckCircle size={24} />,
  info: <Info size={24} />,
};

const typeClasses = {
  error: 'bg-red-600 border-red-500',
  success: 'bg-green-600 border-green-500',
  info: 'bg-blue-600 border-blue-500',
};

export default function Notification({ notification, onDismiss }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification.message) return null;

  return (
    <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-2xl text-white flex items-center gap-4 z-50 animate-fade-in-up border-b-4 ${typeClasses[notification.type]}`}>
      {icons[notification.type]}
      <span className="flex-grow font-semibold">{notification.message}</span>
      <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/20 transition-colors">
        <XCircle size={20} />
      </button>
    </div>
  );
}

// Add keyframe animation for the notification entrance
const styles = `
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out forwards;
}
`;
// Only run on client side
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
