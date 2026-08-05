export function success(message: string, data?: unknown) {
  return data === undefined ? { message } : { message, data };
}

export function created(message: string, data?: unknown) {
  return data === undefined ? { message } : { message, data };
}

export function failure(message: string) {
  return { message };
}
