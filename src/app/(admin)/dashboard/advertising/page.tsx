"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Image as ImageIcon, Video, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface AdvertisingItem {
  id: string;
  type: "image" | "video";
  url: string;
  duration?: number; // seconds, only for images
  order: number;
}

export default function AdvertisingPage() {
  const [items, setItems] = useState<AdvertisingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newItemType, setNewItemType] = useState<"image" | "video">("image");
  const [newItemUrl, setNewItemUrl] = useState("");
  const [newItemDuration, setNewItemDuration] = useState(10);
  const [defaultImageUrl, setDefaultImageUrl] = useState("");
  const [defaultImageLoading, setDefaultImageLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchItems();
    fetchDefaultImage();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("advertising_items")
        .select("*")
        .order("order", { ascending: true });

      if (error) {
        // Table might not exist yet, create it
        if (error.code === "42P01") {
          await createTable();
          setItems([]);
          return;
        }
        throw error;
      }

      setItems(data || []);
    } catch (error) {
      console.error("Error fetching advertising items:", error);
      alert("Error al cargar publicidad");
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultImage = async () => {
    try {
      const { data, error } = await supabase
        .from("advertising_settings")
        .select("default_image_url")
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned, which is fine
        console.error("Error fetching default image:", error);
        return;
      }

      if (data) {
        setDefaultImageUrl(data.default_image_url || "");
      }
    } catch (error) {
      console.error("Error fetching default image:", error);
    }
  };

  const handleDefaultImageUpload = async (file: File) => {
    try {
      setDefaultImageLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `default-${Date.now()}.${fileExt}`;
      const filePath = `advertising/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      // Save to settings table
      const { error: settingsError } = await supabase
        .from("advertising_settings")
        .upsert({ id: "default", default_image_url: publicUrl }, { onConflict: "id" });

      if (settingsError) throw settingsError;

      setDefaultImageUrl(publicUrl);
    } catch (error) {
      console.error("Error uploading default image:", error);
      alert("Error al subir imagen por defecto");
    } finally {
      setDefaultImageLoading(false);
    }
  };

  const handleDefaultImageUrlChange = async (url: string) => {
    try {
      const { error } = await supabase
        .from("advertising_settings")
        .upsert({ id: "default", default_image_url: url }, { onConflict: "id" });

      if (error) throw error;

      setDefaultImageUrl(url);
    } catch (error) {
      console.error("Error saving default image URL:", error);
      alert("Error al guardar URL de imagen por defecto");
    }
  };

  const createTable = async () => {
    // This will be handled by a migration
    console.log("Table advertising_items does not exist. Please run migration.");
  };

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `advertising/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemUrl && !uploading) {
      alert("Por favor ingresa una URL o sube un archivo");
      return;
    }

    try {
      setUploading(true);
      let url = newItemUrl;

      // If URL is empty, we need file upload (handled separately)
      if (!url) {
        alert("Por favor ingresa una URL o usa el botón de subir archivo");
        return;
      }

      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order)) : -1;
      const newItem: Omit<AdvertisingItem, "id"> = {
        type: newItemType,
        url,
        duration: newItemType === "image" ? newItemDuration : undefined,
        order: maxOrder + 1,
      };

      const { data, error } = await supabase
        .from("advertising_items")
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data]);
      setNewItemUrl("");
      setNewItemType("image");
      setNewItemDuration(10);
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Error al agregar publicidad");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith("video/") ? "video" : "image";
    setNewItemType(type);

    try {
      setUploading(true);
      const url = await handleFileUpload(file, type);
      setNewItemUrl(url);
    } catch (error) {
      alert("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este elemento?")) return;

    try {
      const { error } = await supabase
        .from("advertising_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error al eliminar publicidad");
    }
  };

  const handleUpdateOrder = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("advertising_items")
        .update({ order: newOrder })
        .eq("id", id);

      if (error) throw error;

      // Re-fetch to get updated order
      fetchItems();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handleUpdateDuration = async (id: string, duration: number) => {
    try {
      const { error } = await supabase
        .from("advertising_items")
        .update({ duration })
        .eq("id", id);

      if (error) throw error;

      setItems(
        items.map((item) => (item.id === id ? { ...item, duration } : item))
      );
    } catch (error) {
      console.error("Error updating duration:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configuración de Publicidad</h1>
        <p className="text-muted-foreground">
          Gestiona las imágenes y videos que se muestran en la pantalla secundaria del POS
        </p>
      </div>

      {/* Default Image Configuration */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Imagen por Defecto</h2>
        <p className="text-sm text-muted-foreground">
          Esta imagen se mostrará cuando no haya elementos de publicidad configurados
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">URL de Imagen</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={defaultImageUrl}
                onChange={(e) => setDefaultImageUrl(e.target.value)}
                onBlur={(e) => handleDefaultImageUrlChange(e.target.value)}
                placeholder="https://ejemplo.com/imagen-default.jpg"
                className="flex-1 px-4 py-2 bg-background border border-input rounded-lg"
              />
              <label className="px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Subir
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDefaultImageUpload(file);
                  }}
                  className="hidden"
                  disabled={defaultImageLoading}
                />
              </label>
            </div>
          </div>
          
          {defaultImageUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={defaultImageUrl}
                alt="Imagen por defecto"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Agregar Nuevo Elemento</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value as "image" | "video")}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg"
            >
              <option value="image">Imagen</option>
              <option value="video">Video</option>
            </select>
          </div>

          {newItemType === "image" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Duración (segundos)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={newItemDuration}
                onChange={(e) => setNewItemDuration(Number(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">URL o Subir Archivo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemUrl}
                onChange={(e) => setNewItemUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="flex-1 px-4 py-2 bg-background border border-input rounded-lg"
              />
              <label className="px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Subir
                <input
                  type="file"
                  accept={newItemType === "video" ? "video/*" : "image/*"}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <Button
          onClick={handleAddItem}
          disabled={uploading || !newItemUrl}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar {newItemType === "video" ? "Video" : "Imagen"}
        </Button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Elementos de Publicidad</h2>
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            No hay elementos de publicidad. Agrega uno para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <div className="aspect-video bg-muted relative">
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`Publicidad ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    {item.type === "video" ? (
                      <Video className="w-5 h-5 text-white bg-black/50 rounded p-1" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-white bg-black/50 rounded p-1" />
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {item.type === "video" ? "Video" : "Imagen"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Orden: {item.order + 1}
                    </span>
                  </div>
                  {item.type === "image" && item.duration && (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Duración: {item.duration}s
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={item.duration}
                        onChange={(e) =>
                          handleUpdateDuration(item.id, Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateOrder(item.id, index - 1)}
                      disabled={index === 0}
                      className="flex-1"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateOrder(item.id, index + 1)}
                      disabled={index === items.length - 1}
                      className="flex-1"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

