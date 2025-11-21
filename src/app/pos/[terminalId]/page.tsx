"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CashRegisterOpen } from "@/components/pos/CashRegisterOpen";
import { CashRegisterClose } from "@/components/pos/CashRegisterClose";
import { PaymentAmountInput } from "@/components/pos/PaymentAmountInput";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";
import POSPage from "@/app/(admin)/dashboard/pos/page";

interface Terminal {
  id: string;
  terminalIdentifier: string;
  physicalLocation: string;
  isOpen: boolean;
  assignedUserId: string | null;
}

interface Session {
  id: string;
  terminalId: string;
  openedAt: string;
  closedAt: string | null;
  initialCash: number;
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalTickets: number;
}

export default function TerminalPOSPage() {
  const params = useParams();
  const router = useRouter();
  const terminalId = params.terminalId as string;

  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  useEffect(() => {
    if (terminalId) {
      fetchTerminalAndSession();
    }
  }, [terminalId]);

  const fetchTerminalAndSession = async () => {
    try {
      // Fetch terminal
      const terminalResponse = await fetch(`/api/admin/pos/terminals/${terminalId}`);
      if (terminalResponse.ok) {
        const terminalData = await terminalResponse.json();
        setTerminal(terminalData.terminal);
      }

      // Fetch active session
      const sessionResponse = await fetch(`/api/admin/pos/sessions/active?terminalId=${terminalId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData.session);
      }
    } catch (error) {
      console.error("Error fetching terminal/session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCashRegister = async (
    initialCash: number,
    breakdown: Array<{ denomination: number; count: number; type: "bill" | "coin" }>
  ) => {
    try {
      const response = await fetch(`/api/admin/pos/terminals/${terminalId}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialCash, cashBreakdown: breakdown }),
      });

      if (response.ok) {
        const data = await response.json();
        setTerminal(data.terminal);
        setSession(data.session);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Error al abrir la caja");
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleCloseCashRegister = async (
    closureType: "X" | "Z",
    actualCash: number,
    breakdown: Array<{ denomination: number; count: number; type: "bill" | "coin" }>,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/pos/terminals/${terminalId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closureType, actualCash, cashBreakdown: breakdown, notes }),
      });

      if (response.ok) {
        const data = await response.json();
        setTerminal(data.terminal);
        setSession(null);
        setShowCloseDialog(false);
        // Optionally redirect or show success message
      } else {
        const error = await response.json();
        throw new Error(error.error || "Error al cerrar la caja");
      }
    } catch (error: any) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Cargando terminal...</div>
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Terminal no encontrada</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-primary hover:underline"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If terminal is not open, show open dialog
  if (!terminal.isOpen || !session) {
    return (
      <CashRegisterOpen
        terminalId={terminalId}
        onOpen={handleOpenCashRegister}
      />
    );
  }

  // If showing close dialog
  if (showCloseDialog && session) {
    return (
      <CashRegisterClose
        session={session}
        onClose={handleCloseCashRegister}
        onCancel={() => setShowCloseDialog(false)}
      />
    );
  }

  // Main POS interface - pass sessionId to POSPage
  return (
    <div className="relative">
      {/* Header with session info, theme toggle and close button */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{terminal.terminalIdentifier}</h1>
          <p className="text-sm opacity-90">{terminal.physicalLocation}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm opacity-90">Sesión Activa</div>
            <div className="text-xs opacity-75">
              {new Date(session.openedAt).toLocaleTimeString()}
            </div>
          </div>
          {/* Theme Toggle integrated in header */}
          <UniversalThemeToggle />
          <button
            onClick={() => setShowCloseDialog(true)}
            className="px-4 py-2 bg-destructive hover:bg-destructive/90 rounded-lg text-sm font-medium"
          >
            Cerrar Caja
          </button>
        </div>
      </div>

      {/* Render POS page with session context */}
      <POSPageWithSession terminalId={terminalId} sessionId={session.id} />
    </div>
  );
}

// Wrapper component that provides session context to POSPage
function POSPageWithSession({ terminalId, sessionId }: { terminalId: string; sessionId: string }) {
  return <POSPage terminalId={terminalId} sessionId={sessionId} />;
}

