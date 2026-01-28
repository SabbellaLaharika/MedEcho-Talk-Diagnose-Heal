import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import PageContainer from '../../components/layout/PageContainer';
import DoctorsTable from '../../components/admin/DoctorsTable';
import AddEditDoctorForm from '../../components/admin/AddEditDoctorForm';
import Button from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageDoctors: React.FC = () => {
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editDoctorId, setEditDoctorId] = useState<string | null>(null);
  
  if (!currentUser || currentUser.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleAddNew = () => {
    setEditDoctorId(null);
    setShowAddForm(true);
  };

  const handleEdit = (doctorId: string) => {
    setEditDoctorId(doctorId);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditDoctorId(null);
  };

  const handleSuccess = () => {
    setShowAddForm(false);
    setEditDoctorId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <AdminSidebar isOpen={isSidebarOpen} />
      
      <div className="lg:pl-64 pt-16">
        {showAddForm ? (
          <PageContainer
            title={editDoctorId ? "Edit Doctor" : "Add New Doctor"}
            subtitle={editDoctorId ? "Update doctor information" : "Add a new doctor to the system"}
          >
            <AddEditDoctorForm 
              doctorId={editDoctorId || undefined}
              onCancel={handleCancel}
              onSuccess={handleSuccess}
            />
          </PageContainer>
        ) : (
          <PageContainer
            title="Manage Doctors"
            subtitle="View and manage all doctors in the system"
            actions={
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Doctor
              </Button>
            }
          >
            <DoctorsTable onEdit={handleEdit} />
          </PageContainer>
        )}
      </div>
    </div>
  );
};

export default ManageDoctors;