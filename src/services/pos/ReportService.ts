import { POSCashSession } from "@/domain/entities";
import { IPOSCashSessionRepository } from "@/domain/repositories/IPOSCashSessionRepository";
import { IPOSTransactionRepository } from "@/domain/repositories/IPOSTransactionRepository";
import { PaymentMethod } from "@/domain/types";

export interface ClosureReport {
  session: POSCashSession;
  transactions: any[];
  summary: {
    totalSales: number;
    totalCashSales: number;
    totalCardSales: number;
    totalTickets: number;
    byPaymentMethod: Record<PaymentMethod, number>;
    expectedCash: number;
    actualCash: number | null;
    difference: number | null;
    initialCash: number;
  };
  closureType: "X" | "Z";
  timestamp: Date;
}

export class ReportService {
  constructor(
    private sessionRepository: IPOSCashSessionRepository,
    private transactionRepository: IPOSTransactionRepository
  ) {}

  async generateClosureX(sessionId: string): Promise<ClosureReport> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.closedAt || session.closureType !== "X") {
      throw new Error("Session must be closed with type X");
    }

    return this.generateReport(session, "X");
  }

  async generateClosureZ(sessionId: string): Promise<ClosureReport> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.closedAt || session.closureType !== "Z") {
      throw new Error("Session must be closed with type Z");
    }

    return this.generateReport(session, "Z");
  }

  async getSessionSummary(sessionId: string): Promise<{
    session: POSCashSession;
    transactions: any[];
    summary: {
      totalSales: number;
      totalCashSales: number;
      totalCardSales: number;
      totalTickets: number;
      byPaymentMethod: Record<PaymentMethod, number>;
      expectedCash: number;
      actualCash: number | null;
      difference: number | null;
    };
  }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const transactions = await this.transactionRepository.findBySession(sessionId);

    const byPaymentMethod = transactions.reduce(
      (acc, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount;
        return acc;
      },
      {} as Record<PaymentMethod, number>
    );

    return {
      session,
      transactions,
      summary: {
        totalSales: session.totalSales,
        totalCashSales: session.totalCashSales,
        totalCardSales: session.totalCardSales,
        totalTickets: session.totalTickets,
        byPaymentMethod,
        expectedCash: session.calculateExpectedCash(),
        actualCash: session.actualCash,
        difference: session.getCashDifference(),
      },
    };
  }

  async getTerminalReport(
    terminalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    sessions: POSCashSession[];
    totalSales: number;
    totalCashSales: number;
    totalCardSales: number;
    totalTickets: number;
    totalSessions: number;
  }> {
    const sessions = await this.sessionRepository.findByDateRange(startDate, endDate);
    const terminalSessions = sessions.filter((s) => s.terminalId === terminalId);

    const totals = terminalSessions.reduce(
      (acc, session) => {
        acc.totalSales += session.totalSales;
        acc.totalCashSales += session.totalCashSales;
        acc.totalCardSales += session.totalCardSales;
        acc.totalTickets += session.totalTickets;
        return acc;
      },
      {
        totalSales: 0,
        totalCashSales: 0,
        totalCardSales: 0,
        totalTickets: 0,
      }
    );

    return {
      sessions: terminalSessions,
      ...totals,
      totalSessions: terminalSessions.length,
    };
  }

  private async generateReport(
    session: POSCashSession,
    closureType: "X" | "Z"
  ): Promise<ClosureReport> {
    const transactions = await this.transactionRepository.findBySession(session.id);

    const byPaymentMethod = transactions.reduce(
      (acc, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount;
        return acc;
      },
      {} as Record<PaymentMethod, number>
    );

    return {
      session,
      transactions,
      summary: {
        totalSales: session.totalSales,
        totalCashSales: session.totalCashSales,
        totalCardSales: session.totalCardSales,
        totalTickets: session.totalTickets,
        byPaymentMethod,
        expectedCash: session.calculateExpectedCash(),
        actualCash: session.actualCash,
        difference: session.getCashDifference(),
        initialCash: session.initialCash,
      },
      closureType,
      timestamp: new Date(),
    };
  }
}

