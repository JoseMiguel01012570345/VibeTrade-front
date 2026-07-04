import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useOrderTracking } from "../hooks/useOrders";
import { CheckoutPaymentSuccess } from "../components/CheckoutPaymentSuccess";

export function OrderReceiptPage() {
  const { publicNumber = "" } = useParams();
  const { data, isLoading, isError } = useOrderTracking(publicNumber);

  if (isLoading) {
    return (
      <div className="container vt-page flex items-center justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad text-center">No se encontró el pedido.</div>
      </div>
    );
  }

  return (
    <CheckoutPaymentSuccess publicNumber={data.publicNumber} continueShoppingHref="/search" />
  );
}
