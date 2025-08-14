import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import MedicineCard from '../components/medicines/MedicineCard';
import Spinner from '../components/common/Spinner';
import { History, Pill } from 'lucide-react';

const fetchMyMedicines = async (api) => {
  const { data } = await api.get('/medicines/my-medicines');
  return data;
};

const MedicinesPage = () => {
  const { api } = useAuth();

  const { data: medicines, isLoading, isError, error } = useQuery(
    'myMedicines',
    () => fetchMyMedicines(api)
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-secondary-900 flex items-center justify-center gap-3">
          <History size={32} /> My Medicine History
        </h1>
        <p className="text-secondary-600 mt-2">A list of medicines you have purchased previously.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : isError ? (
        <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">
          <p className="font-bold">Error loading your medicines</p>
          <p>{error.message}</p>
        </div>
      ) : !medicines || medicines.length === 0 ? (
        <div className="text-center bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-6 rounded-lg shadow-md">
          <Pill size={48} className="mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-semibold mb-2">No Past Medicines Found</h2>
          <p className="mb-4">It looks like you haven't ordered any medicines with us yet.</p>
          <Link 
            to="/upload-prescription"
            className="inline-block bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Upload a Prescription to Get Started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicines.map(medicine => (
            <MedicineCard key={medicine._id} medicine={medicine} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicinesPage;
