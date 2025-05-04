import React, { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, update } from 'firebase/database';

type NotificationItem = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: string;
  productId?: string;
  reviewId?: string;
};

type NotificationsButtonProps = {
  user: any;
  notifications: NotificationItem[];
  unreadCount: number;
  currentTheme: 'light' | 'dark' | 'synthwave';
};

const NotificationsButton: React.FC<NotificationsButtonProps> = ({
  user,
  notifications,
  unreadCount,
  currentTheme
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const database = getDatabase();

  useEffect(() => {
    // Add event listener to close notifications dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications && 
        notificationsButtonRef.current && 
        notificationsDropdownRef.current && 
        !notificationsButtonRef.current.contains(event.target as Node) && 
        !notificationsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const notificationRef = ref(database, `users/${user.uid}/notifications/${notificationId}`);
      await update(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    // Mark notification as read
    markNotificationAsRead(notification.id);
    
    // Hide notifications dropdown
    setShowNotifications(false);
    
    // Navigate to product and scroll to the review
    if (notification.productId) {
      navigate(`/product/${notification.productId}${notification.reviewId ? `#review-${notification.reviewId}` : ''}`);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const updates: Record<string, boolean> = {};
      
      notifications.forEach(notification => {
        if (!notification.read) {
          updates[`users/${user.uid}/notifications/${notification.id}/read`] = true;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Don't render if no user
  if (!user) return null;

  return (
    <div className="relative">
      <button 
        ref={notificationsButtonRef}
        onClick={() => setShowNotifications(!showNotifications)} 
        className="relative flex items-center justify-center w-10 h-10 transition-all duration-300 ease-in-out rounded-full hover:bg-white/10"
      >
        <Bell size={24} className="text-white" />
        {unreadCount > 0 && (
          <div className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full -top-1 -right-1">
            {unreadCount}
          </div>
        )}
      </button>
      
      {/* Notifications dropdown */}
      {showNotifications && (
        <div 
          ref={notificationsDropdownRef}
          className="absolute right-0 z-20 mt-2 bg-white rounded-md shadow-xl notifications-dropdown w-80"
        >
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllNotificationsAsRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-center text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative p-4 cursor-pointer ${
                    notification.read ? 'bg-white' : 'bg-blue-50'
                  } hover:bg-gray-50 border-b`}
                >
                  {!notification.read && (
                    <div className="absolute w-2 h-2 bg-blue-500 rounded-full top-4 left-2"></div>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">
                      {notification.type === 'review_reply' ? 'Reply to your review' : 'New notification'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsButton;