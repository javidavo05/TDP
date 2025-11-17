import { User } from "../entities";
import { PaginationParams, PaginatedResponse } from "../types";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  findAll(params?: PaginationParams): Promise<PaginatedResponse<User>>;
  findByRole(role: string): Promise<User[]>;
}

