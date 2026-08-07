import { prisma } from "../db/prisma.ts";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/app-errors.ts";
import { comparePassword, hashPassword } from "../utils/hash.ts";
import { generateToken } from "../utils/jwt.ts";
import type { LoginBody, RegisterBody } from "../types/types.ts";

export async function register(data: RegisterBody) {
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();

  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError("User already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });

  return {
    message: "User registered successfully",
    user,
  };
}

export async function login(data: LoginBody) {
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();

  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const isPasswordCorrect = await comparePassword(password, user.password_hash);

  if (!isPasswordCorrect) {
    throw new UnauthorizedError("Invalid credentials");
  }

  return {
    message: "Logged in successfully",
    token: generateToken(user.id, user.email),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
  };
}

export async function me(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return { user };
}
