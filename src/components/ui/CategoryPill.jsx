import React from "react";
import { cn } from "@/lib/utils";
import {
  Smartphone, Armchair, Shirt, Dumbbell, BookOpen,
  Gamepad2, Home, Car, Wrench, MoreHorizontal
} from "lucide-react";

const categoryMeta = {
  electronics: { icon: Smartphone, label: "Electronics", color: "bg-blue-50 text-blue-600 border-blue-100" },
  furniture: { icon: Armchair, label: "Furniture", color: "bg-amber-50 text-amber-600 border-amber-100" },
  clothing: { icon: Shirt, label: "Clothing", color: "bg-pink-50 text-pink-600 border-pink-100" },
  sports: { icon: Dumbbell, label: "Sports", color: "bg-orange-50 text-orange-600 border-orange-100" },
  books: { icon: BookOpen, label: "Books", color: "bg-violet-50 text-violet-600 border-violet-100" },
  toys: { icon: Gamepad2, label: "Toys", color: "bg-red-50 text-red-600 border-red-100" },
  home: { icon: Home, label: "Home", color: "bg-teal-50 text-teal-600 border-teal-100" },
  vehicles: { icon: Car, label: "Vehicles", color: "bg-slate-50 text-slate-600 border-slate-100" },
  tools: { icon: Wrench, label: "Tools", color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  other: { icon: MoreHorizontal, label: "Other", color: "bg-gray-50 text-gray-600 border-gray-100" },
};

export default function CategoryPill({ category, selected, onClick }) {
  const meta = categoryMeta[category] || categoryMeta.other;
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onClick(category)}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-200 whitespace-nowrap",
        selected
          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
          : `${meta.color} hover:opacity-80`
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </button>
  );
}

export { categoryMeta };