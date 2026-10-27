import { Suspense } from "react";
import Link from "next/link";
import { GetStarted } from "@/components/shared/get-started";
import { Walkthrough } from "@/components/onboarding/walkthrough";
import { routes } from "@/lib/routes";

export default function GetStartedPage() {
  return (
    <>
      <GetStarted />
      {/* Opened with ?tour=1 right after onboarding; reads the query, so Suspense */}
      <Suspense>
        <Walkthrough />
      </Suspense>
      {/* TEMP: reopen the walkthrough while we design it. Remove before shipping. */}
      <Link
        href={`${routes.getStarted}?tour=1`}
        scroll={false}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#1e1e1e] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-default transition-colors hover:bg-[#333] [corner-shape:round]"
      >
        Walkthrough
      </Link>
    </>
  );
}
