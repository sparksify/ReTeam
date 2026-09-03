import { PageHeader } from "@/components/ui";
import { NewCustomerForm } from "./new-customer-form";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader eyebrow="Customers" title="New customer" description="Create the customer record, then issue their installation token from the customer page." />
      <NewCustomerForm />
    </>
  );
}
