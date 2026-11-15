"use client";
import React, { useState } from "react";
import {
  MenuIllustration,
  type ConnectLogo,
  type IllustrationId,
} from "@/components/landing-page/nav/illustrations";

const groups: {
  title: string;
  items: { id: IllustrationId; title: string; logo?: ConnectLogo }[];
}[] = [
  {
    title: "PRODUCT",
    items: [
      { id: "canvas", title: "Canvas" },
      { id: "branches", title: "Branches" },
      { id: "blocks", title: "Blocks" },
      { id: "nodeChat", title: "Node Chat" },
      { id: "agents", title: "Agents" },
    ],
  },
  {
    title: "CONNECT",
    items: [
      { id: "connect", title: "GitHub", logo: "github" },
      { id: "connect", title: "Linear", logo: "linear" },
      { id: "connect", title: "Slack", logo: "slack" },
      { id: "connect", title: "Jira", logo: "jira" },
      { id: "connect", title: "MCP", logo: "mcp" },
    ],
  },
];

/** Click a scene to replay it; "Replay all" remounts the whole grid. */
export default function Page() {
  const [replays, setReplays] = useState<Record<string, number>>({});
  const [generation, setGeneration] = useState(0);

  const replay = (key: string) =>
    setReplays((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }));

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="max-w-344 mx-auto px-4 md:px-12 py-12 flex flex-col gap-12">
        <header className="sticky top-0 z-10 -my-3 py-3 flex items-center justify-between gap-4 bg-white text-[#0A5CE0]">
          <p className="text-13 font-medium">Menu illustrations</p>
          <button
            type="button"
            onClick={() => setGeneration((g) => g + 1)}
            className="h-7 px-2 rounded-md text-13 font-medium cursor-pointer hover:bg-[#D4ECFC]/40"
          >
            Replay all
          </button>
        </header>

        {groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-4">
            <p className="text-11 font-medium text-[#3A89FF]">{group.title}</p>
            <div className="grid grid-cols-[repeat(auto-fill,240px)] gap-6">
              {group.items.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  data-card={item.title}
                  onClick={() => replay(item.title)}
                  className="flex flex-col gap-2 text-left cursor-pointer"
                >
                  <div className="w-60 h-71.5">
                    <MenuIllustration
                      key={`${generation}-${replays[item.title] ?? 0}`}
                      id={item.id}
                      logo={item.logo}
                    />
                  </div>
                  <span className="text-11 text-[#3A89FF]">{item.title}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
