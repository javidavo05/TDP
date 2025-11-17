import { Payment } from "../entities";
import { PaymentStatus, PaginationParams, PaginatedResponse } from "../types";

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByTicket(ticketId: string): Promise<Payment | null>;
  findByTransactionId(transactionId: string): Promise<Payment | null>;
  findByStatus(status: PaymentStatus, params?: PaginationParams): Promise<PaginatedResponse<Payment>>;
  create(payment: Payment): Promise<Payment>;
  update(payment: Payment): Promise<Payment>;
  delete(id: string): Promise<void>;
}

