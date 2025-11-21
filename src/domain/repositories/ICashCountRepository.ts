import { CashCountBreakdown } from "@/domain/entities";

export interface ICashCountRepository {
  findBySession(sessionId: string): Promise<CashCountBreakdown[]>;
  saveBreakdown(breakdown: CashCountBreakdown[]): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
}

