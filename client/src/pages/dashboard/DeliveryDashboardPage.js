import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthProvider';
import Spinner from '../../components/common/Spinner';
import { List, Map, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const fetchAssignedOrders = async (api) => {
  // This endpoint would need to be created on the backend
  // For now, we'll assume it fetches orders assigned to the current delivery person
  const { data } = await api.get('/orders/assigned'); 
  return data.orders;
};

const DeliveryDashboardPage = () => {
  const { api, user } = useAuth();
  const { data: orders, isLoading, isError, error } = useQuery('assignedOrders', () => fetchAssignedOrders(api));

  const activeOrders = orders?.filter(o => o.currentStatus === 'Shipped' || o.currentStatus === 'Processing') || [];

  const mapCenter = activeOrders.length > 0 && activeOrders[0].deliveryAddress?.location?.coordinates
    ? [activeOrders[0].deliveryAddress.location.coordinates[1], activeOrders[0].deliveryAddress.location.coordinates[0]]
    : [51.505, -0.09];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Delivery Dashboard</h1>
        <p className="text-secondary-600">Welcome, {user?.name}! Here are your assigned deliveries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders List */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-md h-[calc(100vh-200px)] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><List /> Active Deliveries</h2>
          {isLoading ? (
            <Spinner />
          ) : isError ? (
            <p className="text-red-500">{error.message}</p>
          ) : activeOrders.length > 0 ? (
            <ul className="space-y-4">
              {activeOrders.map(order => (
                <li key={order._id} className="p-3 border rounded-md">
                  <p className="font-semibold">Order #{order._id.substring(0, 8)}</p>
                  <p className="text-sm text-secondary-600">To: {order.deliveryAddress.street}</p>
                  <p className="text-sm font-bold mt-1">Status: {order.currentStatus}</p>
                  <button className="mt-2 w-full text-sm py-1 bg-primary-600 text-white rounded hover:bg-primary-700">View Details</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No active deliveries.</p>
          )}
        </div>

        {/* Map View */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Map /> Delivery Map</h2>
          <div className="h-[calc(100vh-250px)] rounded-lg overflow-hidden">
            <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {activeOrders.map(order => (
                <Marker 
                  key={order._id} 
                  position={[
                    order.deliveryAddress.location.coordinates[1],
                    order.deliveryAddress.location.coordinates[0]
                  ]}>
                  <Popup>
                    <b>Order #{order._id.substring(0, 8)}</b><br/>
                    {order.deliveryAddress.street}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboardPage;
