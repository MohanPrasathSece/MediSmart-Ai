import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { Clock, CheckCircle, Truck, User, MapPin, Phone, Package, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderManagement = () => {
  const { api } = useAuth();
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState({});

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pharmacy/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryBoys = async () => {
    try {
      const response = await api.get('/pharmacy/delivery-boys');
      setDeliveryBoys(response.data.deliveryBoys || []);
    } catch (error) {
      console.error('Failed to fetch delivery boys:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/pharmacy/orders/${orderId}/status`, { status });
      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const assignDeliveryBoy = async (orderId) => {
    const deliveryBoyId = selectedDeliveryBoy[orderId];
    if (!deliveryBoyId) {
      toast.error('Please select a delivery boy.');
      return;
    }

    try {
      const response = await api.put(`/pharmacy/orders/${orderId}/assign-delivery`, { deliveryBoyId });
      const updatedOrder = response.data;
      const newOrders = orders.map(o => o._id === updatedOrder._id ? updatedOrder : o);
      setOrders(newOrders);
      toast.success('Delivery boy assigned!');
    } catch (err) {
      console.error('Failed to assign delivery boy:', err);
      toast.error('Failed to assign delivery boy.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return <Package size={16} />;
      case 'assigned':
      case 'out_for_delivery':
        return <Truck size={16} />;
      case 'delivered':
        return <CheckCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const ordersByStatus = {
    pending: orders.filter(order => order.status === 'pending'),
    confirmed: orders.filter(order => order.status === 'confirmed'),
    preparing: orders.filter(order => order.status === 'preparing'),
    ready: orders.filter(order => order.status === 'ready'),
    assigned: orders.filter(order => order.status === 'assigned'),
    out_for_delivery: orders.filter(order => order.status === 'out_for_delivery'),
    delivered: orders.filter(order => order.status === 'delivered'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Order Management</h2>
        <p className="text-secondary-600">Manage incoming orders and assign delivery</p>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-800">{ordersByStatus.pending.length}</p>
            </div>
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">In Progress</p>
              <p className="text-2xl font-bold text-blue-800">
                {ordersByStatus.confirmed.length + ordersByStatus.preparing.length + ordersByStatus.ready.length}
              </p>
            </div>
            <Package className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Out for Delivery</p>
              <p className="text-2xl font-bold text-orange-800">
                {ordersByStatus.assigned.length + ordersByStatus.out_for_delivery.length}
              </p>
            </div>
            <Truck className="text-orange-600" size={24} />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Delivered</p>
              <p className="text-2xl font-bold text-green-800">{ordersByStatus.delivered.length}</p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Delivery Boy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-secondary-500">No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-secondary-50">
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-secondary-400" />
                        <div>
                          <div className="text-sm font-medium text-secondary-900">{order.patient?.name}</div>
                          <div className="text-sm text-secondary-500 flex items-center gap-1">
                            <Phone size={12} />
                            {order.patient?.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-secondary-900">
                        {order.items?.length} item(s)
                      </div>
                      <div className="text-xs text-secondary-500">
                        {order.items?.slice(0, 2).map(item => item.medicine?.name).join(', ')}
                        {order.items?.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-secondary-900">
                      ₹{order.totalAmount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.deliveryBoy ? (
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-secondary-400" />
                          <div>
                            <div className="text-sm font-medium text-secondary-900">{order.deliveryBoy.name}</div>
                            <div className="text-sm text-secondary-500">{order.deliveryBoy.phone}</div>
                          </div>
                        </div>
                      ) : (
                        <select
                          onChange={(e) => setSelectedDeliveryBoy({ ...selectedDeliveryBoy, [order._id]: e.target.value })}
                          className="w-full px-2 py-1 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select delivery boy...</option>
                          {deliveryBoys.map(db => (
                            <option key={db._id} value={db._id}>{db.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order._id, 'confirmed')}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Confirm
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => updateOrderStatus(order._id, 'preparing')}
                            className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                          >
                            Prepare
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order._id, 'ready')}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          >
                            Ready
                          </button>
                        )}
                        {order.status === 'ready' && !order.deliveryBoy && (
                          <button
                            onClick={() => assignDeliveryBoy(order._id)}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                          >
                            Assign Delivery
                          </button>
                        )}
                        {order.status === 'assigned' && (
                          <button
                            onClick={() => updateOrderStatus(order._id, 'out_for_delivery')}
                            className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700"
                          >
                            Dispatch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};

export default OrderManagement;
