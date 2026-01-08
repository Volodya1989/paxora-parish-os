import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type ParishSetupProps = {
  action: string | (() => void | Promise<void>);
  userName?: string | null;
};

export function ParishSetup({ action, userName }: ParishSetupProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist-50 px-4 py-10">
      <Card className="w-full max-w-lg">
        <div className="space-y-4">
          <div>
            <p className="text-caption uppercase tracking-wide text-ink-500">Setup</p>
            <h1 className="text-h2">Create your parish</h1>
          </div>
          <p className="text-body">
            {userName ? `Welcome back, ${userName}.` : "Welcome to Paxora Parish OS."} Create your
            parish workspace to start planning weeks, tasks, and events.
          </p>
          <form action={action}>
            <Button type="submit">Create parish</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default ParishSetup;
