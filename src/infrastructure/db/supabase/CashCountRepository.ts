import { CashCountBreakdown } from "@/domain/entities";
import { ICashCountRepository } from "@/domain/repositories/ICashCountRepository";
import { createClient } from "@/lib/supabase/server";

export class CashCountRepository implements ICashCountRepository {
  async findBySession(sessionId: string): Promise<CashCountBreakdown[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cash_count_breakdown")
      .select("*")
      .eq("session_id", sessionId)
      .order("denomination", { ascending: false });

    if (error) {
      throw new Error(`Failed to find cash count breakdown: ${error.message}`);
    }

    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async saveBreakdown(breakdown: CashCountBreakdown[]): Promise<void> {
    if (breakdown.length === 0) return;

    const supabase = await createClient();
    const sessionId = breakdown[0].sessionId;

    // Delete existing breakdown for this session
    await this.deleteBySession(sessionId);

    // Insert new breakdown (only non-zero counts)
    const toInsert = breakdown
      .filter((b) => b.count > 0)
      .map((b) => this.mapToDatabase(b));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("cash_count_breakdown").insert(toInsert);

      if (error) {
        throw new Error(`Failed to save cash count breakdown: ${error.message}`);
      }
    }
  }

  async deleteBySession(sessionId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("cash_count_breakdown")
      .delete()
      .eq("session_id", sessionId);

    if (error) {
      throw new Error(`Failed to delete cash count breakdown: ${error.message}`);
    }
  }

  private mapToEntity(data: any): CashCountBreakdown {
    return new CashCountBreakdown(
      data.id,
      data.session_id,
      parseFloat(data.denomination),
      data.count,
      data.type,
      new Date(data.created_at)
    );
  }

  private mapToDatabase(breakdown: CashCountBreakdown): any {
    return {
      id: breakdown.id,
      session_id: breakdown.sessionId,
      denomination: breakdown.denomination.toString(),
      count: breakdown.count,
      type: breakdown.type,
    };
  }
}

