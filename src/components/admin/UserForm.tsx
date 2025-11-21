"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/domain/types";

interface UserFormData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: UserRole;
  // Additional fields for specific roles
  terminalId?: string;
  companyName?: string;
  taxId?: string;
  address?: string;
  accountingEmail?: string;
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function UserForm({ initialData, onSubmit, onCancel, isEditing = false }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: initialData?.email || "",
    password: "",
    fullName: initialData?.fullName || "",
    phone: initialData?.phone || "",
    role: (initialData?.role || "passenger") as UserRole,
    terminalId: initialData?.terminalId,
    companyName: initialData?.companyName || "",
    taxId: initialData?.taxId || "",
    address: initialData?.address || "",
    accountingEmail: initialData?.accountingEmail || "",
  });

  const [terminals, setTerminals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.role === "pos_agent") {
      fetchTerminals();
    }
  }, [formData.role]);

  const fetchTerminals = async () => {
    try {
      const response = await fetch("/api/admin/pos/terminals");
      const data = await response.json();
      if (response.ok) {
        setTerminals(data.terminals || []);
      }
    } catch (error) {
      console.error("Error fetching terminals:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.email) {
        throw new Error("Email es requerido");
      }
      if (!isEditing && !formData.password) {
        throw new Error("Contraseña es requerida para nuevos usuarios");
      }
      if (!formData.role) {
        throw new Error("Rol es requerido");
      }

      await onSubmit(formData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const showRoleSpecificFields = () => {
    return formData.role === "bus_owner" || formData.role === "pos_agent";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isEditing}
          />
        </div>

        {!isEditing && (
          <div>
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
        )}

        <div>
          <Label htmlFor="fullName">Nombre Completo</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="role">Rol *</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {USER_ROLE_LABELS[role] || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Role-specific fields */}
      {showRoleSpecificFields() && (
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">Información Adicional</h3>

          {formData.role === "pos_agent" && (
            <div>
              <Label htmlFor="terminalId">Terminal POS</Label>
              <Select
                value={formData.terminalId || ""}
                onValueChange={(value) => setFormData({ ...formData, terminalId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un terminal" />
                </SelectTrigger>
                <SelectContent>
                  {terminals.map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.id}>
                      {terminal.name} - {terminal.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.role === "bus_owner" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Nombre de Empresa *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required={formData.role === "bus_owner"}
                />
              </div>

              <div>
                <Label htmlFor="taxId">Tax ID / RUC</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="accountingEmail">Email Contabilidad</Label>
                <Input
                  id="accountingEmail"
                  type="email"
                  value={formData.accountingEmail}
                  onChange={(e) => setFormData({ ...formData, accountingEmail: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}

