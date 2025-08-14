import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { TrendingUp, DollarSign, Package, Users, Calendar, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const Analytics = () => {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalMedicines: 0,
    totalCustomers: 0,
    recentOrders: [],
    topMedicines: [],
    monthlyRevenue: [],
    lowStockItems: []
  });
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pharmacy/analytics?days=${dateRange}`);
      setAnalytics(response.data.analytics || {});
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, change }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600">{title}</p>
          <p className="text-3xl font-bold text-secondary-900">{value}</p>
          {change && (
            <p className={`text-sm flex items-center gap-1 mt-1 ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp size={14} />
              {change >= 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Analytics & Reports</h2>
          <p className="text-secondary-600">Track your pharmacy performance</p>
        </div>
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary-500">Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Revenue"
              value={`₹${analytics.totalRevenue?.toLocaleString() || 0}`}
              icon={<DollarSign className="text-green-600" size={24} />}
              color="bg-green-100"
              change={analytics.revenueChange}
            />
            <StatCard
              title="Total Orders"
              value={analytics.totalOrders || 0}
              icon={<Package className="text-blue-600" size={24} />}
              color="bg-blue-100"
              change={analytics.ordersChange}
            />
            <StatCard
              title="Medicines in Stock"
              value={analytics.totalMedicines || 0}
              icon={<BarChart3 className="text-purple-600" size={24} />}
              color="bg-purple-100"
            />
            <StatCard
              title="Active Customers"
              value={analytics.totalCustomers || 0}
              icon={<Users className="text-orange-600" size={24} />}
              color="bg-orange-100"
              change={analytics.customersChange}
            />
          </div>

          {/* Charts and Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Medicines */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Top Selling Medicines</h3>
              <div className="space-y-3">
                {analytics.topMedicines?.length > 0 ? (
                  analytics.topMedicines.slice(0, 5).map((medicine, index) => (
                    <div key={medicine._id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">{medicine.name}</p>
                          <p className="text-sm text-secondary-600">{medicine.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-secondary-900">{medicine.totalSold} sold</p>
                        <p className="text-sm text-secondary-600">₹{medicine.revenue}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary-500 text-center py-4">No sales data available</p>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Low Stock Alert</h3>
              <div className="space-y-3">
                {analytics.lowStockItems?.length > 0 ? (
                  analytics.lowStockItems.slice(0, 5).map((medicine) => (
                    <div key={medicine._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium text-secondary-900">{medicine.name}</p>
                        <p className="text-sm text-secondary-600">{medicine.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">{medicine.stock} left</p>
                        <p className="text-sm text-secondary-600">Min: {medicine.minStock}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary-500 text-center py-4">All medicines are well stocked</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Order ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {analytics.recentOrders?.length > 0 ? (
                    analytics.recentOrders.slice(0, 10).map((order) => (
                      <tr key={order._id} className="hover:bg-secondary-50">
                        <td className="px-4 py-2 text-sm font-medium text-secondary-900">
                          #{order.orderNumber}
                        </td>
                        <td className="px-4 py-2 text-sm text-secondary-900">
                          {order.customer?.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-secondary-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-secondary-900">
                          ₹{order.totalAmount}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' 
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-secondary-500">
                        No recent orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Revenue Chart Placeholder */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <div className="text-center">
                <BarChart3 size={48} className="text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-500">Revenue chart will be displayed here</p>
                <p className="text-sm text-secondary-400">Integration with charting library coming soon</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
