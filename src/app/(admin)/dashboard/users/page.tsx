"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UsersList } from "@/components/admin/UsersList";
import { UserModal } from "@/components/admin/UserModal";
import { UserForm } from "@/components/admin/UserForm";
import { Plus, X } from "lucide-react";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/domain/types";

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: UserRole;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
  additionalData?: {
    busOwner?: any;
    terminal?: any;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
        setStatistics(data.statistics || {});
      } else {
        console.error("Error fetching users:", data.error);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (formData: any) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear usuario");
      }

      const userData = await response.json();

      // If role-specific assignments needed
      if (formData.role === "pos_agent" && formData.terminalId) {
        await fetch(`/api/admin/users/${userData.user.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceType: "terminal",
            resourceId: formData.terminalId,
          }),
        });
      }

      if (formData.role === "bus_owner" && formData.companyName) {
        await fetch(`/api/admin/users/${userData.user.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceType: "bus_owner_data",
            additionalData: {
              companyName: formData.companyName,
              taxId: formData.taxId,
              address: formData.address,
              accountingEmail: formData.accountingEmail,
            },
          }),
        });
      }

      setShowCreateForm(false);
      fetchUsers();
    } catch (error) {
      throw error;
    }
  };

  const handleEditUser = async (formData: any) => {
    try {
      const response = await fetch(`/api/admin/users/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar usuario");
      }

      // Update role-specific assignments if needed
      if (formData.role === "pos_agent" && formData.terminalId) {
        await fetch(`/api/admin/users/${formData.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceType: "terminal",
            resourceId: formData.terminalId,
          }),
        });
      }

      if (formData.role === "bus_owner" && formData.companyName) {
        await fetch(`/api/admin/users/${formData.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceType: "bus_owner_data",
            additionalData: {
              companyName: formData.companyName,
              taxId: formData.taxId,
              address: formData.address,
              accountingEmail: formData.accountingEmail,
            },
          }),
        });
      }

      setIsModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar usuario");
      }

      fetchUsers();
    } catch (error) {
      alert((error as Error).message);
      throw error;
    }
  };

  const handleViewUser = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedUser({ ...user, additionalData: data.additionalData });
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra usuarios, roles y permisos del sistema
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Usuario
          </Button>
        </div>

        {/* Statistics */}
        {statistics.byRole && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold">{statistics.total || 0}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            {Object.entries(statistics.byRole).map(([role, count]: [string, any]) => (
              <div key={role} className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">
                  {USER_ROLE_LABELS[role] || role}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Crear Nuevo Usuario</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <UserForm
                onSubmit={handleCreateUser}
                onCancel={() => setShowCreateForm(false)}
                isEditing={false}
              />
            </div>
          </div>
        )}

        {/* Users List */}
        <UsersList
          users={users}
          onEdit={(user) => {
            handleViewUser(user);
          }}
          onDelete={handleDeleteUser}
          onView={handleViewUser}
          loading={loading}
        />

        {/* User Modal */}
        {selectedUser && (
          <UserModal
            user={selectedUser}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedUser(null);
            }}
            onSave={handleEditUser}
            onDelete={handleDeleteUser}
          />
        )}
      </div>
    </div>
  );
}

