import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthProvider';
import { useMutation } from 'react-query';
import socket from '../socket';
import Spinner from '../components/common/Spinner';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const fetchOrderById = async (api, id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data.order;
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const { api, user } = useAuth();
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');

  const { data: order, isLoading, isError, error, refetch } = useQuery(
    ['order', id],
    () => fetchOrderById(api, id)
  );

  // Fetch available delivery boys if the user is a pharmacy and order is pending
  const { data: deliveryBoys, isLoading: isLoadingBoys } = useQuery(
    'availableDeliveryBoys',
    async () => {
      const { data } = await api.get('/delivery/available');
      return data;
    },
    {
      enabled: user?.role === 'pharmacy' && order?.status === 'pending',
    }
  );

  const assignDeliveryMutation = useMutation(
    (deliveryBoyId) => api.put(`/orders/${id}/assign-delivery`, { deliveryBoyId }),
    {
      onSuccess: () => {
        refetch();
      },
      onError: (error) => {
        console.error('Error assigning delivery boy:', error);
                const errorMessage = error.response?.data?.message || 'An unknown error occurred.';
        alert(`Failed to assign delivery boy: ${errorMessage}`);
      }
    }
  );

    const acceptOrderMutation = useMutation(
    () => api.put(`/delivery/orders/${id}/accept`),
    {
      onSuccess: () => refetch(),
      onError: (error) => {
        console.error('Error accepting order:', error);
        alert('Failed to accept order.');
      }
    }
  );

  const rejectOrderMutation = useMutation(
    () => api.put(`/delivery/orders/${id}/reject`),
    {
      onSuccess: () => refetch(),
      onError: (error) => {
        console.error('Error rejecting order:', error);
        alert('Failed to reject order.');
      }
    }
  );

  const handleAssignDelivery = () => {
    if (selectedDeliveryBoy) {
      assignDeliveryMutation.mutate(selectedDeliveryBoy);
    }
  };



  useEffect(() => {
    socket.emit('join_order_room', id);

    socket.on('order_status_updated', (updatedOrder) => {
      if (updatedOrder._id === id) {
        refetch();
      }
    });

    socket.on('delivery_location_updated', (data) => {
      if (data.orderId === id) {
        setDeliveryLocation(data.location);
      }
    });

    return () => {
      socket.emit('leave_order_room', id);
      socket.off('order_status_updated');
      socket.off('delivery_location_updated');
    };
  }, [id, refetch]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (isError) {
    return <div className="text-center text-red-500 py-10">Error: {error.message}</div>;
  }

  const pharmacyLocation = order.pharmacy?.location?.coordinates;
  const deliveryAddressLocation = order.deliveryAddress?.location?.coordinates;
  const currentDeliveryLocation = deliveryLocation || order.deliveryTracking?.currentLocation?.coordinates;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Order Details</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
          {/* Assign Delivery Boy Section */}
          {user?.role === 'pharmacy' && order?.status === 'pending' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Assign Delivery Boy</h2>
              {isLoadingBoys ? (
                <Spinner />
              ) : deliveryBoys && deliveryBoys.length > 0 ? (
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedDeliveryBoy}
                    onChange={(e) => setSelectedDeliveryBoy(e.target.value)}
                    className="flex-grow p-2 border rounded-md"
                  >
                    <option value="">Select a delivery boy</option>
                    {deliveryBoys.map(boy => (
                      <option key={boy._id} value={boy._id}>{boy.name} - {boy.isAvailable ? 'Available' : 'Unavailable'}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignDelivery}
                    disabled={!selectedDeliveryBoy || assignDeliveryMutation.isLoading}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:bg-secondary-300"
                  >
                    {assignDeliveryMutation.isLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              ) : (
                <p>No delivery boys available at the moment.</p>
              )}
                         {/* Delivery Boy Action Section */}
          {user?.role === 'delivery_boy' && order?.status === 'pending_acceptance' && order.deliveryBoy === user.id && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">New Delivery Request</h2>
              <p className="mb-4">You have a new delivery request from {order.pharmacy.name}.</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => acceptOrderMutation.mutate()}
                  disabled={acceptOrderMutation.isLoading || rejectOrderMutation.isLoading}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-secondary-300"
                >
                  {acceptOrderMutation.isLoading ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  onClick={() => rejectOrderMutation.mutate()}
                  disabled={acceptOrderMutation.isLoading || rejectOrderMutation.isLoading}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-secondary-300"
                >
                  {rejectOrderMutation.isLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
              {(acceptOrderMutation.isError || rejectOrderMutation.isError) && (
                 <p className="text-red-500 mt-2">{acceptOrderMutation.error?.response?.data?.message || rejectOrderMutation.error?.response?.data?.message || 'An error occurred.'}</p>
              )}
            </div>
          )}

               {assignDeliveryMutation.isError && (
                <p className="text-red-500 mt-2">{assignDeliveryMutation.error.response?.data?.message || 'An error occurred.'}</p>
              )}
            </div>
          )}

          {/* Order Items */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Items</h2>
            {order.items.map(item => (
              <div key={item.medicine._id} className="flex justify-between items-center py-2 border-b last:border-none">
                <div>
                  <p className="font-semibold">{item.medicine.name}</p>
                  <p className="text-sm text-secondary-600">{item.quantity} x ${item.price.toFixed(2)}</p>
                </div>
                <p className="font-semibold">${(item.quantity * item.price).toFixed(2)}</p>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg pt-4">
              <span>Total</span>
              <span>${order.pricing.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white p-6 rounded-lg shadow-md">
             <h2 className="text-xl font-semibold mb-4">Order Status</h2>
             <ul className="space-y-4">
              {order.statusHistory.map((statusItem, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-4 h-4 bg-primary-500 rounded-full mt-1.5"></div>
                  <div className="ml-4">
                    <p className="font-semibold">{statusItem.status}</p>
                    <p className="text-sm text-secondary-500">{new Date(statusItem.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          {/* Live Tracking Map */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Live Tracking</h3>
            <div className="h-80 rounded-lg overflow-hidden">
              <MapContainer center={pharmacyLocation ? [pharmacyLocation[1], pharmacyLocation[0]] : [51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {pharmacyLocation && <Marker position={[pharmacyLocation[1], pharmacyLocation[0]]}><Popup>Pharmacy</Popup></Marker>}
                {deliveryAddressLocation && <Marker position={[deliveryAddressLocation[1], deliveryAddressLocation[0]]}><Popup>Your Location</Popup></Marker>}
                {currentDeliveryLocation && <Marker position={[currentDeliveryLocation[1], currentDeliveryLocation[0]]}><Popup>Delivery</Popup></Marker>}
              </MapContainer>
            </div>
          </div>

          {/* Chat placeholder */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">Chat with Support</h3>
            <p className="text-sm text-secondary-600 mt-2">Chat feature coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
