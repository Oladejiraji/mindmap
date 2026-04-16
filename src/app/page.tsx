import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex h-full min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Mindmap</h1>
        <p className="max-w-md text-muted-foreground">
          A branching chat app. Select a thread from the sidebar, or start a
          new one.
        </p>
      </div>
      <Button size="lg" disabled>
        New thread
      </Button>
    </div>
  );
}
