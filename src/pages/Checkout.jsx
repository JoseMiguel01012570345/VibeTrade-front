import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, MapPin, CreditCard, Loader2, CheckCircle2, Plus, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Checkout() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("item_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [locating, setLocating] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // New payment method form
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCard, setNewCard] = useState({ label: "", card_number: "", card_secret: "" });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: item } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => base44.entities.Item.filter({ id: itemId }),
    select: (data) => data[0],
    enabled: !!itemId,
  });

  const { data: paymentMethods = [], refetch: refetchPayments } = useQuery({
    queryKey: ["my-payments", user?.email],
    queryFn: () => base44.entities.PaymentMethod.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  const addCardMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentMethod.create(data),
    onSuccess: () => {
      refetchPayments();
      setShowNewCard(false);
      setNewCard({ label: "", card_number: "", card_secret: "" });
    },
  });

  const orderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: async () => {
      await base44.entities.Item.update(itemId, { status: "sold" });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setOrderPlaced(true);
    },
  });

  const handleLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // const res =
        setDeliveryAddress(res.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    const lastFour = newCard.card_number.replace(/\s/g, "").slice(-4);
    addCardMutation.mutate({
      label: newCard.label || `Card ending ${lastFour}`,
      card_last_four: lastFour,
      card_type: "visa",
      owner_email: user.email,
    });
  };

  const handlePlaceOrder = () => {
    orderMutation.mutate({
      item_id: item.id,
      item_title: item.title,
      item_price: item.price,
      buyer_email: user.email,
      seller_business_id: item.business_id,
      delivery_address: deliveryAddress,
      payment_method_id: selectedPayment,
      status: "confirmed",
    });
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-sm text-gray-500 mb-6">Your order for "{item?.title}" has been placed successfully.</p>
          <Link to={createPageUrl("Home")}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11">
              Back to Browsing
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <Link to={createPageUrl("ItemDetail") + `?id=${itemId}`}>
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Order summary */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex gap-4">
            <img
              src={item.photos?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80"}
              alt=""
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-gray-900">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{item.business_name}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">${item.price?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-sm text-gray-900">Delivery Address</h2>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your delivery address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
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

        {/* Payment methods */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-sm text-gray-900">Payment Method</h2>
            </div>
            <Dialog open={showNewCard} onOpenChange={setShowNewCard}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-xs text-emerald-600 gap-1 h-8">
                  <Plus className="w-3 h-3" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCard} className="space-y-4 mt-2">
                  <div>
                    <Label className="text-sm mb-1.5 block">Label</Label>
                    <Input
                      placeholder="e.g. My Visa"
                      value={newCard.label}
                      onChange={(e) => setNewCard({ ...newCard, label: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Card Number *</Label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={newCard.card_number}
                      onChange={(e) => setNewCard({ ...newCard, card_number: e.target.value })}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">CVV *</Label>
                    <Input
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      value={newCard.card_secret}
                      onChange={(e) => setNewCard({ ...newCard, card_secret: e.target.value })}
                      className="h-10 rounded-xl w-24"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={addCardMutation.isPending}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    {addCardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Card"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {paymentMethods.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No payment methods yet. Add a card to continue.</p>
          ) : (
            <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment} className="space-y-2">
              {paymentMethods.map((pm) => (
                <label
                  key={pm.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedPayment === pm.id
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <RadioGroupItem value={pm.id} />
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{pm.label}</p>
                    <p className="text-xs text-gray-400">•••• {pm.card_last_four}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 z-30">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-bold text-gray-900">${item.price?.toFixed(2)}</span>
          </div>
          <Button
            onClick={handlePlaceOrder}
            disabled={orderMutation.isPending || !deliveryAddress || !selectedPayment}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-base shadow-lg shadow-emerald-200"
          >
            {orderMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Confirm & Pay"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}