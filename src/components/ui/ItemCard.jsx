import React from "react";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ItemCard({ item }) {
  const photo = item.photos?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80";

  return (
    <Link to={createPageUrl("ItemDetail") + `?id=${item.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-0.5">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={photo}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
            <span className="text-sm font-bold text-emerald-600">${item.price?.toFixed(2)}</span>
          </div>
        </div>
        <div className="p-3.5">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.title}</h3>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {item.business_logo ? (
              <img src={item.business_logo} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-100" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-[9px] font-bold text-emerald-600">
                  {item.business_name?.[0]?.toUpperCase() || "S"}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600 font-medium truncate">{item.business_name || "Seller"}</span>
          </div>
          {item.location && (
            <div className="flex items-center gap-1 mt-2">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] text-gray-400 truncate">{item.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}