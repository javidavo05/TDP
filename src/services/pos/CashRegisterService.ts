import { POSTerminal, POSCashSession, CashCountBreakdown } from "@/domain/entities";
import { IPOSTerminalRepository } from "@/domain/repositories/IPOSTerminalRepository";
import { IPOSCashSessionRepository } from "@/domain/repositories/IPOSCashSessionRepository";
import { IPOSTransactionRepository } from "@/domain/repositories/IPOSTransactionRepository";
import { ICashCountRepository } from "@/domain/repositories/ICashCountRepository";
import { calculateCashTotal } from "@/lib/constants";
import { validateCashCount } from "@/lib/validation/cashCountValidator";

export class CashRegisterService {
  constructor(
    private terminalRepository: IPOSTerminalRepository,
    private sessionRepository: IPOSCashSessionRepository,
    private transactionRepository: IPOSTransactionRepository,
    private cashCountRepository: ICashCountRepository
  ) {}

  async openCashRegister(
    terminalId: string,
    userId: string,
    initialCash: number,
    cashBreakdown?: Array<{ denomination: number; count: number; type: "bill" | "coin" }>,
    manualTotal?: number,
    discrepancyNotes?: string
  ): Promise<{ terminal: POSTerminal; session: POSCashSession }> {
    // Get terminal
    const terminal = await this.terminalRepository.findById(terminalId);
    if (!terminal) {
      throw new Error("Terminal not found");
    }

    // Check if already open
    if (terminal.isOpen) {
      throw new Error("Cash register is already open");
    }

    // Note: RLS policies will handle authorization
    // We only check business logic here (terminal exists, not already open, etc.)

    // Check if there's an active session
    const activeSession = await this.sessionRepository.findActiveByTerminal(terminalId);
    if (activeSession) {
      throw new Error("There is already an active session for this terminal");
    }

    // Validate cash breakdown if provided
    if (cashBreakdown && cashBreakdown.length > 0) {
      const countedTotal = calculateCashTotal(cashBreakdown);
      
      if (manualTotal !== undefined) {
        const validation = validateCashCount(countedTotal, manualTotal);
        if (!validation.isValid && !discrepancyNotes) {
          throw new Error(`Discrepancy detected: ${validation.message}. Notes are required.`);
        }
      }
    }

    // Create new session
    const session = POSCashSession.create({
      terminalId,
      openedByUserId: userId,
      initialCash,
      countedTotal: cashBreakdown ? calculateCashTotal(cashBreakdown) : undefined,
      manualTotal: manualTotal,
      discrepancyNotes: discrepancyNotes,
    });

    const createdSession = await this.sessionRepository.create(session);

    // Save cash breakdown if provided
    if (cashBreakdown && cashBreakdown.length > 0) {
      const breakdownEntities = cashBreakdown
        .filter((b) => b.count > 0)
        .map((b) =>
          CashCountBreakdown.create({
            sessionId: createdSession.id,
            denomination: b.denomination,
            count: b.count,
            type: b.type,
          })
        );
      await this.cashCountRepository.saveBreakdown(breakdownEntities);
    }

    // Update terminal
    terminal.openCashRegister(userId, initialCash);
    const updatedTerminal = await this.terminalRepository.update(terminal);

    return { terminal: updatedTerminal, session: createdSession };
  }

  async closeCashRegister(
    terminalId: string,
    userId: string,
    closureType: "X" | "Z",
    actualCash: number,
    cashBreakdown?: Array<{ denomination: number; count: number; type: "bill" | "coin" }>,
    manualTotal?: number,
    notes?: string,
    discrepancyNotes?: string
  ): Promise<{ terminal: POSTerminal; session: POSCashSession }> {
    // Get terminal
    const terminal = await this.terminalRepository.findById(terminalId);
    if (!terminal) {
      throw new Error("Terminal not found");
    }

    if (!terminal.isOpen) {
      throw new Error("Cash register is not open");
    }

    // Get active session
    const session = await this.sessionRepository.findActiveByTerminal(terminalId);
    if (!session) {
      throw new Error("No active session found");
    }

    // Validate cash breakdown if provided
    if (cashBreakdown && cashBreakdown.length > 0) {
      const countedTotal = calculateCashTotal(cashBreakdown);
      const expectedCash = session.calculateExpectedCash();
      
      if (manualTotal !== undefined) {
        const validation = validateCashCount(countedTotal, manualTotal);
        if (!validation.isValid && !discrepancyNotes) {
          throw new Error(`Discrepancy detected: ${validation.message}. Notes are required.`);
        }
      }
    }

    // Close session
    const countedTotal = cashBreakdown ? calculateCashTotal(cashBreakdown) : undefined;
    session.close(
      closureType,
      actualCash,
      notes,
      countedTotal,
      manualTotal,
      discrepancyNotes
    );
    const updatedSession = await this.sessionRepository.update(session);

    // Save cash breakdown if provided
    if (cashBreakdown && cashBreakdown.length > 0) {
      const breakdownEntities = cashBreakdown
        .filter((b) => b.count > 0)
        .map((b) =>
          CashCountBreakdown.create({
            sessionId: updatedSession.id,
            denomination: b.denomination,
            count: b.count,
            type: b.type,
          })
        );
      await this.cashCountRepository.saveBreakdown(breakdownEntities);
    }

    // Update terminal
    terminal.closeCashRegister(closureType, actualCash);
    const updatedTerminal = await this.terminalRepository.update(terminal);

    return { terminal: updatedTerminal, session: updatedSession };
  }

  async getActiveSession(terminalId: string): Promise<POSCashSession | null> {
    return this.sessionRepository.findActiveByTerminal(terminalId);
  }

  async validateCashAmount(
    sessionId: string,
    expected: number,
    received: number
  ): Promise<{ isValid: boolean; change: number }> {
    if (received < expected) {
      return { isValid: false, change: 0 };
    }
    return { isValid: true, change: received - expected };
  }

  async getSessionReport(sessionId: string): Promise<{
    session: POSCashSession;
    transactions: any[];
    summary: {
      totalSales: number;
      totalCashSales: number;
      totalCardSales: number;
      totalTickets: number;
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

    return {
      session,
      transactions,
      summary: {
        totalSales: session.totalSales,
        totalCashSales: session.totalCashSales,
        totalCardSales: session.totalCardSales,
        totalTickets: session.totalTickets,
        expectedCash: session.calculateExpectedCash(),
        actualCash: session.actualCash,
        difference: session.getCashDifference(),
      },
    };
  }
}

