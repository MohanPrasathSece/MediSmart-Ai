import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { UploadCloud, FileText, Pill, AlertTriangle, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';

const UploadPrescriptionPage = () => {
  // Load state from session storage on initial render
  const getInitialState = (key, defaultValue) => {
    try {
      const storedData = sessionStorage.getItem('prescriptionResults');
      if (storedData) {
        const { data, timestamp } = JSON.parse(storedData);
        // Data is valid for 3 minutes (180000 ms)
        if (Date.now() - timestamp < 180000) {
          return data[key] || defaultValue;
        }
      }
    } catch (e) {
      console.error("Failed to parse session storage data", e);
    }
    return defaultValue;
  };

  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Results state
  const [extractedText, setExtractedText] = useState(() => getInitialState('extractedText', ''));
  const [medicines, setMedicines] = useState(() => getInitialState('medicines', []));
  const [pharmacies, setPharmacies] = useState(() => getInitialState('pharmacies', []));
  const [selections, setSelections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState(null);

  useEffect(() => {
    if (medicines.length > 0 && pharmacies.length > 0) {
      const initialSelections = {};
      medicines.forEach(med => {
        // Find the first pharmacy that has this medicine
        const availablePharmacy = pharmacies.find(p => 
          p.medicinesInStock.some(m => m.name.toLowerCase() === med.word.toLowerCase() && m.stock > 0)
        );
        if (availablePharmacy) {
          const medicineInStock = availablePharmacy.medicinesInStock.find(m => m.name.toLowerCase() === med.word.toLowerCase());
          initialSelections[med.word] = {
            medicineId: medicineInStock?._id || '',
            pharmacyId: availablePharmacy._id,
            quantity: 1,
          };
        }
      });
      setSelections(initialSelections);
    }
  }, [medicines, pharmacies]);

  const handleCancel = () => {
    // Clear cache and reset all state to initial
    sessionStorage.removeItem('prescriptionResults');
    setExtractedText('');
    setMedicines([]);
    setPharmacies([]);
    setSelections({});
    setSelectedFile(null);
    setPreview(null);
    setError('');
    setIsLoading(false);
    toast.success('Process cancelled. You can upload a new prescription.');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a prescription image first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setExtractedText('');
    setMedicines([]);
    setPharmacies([]);
    setSelections({});

    const formData = new FormData();
    formData.append('prescription', selectedFile);

    try {
      const res = await api.post('/ai/upload-prescription', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      setExtractedText(data.text);

      // De-duplicate medicines by name (case-insensitive)
      const uniqueMedicines = [];
      const seenNames = new Set();
      if (data.medicines) {
        for (const med of data.medicines) {
          const lowerCaseName = med.word.toLowerCase();
          if (!seenNames.has(lowerCaseName)) {
            seenNames.add(lowerCaseName);
            uniqueMedicines.push(med);
          }
        }
      }

      setMedicines(uniqueMedicines);
      setPharmacies(data.pharmacies || []);
      if (uniqueMedicines.length === 0) {
        toast.success('Prescription processed, but no medicines were identified.');
      } else {
        toast.success('Prescription processed successfully!');
      }

      // Cache results in session storage with a timestamp
      const resultsToCache = { extractedText: data.text, medicines: uniqueMedicines, pharmacies: data.pharmacies || [] };
      sessionStorage.setItem('prescriptionResults', JSON.stringify({ data: resultsToCache, timestamp: Date.now() }));
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to process prescription.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderChange = (medName, field, value) => {
    setSelections(prev => {
      const updated = { ...prev };
      const current = updated[medName] || {};

      if (field === 'pharmacyId') {
        // When pharmacy changes, also update the corresponding medicineId and reset quantity to 1
        const selectedPharmacy = pharmacies.find(p => p._id === value);
        const medInStock = selectedPharmacy?.medicinesInStock.find(m => m.name.toLowerCase() === medName.toLowerCase());
        updated[medName] = {
          ...current,
          pharmacyId: value,
          medicineId: medInStock?._id || '',
          quantity: current.quantity || 1,
        };
      } else {
        updated[medName] = { ...current, [field]: value };
      }
      return updated;
    });
  };

  // Temporary storage for order payload so we can reuse on modal confirm
  const orderPayloadRef = React.useRef(null);

  const submitOrder = async () => {
    const { payload } = orderPayloadRef.current || {};
    if (!payload) return;
    setIsSubmitting(true);
    try {
      await api.post('/orders', payload);
      toast.success('Order placed successfully!');
      sessionStorage.removeItem('prescriptionResults');
      setExtractedText('');
      setMedicines([]);
      setPharmacies([]);
      setSelections({});
      navigate('/my-orders');
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Please login to place an order.');
        navigate('/login');
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to place order.';
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
      setConfirmDetails(null);
    }
  };

  const handleOrderSubmit = async () => {
    const firstMedKey = Object.keys(selections)[0];
    if (!firstMedKey) {
      toast.error("No items to order.");
      return;
    }
    const pharmacyId = selections[firstMedKey].pharmacyId;
    const selectedPharmacy = pharmacies.find(p => p._id === pharmacyId);

    // Recalculate total price for safety
    let totalPrice = 0;
    for (const [medName, selection] of Object.entries(selections)) {
        const pharmacyForMed = pharmacies.find(p => p._id === selection.pharmacyId);
        const medInStock = pharmacyForMed?.medicinesInStock.find(m => m._id === selection.medicineId);
        if (medInStock) {
            totalPrice += medInStock.price * selection.quantity;
        }
    }



    setIsSubmitting(true);
    try {
      const firstMedKey = Object.keys(selections)[0];
      if (!firstMedKey) throw new Error('No medicines selected.');

      const pharmacyId = selections[firstMedKey].pharmacyId;

      const items = Object.keys(selections).map(medName => {
        const value = selections[medName];
        if (!value.medicineId) {
          throw new Error(`Could not find ID for medicine: ${medName}`);
        }
        const selectedPharm = pharmacies.find(p => p._id === value.pharmacyId);
        const stockRecord = selectedPharm?.medicinesInStock.find(m => m._id === value.medicineId);
        if (!stockRecord || value.quantity > stockRecord.stock) {
          throw new Error(`Insufficient stock for ${medName}. Available: ${stockRecord?.stock || 0}`);
        }
        return {
          medicine: value.medicineId,
          quantity: value.quantity,
        };
      });

      // store payload for modal
      orderPayloadRef.current = { payload: {
        pharmacy: pharmacyId,
        items,
        // TODO: Add a real address form
        deliveryAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA',
          coordinates: { type: 'Point', coordinates: [-118.2437, 34.0522] },
          contactPhone: user?.phone || 'N/A'
        },
        paymentMethod: 'cash_on_delivery',
      } };

      setConfirmDetails({
        pharmacyName: selectedPharmacy.name,
        totalPrice: totalPrice.toFixed(2),
        onConfirm: () => {
          api.post('/orders', orderPayloadRef.current.payload)
            .then(() => {
              toast.success('Order placed successfully!');
              sessionStorage.removeItem('prescriptionResults');
              setExtractedText('');
              setMedicines([]);
              setPharmacies([]);
              setSelections({});
              navigate('/my-orders');
            })
            .catch((err) => {
              if (err.response?.status === 401) {
                toast.error('Please login to place an order.');
                navigate('/login');
              } else {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to place order.';
                toast.error(errorMessage);
              }
            })
            .finally(() => {
              setIsSubmitting(false);
              setConfirmDetails(null);
            });
        },
      });
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to place order.';
      console.error(err);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOrderForm = () => (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <ShoppingCart size={24} /> Place Your Order
      </h3>
      <div className="space-y-4">
        {medicines.map(med => {
          const selection = selections[med.word];
          if (!selection) return null;

          const availablePharmacies = pharmacies.filter(p => 
            p.medicinesInStock.some(m => m.name.toLowerCase() === med.word.toLowerCase())
          );

          if (availablePharmacies.length === 0) {
            return (
              <div key={med.word} className="border p-4 rounded mb-3 bg-gray-50">
                <p className="font-semibold text-lg text-gray-700">{med.word}</p>
                <p className="text-sm text-red-600 mt-1">Not available in any partner pharmacies.</p>
              </div>
            );
          }

          return (
            <div key={med.word} className="border p-4 rounded mb-3">
              <h2 className="text-lg font-semibold">{med.word}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                <select
                  className="border p-2 rounded flex-1"
                  value={selection.pharmacyId}
                  onChange={(e) => handleOrderChange(med.word, 'pharmacyId', e.target.value)}
                >
                  {availablePharmacies.map(ph => {
                    const stockInfo = ph.medicinesInStock.find(m => m.name.toLowerCase() === med.word.toLowerCase());
                    return (
                      <option key={ph._id} value={ph._id}>
                        {ph.name} (${stockInfo?.price?.toFixed(2) || 'N/A'})
                      </option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  min="1"
                  className="border p-2 rounded w-24"
                  value={selection.quantity}
                  onChange={(e) => handleOrderChange(med.word, 'quantity', Number(e.target.value))}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="mt-6 w-full flex justify-center items-center py-3 px-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-300"
        onClick={handleOrderSubmit}
        disabled={isSubmitting || Object.keys(selections).length === 0}
      >
        {isSubmitting ? <Spinner size="sm" /> : 'Place Order'}
      </button>
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      {/* Confirmation Modal */}
      {confirmDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white w-11/12 max-w-md p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Confirm Your Order</h3>
            <p className="mb-2 text-gray-700">Pharmacy: <span className="font-medium">{confirmDetails.pharmacyName}</span></p>
            <p className="mb-4 text-gray-700">Total Amount: <span className="font-medium">${confirmDetails.totalPrice}</span></p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
                onClick={() => setConfirmDetails(null)}
              >Cancel</button>
              <button
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setConfirmDetails(null);
                  confirmDetails.onConfirm();
                }}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-secondary-900">Upload Your Prescription</h1>
        <p className="text-secondary-600 mt-2">Our AI will read your prescription, find medicines, and help you order them instantly.</p>
      </div>

      <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-lg shadow-md">
        {!extractedText && (
          <form onSubmit={handleUploadSubmit}>
            <div className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors">
              <input type="file" id="prescription-upload" className="hidden" onChange={handleFileChange} accept="image/*" />
              <label htmlFor="prescription-upload" className="cursor-pointer">
                <UploadCloud className="mx-auto h-12 w-12 text-secondary-400" />
                <p className="mt-2 text-sm text-secondary-600">
                  <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-secondary-500">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>

            {preview && (
              <div className="mt-6 text-center">
                <h4 className="font-semibold mb-2">Image Preview:</h4>
                <img src={preview} alt="Prescription preview" className="max-w-xs mx-auto rounded-lg shadow-sm" />
              </div>
            )}

            <div className="mt-6">
              <button 
                type="submit" 
                className="w-full flex justify-center items-center py-3 px-4 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 disabled:bg-primary-300"
                disabled={isLoading || !selectedFile}
              >
                {isLoading ? <Spinner size="sm" /> : 'Process Prescription'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} />
            <div>
              <h4 className="font-bold">Error</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {extractedText && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCancel}
              className="py-2 px-4 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
            >
              Cancel & Upload Another
            </button>
          </div>
        )}

        {extractedText && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-secondary-800 flex items-center gap-2"><FileText size={20} /> Extracted Text</h3>
            <p className="mt-2 text-secondary-700 whitespace-pre-wrap font-mono bg-secondary-50 p-3 rounded">{extractedText}</p>
          </div>
        )}

        {medicines.length > 0 && pharmacies.length > 0 && renderOrderForm()}

        {medicines.length > 0 && pharmacies.length === 0 && !isLoading && (
            <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold text-yellow-800 mb-4">Medicines Identified</h3>
                <p className="text-yellow-700">The following medicines were found, but they are not currently available in any of our partner pharmacies:</p>
                <ul className="space-y-3 mt-4">
                {medicines.map((med, index) => (
                    <li key={index} className="p-3 bg-yellow-100 rounded-md">
                    <p className="font-semibold text-lg text-yellow-900">{med.word}</p>
                    </li>
                ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadPrescriptionPage;
