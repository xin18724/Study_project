import MemorySession from "@/components/vocabulary/MemorySession";

type Props = { searchParams: Promise<{ amount?: string }> };
const allowedAmounts = [15, 20, 25, 30];

export default async function MemoryPage({ searchParams }: Props) {
  const { amount } = await searchParams;
  const requested = Number(amount);
  const studyAmount = allowedAmounts.includes(requested) ? requested : 15;
  return <MemorySession amount={studyAmount} />;
}
