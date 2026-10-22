import { ArrowLeftRight, BookOpen, Coins, Landmark, type LucideProps } from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

const ICONS = { earn: Coins, liquidity: ArrowLeftRight, borrow: Landmark, hub: BookOpen } as const;

/** The category's icon in its colour. Decorative: the label always sits beside it. */
export function CategoryIcon({ category, ...props }: { category: CategoryKey } & LucideProps) {
  const Icon = ICONS[category];
  return <Icon aria-hidden="true" {...props} className={`${CATEGORIES[category].cls.text} ${props.className ?? ""}`} />;
}

/** The icon on a tinted rounded plate, for cards and page headers. */
export function CategoryBadgeIcon({ category, size = 40 }: { category: CategoryKey; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${CATEGORIES[category].cls.subtle}`}
    >
      <CategoryIcon category={category} size={size * 0.5} strokeWidth={2} />
    </span>
  );
}
