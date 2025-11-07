// ============================================================================
// SmartQuote v3 - Notification Center
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';

export const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadNotifications();
        loadUnreadCount();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
            const data = await notificationService.getUserNotifications(user.user.id, false);
            setNotifications(data);
        }
        setLoading(false);
    };

    const loadUnreadCount = async () => {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
            const count = await notificationService.getUnreadCount(user.user.id);
            setUnreadCount(count);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        await notificationService.markAsRead(id);
        await loadNotifications();
        await loadUnreadCount();
    };

    const handleMarkAllAsRead = async () => {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
            await notificationService.markAllAsRead(user.user.id);
            await loadNotifications();
            await loadUnreadCount();
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 border-red-300 text-red-800';
            case 'high':
                return 'bg-orange-100 border-orange-300 text-orange-800';
            case 'normal':
                return 'bg-blue-100 border-blue-300 text-blue-800';
            default:
                return 'bg-gray-100 border-gray-300 text-gray-800';
        }
    };

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                        !notification.read ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={() => {
                                        if (!notification.read) {
                                            handleMarkAsRead(notification.id);
                                        }
                                        if (notification.actionUrl) {
                                            window.location.href = notification.actionUrl;
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900">
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                )}
                                            </div>
                                            {notification.message && (
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`text-xs px-2 py-1 rounded ${getPriorityColor(
                                                        notification.priority
                                                    )}`}
                                                >
                                                    {notification.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(
                                                        notification.createdAt
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
