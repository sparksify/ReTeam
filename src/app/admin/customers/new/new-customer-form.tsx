"use client";

import { useActionState } from "react";
import { createCustomerAction, type ActionState } from "../../actions";
import { Button, Card, FormMessage, Input, Label, LinkButton } from "@/components/ui";

export function NewCustomerForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCustomerAction, {});
  return (
    <Card>
      <form action={action} className="max-w-lg space-y-5">
        <div>
          <Label htmlFor="name">Realtor name</Label>
          <Input id="name" name="name" required autoFocus placeholder="Jordan Realtor" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="jordan@brokerage.com" />
        </div>
        <div>
          <Label htmlFor="companyName" hint="optional">Company / brokerage</Label>
          <Input id="companyName" name="companyName" placeholder="Jordan Homes at Example Realty" />
        </div>
        <FormMessage message={state.error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create customer"}</Button>
          <LinkButton href="/admin/customers">Cancel</LinkButton>
        </div>
      </form>
    </Card>
  );
}
