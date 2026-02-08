import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageCircle, ChevronLeft, ChevronRight, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { categoryMeta } from "@/components/ui/CategoryPill";

export default function ItemDetail() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("id");
  const [photoIdx, setPhotoIdx] = useState(0);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => base44.entities.Item.filter({ id: itemId }),
    select: (data) => data[0],
    enabled: !!itemId,
  });

  const { data: business } = useQuery({
    queryKey: ["business", item?.business_id],
    queryFn: () => base44.entities.Business.filter({ id: item.business_id }),
    select: (data) => data[0],
    enabled: !!item?.business_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton className="w-full aspect-square" />
        <div className="p-5 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Item not found</p>
      </div>
    );
  }

  const photos = item.photos?.length ? item.photos : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"];
  const catMeta = categoryMeta[item.category];
  const whatsappNumber = business?.whatsapp_number?.replace(/[^0-9]/g, "");
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi! I'm interested in "${item.title}" listed for $${item.price?.toFixed(2)}`)}`
    : null;

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Photo Gallery */}
      <div className="relative">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          <img
            src={photos[photoIdx]}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Back button */}
        <Link
          to={createPageUrl("Home")}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>

        {/* Photo nav */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIdx(Math.max(0, photoIdx - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPhotoIdx(Math.min(photos.length - 1, photoIdx + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-5 space-y-5">
        {/* Price & category */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{item.title}</h1>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">${item.price?.toFixed(2)}</p>
          </div>
          {catMeta && (
            <Badge variant="secondary" className={`${catMeta.color} border text-xs mt-1`}>
              {catMeta.label}
            </Badge>
          )}
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl">
          {item.business_logo ? (
            <img src={item.business_logo} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center ring-2 ring-white">
              <span className="text-sm font-bold text-emerald-600">
                {item.business_name?.[0]?.toUpperCase() || "S"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{item.business_name || "Seller"}</p>
            {business?.location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 truncate">{business.location}</span>
              </div>
            )}
          </div>
          {business?.offers_delivery && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-lg">
              <Truck className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-medium text-emerald-600">Delivery</span>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Location */}
        {item.location && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{item.location}</span>
          </div>
        )}
      </div>

      {/* Floating bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 z-30">
        <div className="max-w-2xl mx-auto flex gap-3">
          {business?.offers_delivery && (
            <Link to={createPageUrl("Checkout") + `?item_id=${item.id}`} className="flex-1">
              <Button className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-lg shadow-emerald-200">
                <ShoppingBag className="w-4 h-4" />
                Buy Now
              </Button>
            </Link>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={business?.offers_delivery ? "" : "flex-1"}>
              <Button
                variant={business?.offers_delivery ? "outline" : "default"}
                className={`h-12 rounded-xl font-semibold gap-2 ${business?.offers_delivery ? "px-5 border-gray-200" : "w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"}`}
              >
                <MessageCircle className="w-4 h-4" />
                {business?.offers_delivery ? "Chat" : "Chat on WhatsApp"}
              </Button>
            </a>
          )}
          {!whatsappUrl && !business?.offers_delivery && (
            <Button disabled className="flex-1 h-12 rounded-xl font-semibold opacity-50">
              Contact Seller
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}