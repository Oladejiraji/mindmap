"use client";
import React from "react";
import { MenuGroup } from "./menu-group";
import type { NavState } from "./nav-area";

const featuresData = [
  { id: 1, title: "Canvas", description: "Lay ideas out in space" },
  { id: 2, title: "Branching Chats", description: "Explore any thread" },
  { id: 3, title: "Node Editor", description: "Rich block documents" },
  { id: 4, title: "Context Inheritance", description: "Children know parents" },
  { id: 5, title: "Search", description: "Find any idea fast" },
];

const useCasesData = [
  { id: 1, title: "Research", description: "Map a field as you learn it" },
  { id: 2, title: "Writing", description: "Outline before you draft" },
  { id: 3, title: "Studying", description: "Turn notes into structure" },
  { id: 4, title: "Product Planning", description: "Branch every option" },
  { id: 5, title: "Brainstorming", description: "Follow every tangent" },
];

const solutionsData = [
  { id: 1, title: "Individuals", description: "Your personal thinking space" },
  { id: 2, title: "Teams", description: "Shared maps for shared work" },
  { id: 3, title: "Students", description: "Build knowledge that sticks" },
  { id: 4, title: "Researchers", description: "Keep every source in context" },
  { id: 5, title: "Enterprise", description: "Security and admin controls" },
];

export type IMenuData = (typeof featuresData)[0];

interface IProps {
  state: NavState;
}

export function MenuContent(props: IProps) {
  const { state } = props;

  const stateKey = state || "features";

  return (
    <div className="relative h-77.5 overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_0.5px_#093BDC1f,0_8px_40px_0_#093BDC40,0_12px_32px_-16px_#093BDC66] flex gap-0">
      <MenuGroup
        title={stateKey === "solutions" ? "SOLUTIONS" : "FEATURES"}
        data={stateKey === "solutions" ? solutionsData : featuresData}
      />

      <MenuGroup
        title="USE CASES"
        data={useCasesData}
        isVisible={stateKey === "features"}
      />

      <div className="w-60 h-full py-3 mr-3">
        <div className="w-full h-full bg-[#D4ECFC] rounded-[8px]"></div>
      </div>
    </div>
  );
}
