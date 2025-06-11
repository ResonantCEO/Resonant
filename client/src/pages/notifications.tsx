
import NotificationsPanel from "@/components/notifications-panel";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";

export default function NotificationsPage() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${
        isCollapsed ? 'lg:ml-16' : 'lg:ml-80'
      }`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              Notifications
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Stay up to date with your latest activities and updates
            </p>
          </div>
          
          <NotificationsPanel showAsCard={false} />
        </div>
      </div>
      </div>
    </div>
  );
}
