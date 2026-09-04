"use client";

import { useActionState } from "react";
import type { Employee } from "@/db/schema";
import { updateEmployeeAction, type ActionState } from "../../actions";
import { Button, FormMessage, Input, Label, Select, Textarea } from "@/components/ui";

export function EmployeeForm({ employee }: { employee: Employee }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateEmployeeAction, {});
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="employeeId" value={employee.id} />
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={employee.name} required />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" defaultValue={employee.category} required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={employee.description} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="triggerExamples" hint="one per line">Trigger examples</Label>
        <Textarea id="triggerExamples" name="triggerExamples" defaultValue={employee.triggerExamples.join("\n")} rows={3} />
      </div>
      <div>
        <Label htmlFor="inputSummary">Input summary</Label>
        <Textarea id="inputSummary" name="inputSummary" defaultValue={employee.inputSummary} rows={3} />
      </div>
      <div>
        <Label htmlFor="outputSummary">Output summary</Label>
        <Textarea id="outputSummary" name="outputSummary" defaultValue={employee.outputSummary} rows={3} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={employee.status}>
          <option value="active">active — listed in the catalog</option>
          <option value="inactive">inactive — hidden from customers</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="sortOrder">Sort order</Label>
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={employee.sortOrder} min={0} />
      </div>
      <div className="sm:col-span-2 space-y-3">
        <FormMessage message={state.error ?? state.success} tone={state.error ? "error" : "success"} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save metadata"}</Button>
      </div>
    </form>
  );
}
