import React from "react";
import { Content } from "@/components/landing-page/content";
import { Debug } from "@/components/landing-page/debug";
import { Header } from "@/components/landing-page/header";
import GridLines from "@/components/landing-page/grid-lines";
import { MobileMenu } from "@/components/landing-page/mobile-menu";

export default function Page() {
  return (
    <div className="bg-[#106CFB] w-full">
      <div className="max-w-247.25 mx-auto flex flex-col w-full h-full  min-h-screen">
        <Header />
        <div className="flex-1 flex flex-col justify-center">
          <Content />
        </div>
      </div>

      <Debug />
      <GridLines />
      {/* <MobileMenu /> */}
    </div>
  );
}
