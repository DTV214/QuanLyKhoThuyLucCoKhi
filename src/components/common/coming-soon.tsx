import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, phase, items }: { title: string; phase: string; items: string[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <Card>
        <CardContent className="flex gap-4 p-6">
          <Construction className="size-8 shrink-0 text-primary" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">Đang xây dựng · {phase}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
