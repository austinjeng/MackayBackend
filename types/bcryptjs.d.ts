declare module 'bcryptjs' {
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSaltSync(rounds?: number): string;
  export function hashSync(data: string, salt: string | number): string;
}
