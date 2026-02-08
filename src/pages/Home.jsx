import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ItemCard from "@/components/ui/ItemCard";
import CategoryPill from "@/components/ui/CategoryPill";
import EmptyState from "@/components/ui/EmptyState";

const CATEGORIES = ["electronics", "furniture", "clothing", "sports", "books", "toys", "home", "vehicles", "tools", "other"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.Item.filter({ status: "published" }, "-created_date", 100),
  });

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.title?.toLowerCase().includes(search.toLowerCase()) || item.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || item.category === selectedCategory;
    const matchLocation = !locationFilter || item.location?.toLowerCase().includes(locationFilter.toLowerCase());
    return matchSearch && matchCategory && matchLocation;
  });

  const handleCategoryClick = (cat) => {
    setSelectedCategory(selectedCategory === cat ? null : cat);
  };

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Garage Sale</h1>
              <p className="text-xs text-gray-400 mt-0.5">Find amazing deals near you</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "border-gray-200 text-gray-400 hover:text-gray-600"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 h-11 rounded-xl border-gray-200 bg-gray-50/70 text-sm focus:bg-white transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Location filter */}
          {showFilters && (
            <div className="mt-3 relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-10 pr-4 h-11 rounded-xl border-gray-200 bg-gray-50/70 text-sm"
              />
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat}
                category={cat}
                selected={selectedCategory === cat}
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No items found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}