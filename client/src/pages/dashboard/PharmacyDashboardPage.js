import React, { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { Package, ListOrdered, BarChart2, Pill } from 'lucide-react';
import MedicineManagement from '../../components/pharmacy/MedicineManagementFixed';
import OrderManagement from '../../components/pharmacy/OrderManagement';
import Analytics from '../../components/pharmacy/Analytics';

const PharmacyDashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const tabs = [
    { id: 'orders', label: 'Orders', icon: ListOrdered },
    { id: 'medicines', label: 'Medicines', icon: Pill },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'medicines':
        return <MedicineManagement />;
      case 'inventory':
        return <MedicineManagement />; // Using same component for now
      case 'analytics':
        return <Analytics />;
      case 'orders':
      default:
        return <OrderManagement />;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Pharmacy Dashboard</h1>
        <p className="text-secondary-600">Welcome, {user?.pharmacyDetails?.name || user?.name}!</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Navigation */}
        <aside className="lg:w-1/4">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <ul className="space-y-2">
              {tabs.map(tab => (
                <li key={tab.id}>
                  <button 
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-700 hover:bg-secondary-100'
                    }`}>
                    <tab.icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Tab Content */}
        <main className="lg:w-3/4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default PharmacyDashboardPage;
