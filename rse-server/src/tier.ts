export function getTier(score: number): string {
    if (score >= 850) return "Platinum";
    if (score >= 650) return "Gold";
    if (score >= 400) return "Silver";
    return "Bronze";
}
