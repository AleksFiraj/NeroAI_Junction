import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { CustomerProfile } from "../components/customer/CustomerProfile";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  if (!customerId) return null;

  return (
    <div className="space-y-4">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to customers
      </Link>
      <CustomerProfile customerId={customerId} />
    </div>
  );
}
