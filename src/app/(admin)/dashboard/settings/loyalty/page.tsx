"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface LoyaltyTier {
  id?: string;
  tier_name: string;
  min_points: number;
  benefits: any;
  discount_percentage: number;
  is_active: boolean;
}

export default function LoyaltySettingsPage() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [isNewTier, setIsNewTier] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings/loyalty");
      const data = await response.json();

      if (response.ok) {
        setTiers(data.tiers || []);
      }
    } catch (error) {
      console.error("Error fetching tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier: LoyaltyTier) => {
    setEditingTier({ ...tier });
    setIsNewTier(false);
  };

  const handleNew = () => {
    setEditingTier({
      tier_name: "",
      min_points: 0,
      benefits: {},
      discount_percentage: 0,
      is_active: true,
    });
    setIsNewTier(true);
  };

  const handleCancel = () => {
    setEditingTier(null);
    setIsNewTier(false);
  };

  const handleSave = async () => {
    if (!editingTier) return;

    try {
      const response = await fetch("/api/admin/settings/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTier),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchTiers();
        setEditingTier(null);
        setIsNewTier(false);
      } else {
        alert(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Error saving tier:", error);
      alert("Error al guardar la configuración");
    }
  };

  const handleDelete = async (tierName: string) => {
    if (!confirm(`¿Estás seguro de que deseas desactivar el nivel "${tierName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/settings/loyalty?tier_name=${encodeURIComponent(tierName)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTiers();
      } else {
        const data = await response.json();
        alert(data.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error deleting tier:", error);
      alert("Error al eliminar la configuración");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Lealtad</h1>
          <p className="text-muted-foreground mt-1">
            Configura los niveles y beneficios del programa de lealtad
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Volver</Button>
          </Link>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Nivel
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {editingTier && (
        <Card>
          <CardHeader>
            <CardTitle>{isNewTier ? "Nuevo Nivel" : "Editar Nivel"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tier_name">Nombre del Nivel *</Label>
              <Input
                id="tier_name"
                value={editingTier.tier_name}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, tier_name: e.target.value })
                }
                placeholder="Ej: bronze, silver, gold, platinum"
                disabled={!isNewTier}
              />
            </div>

            <div>
              <Label htmlFor="min_points">Puntos Mínimos *</Label>
              <Input
                id="min_points"
                type="number"
                value={editingTier.min_points}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, min_points: parseInt(e.target.value) || 0 })
                }
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="discount_percentage">Descuento (%)</Label>
              <Input
                id="discount_percentage"
                type="number"
                value={editingTier.discount_percentage}
                onChange={(e) =>
                  setEditingTier({
                    ...editingTier,
                    discount_percentage: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                max="100"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="benefits">Beneficios (JSON)</Label>
              <Textarea
                id="benefits"
                value={JSON.stringify(editingTier.benefits, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingTier({ ...editingTier, benefits: parsed });
                  } catch {
                    // Invalid JSON, keep as is
                  }
                }}
                rows={4}
                placeholder='{"description": "Nivel inicial", "benefits": ["Acceso a ofertas especiales"]}'
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={editingTier.is_active}
                onCheckedChange={(checked) =>
                  setEditingTier({ ...editingTier, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Activo</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tiers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <Card key={tier.tier_name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{tier.tier_name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tier)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tier.tier_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Puntos Mínimos</p>
                <p className="font-semibold">{tier.min_points}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descuento</p>
                <p className="font-semibold">{tier.discount_percentage}%</p>
              </div>
              {tier.benefits && (
                <div>
                  <p className="text-sm text-muted-foreground">Beneficios</p>
                  <p className="text-sm">
                    {typeof tier.benefits === "object"
                      ? JSON.stringify(tier.benefits, null, 2)
                      : tier.benefits}
                  </p>
                </div>
              )}
              <div className="pt-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    tier.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {tier.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && !editingTier && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No hay niveles configurados. Crea uno nuevo para comenzar.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

