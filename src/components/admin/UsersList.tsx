"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/domain/types";
import { Edit, Trash2, Eye, Search, Filter } from "lucide-react";

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: UserRole;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
}

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onView: (user: User) => void;
  loading?: boolean;
}

const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "outline" | "destructive" => {
  switch (role) {
    case "admin":
      return "destructive";
    case "bus_owner":
      return "default";
    case "pos_agent":
      return "secondary";
    case "driver":
    case "assistant":
      return "outline";
    default:
      return "outline";
  }
};

export function UsersList({ users, onEdit, onDelete, onView, loading = false }: UsersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {USER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {USER_ROLE_LABELS[role] || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Teléfono</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.full_name || "Sin nombre"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{user.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{user.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {USER_ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {user.email_verified_at && (
                          <Badge variant="outline" className="text-xs w-fit">
                            Email ✓
                          </Badge>
                        )}
                        {user.phone_verified_at && (
                          <Badge variant="outline" className="text-xs w-fit">
                            Teléfono ✓
                          </Badge>
                        )}
                        {!user.email_verified_at && !user.phone_verified_at && (
                          <span className="text-xs text-muted-foreground">No verificado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(user)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(user)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(user.id)}
                          title="Eliminar"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </div>
    </div>
  );
}

