"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserForm } from "./UserForm";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/domain/types";
import { X } from "lucide-react";

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

interface UserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

export function UserModal({ user, isOpen, onClose, onSave, onDelete }: UserModalProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setIsEditing(false);
      setActiveTab("info");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleFormSubmit = async (data: any) => {
    await onSave({ ...data, id: user.id });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
      await onDelete(user.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Editar Usuario" : user.full_name || user.email || "Usuario"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Eliminar
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <UserForm
              initialData={{
                email: user.email || "",
                fullName: user.full_name || "",
                phone: user.phone || "",
                role: user.role,
                terminalId: user.additionalData?.terminal?.id,
                companyName: user.additionalData?.busOwner?.company_name,
                taxId: user.additionalData?.busOwner?.tax_id,
                address: user.additionalData?.busOwner?.address,
                accountingEmail: user.additionalData?.busOwner?.accounting_email,
              }}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsEditing(false)}
              isEditing={true}
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
                <TabsTrigger value="details">Detalles</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{user.email || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                    <p className="text-base">{user.phone || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                    <p className="text-base">{user.full_name || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rol</label>
                    <div className="mt-1">
                      <Badge variant="default">
                        {USER_ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4 mt-6">
                {user.role === "pos_agent" && (
                  <div>
                    <h3 className="font-semibold mb-2">Terminal POS Asignada</h3>
                    {user.additionalData?.terminal ? (
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="font-medium">{user.additionalData.terminal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.additionalData.terminal.location}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay terminal asignada</p>
                    )}
                  </div>
                )}

                {user.role === "bus_owner" && (
                  <div>
                    <h3 className="font-semibold mb-2">Información de Empresa</h3>
                    {user.additionalData?.busOwner ? (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                          <p className="font-medium">{user.additionalData.busOwner.company_name}</p>
                        </div>
                        {user.additionalData.busOwner.tax_id && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                            <p>{user.additionalData.busOwner.tax_id}</p>
                          </div>
                        )}
                        {user.additionalData.busOwner.address && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                            <p>{user.additionalData.busOwner.address}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay información de empresa registrada</p>
                    )}
                  </div>
                )}

                {(user.role === "driver" || user.role === "assistant") && (
                  <p className="text-muted-foreground">No hay asignaciones específicas para este rol</p>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID de Usuario</label>
                    <p className="text-base font-mono text-sm">{user.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
                    <p className="text-base">
                      {new Date(user.created_at).toLocaleDateString("es-PA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Verificado</label>
                    <p className="text-base">
                      {user.email_verified_at ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Teléfono Verificado</label>
                    <p className="text-base">
                      {user.phone_verified_at ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

