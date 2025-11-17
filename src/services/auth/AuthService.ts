import { User } from "@/domain/entities";
import { IUserRepository } from "@/domain/repositories";
import { UserRole } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class AuthService {
  constructor(private userRepository: IUserRepository) {}

  async getCurrentUser(): Promise<User | null> {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    let user = await this.userRepository.findByEmail(authUser.email!);
    if (!user) {
      // Create user if doesn't exist
      user = User.create({
        email: authUser.email!,
        role: "passenger",
        fullName: authUser.user_metadata?.full_name,
      });
      user = await this.userRepository.create(user);
    }

    return user;
  }

  async signUp(data: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    role?: UserRole;
  }): Promise<{ user: User; session: any }> {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
        },
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    // Create user entity
    const user = User.create({
      email: data.email,
      phone: data.phone,
      role: data.role || "passenger",
      fullName: data.fullName,
    });

    const savedUser = await this.userRepository.create(user);

    return {
      user: savedUser,
      session: authData.session,
    };
  }

  async signIn(email: string, password: string): Promise<{ user: User; session: any }> {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Failed to sign in");
    }

    let user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Create user if doesn't exist
      user = User.create({
        email,
        role: "passenger",
      });
      user = await this.userRepository.create(user);
    }

    return {
      user,
      session: authData.session,
    };
  }

  async signOut(): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // In a real implementation, you'd check permissions here
    const updatedUser = new User(
      user.id,
      user.email,
      user.phone,
      role,
      user.fullName,
      user.avatarUrl,
      user.emailVerifiedAt,
      user.phoneVerifiedAt,
      user.createdAt,
      new Date()
    );

    return this.userRepository.update(updatedUser);
  }
}

