import { User } from "@/domain/entities";
import { IUserRepository } from "@/domain/repositories";
import { UserRole } from "@/domain/types";

export class UserManagementService {
  constructor(private userRepository: IUserRepository) {}

  async createUser(data: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    role: UserRole;
  }): Promise<User> {
    // Validation
    if (!data.email || !data.password) {
      throw new Error("Email and password are required");
    }

    // Check if user exists
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    // Create user entity
    const user = User.create({
      email: data.email,
      phone: data.phone,
      role: data.role,
      fullName: data.fullName,
    });

    return this.userRepository.create(user);
  }

  async updateUser(user: User): Promise<User> {
    return this.userRepository.update(user);
  }

  async changeUserRole(userId: string, newRole: UserRole): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = new User(
      user.id,
      user.email,
      user.phone,
      newRole,
      user.fullName,
      user.avatarUrl,
      user.emailVerifiedAt,
      user.phoneVerifiedAt,
      user.createdAt,
      new Date()
    );

    return this.userRepository.update(updatedUser);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return this.userRepository.delete(userId);
  }
}

