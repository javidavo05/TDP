"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";

interface POSTerminal {
  id: string;
  terminalIdentifier: string;
  physicalLocation: string;
  isOpen: boolean;
  assignedUserId: string | null;
}

export default function POSPage() {
  const router = useRouter();
  const [terminals, setTerminals] = useState<POSTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTerminal, setUserTerminal] = useState<POSTerminal | null>(null);

  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Fetch user's assigned terminal
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData?.role === "pos_agent") {
          // Fetch assigned terminal
          const terminalResponse = await fetch("/api/admin/pos/terminals");
          if (terminalResponse.ok) {
            const data = await terminalResponse.json();
            const terminals = data.terminals || data.data || [];
            const assigned = terminals.find(
              (t: POSTerminal) => t.assignedUserId === user.id
            );
            if (assigned) {
              setUserTerminal(assigned);
              // Auto-redirect to terminal if assigned
              router.push(`/pos/${assigned.id}`);
              return;
            }
          }
        } else if (userData?.role === "admin") {
          // Admin can see all terminals
          const terminalResponse = await fetch("/api/admin/pos/terminals");
          if (terminalResponse.ok) {
            const data = await terminalResponse.json();
            setTerminals(data.terminals || data.data || []);
          }
        } else {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Error fetching terminals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTerminals();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userTerminal) {
    // Will redirect, but show loading meanwhile
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Terminales POS</h1>
          <p className="text-muted-foreground mt-1">
            Selecciona una terminal para comenzar
          </p>
        </div>
        <UniversalThemeToggle />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {terminals.map((terminal) => (
          <Card key={terminal.id}>
            <CardHeader>
              <CardTitle>{terminal.terminalIdentifier}</CardTitle>
              <CardDescription>{terminal.physicalLocation}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/pos/${terminal.id}`}>
                <Button className="w-full">Abrir Terminal</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {terminals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No hay terminales disponibles
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Volver al Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

