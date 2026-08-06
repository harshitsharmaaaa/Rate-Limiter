import bcrypt from "bcrypt";
import crypto from "crypto";
export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
}

export async function comparePassword(
    password: string,
    hashedPassword: string
) {
    return await bcrypt.compare(password, hashedPassword);
}


export function hashApiKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
}



