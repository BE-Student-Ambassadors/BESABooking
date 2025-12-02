import { useState, useEffect } from 'react';
import { X, User, Save, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../src/firebase.ts';
// import { mockBesas } from '../../../../data/mockData.ts';

type BesaType = {
  id: string;          
  name: string;
  email: string;
  role: string;
  status: string;
  toursThisWeek?: number;
  totalTours?: number;
};

type BookingData = {
  id?: string;
  tourType: string;
  date: string;
  time: string;
  attendees: number;
  maxAttendees: number;
  besas?: string[];
  besa?: string; // For backward compatibility
  contactEmail: string;
  firstName: string;
  lastName: string;
  contactPhone: string;
  organization: string;
  role: string;
  interests: string[];
};

export default function BESAManagementView() {
  const [besas, setBesas] = useState<BesaType[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [selectedBesa, setSelectedBesa] = useState<string | null>(null);
  const [viewingBesaTours, setViewingBesaTours] = useState<string | null>(null);
  const [showNewBesaModal, setShowNewBesaModal] = useState(false);
  const [newBesa, setNewBesa] = useState({
    name: '',
    email: '',
    role: 'BESA',
    status: 'active',
  });

  {/* Fetch BESAS & Booking Info */}
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch BESAs
        const besaSnapshot = await getDocs(collection(db, "Besas"));
        const besasData = besaSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            toursThisWeek: 0, 
            totalTours: 0, 
          } as BesaType;
        });

        // Fetch Bookings
        const bookingSnapshot = await getDocs(collection(db, "Bookings"));
        const bookingsData = bookingSnapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            // Handle backward compatibility - convert single besa to array
            besas: docData.besas ? docData.besas : (docData.besa ? [docData.besa] : [])
          };
        }) as BookingData[];

        setBookings(bookingsData);

        // Calculate tour counts for each BESA
        const updatedBesas = besasData.map(besa => {
          const besaTours = bookingsData.filter(booking => 
            booking.besas?.includes(besa.name) || booking.besa === besa.name
          );

          // Calculate this week's tours
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)

          const toursThisWeek = besaTours.filter(booking => {
            const bookingDate = new Date(booking.date);
            return bookingDate >= startOfWeek && bookingDate <= endOfWeek;
          }).length;

          return {
            ...besa,
            toursThisWeek,
            totalTours: besaTours.length
          };
        });

        setBesas(updatedBesas);
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
      }
    };

    fetchData();
  }, []);

  const updateBesaField = (
    id: string,
    field: 'name' | 'email' | 'role' | 'status',
    value: string
  ) => {
    setBesas(prevBesas =>
      prevBesas.map(besa =>
        besa.id === id ? { ...besa, [field]: value } : besa
      )
    );
  };

  const handleAddNewBesa = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const docRef = await addDoc(collection(db, 'Besas'), {
        ...newBesa,
        officeHours: defaultOfficeHours,
      });
      
      setBesas(prev => [...prev, { 
        id: docRef.id, 
        ...newBesa, 
        toursThisWeek: 0, 
        totalTours: 0 
      }]);
      
      setShowNewBesaModal(false);
      setNewBesa({ name: '', email: '', role: 'BESA', status: 'active' });
    } catch (error) {
      console.error("Error adding new BESA:", error);
      alert('Failed to add new BESA. Please try again.');
    }
  };

  const defaultOfficeHours = {
    monday:    { available: false, start: '', end: '' },
    tuesday:   { available: false, start: '', end: '' },
    wednesday: { available: false, start: '', end: '' },
    thursday:  { available: false, start: '', end: '' },
    friday:    { available: false, start: '', end: '' },
    saturday:  { available: false, start: '', end: '' },
    sunday:    { available: false, start: '', end: '' }
  };

  const saveBesaChanges = async () => {
    if (selectedBesa === null) return;
    try {
      const besaToUpdate = besas.find(b => b.id === selectedBesa);
      if (!besaToUpdate) return;

      const besaDocRef = doc(db, 'Besas', besaToUpdate.id);

      await updateDoc(besaDocRef, {
        name: besaToUpdate.name,
        email: besaToUpdate.email,
        role: besaToUpdate.role,
        status: besaToUpdate.status,
      });

      setSelectedBesa(null); 
      alert('BESA updated successfully!');
    } catch (error) {
      console.error('Error updating BESA in Firestore:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  {/* Tours Assigned to Specific BESAS */}
  const getBesaTours = (besaName: string) => {
    return bookings.filter(booking => 
      booking.besas?.includes(besaName) || booking.besa === besaName
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  {/* Click BESAs name to view tours */}
  const handleBesaNameClick = (besaId: string, besaName: string) => {
    setViewingBesaTours(besaName);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        {/* Besa Management Header*/}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BESA Management</h1>
          <p className="text-gray-600">Manage BESA accounts and permissions</p>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          onClick={() => setShowNewBesaModal(true)}>
          <User className="h-4 w-4" />
          <span>Add New BESA</span>
        </button>
      </div>

      {/* Besa Table Display */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BESA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">This Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {besas.map((besa) => (
                <tr key={besa.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => handleBesaNameClick(besa.id, besa.name)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {besa.name}
                        </button>
                        <div className="text-sm text-gray-500">{besa.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${besa.role === 'BESA Lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {besa.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      {besa.toursThisWeek}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-1" />
                      {besa.totalTours}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${besa.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {besa.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedBesa(besa.id)}
                      className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to deactivate and delete ${besa.name}? This action cannot be undone.`)) {
                          try {
                            const besaDocRef = doc(db, 'Besas', besa.id);
                            await deleteDoc(besaDocRef);
                            setBesas(prev => prev.filter(b => b.id !== besa.id));
                          } catch (error) {
                            console.error('Error deleting BESA:', error);
                            alert('Failed to delete BESA. Please try again.');
                          }
                        }
                      }}>
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BESA Tours Modal */}
      {viewingBesaTours && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Tours Assigned to {viewingBesaTours}
                </h3>
                <button
                  onClick={() => setViewingBesaTours(null)}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Tours List */}
              <div className="space-y-4">
                {getBesaTours(viewingBesaTours).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No tours assigned to this BESA yet.</p>
                  </div>
                ) : (
                  getBesaTours(viewingBesaTours).map((tour, index) => (
                    <div key={tour.id || index} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {tour.tourType}
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                              <span>{formatDate(tour.date)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-green-500" />
                              <span>{tour.time}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-purple-500" />
                              <span>{tour.attendees}/{tour.maxAttendees} attendees</span>
                            </div>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-orange-500" />
                              <span>{tour.firstName} {tour.lastName}</span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <strong>Organization:</strong> {tour.organization}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Contact:</strong> {tour.contactEmail}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            new Date(tour.date) < new Date() 
                              ? 'bg-gray-100 text-gray-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {new Date(tour.date) < new Date() ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setViewingBesaTours(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Button: The Display */}
      {selectedBesa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Edit BESA: {besas.find(b => b.id === selectedBesa)?.name}
                </h3>
                <button
                  onClick={() => setSelectedBesa(null)}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Edit Form */}
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={besas.find(b => b.id === selectedBesa)?.name || ''}
                      onChange={(e) => updateBesaField(selectedBesa, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={besas.find(b => b.id === selectedBesa)?.email || ''}
                      onChange={(e) => updateBesaField(selectedBesa, 'email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={besas.find(b => b.id === selectedBesa)?.role || 'BESA'}
                      onChange={(e) => updateBesaField(selectedBesa, 'role', e.target.value)}
                    >
                      <option value="BESA">BESA</option>
                      <option value="BESA Lead">BESA Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={besas.find(b => b.id === selectedBesa)?.status || 'active'}
                      onChange={(e) => updateBesaField(selectedBesa, 'status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setSelectedBesa(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={saveBesaChanges}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New BESA Button Window */}
      {showNewBesaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New BESA</h3>
              <button
                onClick={() => setShowNewBesaModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Change State to be on click*/}
            <form onSubmit={handleAddNewBesa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newBesa.name}
                  onChange={e => setNewBesa({ ...newBesa, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newBesa.email}
                  onChange={e => setNewBesa({ ...newBesa, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newBesa.role}
                  onChange={e => setNewBesa({ ...newBesa, role: e.target.value })}
                >
                  <option value="BESA">BESA</option>
                  <option value="BESA Lead">BESA Lead</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newBesa.status}
                  onChange={e => setNewBesa({ ...newBesa, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewBesaModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add BESA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
