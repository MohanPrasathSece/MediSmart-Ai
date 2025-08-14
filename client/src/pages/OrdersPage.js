import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import Spinner from '../components/common/Spinner';
import { ListOrdered, Calendar, DollarSign, Package } from 'lucide-react';

const fetchOrders = async (api) => {
  const { data } = await api.get('/orders');
  return data.orders;
};

const OrdersPage = () => {
  const { api, user } = useAuth();
  const { data: orders, isLoading, isError, error } = useQuery('orders', () => fetchOrders(api), {
    enabled: !!user, // Only run query if user is logged in
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Processing': return 'text-blue-600 bg-blue-100';
      case 'Shipped': return 'text-indigo-600 bg-indigo-100';
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-secondary-600 bg-secondary-100';
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (isError) {
    return <div className="text-center text-red-500 py-10">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2"><ListOrdered /> My Orders</h1>
        <p className="text-secondary-600 mt-1">View your order history and track current deliveries.</p>
      </div>

      {orders && orders.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <ul className="divide-y divide-secondary-200">
            {orders.map(order => (
              <li key={order._id}>
                <Link to={`/orders/${order._id}`} className="block p-4 hover:bg-secondary-50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                      <p className="font-semibold text-primary-600">Order #{order._id.substring(0, 8)}</p>
                      <div className="flex items-center gap-4 text-sm text-secondary-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><DollarSign size={14} /> {order.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0 text-right">
                       <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.currentStatus)}`}>
                         {order.currentStatus}
                       </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
          <Package size={48} className="mx-auto text-secondary-400" />
          <h3 className="mt-4 text-xl font-semibold text-secondary-800">No Orders Yet</h3>
          <p className="mt-2 text-secondary-600">You haven't placed any orders. Start by searching for medicines.</p>
          <Link to="/medicines" className="mt-4 inline-block px-6 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700">
            Browse Medicines
          </Link>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
