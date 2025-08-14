import { Suspense } from "react";
import SubmitPage from "./SubmitPage";

export default function Page() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <SubmitPage />
    </Suspense>
  );
}
