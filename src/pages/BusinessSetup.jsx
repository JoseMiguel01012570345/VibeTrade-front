import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BusinessSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: existing } = useQuery({
    queryKey: ["my-business", user?.email],
    queryFn: () => base44.entities.Business.filter({ owner_email: user.email }),
    select: (data) => data[0],
    enabled: !!user?.email,
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    whatsapp_number: "",
    location: "",
    offers_delivery: false,
    logo_url: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        description: existing.description || "",
        whatsapp_number: existing.whatsapp_number || "",
        location: existing.location || "",
        offers_delivery: existing.offers_delivery || false,
        logo_url: existing.logo_url || "",
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (existing) {
        return base44.entities.Business.update(existing.id, data);
      }
      return base44.entities.Business.create({ ...data, owner_email: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-business"] });
      navigate(createPageUrl("MyListings"));
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, logo_url: file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-gray-50/80 pb-6">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-5">
          <h1 className="text-lg font-bold text-gray-900">
            {existing ? "Edit Business" : "Create Business Profile"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Set up your seller profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {form.logo_url ? (
              <img src={form.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            )}
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">Logo</Label>
            <p className="text-xs text-gray-400 mb-2">Upload your business logo</p>
            <label className="cursor-pointer">
              <span className="text-xs font-medium text-emerald-600 hover:underline">Upload Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>

        {/* Name */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Business Name *</Label>
          <Input
            placeholder="Your business name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 rounded-xl"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
          <Textarea
            placeholder="Tell buyers about your business..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl min-h-[80px]"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">WhatsApp Number</Label>
          <Input
            placeholder="+1 234 567 8900"
            value={form.whatsapp_number}
            onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
            className="h-11 rounded-xl"
          />
          <p className="text-[11px] text-gray-400 mt-1">Include country code for WhatsApp chat</p>
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Location</Label>
          <Input
            placeholder="City, State or Address"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>

        {/* Delivery */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
          <div>
            <Label className="text-sm font-semibold text-gray-700">Home Delivery</Label>
            <p className="text-xs text-gray-400 mt-0.5">Offer delivery to buyers</p>
          </div>
          <Switch
            checked={form.offers_delivery}
            onCheckedChange={(v) => setForm({ ...form, offers_delivery: v })}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={mutation.isPending || !form.name}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-base shadow-lg shadow-emerald-200"
        >
          {mutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : existing ? (
            "Save Changes"
          ) : (
            "Create Business"
          )}
        </Button>
      </form>
    </div>
  );
}