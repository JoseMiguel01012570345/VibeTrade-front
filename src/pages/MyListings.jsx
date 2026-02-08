import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmptyState from "@/components/ui/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MyListings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-items", business?.id],
    queryFn: () => base44.entities.Item.filter({ business_id: business.id }, "-created_date"),
    enabled: !!business?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-items"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Item.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-items"] }),
  });

  const statusColors = {
    published: "bg-emerald-100 text-emerald-700",
    draft: "bg-gray-100 text-gray-600",
    sold: "bg-amber-100 text-amber-700",
  };

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Set Up Your Business First</h2>
          <p className="text-sm text-gray-500 mb-4">Create a business profile to start listing items.</p>
          <Button onClick={() => navigate(createPageUrl("BusinessSetup"))} className="bg-emerald-600 hover:bg-emerald-700">
            Create Business Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80 pb-24">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Listings</h1>
            <p className="text-xs text-gray-400 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to={createPageUrl("NewListing")}>
            <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              New Item
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No listings yet"
            description="Start selling by creating your first listing"
            action={
              <Link to={createPageUrl("NewListing")}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-1.5">
                  <Plus className="w-4 h-4" />
                  Create Listing
                </Button>
              </Link>
            }
          />
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.photos?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{item.title}</h3>
                      <p className="text-base font-bold text-emerald-600 mt-0.5">${item.price?.toFixed(2)}</p>
                    </div>
                    <Badge className={`${statusColors[item.status || "draft"]} text-[10px] font-medium border-0`}>
                      {item.status || "draft"}
                    </Badge>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs gap-1 border-gray-200"
                      onClick={() => navigate(createPageUrl("NewListing") + `?edit=${item.id}`)}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs gap-1 border-gray-200"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: item.id,
                          status: item.status === "published" ? "draft" : "published",
                        })
                      }
                    >
                      {item.status === "published" ? (
                        <><EyeOff className="w-3 h-3" /> Unpublish</>
                      ) : (
                        <><Eye className="w-3 h-3" /> Publish</>
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs gap-1 border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Listing</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="rounded-xl bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}