import { Suspense } from "react";
import { GetStarted } from "@/components/shared/get-started";
import { Walkthrough } from "@/components/onboarding/walkthrough";

export default function GetStartedPage() {
  return (
    <>
      <GetStarted />
      {/* Opened with ?tour=1 right after onboarding; reads the query, so Suspense */}
      <Suspense>
        <Walkthrough />
      </Suspense>
    </>
  );
}
