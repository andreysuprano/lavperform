/** Converte `snake_case` em `camelCase` (ex.: `em_potencial` → `emPotencial`). */
export function snakeToCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
