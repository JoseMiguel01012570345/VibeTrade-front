import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PhotoUploader from "@/components/ui/PhotoUploader";

const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "sports", label: "Sports" },
  { value: "books", label: "Books" },
  { value: "toys", label: "Toys" },
  { value: "home", label: "Home" },
  { value: "vehicles", label: "Vehicles" },
  { value: "tools", label: "Tools" },
  { value: "other", label: "Other" },
];

export default function NewListing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");

  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    category: "other",
    location: "",
    photos: [],
  });
  const [locating, setLocating] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: business } = useQuery({
    queryKey: ["my-business", user?.email],
    queryFn: () => base44.entities.Business.filter({ owner_email: user.email }),
    select: (data) => data[0],
    enabled: !!user?.email,
  });

  const { data: editItem } = useQuery({
    queryKey: ["edit-item", editId],
    queryFn: () => base44.entities.Item.filter({ id: editId }),
    select: (data) => data[0],
    enabled: !!editId,
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title || "",
        price: editItem.price?.toString() || "",
        description: editItem.description || "",
        category: editItem.category || "other",
        location: editItem.location || "",
        photos: editItem.photos || [],
      });
    }
  }, [editItem]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return base44.entities.Item.update(editId, data);
      }
      return base44.entities.Item.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["my-items"] });
      navigate(createPageUrl("MyListings"));
    },
  });

  const handleLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Given coordinates lat=${latitude} lng=${longitude}, return a human-readable short address/location name.`,
          response_json_schema: {
            type: "object",
            properties: { address: { type: "string" } },
          },
        });
        setForm({ ...form, location: res.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      price: parseFloat(form.price) || 0,
      description: form.description,
      category: form.category,
      location: form.location || undefined,
      photos: form.photos,
      status: "published",
      business_id: business?.id,
      business_name: business?.name,
      business_logo: business?.logo_url,
    };
    mutation.mutate(payload);
  };

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Set Up Your Business First</h2>
          <p className="text-sm text-gray-500 mb-4">You need a business profile before listing items.</p>
          <Button onClick={() => navigate(createPageUrl("BusinessSetup"))} className="bg-emerald-600 hover:bg-emerald-700">
            Create Business Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80 pb-6">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-5">
          <h1 className="text-lg font-bold text-gray-900">{editId ? "Edit Listing" : "New Listing"}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Fill in the details and publish</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Photos */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">Photos</Label>
          <PhotoUploader photos={form.photos} setPhotos={(p) => setForm({ ...form, photos: p })} />
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Title *</Label>
          <Input
            placeholder="e.g. Vintage wooden chair"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="h-11 rounded-xl"
            required
          />
        </div>

        {/* Price */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Price ($) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="h-11 rounded-xl"
            required
          />
        </div>

        {/* Category */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
          <Textarea
            placeholder="Describe the item, its condition, and any other details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl min-h-[100px]"
          />
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Location (optional)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="h-11 rounded-xl flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleLocation}
              disabled={locating}
              className="h-11 rounded-xl px-3 border-gray-200"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            disabled={mutation.isPending || !form.title || !form.price}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-base shadow-lg shadow-emerald-200"
          >
            {mutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : editId ? (
              "Update Listing"
            ) : (
              "Publish Now"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-xl text-gray-500"
            onClick={() => navigate(createPageUrl("MyListings"))}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}